"use client";

import { Download, FileText, Printer, CheckCircle } from "lucide-react";
import { useState } from "react";
import { exportStudyToCsv } from "@/lib/export-utils";

export function ExportControls({ studyId, studyTitle, blocks = [] }: { studyId: string; studyTitle: string; blocks?: any[] }) {
  const [isExporting, setIsExporting] = useState(false);

  const downloadAllCsv = async () => {
    if (!studyId) return;
    setIsExporting(true);
    await exportStudyToCsv(studyId, studyTitle, blocks);
    setIsExporting(false);
  };

  const downloadCompletedCsv = async () => {
    if (!studyId) return;
    setIsExporting(true);
    await exportStudyToCsv(studyId, `${studyTitle} (Completed)`, blocks, "completed");
    setIsExporting(false);
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
          onClick={downloadCompletedCsv}
          disabled={isExporting}
          className="relative flex items-center justify-between gap-2 rounded-xl bg-emerald-500 px-4 py-4 text-sm font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span>{isExporting ? "Preparing..." : "Download Completed (21)"}</span>
          </div>
          <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-md font-mono">.XLSX</span>
        </button>

        <button
          onClick={downloadAllCsv}
          disabled={isExporting}
          className="relative flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            <span>Download All Data (Incl. In-Progress)</span>
          </div>
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
          Exported as a native Excel (.xlsx) file — one row per participant, proper date columns, and clean question headers. Opens directly in Excel, Google Sheets, and SPSS without data loss.
        </p>
      </div>
    </article>
  );
}
