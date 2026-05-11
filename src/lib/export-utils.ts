export async function exportStudyToCsv(studyId: string, studyTitle: string, blocks: any[] = [], status?: string) {
  try {
    const url = `/api/admin/export?studyId=${studyId}${status ? `&status=${status}` : ""}&t=${Date.now()}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      alert("No data available to export for this study.");
      return;
    }

    // Map blocks to get question labels
    const questionMap: Record<string, string> = {};
    blocks.forEach(b => {
      if (Array.isArray(b.config?.questions)) {
        b.config.questions.forEach((q: any) => {
          const qText = q.question || b.label;
          questionMap[q.id] = qText;
          questionMap[`survey_${q.id}`] = qText;
          questionMap[`mcq_${q.id}`] = qText;
          questionMap[`likert_${q.id}`] = qText;
          questionMap[`text_${q.id}`] = qText;
        });
      } else {
        const qText = b.config?.question || b.config?.prompt || b.config?.instruction || b.label;
        if (qText) {
          const explicitKey = b.config?.questionKey;
          if (explicitKey) questionMap[explicitKey] = qText;
          const baseKey = b.id;
          questionMap[baseKey] = qText;
          questionMap[`survey_${baseKey}`] = qText;
          questionMap[`mcq_${baseKey}`] = qText;
          questionMap[`brs_${baseKey}`] = qText;
          questionMap[`ux_${baseKey}`] = qText;
          questionMap[`rt_${baseKey}`] = qText;
        }
      }
    });

    // Collect all unique keys from all rows
    const allKeys = new Set<string>();
    data.rows.forEach((row: any) => {
      for (const key in row) {
        allKeys.add(key);
      }
    });
    
    const headerKeys = Array.from(allKeys);
    const mappedHeaderKeys = headerKeys.map(key => questionMap[key] || key.replace(/_/g, ' '));
    
    // Create CSV content
    const headers = mappedHeaderKeys.map(h => `"${h.replace(/"/g, '""')}"`).join(",");
    const csvRows = data.rows.map((row: any) => 
      headerKeys.map(key => {
        const val = row[key] !== undefined && row[key] !== null ? row[key] : "";
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csvContent = [headers, ...csvRows].join("\n");
    
    // Trigger download with BOM for Excel UTF-8 support
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const blobUrl = URL.createObjectURL(blob);
    link.setAttribute("href", blobUrl);
    link.setAttribute("download", `${studyTitle.replace(/\s+/g, "_")}_results.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error("Export failed", error);
    alert("Failed to export data.");
    return false;
  }
}
