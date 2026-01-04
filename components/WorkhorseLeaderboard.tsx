import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CaseData, JusticeData } from '../types';

interface WorkhorseLeaderboardProps {
  cases: CaseData[];
  justices: JusticeData[];
}

const WorkhorseLeaderboard: React.FC<WorkhorseLeaderboardProps> = ({ cases, justices }) => {
  const data = useMemo(() => {
    const counts = new Map<string, { majority: number; dissent: number }>();

    const increment = (id: string, type: 'majority' | 'dissent') => {
      const cleanId = String(id).trim();
      if (!cleanId || cleanId === '0' || cleanId === 'N/A') return;
      
      if (!counts.has(cleanId)) {
        counts.set(cleanId, { majority: 0, dissent: 0 });
      }
      counts.get(cleanId)![type]++;
    };

    cases.forEach(c => {
      increment(c.majorityWriter, 'majority');
      increment(c.dissentWriter, 'dissent');
    });

    const result = Array.from(counts.entries()).map(([id, stats]) => {
      const justice = justices.find(j => j.justiceID === id);
      let name = justice ? justice.justiceName : `Justice ${id}`;
      if (name.includes(' ')) {
          const parts = name.split(' ');
          if (parts.length > 1) {
              name = `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
          }
      }
      return {
        name,
        fullName: justice ? justice.justiceName : `Justice ${id}`,
        ...stats,
        total: stats.majority + stats.dissent
      };
    });

    return result.sort((a, b) => b.majority - a.majority).slice(0, 10);
  }, [cases, justices]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded text-sm z-50">
          <p className="font-bold text-gray-800 mb-2">{data.fullName}</p>
          <div className="space-y-1">
            <p className="text-scc-blue font-semibold">
              Majority: {data.majority}
            </p>
            <p className="text-orange-600 font-semibold">
              Dissent: {data.dissent}
            </p>
            <div className="border-t pt-1 mt-1 text-gray-500 text-xs">
                Total Authored: {data.total}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="mb-4">
        <h3 className="text-xl font-serif text-scc-blue mb-1">Workhorse Leaderboard</h3>
        <p className="text-sm text-gray-500">
          Top 10 justices by number of majority reasons authored.
        </p>
      </div>

      <div className="flex-grow min-h-[400px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={120} 
                tick={{ fontSize: 10, fill: '#475569' }} 
                interval={0}
              />
              <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              
              <Bar 
                dataKey="majority" 
                name="Majority Opinions" 
                fill="#003366" 
                radius={[0, 4, 4, 0]} 
                barSize={12}
              />
              <Bar 
                dataKey="dissent" 
                name="Dissenting Opinions" 
                fill="#ea580c" 
                radius={[0, 4, 4, 0]} 
                barSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            No data available for this range.
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-400 italic">
        *Counts principal authorship. Co-authored opinions credited to the senior author per dataset convention.
      </p>
    </div>
  );
};

export default WorkhorseLeaderboard;