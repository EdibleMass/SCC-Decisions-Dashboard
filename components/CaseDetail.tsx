import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CaseData, VoteData, JusticeData, IssueData } from '../types';
import { PROVINCE_MAP, ISSUE_AREAS } from '../utils/constants';
import CaseTimeline from './CaseTimeline';
import CaseExternalContext from './CaseExternalContext';

interface CaseDetailProps {
  caseData: CaseData;
  votes: VoteData[];
  issues: IssueData[];
  justices: JusticeData[];
  onClose: () => void;
  onCompare: () => void; // Trigger for comparison mode
}

const CaseDetail: React.FC<CaseDetailProps> = ({ caseData, votes, issues, justices, onClose, onCompare }) => {
  const [activeTab, setActiveTab] = useState<number>(0);

  // 1. Determine Outcome Pill
  const getOutcome = (disposition: string) => {
    const d = disposition.trim();
    if (d === '2') return { label: 'Appeal Allowed', color: 'bg-green-100 text-green-800 border-green-200' };
    if (d === '1') return { label: 'Appeal Dismissed', color: 'bg-red-100 text-red-800 border-red-200' };
    return { label: 'Reserved / Other', color: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  const outcome = getOutcome(caseData.caseDispositionCan);
  const provinceName = PROVINCE_MAP[caseData.provinceOfOrigin.trim()] || 'Unknown Jurisdiction';

  // 2. Identify Unique Issues
  // Group votes by issueID.
  const issueGroups = useMemo(() => {
    const groups = new Map<string, VoteData[]>();
    
    // Sort votes to ensure consistent order if data is messy
    // We assume votes with same issueID belong together.
    // If issueID is missing (older data?), fallback to grouping by caseID (single group)
    votes.forEach(v => {
        const key = v.issueID || 'default';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(v);
    });

    // Convert to array and try to link with IssueData for names
    return Array.from(groups.entries()).map(([key, groupVotes]) => {
        // Find corresponding issue metadata
        const metadata = issues.find(i => i.issueID === key);
        let label = `Issue ${key}`;
        let subLabel = '';

        if (metadata) {
            if (metadata.caseIssueID) label = `Issue ${metadata.caseIssueID}`;
            if (metadata.issueAreaCan) subLabel = ISSUE_AREAS[metadata.issueAreaCan.trim()] || '';
        } else if (key === 'default') {
            label = "Primary Issue";
        }

        return {
            id: key,
            label,
            subLabel,
            votes: groupVotes
        };
    }).sort((a, b) => a.label.localeCompare(b.label)); // Sort by "Issue 1", "Issue 2"
  }, [votes, issues]);

  // 3. Select Active Votes based on Tab
  const activeIssue = issueGroups[activeTab] || issueGroups[0];
  const activeVotes = activeIssue ? activeIssue.votes : [];

  // 4. Process Votes for Donut (Active Issue Only)
  const voteStats = useMemo(() => {
    const majority = activeVotes.filter(v => v.justiceWithMajorityResult === '1').length;
    const dissent = activeVotes.filter(v => v.justiceWithMajorityResult === '2').length;
    return {
      majority,
      dissent,
      total: majority + dissent,
      data: [
        { name: 'Majority', value: majority, color: '#003366' },
        { name: 'Dissent', value: dissent, color: '#ef4444' }
      ]
    };
  }, [activeVotes]);

  // 5. Process Opinion Tree (Active Issue Only)
  const opinionTree = useMemo(() => {
    const getJusticeName = (id: string) => justices.find(j => j.justiceID === id)?.justiceName || `Justice ${id}`;
    
    // Identify Main Writers from Case Data Headers
    // NOTE: The main headers (majorityWriter/dissentWriter) in CaseData usually refer to the FIRST issue 
    // or the "Main" judgment. For split issues, this might be slightly inaccurate if writers differ per issue.
    // However, we can infer writers from the vote data itself: `justiceDecisionWriting`
    
    // 1=No Opinion, 2=Wrote Opinion Alone, 3=Co-authored
    // Vote Type: 1=Maj, 2=Diss, 3=Conc
    
    // Determine writers purely from vote data for this specific issue to be accurate
    let majorityWriters: string[] = [];
    let dissentWriters: string[] = [];
    let concurrenceWriters: string[] = [];

    activeVotes.forEach(v => {
        const wrote = v.justiceDecisionWriting === '2' || v.justiceDecisionWriting === '3';
        if (wrote) {
            if (v.individualVoteType === '1' || v.individualVoteType === '4') majorityWriters.push(v.justiceID); // 1=Maj, 4=Judgment of Court
            else if (v.individualVoteType === '2') dissentWriters.push(v.justiceID);
            else if (v.individualVoteType === '3') concurrenceWriters.push(v.justiceID); // 3=Reg Conc, also check Special Conc
        }
    });

    // Fallback: If no writers found in votes (data gap), use headers if on Issue 1
    if (majorityWriters.length === 0 && activeTab === 0 && caseData.majorityWriter) majorityWriters.push(caseData.majorityWriter);
    if (dissentWriters.length === 0 && activeTab === 0 && caseData.dissentWriter && caseData.dissentWriter !== '0') dissentWriters.push(caseData.dissentWriter);

    // 2. Initialize Buckets
    const majorityGroup: string[] = [];
    const dissentGroup: string[] = [];
    
    // Map: WriterID -> List of Joiner Names
    const concurrenceJoiners: Record<string, string[]> = {};
    concurrenceWriters.forEach(id => { concurrenceJoiners[id] = []; });

    // 3. Sort Judges into Buckets
    activeVotes.forEach(v => {
      // Skip the writers themselves in the joiner lists (they are headers)
      if (majorityWriters.includes(v.justiceID)) return;
      if (dissentWriters.includes(v.justiceID)) return;
      if (concurrenceWriters.includes(v.justiceID)) return;

      const name = getJusticeName(v.justiceID);
      const signedOnWith = v.justiceSignedOnWith ? v.justiceSignedOnWith.trim() : '';

      // Logic: Use `justiceSignedOnWith` if available to place the judge
      if (signedOnWith && signedOnWith !== '0' && signedOnWith !== 'N/A') {
          if (majorityWriters.includes(signedOnWith)) {
              majorityGroup.push(name);
          } else if (dissentWriters.includes(signedOnWith)) {
              dissentGroup.push(name);
          } else if (concurrenceJoiners[signedOnWith]) {
              concurrenceJoiners[signedOnWith].push(name);
          } else {
              // Fallback
              if (v.justiceWithMajorityResult === '1') majorityGroup.push(name);
              else if (v.justiceWithMajorityResult === '2') dissentGroup.push(name);
          }
      } else {
          // Fallback: If no sign-on data, bucket by Vote Result
          if (v.justiceWithMajorityResult === '1') majorityGroup.push(name);
          else if (v.justiceWithMajorityResult === '2') dissentGroup.push(name);
      }
    });

    // 4. Format Output
    return {
      majorityWriters: majorityWriters.map(getJusticeName),
      dissentWriters: dissentWriters.map(getJusticeName),
      majorityGroup,
      dissentGroup,
      concurrenceGroup: concurrenceWriters.map(writerId => ({
        writer: getJusticeName(writerId),
        joiners: concurrenceJoiners[writerId] || []
      }))
    };
  }, [activeVotes, caseData, justices, activeTab]);

  // Helper to generate external link
  const getExternalLink = (c: CaseData) => {
    const cleanDocket = c.docketID ? c.docketID.trim() : '';
    if (cleanDocket && /^\d{5}$/.test(cleanDocket)) {
        return `https://decisions.scc-csc.ca/scc-csc/en/d/s/index.do?cont=&ref=${cleanDocket}`;
    }

    let query = c.caseName;
    if (c.neutralCitation && c.neutralCitation.trim()) {
        query = `"${c.neutralCitation}"`;
    } else if (c.scrCitation && c.scrCitation.trim()) {
        query = `"${c.scrCitation}"`;
    } else {
        query = `"${c.caseName}"`;
    }
    
    return `https://www.canlii.org/en/#search/text=${encodeURIComponent(query)}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Buttons (Compare + Read Case) Top Right */}
        <div className="absolute top-4 right-16 z-10 flex gap-3">
            <a 
                href={getExternalLink(caseData)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-scc-blue border border-slate-300 hover:border-scc-blue px-4 py-2.5 rounded-lg shadow-sm text-sm font-bold transition-all transform hover:-translate-y-0.5"
                title="Read full judgment on SCC or CanLII"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                <span className="hidden sm:inline">Read Case</span>
            </a>
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

        {/* A. HERO HEADER - Fixed */}
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

        {/* B. ISSUE TABS (IF MULTIPLE) - Fixed */}
        {issueGroups.length > 1 && (
            <div className="px-8 pt-4 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto flex-shrink-0 z-20">
                {issueGroups.map((group, idx) => (
                    <button
                        key={group.id}
                        onClick={() => setActiveTab(idx)}
                        className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors border-t border-x ${
                            activeTab === idx 
                            ? 'bg-white text-scc-blue border-slate-200 border-b-transparent shadow-sm translate-y-px' 
                            : 'bg-transparent text-gray-400 border-transparent hover:text-gray-600'
                        }`}
                    >
                        <span className="uppercase tracking-wider">{group.label}</span>
                        {group.subLabel && <span className="ml-2 font-normal text-xs opacity-75 hidden sm:inline">| {group.subLabel}</span>}
                    </button>
                ))}
            </div>
        )}

        {/* Content Body - Scrollable */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 flex-grow overflow-y-auto min-h-0 bg-white">
            
            {/* C. VOTE RING */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100 h-fit">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">The Decision</h3>
                {issueGroups.length > 1 && (
                    <span className="text-xs font-bold text-scc-blue mb-4 bg-blue-50 px-2 py-1 rounded">
                        {issueGroups[activeTab].label}
                    </span>
                )}
                
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

            {/* D. OPINION TREE */}
            <div className="lg:col-span-2">
                 <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Opinion Tree</h3>
                    {issueGroups[activeTab].subLabel && (
                        <span className="text-xs font-bold text-scc-blue bg-blue-50 px-2 py-1 rounded">
                            {issueGroups[activeTab].subLabel}
                        </span>
                    )}
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-slate-100 h-full">
                    
                    {/* Column 1: Majority */}
                    <div className="px-4 pb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-[#003366]"></div>
                            <span className="text-sm font-bold text-[#003366] uppercase">Majority</span>
                        </div>
                        <div className="mb-4">
                            <span className="text-[10px] text-gray-400 uppercase block mb-1">Written By</span>
                            {opinionTree.majorityWriters.length > 0 ? (
                                opinionTree.majorityWriters.map((writer, i) => (
                                    <div key={i} className="font-serif font-bold text-lg text-slate-800 leading-snug mb-1">
                                        {writer}
                                    </div>
                                ))
                            ) : (
                                <span className="text-sm text-gray-400 italic">Unspecified / Per Curiam</span>
                            )}
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
                                         <div className="mb-2">
                                            <span className="text-[10px] text-yellow-700 uppercase block mb-1">Written By</span>
                                            <div className="font-serif font-semibold text-slate-800 leading-snug">
                                                {conc.writer}
                                            </div>
                                         </div>
                                         
                                         {conc.joiners.length > 0 && (
                                            <div>
                                                <span className="text-[10px] text-yellow-700 uppercase block mb-1">Joined By</span>
                                                <ul className="space-y-1">
                                                    {conc.joiners.map((name, i) => (
                                                        <li key={i} className="text-sm text-slate-600 border-l-2 border-yellow-200 pl-2">
                                                            {name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                         )}
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
                        {opinionTree.dissentWriters.length > 0 || opinionTree.dissentGroup.length > 0 ? (
                            <>
                                {opinionTree.dissentWriters.length > 0 && (
                                    <div className="mb-4">
                                        <span className="text-[10px] text-gray-400 uppercase block mb-1">Written By</span>
                                        {opinionTree.dissentWriters.map((writer, i) => (
                                            <div key={i} className="font-serif font-bold text-lg text-slate-800 leading-snug mb-1">
                                                {writer}
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                                Unanimous on this issue.
                            </div>
                        )}
                    </div>
                 </div>
            </div>

            {/* Optional third-party context. Opt-in: fires no network request
                until the user clicks, so the modal never depends on A2AJ. */}
            <CaseExternalContext caseData={caseData} />
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