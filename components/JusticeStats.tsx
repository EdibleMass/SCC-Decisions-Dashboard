import React, { useMemo } from 'react';
import { ResponsiveContainer, Cell, PieChart, Pie, Tooltip as RechartsTooltip } from 'recharts';
import { VoteData, VoteResult, IssueData, CaseData } from '../types';
import { ISSUE_AREAS } from '../utils/constants';

interface JusticeStatsProps {
  justiceName: string;
  votes: VoteData[];
  issues: IssueData[];
  cases: CaseData[];
}

const COLORS = {
  majority: '#003366', // SCC Blue
  dissent: '#ef4444',  // Red
  concurrence: '#C5A900', // Gold
  silent: '#94a3b8',   // Slate-400
};

const JusticeStats: React.FC<JusticeStatsProps> = ({ justiceName, votes, issues, cases }) => {
  
  // 1. Basic Vote Record
  const totalVotes = votes.length;
  const majorityVotes = votes.filter(v => v.justiceWithMajorityResult === VoteResult.Majority).length;
  
  // 2. Ideological Compass (2D)
  const ideologyStats = useMemo(() => {
    // Map Case to Issue Area
    const caseIssueMap = new Map<string, string>();
    issues.forEach(i => {
        if(i.primaryCaseID && i.issueAreaCan) {
            caseIssueMap.set(i.primaryCaseID, i.issueAreaCan.trim());
        }
    });

    let civilTotal = 0;
    let civilScore = 0; // Sum of (-1 for Pro-Accused, +1 for Pro-State)
    
    let econTotal = 0;
    let econScore = 0; // Sum of (-1 for Pro-Indiv, +1 for Pro-Business)

    votes.forEach(v => {
        const area = caseIssueMap.get(v.primaryCaseID);
        const direction = v.individualVoteDirection; // 1=Cons, 2=Lib

        // Y-Axis: Civil Liberties & Criminal (Pro-State vs Pro-Accused)
        // 1=Conservative (Pro-State), 2=Liberal (Pro-Accused)
        // Criminal(8), Civil Rights(5), Immigration(3)
        if (['8', '5', '3'].includes(area || '')) {
            if (direction === '1') { civilScore += 1; civilTotal++; }
            if (direction === '2') { civilScore -= 1; civilTotal++; }
        }

        // X-Axis: Economic (Pro-Business vs Pro-Individual)
        // 1=Conservative (Pro-Business), 2=Liberal (Pro-Individual)
        // Commercial(6), Contracts(7), IP(12), Labour(14), Property(16), Tax(18), Torts(19)
        if (['6', '7', '12', '14', '16', '18', '19'].includes(area || '')) {
            if (direction === '1') { econScore += 1; econTotal++; }
            if (direction === '2') { econScore -= 1; econTotal++; }
        }
    });

    const yVal = civilTotal > 0 ? civilScore / civilTotal : 0; // -1 to 1
    const xVal = econTotal > 0 ? econScore / econTotal : 0;   // -1 to 1

    return { x: xVal, y: yVal, hasData: civilTotal > 0 || econTotal > 0 };
  }, [votes, issues]);

  // 3. Swing Vote Rating
  const swingStats = useMemo(() => {
    // Create Map of CaseID -> Unanimous Status
    const caseMap = new Map<string, boolean>(); 
    cases.forEach(c => {
        caseMap.set(c.primaryCaseID, c.decisionUnanimous === '1');
    });

    let splitCases = 0;
    let majorityInSplit = 0;

    votes.forEach(v => {
        const isUnanimous = caseMap.get(v.primaryCaseID);
        if (isUnanimous === false) {
            splitCases++;
            if (v.justiceWithMajorityResult === VoteResult.Majority) {
                majorityInSplit++;
            }
        }
    });

    return {
        rating: splitCases > 0 ? (majorityInSplit / splitCases) * 100 : 0,
        totalSplit: splitCases
    };
  }, [votes, cases]);

  // 4. Writing Profile
  const writingStats = useMemo(() => {
    let majorityAuthor = 0;
    let dissentAuthor = 0;
    let concurrenceAuthor = 0;
    let silent = 0;

    votes.forEach(v => {
        const wrote = v.justiceDecisionWriting === '2' || v.justiceDecisionWriting === '3';
        const type = v.individualVoteType;

        if (wrote) {
            if (type === '1') majorityAuthor++;
            else if (type === '2') dissentAuthor++;
            else if (type === '3' || type === '4') concurrenceAuthor++;
            else majorityAuthor++;
        } else {
            silent++;
        }
    });

    const data = [
        { name: 'Maj. Author', value: majorityAuthor, color: COLORS.majority },
        { name: 'Diss. Author', value: dissentAuthor, color: COLORS.dissent },
        { name: 'Conc. Author', value: concurrenceAuthor, color: COLORS.concurrence },
        { name: 'Silent/Joined', value: silent, color: COLORS.silent },
    ].filter(d => d.value > 0);

    return { data, total: votes.length };
  }, [votes]);

  // 5. Top Issue Areas
  const topIssues = useMemo(() => {
    if (votes.length === 0 || issues.length === 0) return [];
    const caseToArea = new Map<string, string>();
    issues.forEach(i => {
      if (i.primaryCaseID && i.issueAreaCan) {
        caseToArea.set(i.primaryCaseID, i.issueAreaCan.trim());
      }
    });
    const counts = new Map<string, number>();
    votes.forEach(v => {
      const code = caseToArea.get(v.primaryCaseID);
      if (code) counts.set(code, (counts.get(code) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code, count]) => ({
        name: ISSUE_AREAS[code] || `Area ${code}`,
        count
      }));
  }, [votes, issues]);

  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-100 p-4">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xl font-serif text-scc-blue font-bold">{justiceName}</h3>
            <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm">
                Scouting Report
            </span>
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
              <span>Decisions: <strong>{totalVotes}</strong></span>
              <span>Split Cases: <strong>{swingStats.totalSplit}</strong></span>
          </div>
      </div>
      
      <div className="p-5 flex-grow space-y-6">
        
        {/* Metric 1: Ideological Compass (2D) */}
        <div className="relative flex flex-col items-center">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 w-full text-left">Ideological Compass</h4>
            
            <div className="relative w-full aspect-square max-w-[200px] border border-slate-200 bg-slate-50 rounded-full shadow-inner overflow-hidden">
                {/* Axis Lines */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-300 transform -translate-x-1/2"></div>
                <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-300 transform -translate-y-1/2"></div>

                {/* Labels */}
                <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-[8px] font-bold text-slate-500 uppercase">Pro-State</span>
                <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-[8px] font-bold text-slate-500 uppercase">Pro-Accused</span>
                <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-[8px] font-bold text-slate-500 uppercase -rotate-90">Pro-Indiv</span>
                <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-[8px] font-bold text-slate-500 uppercase rotate-90">Pro-Biz</span>

                {/* Plot Point */}
                {ideologyStats.hasData ? (
                    <div 
                        className="absolute w-4 h-4 bg-scc-blue border-2 border-white rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out z-10"
                        style={{
                            left: `${((ideologyStats.x + 1) / 2) * 100}%`,
                            top: `${((1 - ideologyStats.y) / 2) * 100}%` // Invert Y because CSS top is 0
                        }}
                        title={`Economic: ${ideologyStats.x.toFixed(2)}, Civil: ${ideologyStats.y.toFixed(2)}`}
                    ></div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] text-gray-400">
                        Insufficient Data
                    </div>
                )}
            </div>
            <p className="text-[9px] text-gray-400 mt-2 text-center w-3/4 leading-tight">
                Vertical: Criminal/Civil Rights. Horizontal: Economic/Tax/Labour. Center is neutral.
            </p>
        </div>

        {/* Metric 2: Swing Vote & Participation */}
        <div className="grid grid-cols-2 gap-4">
            {/* Swing Vote */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center relative overflow-hidden">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Swing Vote</p>
                <div className="text-2xl font-bold text-slate-800 font-mono">
                    {swingStats.rating.toFixed(1)}%
                </div>
                <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                    Majority rate in split decisions
                </p>
                <div className="absolute bottom-0 left-0 h-1 bg-scc-gold transition-all duration-500" style={{ width: `${swingStats.rating}%` }}></div>
            </div>

            {/* Participation */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Majority Total</p>
                <div className="text-2xl font-bold text-scc-blue font-mono">
                    {totalVotes > 0 ? ((majorityVotes / totalVotes) * 100).toFixed(1) : 0}%
                </div>
                <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                    Overall alignment rate
                </p>
            </div>
        </div>

        {/* Metric 3: Writing Habits */}
        <div className="flex items-center gap-4">
            <div className="w-20 h-20 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={writingStats.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            dataKey="value"
                            strokeWidth={1}
                        >
                            {writingStats.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <RechartsTooltip 
                            contentStyle={{ fontSize: '10px', borderRadius: '4px', padding: '4px' }} 
                            itemStyle={{ padding: 0 }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex-grow">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Writing Profile</h4>
                <div className="space-y-1">
                    {writingStats.data.map(item => (
                        <div key={item.name} className="flex items-center text-[10px]">
                            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                            <span className="text-gray-600 w-20 truncate">{item.name}</span>
                            <span className="font-mono text-gray-800">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Metric 4: Top Issues */}
        <div className="pt-2 border-t border-slate-100">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                Frequent Subject Areas
            </h4>
            {topIssues.length > 0 ? (
                <div className="space-y-2">
                    {topIssues.map((issue, idx) => (
                        <div key={issue.name} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="flex-shrink-0 w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-bold">
                                    {idx + 1}
                                </span>
                                <span className="text-slate-700 truncate" title={issue.name}>
                                    {issue.name}
                                </span>
                            </div>
                            <span className="text-slate-400 font-mono text-[10px]">
                                {issue.count}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-gray-400 italic">No subject data available.</p>
            )}
        </div>

      </div>
    </div>
  );
};

export default JusticeStats;