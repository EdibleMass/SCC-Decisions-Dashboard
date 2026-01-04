import React, { useMemo, useState } from 'react';
import { CaseData, IssueData, AppellantData } from '../types';
import { ISSUE_AREAS } from '../utils/constants';
import SearchBar from './SearchBar';
import CaseTimeline from './CaseTimeline';

interface CaseComparisonProps {
  case1: CaseData;
  allCases: CaseData[];
  issues: IssueData[];
  appellants: AppellantData[];
  onClose: () => void;
}

const CaseComparison: React.FC<CaseComparisonProps> = ({ case1, allCases, issues, appellants, onClose }) => {
  const [case2Id, setCase2Id] = useState<string | null>(null);

  const case2 = useMemo(() => {
    return allCases.find(c => c.primaryCaseID === case2Id) || null;
  }, [case2Id, allCases]);

  // Helper to get Data
  const getCaseDetails = (c: CaseData | null) => {
    if (!c) return null;

    // Subject
    const issue = issues.find(i => i.primaryCaseID === c.primaryCaseID);
    const subject = issue && issue.issueAreaCan ? ISSUE_AREAS[issue.issueAreaCan.trim()] : 'Unknown';

    // Wait Time
    let waitTime = 'N/A';
    if (c.dateArgument && c.dateDecisionGiven) {
        const d1 = new Date(c.dateArgument);
        const d2 = new Date(c.dateDecisionGiven);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            const days = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
            waitTime = `${days} Days`;
        }
    }

    // Outcome / Result (Standardized based on Disposition)
    // 1 = Appeal Dismissed, 2 = Appeal Allowed
    const disp = c.caseDispositionCan ? c.caseDispositionCan.trim() : '';
    let resultText = 'Reserved / Other';
    let resultColor = 'text-slate-500';

    if (disp === '2') {
        resultText = 'Appeal Allowed';
        resultColor = 'text-green-700'; // Consistent with CaseDetail green pill
    } else if (disp === '1') {
        resultText = 'Appeal Dismissed';
        resultColor = 'text-red-700'; // Consistent with CaseDetail red pill
    }

    return {
        subject,
        waitTime,
        panel: `${c.panelSize} Judges`,
        result: resultText,
        resultColor: resultColor,
        citation: c.neutralCitation || c.scrCitation || c.dateDecisionGiven
    };
  };

  const d1 = getCaseDetails(case1);
  const d2 = getCaseDetails(case2);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
       <div className="bg-white w-full max-w-6xl md:w-11/12 max-h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
          
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between flex-shrink-0">
             <div className="flex items-center gap-3">
                <div className="bg-scc-blue text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
                    Comparator Mode
                </div>
                <h2 className="text-lg font-serif font-bold text-slate-800">Tale of the Tape</h2>
             </div>
             <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2"
             >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>

          <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
             
             {/* Left Side: Case 1 */}
             <div className="flex-1 overflow-y-auto p-6 border-r border-slate-200 bg-white">
                <div className="mb-6">
                    <span className="text-xs font-bold text-gray-400 uppercase">Challenger 1</span>
                    <h3 className="text-2xl font-serif font-bold text-scc-blue mt-1 leading-tight">{case1.caseName}</h3>
                    <p className="text-sm text-gray-500 font-mono mt-2">{d1?.citation}</p>
                </div>
                <CaseTimeline dateArgument={case1.dateArgument} dateDecision={case1.dateDecisionGiven} />
             </div>

             {/* Center Stats (Desktop) or Interstitial */}
             <div className="hidden md:flex w-px bg-slate-200 relative z-10">
                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-full p-2 shadow-sm font-bold text-gray-400 text-xs">
                    VS
                 </div>
             </div>

             {/* Right Side: Case 2 */}
             <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {!case2 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xl font-bold border-2 border-white shadow-sm">?</div>
                        <h3 className="text-xl font-serif text-slate-600">Select Opponent</h3>
                        <div className="w-full max-w-sm relative">
                             {/* Reusing SearchBar but we need to prevent it from navigating globally. 
                                 Since SearchBar uses onSelectCase callback, we can trap it. */}
                             <SearchBar 
                                cases={allCases} 
                                issues={issues}
                                onSelectCase={(id) => setCase2Id(id)}
                             />
                        </div>
                    </div>
                ) : (
                    <div>
                         <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase">Challenger 2</span>
                                <h3 className="text-2xl font-serif font-bold text-slate-800 mt-1 leading-tight">{case2.caseName}</h3>
                                <p className="text-sm text-gray-500 font-mono mt-2">{d2?.citation}</p>
                            </div>
                            <button 
                                onClick={() => setCase2Id(null)} 
                                className="text-xs text-red-500 hover:text-red-700 font-medium underline"
                            >
                                Change
                            </button>
                         </div>
                         <CaseTimeline dateArgument={case2.dateArgument} dateDecision={case2.dateDecisionGiven} />
                    </div>
                )}
             </div>
          </div>

          {/* Tale of the Tape Table */}
          {case2 && d1 && d2 && (
            <div className="bg-white border-t border-slate-200 p-0 flex-shrink-0">
                <div className="grid grid-cols-3 divide-x divide-slate-100 text-sm">
                    {/* Row 1: Wait Time */}
                    <div className="p-4 text-center">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Wait Time</div>
                        <div className="font-mono text-slate-800 font-semibold">{d1.waitTime}</div>
                    </div>
                    <div className="p-4 flex items-center justify-center bg-slate-50">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Metric</span>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Wait Time</div>
                        <div className="font-mono text-slate-800 font-semibold">{d2.waitTime}</div>
                    </div>

                     {/* Row 2: Panel Size */}
                    <div className="p-4 text-center border-t border-slate-100">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Panel</div>
                        <div className="font-serif text-slate-800 font-semibold">{d1.panel}</div>
                    </div>
                    <div className="p-4 flex items-center justify-center bg-slate-50 border-t border-slate-100">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Judges</span>
                    </div>
                    <div className="p-4 text-center border-t border-slate-100">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Panel</div>
                        <div className="font-serif text-slate-800 font-semibold">{d2.panel}</div>
                    </div>

                     {/* Row 3: Subject */}
                    <div className="p-4 text-center border-t border-slate-100">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Subject</div>
                        <div className="text-slate-800 font-medium">{d1.subject}</div>
                    </div>
                    <div className="p-4 flex items-center justify-center bg-slate-50 border-t border-slate-100">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Area</span>
                    </div>
                    <div className="p-4 text-center border-t border-slate-100">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Subject</div>
                        <div className="text-slate-800 font-medium">{d2.subject}</div>
                    </div>

                    {/* Row 4: Result */}
                    <div className="p-4 text-center border-t border-slate-100">
                         <div className="text-xs font-bold text-gray-400 uppercase mb-1">Outcome</div>
                         <div className={`font-bold ${d1.resultColor}`}>{d1.result}</div>
                    </div>
                    <div className="p-4 flex items-center justify-center bg-slate-50 border-t border-slate-100">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Result</span>
                    </div>
                    <div className="p-4 text-center border-t border-slate-100">
                         <div className="text-xs font-bold text-gray-400 uppercase mb-1">Outcome</div>
                         <div className={`font-bold ${d2.resultColor}`}>{d2.result}</div>
                    </div>
                </div>
            </div>
          )}
       </div>
    </div>
  );
};

export default CaseComparison;