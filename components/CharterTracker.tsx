import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CaseData } from '../types';

interface CharterTrackerProps {
  cases: CaseData[];
}

const CharterTracker: React.FC<CharterTrackerProps> = ({ cases }) => {
  const chartData = useMemo(() => {
    const yearMap = new Map<number, { year: number; federal: number; provincial: number; action: number; other: number }>();
    let minYear = Infinity;
    let maxYear = -Infinity;

    cases.forEach(c => {
      const yearMatch = c.dateDecisionGiven?.match(/\d{4}/);
      if (!yearMatch) return;
      const year = parseInt(yearMatch[0], 10);
      
      if (year < minYear) minYear = year;
      if (year > maxYear) maxYear = year;

      if (!yearMap.has(year)) {
        yearMap.set(year, { year, federal: 0, provincial: 0, action: 0, other: 0 });
      }

      const val = c.declareUnconCAN?.trim();
      const entry = yearMap.get(year)!;

      // Variable 63: declareUnconCAN
      // 1. Federal law ultra vires
      // 2. Provincial law ultra vires
      // 3. Municipal law ultra vires
      // 4. Federal law violating Charter
      // 5. Provincial law violating Charter
      // 6. Municipal law violating Charter
      // 7. Government action violating Charter
      // 8. No declaration / 0. N/A

      if (['1', '2', '3', '4', '5', '6', '7'].includes(val)) {
        if (val === '1' || val === '4') {
          // Federal Law (Ultra Vires or Charter)
          entry.federal += 1;
        } else if (val === '2' || val === '5') {
          // Provincial Law (Ultra Vires or Charter)
          entry.provincial += 1;
        } else if (val === '7') {
          // Government Action (Charter)
          entry.action += 1;
        } else {
          // Municipal (3, 6)
          entry.other += 1;
        }
      }
    });

    if (minYear === Infinity) return [];

    const result = [];
    for (let y = minYear; y <= maxYear; y++) {
      if (yearMap.has(y)) {
        result.push(yearMap.get(y)!);
      } else {
        result.push({ year: y, federal: 0, provincial: 0, action: 0, other: 0 });
      }
    }

    return result.sort((a, b) => a.year - b.year);
  }, [cases]);

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, curr) => ({
        federal: acc.federal + curr.federal,
        provincial: acc.provincial + curr.provincial,
        action: acc.action + curr.action,
        other: acc.other + curr.other
      }),
      { federal: 0, provincial: 0, action: 0, other: 0 }
    );
  }, [chartData]);

  const totalInvalid = totals.federal + totals.provincial + totals.action + totals.other;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded text-sm z-50">
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-bold text-gray-800">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full overflow-hidden">
      <div className="mb-4">
        <h3 className="text-xl font-serif text-scc-blue mb-1">Constitutional Invalidity Tracker</h3>
        <p className="text-sm text-gray-500">
          Declarations of unconstitutionality (Charter & Federalism).
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
        <div className="bg-red-50 px-3 py-2 rounded border border-red-100">
            <span className="block text-[10px] text-red-600 font-bold uppercase tracking-wider">Total Strike-Downs</span>
            <span className="text-xl font-bold text-red-800">{totalInvalid}</span>
        </div>
        <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100">
            <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Federal Laws</span>
            <span className="text-lg font-mono font-bold text-gray-700">{totals.federal}</span>
        </div>
        <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100">
            <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Provincial Laws</span>
            <span className="text-lg font-mono font-bold text-gray-700">{totals.provincial}</span>
        </div>
        <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100">
            <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Gov Action</span>
            <span className="text-lg font-mono font-bold text-gray-700">{totals.action}</span>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 11 }} 
                type="number" 
                domain={['dataMin', 'dataMax']} 
                tickCount={5}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="plainline" wrapperStyle={{fontSize: '11px'}} />
              
              <Line 
                type="monotone" 
                dataKey="federal" 
                name="Federal (Legislation)" 
                stroke="#C5A900" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="provincial" 
                name="Provincial (Legislation)" 
                stroke="#003366" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="action" 
                name="State Conduct / Action" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            No data available for this range.
          </div>
        )}
      </div>
       <p className="mt-2 text-xs text-gray-400 italic">
        *Includes declarations under both Charter (s. 52/24) and Federalism (Ultra Vires). Municipal laws included in total but not plotted.
      </p>
    </div>
  );
};

export default CharterTracker;