import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CaseData } from '../types';

interface ReversalRateChartProps {
  cases: CaseData[];
}

const PROVINCE_MAP: Record<string, string> = {
  '0': 'N/A',
  '1': 'Alberta',
  '2': 'British Columbia',
  '3': 'Manitoba',
  '4': 'New Brunswick',
  '5': 'Newfoundland and Labrador',
  '6': 'Nova Scotia',
  '7': 'Ontario',
  '8': 'Prince Edward Island',
  '9': 'Quebec',
  '10': 'Saskatchewan',
  '11': 'Northwest Territories',
  '12': 'Nunavut',
  '13': 'Yukon',
  '14': 'Federal'
};

const getOutcome = (disposition: string): 'Affirmed' | 'Reversed' | 'Other' => {
  const d = disposition.trim().toLowerCase();
  if (d === '1') return 'Reversed';
  if (d === '2') return 'Affirmed';
  if (d === '3') return 'Reversed';
  if (d.includes('allow')) return 'Reversed';
  if (d.includes('dismiss')) return 'Affirmed';
  return 'Other';
};

const ReversalRateChart: React.FC<ReversalRateChartProps> = ({ cases }) => {
  const [selectedProvince, setSelectedProvince] = useState<string>('All');

  const provinceCodes = useMemo(() => {
    const s = new Set<string>();
    cases.forEach(c => {
      const val = c.provinceOfOrigin ? c.provinceOfOrigin.trim() : '';
      if (val) s.add(val);
    });
    return Array.from(s).sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    });
  }, [cases]);

  const stats = useMemo(() => {
    let affirmed = 0;
    let reversed = 0;
    let other = 0;
    let total = 0;

    cases.forEach(c => {
      const pCode = c.provinceOfOrigin ? c.provinceOfOrigin.trim() : '';
      if (selectedProvince !== 'All' && pCode !== selectedProvince) return;

      const outcome = getOutcome(c.caseDispositionCan);
      if (outcome === 'Affirmed') affirmed++;
      else if (outcome === 'Reversed') reversed++;
      else other++;
      
      if (outcome !== 'Other') total++;
    });

    const reversalRate = total > 0 ? (reversed / total) * 100 : 0;

    return {
      affirmed,
      reversed,
      other,
      total,
      reversalRate,
      data: [
        { name: 'Affirmed (Dismissed)', count: affirmed, color: '#003366' },
        { name: 'Reversed (Allowed)', count: reversed, color: '#C5A900' }
      ]
    };
  }, [cases, selectedProvince]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = stats.total > 0 ? ((data.count / stats.total) * 100).toFixed(1) : '0.0';
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded text-sm z-50">
          <p className="font-bold text-gray-800">{data.name}</p>
          <p className="text-gray-600">Decisions: {data.count}</p>
          <p className="text-gray-600">Rate: {pct}%</p>
        </div>
      );
    }
    return null;
  };

  const getProvinceLabel = (code: string) => {
    return PROVINCE_MAP[code] || `Unknown Code (${code})`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col overflow-hidden relative">
      <div className="mb-4">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-xl font-serif text-scc-blue mb-1">Reversal Rate Calculator</h3>
                <p className="text-sm text-gray-500">
                    Odds of the SCC overturning a decision.
                </p>
            </div>
        </div>
        
        <div className="flex items-center gap-3 mt-4">
            <label className="text-xs font-bold text-gray-500 uppercase">Origin:</label>
            <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="block w-full md:w-64 p-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:border-scc-blue focus:ring-1 focus:ring-scc-blue"
            >
                <option value="All">All Provinces / Courts</option>
                {provinceCodes.map(code => (
                    <option key={code} value={code}>
                        {getProvinceLabel(code)}
                    </option>
                ))}
            </select>
        </div>
      </div>

      <div className="flex items-end gap-2 mb-6">
        <span className="text-5xl font-bold text-gray-800">{stats.reversalRate.toFixed(1)}%</span>
        <span className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Reversal Rate</span>
      </div>

      <div className="flex-grow min-h-[200px] w-full">
            {stats.total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={stats.data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                    layout="horizontal"
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        tick={{fontSize: 10, textAnchor: 'end'}} 
                        angle={-45}
                        interval={0} 
                        height={60}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={60}>
                    {stats.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No disposed cases found for this selection.
                </div>
            )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-gray-400 flex justify-between">
         <span>Based on {stats.total} Decisions</span>
         <span>Excluded {stats.other} unclear/other outcomes</span>
      </div>
    </div>
  );
};

export default ReversalRateChart;