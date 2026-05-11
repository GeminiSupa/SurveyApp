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
      
      // Trigger download with BOM for Excel UTF-8 support
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
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
    <article className="rounded-2xl border border-white/15 bg-white/5 p-6 space-y-6 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Download className="w-12 h-12" />
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Export & Research Data</h3>
        <p className="text-[10px] text-white/40">Download raw participant responses for external analysis.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={downloadCsv}
          disabled={isExporting}
          className="relative flex items-center justify-between gap-2 rounded-xl bg-[var(--brand)] px-4 py-4 text-sm font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-[var(--brand)]/20"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Download className="w-4 h-4" />
            </div>
            <span>{isExporting ? "Preparing Data..." : "Download CSV Data"}</span>
          </div>
          <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-md font-mono">.CSV</span>
        </button>
        
        <button
          onClick={printReport}
          className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all text-white/80"
        >
          <Printer className="w-4 h-4 text-white/40" />
          Generate PDF Report
        </button>
      </div>

      <div className="pt-4 border-t border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <FileText className="w-3 h-3" />
          <span>Optimized for Excel, SPSS, and R</span>
        </div>
        <p className="text-[9px] leading-relaxed text-white/30 italic">
          Data is exported in wide-format (one row per participant) with all survey answers and session metadata included.
        </p>
      </div>
    </article>
  );
}
