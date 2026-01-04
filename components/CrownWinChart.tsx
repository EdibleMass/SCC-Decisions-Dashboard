import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CaseData, AppellantData, IssueData } from '../types';

interface CrownWinChartProps {
  cases: CaseData[];
  appellants: AppellantData[];
  issues: IssueData[];
}

const CrownWinChart: React.FC<CrownWinChartProps> = ({ cases, appellants, issues }) => {
  const stats = useMemo(() => {
    const criminalCaseIDs = new Set<string>();
    issues.forEach(issue => {
      const area = String(issue.issueAreaCan || '').trim();
      if (area === '8') {
        criminalCaseIDs.add(issue.primaryCaseID);
      }
    });

    const crownAppealCaseIDs = new Set<string>();
    appellants.forEach(app => {
      const type = String(app.appellantType || '').trim();
      if (type === '2' || type === '140101') {
        crownAppealCaseIDs.add(app.primaryCaseID);
      }
    });

    let wins = 0;
    let losses = 0;
    let other = 0;
    let total = 0;

    cases.forEach(c => {
      if (criminalCaseIDs.has(c.primaryCaseID) && crownAppealCaseIDs.has(c.primaryCaseID)) {
        const result = String(c.partyWinning || '').trim();
        if (result === '2') {
          wins++;
        } else if (result === '1') {
          losses++;
        } else {
          other++;
        }
        total++;
      }
    });

    return {
      wins,
      losses,
      other,
      total,
      data: [
        { name: 'Crown Wins (Appeal Allowed)', value: wins, color: '#C5A900' },
        { name: 'Crown Loses (Appeal Dismissed)', value: losses, color: '#003366' },
      ]
    };
  }, [cases, appellants, issues]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = stats.total > 0 ? ((data.value / (stats.wins + stats.losses)) * 100).toFixed(1) : '0.0';
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded text-sm z-50">
          <p className="font-bold text-gray-800">{data.name}</p>
          <p className="text-gray-600">Decisions: {data.value}</p>
          <p className="text-gray-600">Share: {pct}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="mb-4">
        <h3 className="text-xl font-serif text-scc-blue mb-1">Crown Success Ratio</h3>
        <p className="text-sm text-gray-500">
          Criminal appeals by the Crown (Federal/HMQ).
        </p>
      </div>

      <div className="flex-grow min-h-[200px] relative">
        {stats.wins + stats.losses > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {stats.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                <tspan x="50%" dy="-0.5em" fontSize="24" fontWeight="bold" fill="#334155">
                    {`${((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(0)}%`}
                </tspan>
                <tspan x="50%" dy="1.5em" fontSize="10" fill="#64748b" fontWeight="500">
                    SUCCESS RATE
                </tspan>
              </text>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm space-y-2">
            <p>No Crown criminal appeals found in this period.</p>
            {stats.total > 0 && stats.other > 0 && (
                <p className="text-xs text-yellow-600">
                    (Note: {stats.other} cases found but excluded due to mixed/unclear outcome)
                </p>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-gray-400 flex justify-between">
         <span>Based on {stats.total} Appeals</span>
         <span>{stats.other} mixed/unclear results excluded</span>
      </div>
    </div>
  );
};

export default CrownWinChart;