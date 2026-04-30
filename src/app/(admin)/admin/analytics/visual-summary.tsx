
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, PieChart, Layout } from 'lucide-react';

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

  const chartSections = Object.values(summary);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--brand)]" />
          Live Response Summary
        </h2>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">
          <span className="flex items-center gap-1"><Layout className="w-3 h-3" /> Question Level</span>
          <span className="flex items-center gap-1"><PieChart className="w-3 h-3" /> Real-time</span>
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
              
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
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
