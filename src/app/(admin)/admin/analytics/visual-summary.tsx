"use client";
import React from "react";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, PieChart, Layout, Download } from 'lucide-react';

export function VisualSummary({ responses, blocks }: { responses: any[], blocks: any[] }) {
  // 1. Map blocks to get question labels
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

  // 2. Aggregate data by question
  const summary: Record<string, any> = {};
  
  responses.forEach(r => {
    const label = questionMap[r.question_key] || r.question_key;
    if (!summary[label]) {
      summary[label] = { question: label, type: r.response_type, counts: {} as Record<string, number> };
    }
    
    const val = r.text_value || String(r.numeric_value);
    summary[label].counts[val] = (summary[label].counts[val] || 0) + 1;
  });

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const chartSections = Object.values(summary);

  if (!mounted) return <div className="h-[400px] flex items-center justify-center text-white/10 uppercase tracking-widest text-[10px] font-bold">Initializing Charts...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--brand)]" />
          Live Response Summary
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const exportBtn = document.querySelector('button[class*="bg-[var(--brand)]"][class*="px-4"][class*="py-4"]') as HTMLButtonElement;
              if (exportBtn) exportBtn.click();
              else alert("Please use the Export Data button in the right sidebar.");
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all text-white/60"
          >
            <Download className="w-3 h-3" />
            Download Raw Data (CSV)
          </button>
          <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">
            <span className="flex items-center gap-1"><Layout className="w-3 h-3" /> Question Level</span>
            <span className="flex items-center gap-1"><PieChart className="w-3 h-3" /> Real-time</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {chartSections.map((section: any, idx) => {
          const chartData = Object.entries(section.counts).map(([name, value]) => ({ name, value }));
          
          return (
            <article key={idx} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h3 className="text-sm font-medium text-white/80 line-clamp-2 min-h-[2.5rem]">
                {section.question}
              </h3>
              
              <div className="h-[200px] w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#ffffff60', fontSize: 10 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#ffffff05' }}
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsla(var(--brand-hue), 80%, ${60 - (index * 10)}%, 0.8)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          );
        })}
      </div>

      {chartSections.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-white/20 italic">
          No aggregate response data available to visualize yet.
        </div>
      )}
    </div>
  );
}
