"use client";

import { Download, FileText, Printer } from "lucide-react";
import { useState } from "react";

export function ExportControls({ studyId, studyTitle, blocks = [] }: { studyId: string; studyTitle: string; blocks?: any[] }) {
  const [isExporting, setIsExporting] = useState(false);

  const downloadCsv = async () => {
    if (!studyId) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/admin/export?studyId=${studyId}`);
      const data = await response.json();
      
      if (!data.rows || data.rows.length === 0) {
        alert("No data available to export for this study.");
        return;
      }

      // Map blocks to get question labels
      const questionMap: Record<string, string> = {};
      blocks.forEach(b => {
        // Handle multiple questions per block
        if (Array.isArray(b.config?.questions)) {
          b.config.questions.forEach((q: any) => {
            const qText = q.question || b.label;
            const qId = q.id;
            
            // Map various possible keys to the question text
            questionMap[qId] = qText;
            questionMap[`survey_${qId}`] = qText;
            questionMap[`mcq_${qId}`] = qText;
            questionMap[`likert_${qId}`] = qText;
            questionMap[`text_${qId}`] = qText;
          });
        } else {
          // Legacy single question blocks
          const qText = b.config?.question || b.config?.prompt || b.config?.instruction || b.label;
          if (qText) {
            const explicitKey = b.config?.questionKey;
            if (explicitKey) {
              questionMap[explicitKey] = qText;
            }
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

      // Collect all unique keys from all rows to ensure aligned columns
      const allKeys = new Set<string>();
      data.rows.forEach((row: any) => {
        for (const key in row) {
          allKeys.add(key);
        }
      });
      
      const headerKeys = Array.from(allKeys);
      
      // Map headers to human-readable questions
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
      
      // Trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${studyTitle.replace(/\s+/g, "_")}_results.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  return (
    <article className="rounded-xl border border-white/15 bg-white/5 p-4 flex flex-col gap-3">
      <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Export & Reports</p>
      <div className="grid grid-cols-2 gap-3 mt-1">
        <button
          onClick={downloadCsv}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? "Exporting..." : "Excel / SPSS (.csv)"}
        </button>
        <button
          onClick={printReport}
          className="flex items-center justify-center gap-2 rounded-lg bg-white/10 border border-white/10 px-3 py-2.5 text-sm font-medium hover:bg-white/15 transition-all"
        >
          <Printer className="w-4 h-4" />
          PDF Report
        </button>
      </div>
      <p className="text-[10px] text-[var(--muted)] text-center">
        Pivoted wide-format. One row per participant.<br/>
        Perfect for SPSS Variable View and Excel Analysis.
      </p>
    </article>
  );
}
