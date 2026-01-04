import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CaseData, VoteData, JusticeData } from '../types';
import { PROVINCE_MAP } from '../utils/constants';
import CaseTimeline from './CaseTimeline';

interface CaseDetailProps {
  caseData: CaseData;
  votes: VoteData[];
  justices: JusticeData[];
  onClose: () => void;
  onCompare: () => void; // Trigger for comparison mode
}

const CaseDetail: React.FC<CaseDetailProps> = ({ caseData, votes, justices, onClose, onCompare }) => {
  
  // 1. Determine Outcome Pill
  const getOutcome = (disposition: string) => {
    const d = disposition.trim();
    if (d === '2') return { label: 'Appeal Allowed', color: 'bg-green-100 text-green-800 border-green-200' };
    if (d === '1') return { label: 'Appeal Dismissed', color: 'bg-red-100 text-red-800 border-red-200' };
    return { label: 'Reserved / Other', color: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  const outcome = getOutcome(caseData.caseDispositionCan);
  const provinceName = PROVINCE_MAP[caseData.provinceOfOrigin.trim()] || 'Unknown Jurisdiction';

  // 2. Process Votes for Donut
  const voteStats = useMemo(() => {
    const majority = votes.filter(v => v.justiceWithMajorityResult === '1').length;
    const dissent = votes.filter(v => v.justiceWithMajorityResult === '2').length;
    return {
      majority,
      dissent,
      total: majority + dissent,
      data: [
        { name: 'Majority', value: majority, color: '#003366' },
        { name: 'Dissent', value: dissent, color: '#ef4444' }
      ]
    };
  }, [votes]);

  // 3. Process Opinion Tree
  const opinionTree = useMemo(() => {
    const getJusticeName = (id: string) => justices.find(j => j.justiceID === id)?.justiceName || `Justice ${id}`;
    
    // Identify Writers
    const majorityWriterId = caseData.majorityWriter;
    const dissentWriterId = caseData.dissentWriter;

    // Buckets
    const majorityGroup: string[] = [];
    const dissentGroup: string[] = [];
    const concurrenceGroup: { writer: string; joiners: string[] }[] = [];

    // Helper to find concurrences: Anyone writing who is NOT the main majority or dissent writer
    const otherWriters = new Set<string>();

    votes.forEach(v => {
      // Is this person writing?
      if (v.justiceDecisionWriting === '1') {
        if (v.justiceID !== majorityWriterId && v.justiceID !== dissentWriterId) {
            otherWriters.add(v.justiceID);
        }
      }
    });

    // Populate Joiners
    votes.forEach(v => {
      const name = getJusticeName(v.justiceID);
      
      if (v.justiceWithMajorityResult === '1') {
        // Voted with Majority
        if (v.justiceID === majorityWriterId) return; // Already handled as header
        if (otherWriters.has(v.justiceID)) return; // Handled in Concurrence
        majorityGroup.push(name);
      } else if (v.justiceWithMajorityResult === '2') {
        // Voted with Dissent
        if (v.justiceID === dissentWriterId) return; // Already handled as header
        if (otherWriters.has(v.justiceID)) return; // Handled in Concurrence
        dissentGroup.push(name);
      }
    });

    // Build Concurrence Objects
    otherWriters.forEach(writerId => {
       concurrenceGroup.push({
           writer: getJusticeName(writerId),
           joiners: [] 
       });
    });

    return {
      majorityWriter: getJusticeName(majorityWriterId),
      dissentWriter: dissentWriterId && dissentWriterId !== '0' ? getJusticeName(dissentWriterId) : null,
      majorityGroup,
      dissentGroup,
      concurrenceGroup
    };
  }, [votes, caseData, justices]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-y-auto relative flex flex-col">
        
        {/* Comparison Trigger (Top Right) */}
        <div className="absolute top-4 right-16 z-10">
            <button 
                onClick={onCompare}
                className="flex items-center gap-2 bg-scc-blue hover:bg-blue-900 text-white px-5 py-2.5 rounded-lg shadow-lg text-sm font-bold transition-all transform hover:-translate-y-0.5"
            >
                <span>Compare Case</span>
            </button>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* A. HERO HEADER */}
        <div className="p-8 border-b border-slate-100 flex-shrink-0">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${outcome.color}`}>
                    {outcome.label}
                </span>
                <span className="text-gray-400 font-mono text-sm border-l border-slate-200 pl-3">
                    {caseData.neutralCitation || caseData.scrCitation || caseData.dateDecisionGiven}
                </span>
                <span className="text-gray-500 text-sm font-medium italic flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    On appeal from {provinceName}
                </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 leading-tight mb-6 pr-24">
                {caseData.caseName}
            </h2>

            {/* Timeline */}
            <div className="max-w-2xl bg-slate-50 p-4 rounded-lg border border-slate-100">
                <CaseTimeline dateArgument={caseData.dateArgument} dateDecision={caseData.dateDecisionGiven} />
            </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 overflow-y-auto">
            
            {/* B. VOTE RING */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100 h-fit">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">The Decision</h3>
                <div className="relative w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={voteStats.data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                            >
                                {voteStats.data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-slate-800">
                            {voteStats.majority} - {voteStats.dissent}
                        </span>
                    </div>
                </div>
                <div className="flex gap-6 mt-4 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#003366]"></div>
                        <span>Majority</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                        <span>Dissent</span>
                    </div>
                </div>
            </div>

            {/* C. OPINION TREE */}
            <div className="lg:col-span-2">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Opinion Tree</h3>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-slate-100 h-full">
                    
                    {/* Column 1: Majority */}
                    <div className="px-4 pb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-[#003366]"></div>
                            <span className="text-sm font-bold text-[#003366] uppercase">Majority</span>
                        </div>
                        <div className="mb-4">
                            <span className="text-[10px] text-gray-400 uppercase block mb-1">Written By</span>
                            <div className="font-serif font-bold text-lg text-slate-800 leading-snug">
                                {opinionTree.majorityWriter}
                            </div>
                        </div>
                        {opinionTree.majorityGroup.length > 0 && (
                            <div>
                                <span className="text-[10px] text-gray-400 uppercase block mb-1">Joined By</span>
                                <ul className="space-y-1">
                                    {opinionTree.majorityGroup.map((name, i) => (
                                        <li key={i} className="text-sm text-slate-600 border-l-2 border-slate-200 pl-2">
                                            {name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Column 2: Concurrences */}
                    <div className="px-4 pb-4 mt-6 md:mt-0">
                        <div className="flex items-center gap-2 mb-3">
                             <div className="w-2 h-2 rounded-full bg-scc-gold"></div>
                             <span className="text-sm font-bold text-scc-gold uppercase">Concurrence</span>
                        </div>
                         {opinionTree.concurrenceGroup.length > 0 ? (
                             <div className="space-y-4">
                                 {opinionTree.concurrenceGroup.map((conc, idx) => (
                                     <div key={idx} className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                         <span className="text-[10px] text-yellow-700 uppercase block mb-1">Separate Reasons</span>
                                         <div className="font-serif font-semibold text-slate-800 leading-snug">
                                             {conc.writer}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <div className="text-xs text-gray-400 italic py-4">
                                 No separate concurring reasons filed.
                             </div>
                         )}
                    </div>

                    {/* Column 3: Dissent */}
                    <div className="px-4 pb-4 mt-6 md:mt-0">
                        <div className="flex items-center gap-2 mb-3">
                             <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
                             <span className="text-sm font-bold text-[#ef4444] uppercase">Dissent</span>
                        </div>
                        {opinionTree.dissentWriter ? (
                            <>
                                <div className="mb-4">
                                    <span className="text-[10px] text-gray-400 uppercase block mb-1">Written By</span>
                                    <div className="font-serif font-bold text-lg text-slate-800 leading-snug">
                                        {opinionTree.dissentWriter}
                                    </div>
                                </div>
                                {opinionTree.dissentGroup.length > 0 && (
                                    <div>
                                        <span className="text-[10px] text-gray-400 uppercase block mb-1">Joined By</span>
                                        <ul className="space-y-1">
                                            {opinionTree.dissentGroup.map((name, i) => (
                                                <li key={i} className="text-sm text-slate-600 border-l-2 border-red-100 pl-2">
                                                    {name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-xs text-gray-400 italic py-4">
                                Unanimous decision.
                            </div>
                        )}
                    </div>
                 </div>
            </div>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100 text-xs text-gray-400 flex-shrink-0">
             Case ID: {caseData.primaryCaseID} • Docket: {caseData.docketID || 'N/A'} • {caseData.panelSize} Judge Panel
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;