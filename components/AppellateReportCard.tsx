import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { CaseData } from '../types';

interface AppellateReportCardProps {
  cases: CaseData[];
}

// Major Court of Appeal Codes based on Appendix D
const COURT_MAP: Record<string, string> = {
  '1503': 'Alta. C.A.',
  '2503': 'B.C.C.A.',
  '3502': 'Man. C.A.',
  '4503': 'N.B.C.A.',
  '5502': 'N.L.C.A.',
  '6503': 'N.S.C.A.',
  '7505': 'Ont. C.A.',
  '7502': 'Ont. C.A. (Hist)',
  '8503': 'P.E.I.C.A.',
  '9504': 'Que. C.A.',
  '10502': 'Sask. C.A.',
  '14114': 'Fed. C.A.',
  '14113': 'Fed. C.A. (Hist)'
};

const AppellateReportCard: React.FC<AppellateReportCardProps> = ({ cases }) => {
  
  const stats = useMemo(() => {
    const courtStats = new Map<string, { name: string; total: number; reversed: number; affirmed: number }>();
    let dissentTotal = 0;
    let dissentValidated = 0; // Appeal Allowed when dissent below

    cases.forEach(c => {
      // 1. Reversal Rate by Court
      const source = c.caseSource?.trim();
      const disposition = c.caseDispositionCan?.trim();
      
      if (source && COURT_MAP[source]) {
        if (!courtStats.has(source)) {
          courtStats.set(source, { name: COURT_MAP[source], total: 0, reversed: 0, affirmed: 0 });
        }
        const stat = courtStats.get(source)!;
        stat.total++;

        // Coding Manual: 
        // 1=Affirmed, 2=Reversed, 3=Reversed in part, 4=Affirmed+NewTrial, 5=Reversed+NewTrial
        // 6=Affirmed+Remand, 7=Reversed+Remand, 8=Mixed
        if (['2', '3', '5', '7', '8'].includes(disposition)) {
          stat.reversed++;
        } else if (['1', '4', '6'].includes(disposition)) {
          stat.affirmed++;
        }
      }

      // 2. Dissent Validation
      // Variable 30: lowerCourtSplit. 2=Dissent, 4=Concurrence+Dissent
      const split = c.lowerCourtSplit?.trim();
      if (split === '2' || split === '4') {
        dissentTotal++;
        // If SCC allowed the appeal (reversed), they essentially agreed with the dissenter
        if (['2', '3', '5', '7', '8'].includes(disposition)) {
          dissentValidated++;
        }
      }
    });

    // Transform for Charts
    const courts = Array.from(courtStats.values())
      .filter(c => c.total >= 10) // Filter out low sample size
      .map(c => ({
        ...c,
        reversalRate: (c.reversed / c.total) * 100
      }))
      .sort((a, b) => b.reversalRate - a.reversalRate)
      .slice(0, 6); // Top 6

    const validationRate = dissentTotal > 0 ? (dissentValidated / dissentTotal) * 100 : 0;

    return { courts, dissentTotal, dissentValidated, validationRate };
  }, [cases]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded text-xs z-50">
          <p className="font-bold text-gray-800 mb-1">{data.name}</p>
          <div className="space-y-1">
            <p className="text-scc-blue">Affirmed: {data.affirmed}</p>
            <p className="text-orange-600">Reversed: {data.reversed}</p>
            <div className="border-t pt-1 font-bold text-gray-700">
                Rate: {data.reversalRate.toFixed(1)}%
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="mb-4 flex justify-between items-start flex-shrink-0">
        <div>
            <h3 className="text-xl font-serif text-scc-blue mb-1">Appellate Report Card</h3>
            <p className="text-sm text-gray-500">
            Lower court reversal rates and dissent tracking.
            </p>
        </div>
      </div>

      <div className="flex flex-col flex-grow gap-4 overflow-hidden">
          
          {/* Top: Leaderboard */}
          <div className="flex-grow flex flex-col min-h-0">
             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Most Overturned Courts (min. 10 cases)</h4>
             <div className="flex-grow">
                {stats.courts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={stats.courts}
                            layout="vertical"
                            margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                            barSize={16}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={70} 
                                tick={{ fontSize: 10, fill: '#475569', fontWeight: 500 }} 
                            />
                            <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
                            <Bar dataKey="reversalRate" radius={[0, 4, 4, 0]}>
                                {stats.courts.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#003366'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        Insufficient data for court ranking.
                    </div>
                )}
             </div>
          </div>

          {/* Bottom: Dissent Logic */}
          <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-4 border border-slate-100 flex-shrink-0 h-28">
              
              <div className="relative w-20 h-20 flex-shrink-0">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={[
                                { value: stats.dissentValidated, fill: '#C5A900' },
                                { value: stats.dissentTotal - stats.dissentValidated, fill: '#e2e8f0' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={35}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                        />
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex items-center justify-center flex-col">
                     <span className="text-sm font-bold text-slate-800">{stats.validationRate.toFixed(0)}%</span>
                 </div>
              </div>

              <div className="flex-grow">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Dissent Validation</h4>
                  <p className="text-sm text-slate-600 leading-tight">
                      <strong>{stats.dissentValidated}</strong> lower court dissents were vindicated by the SCC.
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AppellateReportCard;
