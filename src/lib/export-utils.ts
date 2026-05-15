import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Convert an ISO date string to a JS Date (Excel stores dates as Date objects). */
function parseDate(val: string | null | undefined): Date | string {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d;
  } catch {
    return val ?? "";
  }
}

/**
 * Flatten a value so it is always a scalar (string / number / Date).
 * Arrays  → joined with " | "
 * Objects → JSON string (last resort)
 */
function flatten(val: unknown): string | number | Date {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) return val;
  if (typeof val === "number" || typeof val === "boolean") return Number(val);
  if (typeof val === "string") {
    // Already a string — try to parse as JSON array/object so we can flatten it
    const trimmed = val.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.join(" | ");
        if (typeof parsed === "object") return JSON.stringify(parsed);
      } catch {
        // not JSON — return as-is
      }
    }
    return val;
  }
  if (Array.isArray(val)) return (val as unknown[]).map(String).join(" | ");
  if (typeof val === "object") {
    try { return JSON.stringify(val); } catch { return String(val); }
  }
  return String(val);
}

// ─────────────────────────────────────────────────────────────
// Build a human-readable label map from study blocks
// ─────────────────────────────────────────────────────────────

function buildLabelMap(blocks: any[]): { labelMap: Record<string, string>; orderedKeys: string[] } {
  const labelMap: Record<string, string> = {};
  const orderedKeys: string[] = [];

  const addKey = (key: string, label: string) => {
    if (!key) return;
    // Always register the raw key as given, PLUS the canonical survey_ form
    // (the API normalises old keys to survey_ before sending, so both must map)
    labelMap[key] = label;
    if (!orderedKeys.includes(key)) orderedKeys.push(key);

    // Also ensure the canonical survey_ variant is mapped
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const LEGACY = ["likert_","mcq_","text_","open_text_","multiple_choice_","survey_"];
    for (const pfx of LEGACY) {
      if (key.startsWith(pfx)) {
        const uuid = key.slice(pfx.length);
        if (UUID_RE.test(uuid)) {
          const canonical = `survey_${uuid}`;
          if (!labelMap[canonical]) labelMap[canonical] = label;
          if (!orderedKeys.includes(canonical)) orderedKeys.push(canonical);
        }
        break;
      }
    }
  };

  blocks.forEach((b) => {
    if (Array.isArray(b.config?.questions)) {
      b.config.questions.forEach((q: any) => {
        const label: string = q.question || b.label || b.id;
        // Register explicit questionKey if set, plus the canonical UUID form
        if (q.questionKey) addKey(q.questionKey, label);
        addKey(`survey_${q.id}`, label);
      });
    } else {
      const label: string =
        b.config?.question ||
        b.config?.prompt ||
        b.config?.instruction ||
        b.label ||
        b.id;

      if (b.config?.questionKey) addKey(b.config.questionKey, label);

      // BRS items: key format is brs_<blockId>_<itemId> — kept as-is
      if (b.block_type === "brs" && Array.isArray(b.config?.items)) {
        (b.config.items as any[]).forEach((item: any) => {
          const itemLabel = item.text || label;
          addKey(`brs_${b.id}_${item.id}`, itemLabel);
        });
      } else {
        addKey(`survey_${b.id}`, label);
      }
    }
  });

  return { labelMap, orderedKeys };
}


// ─────────────────────────────────────────────────────────────
// Main export function — generates a .xlsx file
// ─────────────────────────────────────────────────────────────

export async function exportStudyToCsv(
  studyId: string,
  studyTitle: string,
  blocks: any[] = [],
  status?: string
) {
  try {
    const url = `/api/admin/export?studyId=${studyId}${
      status ? `&status=${status}` : ""
    }&t=${Date.now()}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      console.error("[Export] API error:", errText);
      alert("Export failed: server returned an error. Check the console.");
      return false;
    }

    const data = await response.json();

    if (!data.rows || data.rows.length === 0) {
      alert("No data available to export for this study.");
      return false;
    }

    const { labelMap, orderedKeys } = buildLabelMap(blocks);

    // ── 1. Determine column order ──────────────────────────────
    const METADATA_KEYS = ["ParticipantID", "StartedAt", "CompletedAt", "Status", "Device", "Locale"];

    // Collect every key present in the actual data rows
    const dataKeySet = new Set<string>();
    (data.rows as any[]).forEach((row) => {
      Object.keys(row).forEach((k) => dataKeySet.add(k));
    });

    const finalKeys: string[] = [...METADATA_KEYS];

    // Add known question keys in study order (only if they exist in data)
    orderedKeys.forEach((k) => {
      if (dataKeySet.has(k) && !finalKeys.includes(k)) finalKeys.push(k);
    });

    // Add any remaining unexpected keys
    dataKeySet.forEach((k) => {
      if (!finalKeys.includes(k)) finalKeys.push(k);
    });

    // ── 2. Build human-readable column headers ─────────────────
    //  De-duplicate: if two internal keys map to the same label, suffix the second
    const seenLabels = new Map<string, number>();
    const headers: string[] = finalKeys.map((key) => {
      let label = labelMap[key] ?? key.replace(/_/g, " ");
      const count = seenLabels.get(label) ?? 0;
      seenLabels.set(label, count + 1);
      return count === 0 ? label : `${label} (${count + 1})`;
    });

    // ── 3. Build worksheet rows ────────────────────────────────
    const wsData: (string | number | Date | null)[][] = [headers];

    (data.rows as any[]).forEach((row) => {
      const rowArr = finalKeys.map((key) => {
        const raw = row[key];
        if (raw === undefined || raw === null) return "";

        // Date columns → JS Date so Excel renders them as dates
        if (key === "StartedAt" || key === "CompletedAt") {
          return parseDate(String(raw));
        }

        return flatten(raw);
      });
      wsData.push(rowArr as any);
    });

    // ── 4. Create workbook ─────────────────────────────────────
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData, { cellDates: true });

    // Apply date format to StartedAt / CompletedAt columns
    const dateColIndices = [finalKeys.indexOf("StartedAt"), finalKeys.indexOf("CompletedAt")].filter((i) => i >= 0);
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

    dateColIndices.forEach((colIdx) => {
      for (let R = 1; R <= range.e.r; R++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: colIdx });
        const cell = ws[cellAddr];
        if (cell && cell.v) {
          cell.z = "yyyy-mm-dd hh:mm:ss"; // ISO date format — reads correctly everywhere
        }
      }
    });

    // Auto-width columns
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...wsData.slice(1).map((row) => String(row[i] ?? "").length)
      );
      return { wch: Math.min(maxLen + 2, 60) };
    });
    ws["!cols"] = colWidths;

    // Freeze the header row
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

    const safeTitle = studyTitle.replace(/[\/\\?*[\]]/g, "_").slice(0, 31); // Excel sheet name limit
    XLSX.utils.book_append_sheet(wb, ws, safeTitle);

    // ── 5. Trigger download ────────────────────────────────────
    const fileName = `${studyTitle.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "")}_results.xlsx`;
    XLSX.writeFile(wb, fileName);

    return true;
  } catch (error) {
    console.error("[Export] Failed:", error);
    alert("Export failed. Please try again or check the console for details.");
    return false;
  }
}
