import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CaseData, IssueData } from '../types';

interface WaitTimeEstimatorProps {
  cases: CaseData[];
  issues: IssueData[];
}

const ISSUE_AREAS: Record<string, string> = {
  '1': 'Aboriginal Law',
  '2': 'Administrative Law',
  '3': 'Citizenship & Immigration',
  '4': 'Civil Procedure',
  '5': 'Civil Rights / Human Rights',
  '6': 'Commercial Law',
  '7': 'Contracts',
  '8': 'Criminal Law',
  '9': 'Division of Powers',
  '10': 'Equity & Trusts',
  '11': 'Family Law',
  '12': 'Intellectual Property',
  '13': 'International Law',
  '14': 'Labour Law',
  '15': 'Privacy & Access to Info',
  '16': 'Property Law',
  '17': 'Regulatory Law',
  '18': 'Tax Law',
  '19': 'Tort Law',
  '20': 'Wills & Estates',
  '21': 'Miscellaneous'
};

const WaitTimeEstimator: React.FC<WaitTimeEstimatorProps> = ({ cases, issues }) => {
  const [selectedArea, setSelectedArea] = useState<string>('All');

  const stats = useMemo(() => {
    // 1. Build Map of CaseID -> IssueArea
    const caseAreas = new Map<string, Set<string>>();
    issues.forEach(i => {
        if (!i.primaryCaseID || !i.issueAreaCan) return;
        const cid = i.primaryCaseID;
        const area = String(i.issueAreaCan).trim();
        if (!caseAreas.has(cid)) {
            caseAreas.set(cid, new Set());
        }
        caseAreas.get(cid)!.add(area);
    });

    // 2. Process Cases
    const daysData: number[] = [];
    
    cases.forEach(c => {
        if (selectedArea !== 'All') {
            const areas = caseAreas.get(c.primaryCaseID);
            if (!areas || !areas.has(selectedArea)) return;
        }

        if (!c.dateArgument || !c.dateDecisionGiven) return;
        
        const dArg = new Date(c.dateArgument);
        const dDec = new Date(c.dateDecisionGiven);

        if (isNaN(dArg.getTime()) || isNaN(dDec.getTime())) return;

        const diffTime = dDec.getTime() - dArg.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays >= 0 && diffDays < 1825) {
            daysData.push(Math.floor(diffDays));
        }
    });

    daysData.sort((a, b) => a - b);

    // 3. Calculate Stats
    const total = daysData.length;
    if (total === 0) return { median: 0, average: 0, histogram: [], total: 0 };

    const average = daysData.reduce((a, b) => a + b, 0) / total;
    const median = total % 2 === 0 
        ? (daysData[total/2 - 1] + daysData[total/2]) / 2 
        : daysData[Math.floor(total/2)];

    // 4. Create Histogram Bins
    const binSize = 30; 
    const maxBuckets = 24; 
    
    const histogram = new Array(maxBuckets + 1).fill(0).map((_, i) => ({
        name: i === maxBuckets ? `> ${i}m` : `${i}m`,
        label: i === maxBuckets ? `> ${i} Months` : `${i}-${i+1} Months`,
        count: 0
    }));

    daysData.forEach(d => {
        const binIndex = Math.min(maxBuckets, Math.floor(d / binSize));
        histogram[binIndex].count++;
    });

    return { median, average, histogram, total };

  }, [cases, issues, selectedArea]);

  const medianMonths = (stats.median / 30.44).toFixed(1);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-xs z-50">
          <p className="font-bold text-gray-800">{data.label}</p>
          <p className="text-gray-600">Decisions: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="mb-4">
        <h3 className="text-xl font-serif text-scc-blue mb-1">Wait Time Estimator</h3>
        <p className="text-sm text-gray-500 mb-4">
          Time from Oral Argument to Judgment.
        </p>

        {/* Filter */}
        <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm focus:border-scc-blue focus:ring-1 focus:ring-scc-blue"
        >
            <option value="All">All Legal Areas</option>
            {Object.entries(ISSUE_AREAS).sort((a,b) => a[1].localeCompare(b[1])).map(([code, label]) => (
                <option key={code} value={code}>
                    {label}
                </option>
            ))}
        </select>
      </div>

      <div className="flex items-end gap-2 mb-6 border-b border-slate-100 pb-4">
        <div>
            <span className="text-4xl font-bold text-gray-800">{medianMonths}</span>
            <span className="text-sm font-medium text-gray-500 ml-1">Months</span>
        </div>
        <div className="text-xs text-gray-400 mb-1 ml-auto">
            Median Wait Time
        </div>
      </div>

      <div className="flex-grow min-h-[250px] w-full relative">
        {stats.total > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.histogram} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }} 
                    interval={2} 
                    padding={{ left: 10, right: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="count" fill="#64748b" radius={[2, 2, 0, 0]} activeBar={{ fill: '#003366' }} />
                </BarChart>
            </ResponsiveContainer>
            <div className="absolute bottom-0 right-0 text-[10px] text-gray-400 bg-white/80 px-1">
                Histogram (Months)
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            No date data available for this selection.
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-2 text-xs text-gray-400 flex justify-between">
         <span>Avg: {(stats.average / 30.44).toFixed(1)} months</span>
         <span>n={stats.total}</span>
      </div>
    </div>
  );
};

export default WaitTimeEstimator;