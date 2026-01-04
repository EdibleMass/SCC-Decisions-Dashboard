import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { CaseData, AppellantData, RespondentData } from '../types';

interface DavidVsGoliathProps {
  cases: CaseData[];
  appellants: AppellantData[];
  respondents: RespondentData[];
}

// Categories matching Dataset Manual Variable 11 + Virtual Categories (7, 8)
const CATEGORIES: Record<string, string> = {
  '1': 'Federal Government',
  '2': 'Provincial Government',
  '3': 'Municipal Government',
  '4': 'Individual',
  '5': 'Corporation / Org',
  '6': 'Foreign Nation',
  '7': 'Union (Derived)',       // Virtual Category
  '8': 'First Nation (Derived)'  // Virtual Category
};

// Helper to determine the effective category based on Category AND Type
const getEffectiveCategory = (cat: string, type: string): string => {
  const cleanType = type.replace(/\D/g, ''); // Remove non-digits just in case
  
  // Detect First Nations (Appendix B: 201201-201218, or US Code 170)
  if (cleanType.startsWith('2012') || cleanType === '170') {
    return '8';
  }

  // Detect Unions (Appendix B: 200503-200505)
  if (['200503', '200504', '200505'].includes(cleanType)) {
    return '7';
  }

  // Detect Foreign Nation (Variable 11 code 6)
  if (cat === '6') return '6';

  // Default mappings from Variable 11
  // 1=Fed, 2=Prov, 3=Muni, 4=Indiv, 5=Corp
  if (['1', '2', '3', '4', '5'].includes(cat)) {
    return cat;
  }

  return '0'; // Unknown/Other
};

const DavidVsGoliath: React.FC<DavidVsGoliathProps> = ({ cases, appellants, respondents }) => {
  // Defaults: Individual vs Federal Government
  const [appellantFilter, setAppellantFilter] = useState<string>('4'); 
  const [respondentFilter, setRespondentFilter] = useState<string>('1');

  const stats = useMemo(() => {
    // 1. Map CaseID to Appellant Category derived from Type+Category
    const appMap = new Map<string, string>();
    appellants.forEach(a => {
      // Prioritize assigning a category if we haven't yet, or if the current one is '0'
      if (!appMap.has(a.primaryCaseID) || appMap.get(a.primaryCaseID) === '0') {
        const derived = getEffectiveCategory(a.appellantCategory?.trim(), a.appellantType?.trim());
        if (derived !== '0') appMap.set(a.primaryCaseID, derived);
      }
    });

    // 2. Map CaseID to Respondent Category derived from Type+Category
    const respMap = new Map<string, string>();
    respondents.forEach(r => {
      if (!respMap.has(r.primaryCaseID) || respMap.get(r.primaryCaseID) === '0') {
        const derived = getEffectiveCategory(r.respondentCategory?.trim(), r.respondentType?.trim());
        if (derived !== '0') respMap.set(r.primaryCaseID, derived);
      }
    });

    let appWins = 0; // PartyWinning = 2
    let respWins = 0; // PartyWinning = 1
    let total = 0;

    cases.forEach(c => {
      const aCat = appMap.get(c.primaryCaseID);
      const rCat = respMap.get(c.primaryCaseID);

      if (aCat === appellantFilter && rCat === respondentFilter) {
        const result = c.partyWinning ? c.partyWinning.trim() : '';
        // Variable 65: 1=Respondent Wins, 2=Appellant Wins
        if (result === '2') {
          appWins++;
          total++;
        } else if (result === '1') {
          respWins++;
          total++;
        }
        // Exclude other results (N/A, unclear)
      }
    });

    const appWinRate = total > 0 ? (appWins / total) * 100 : 0;
    
    return {
      appWins,
      respWins,
      total,
      appWinRate
    };
  }, [cases, appellants, respondents, appellantFilter, respondentFilter]);

  const chartData = [
    { name: 'Appellant Wins', value: stats.appWins, color: '#C5A900' }, // Gold
    { name: 'Respondent Wins', value: stats.respWins, color: '#003366' }, // Blue
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-xl font-serif text-scc-blue mb-1">David vs. Goliath Calculator</h3>
        <p className="text-sm text-gray-500">
          Compare win rates between specific parties.
        </p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Appellant (Attacker)</label>
          <select
            value={appellantFilter}
            onChange={(e) => setAppellantFilter(e.target.value)}
            className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-scc-gold focus:border-scc-gold"
          >
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <option key={`app-${key}`} value={key}>{label}</option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-col justify-center items-center">
            <span className="text-xs font-bold text-gray-300 uppercase mb-1">VS</span>
             <div className="h-px w-full bg-slate-200"></div>
        </div>

        <div className="col-span-2 md:col-span-1 md:col-start-2 -mt-4 md:mt-0">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Respondent (Defender)</label>
          <select
            value={respondentFilter}
            onChange={(e) => setRespondentFilter(e.target.value)}
            className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-scc-blue focus:border-scc-blue"
          >
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <option key={`resp-${key}`} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="flex-grow flex flex-col">
        {stats.total > 0 ? (
          <>
            <div className="flex items-baseline justify-between mb-2">
                <div>
                   <span className="text-4xl font-bold text-scc-gold">{stats.appWinRate.toFixed(1)}%</span>
                   <span className="text-xs font-bold text-gray-400 uppercase ml-2">Success Rate</span>
                </div>
                <div className="text-right">
                   <span className="text-xs text-gray-400">Sample Size</span>
                   <div className="font-mono font-bold text-gray-700">{stats.total} Cases</div>
                </div>
            </div>

            <div className="flex-grow min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{top:0, left:0, right:30, bottom:0}} barSize={30}>
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" width={110} tick={{fontSize: 11}} />
                   <Tooltip 
                     cursor={{fill: 'transparent'}}
                     contentStyle={{fontSize: '12px', borderRadius: '4px'}}
                   />
                   <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                   </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
           <div className="flex-grow flex items-center justify-center text-gray-400 text-sm bg-slate-50 rounded border border-dashed border-slate-200">
             No cases found for this specific matchup in the selected era.
           </div>
        )}
      </div>
    </div>
  );
};

export default DavidVsGoliath;