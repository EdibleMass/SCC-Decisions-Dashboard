import React, { useMemo } from 'react';
import { CaseData } from '../types';

interface PrecedentTrackerProps {
  cases: CaseData[];
}

const PrecedentTracker: React.FC<PrecedentTrackerProps> = ({ cases }) => {
  const precedentCases = useMemo(() => {
    return cases
      .filter(c => c.precedentOverrule && c.precedentOverrule.trim() === '1')
      .sort((a, b) => (b.dateDecisionGiven || '').localeCompare(a.dateDecisionGiven || ''));
  }, [cases]);

  const getSccLink = (c: CaseData) => {
    // 1. Direct Link (Modern Cases)
    // Check if Docket ID exists AND is exactly 5 digits (standard SCC format)
    const cleanDocket = c.docketID ? c.docketID.trim() : '';
    if (cleanDocket && /^\d{5}$/.test(cleanDocket)) {
        return `https://decisions.scc-csc.ca/scc-csc/en/d/s/index.do?cont=&ref=${cleanDocket}`;
    }

    // 2. CanLII Search (Historical / Fallback)
    // CanLII is generally more robust for historical text searches (e.g. "1954 1 S.C.R. 45")
    // whereas the official SCC site search can be brittle with older citation formats.
    let query = c.caseName;
    
    if (c.neutralCitation && c.neutralCitation.trim()) {
        // Exact phrase match for neutral citation
        query = `"${c.neutralCitation}"`;
    } else if (c.scrCitation && c.scrCitation.trim()) {
        // Exact phrase match for SCR citation
        query = `"${c.scrCitation}"`;
    } else {
        // Exact phrase match for Case Name
        query = `"${c.caseName}"`;
    }
    
    return `https://www.canlii.org/en/#search/text=${encodeURIComponent(query)}`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col">
       {/* Header */}
       <div className="mb-4">
        <h3 className="text-xl font-serif text-scc-blue mb-1">Precedent Killers</h3>
        <p className="text-sm text-gray-500">
          Landmark cases where the Court formally overruled a past decision.
        </p>
      </div>
      
      {/* Content */}
      <div className="flex-grow overflow-y-auto pr-2">
         {precedentCases.length > 0 ? (
            <div className="space-y-3">
                {precedentCases.map(c => (
                    <a 
                      key={c.primaryCaseID}
                      href={getSccLink(c)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-slate-50 border border-slate-200 rounded hover:border-scc-gold hover:shadow-sm transition-all group decoration-transparent"
                    >
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-scc-blue text-sm mb-1 group-hover:text-yellow-600 transition-colors leading-tight flex items-start gap-2">
                                <span>{c.caseName}</span>
                                <svg className="w-3 h-3 text-gray-400 group-hover:text-scc-gold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </h4>
                            <span className="text-xs text-gray-400 font-mono whitespace-nowrap ml-2 bg-white px-1 rounded border border-slate-100 group-hover:border-slate-200">
                                {c.dateDecisionGiven?.substring(0, 4)}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 mt-2">
                            {c.docketID && (
                                 <span className="bg-slate-100 px-1.5 py-0.5 rounded text-gray-500 font-mono">
                                    #{c.docketID}
                                </span>
                            )}
                            {c.neutralCitation && (
                                <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-gray-600 font-medium">
                                    {c.neutralCitation}
                                </span>
                            )}
                             {c.scrCitation && (
                                <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    {c.scrCitation}
                                </span>
                            )}
                        </div>
                    </a>
                ))}
            </div>
         ) : (
             <div className="h-full flex items-center justify-center text-gray-400 text-sm bg-slate-50 rounded border border-dashed border-slate-200 p-4 text-center">
                <p>No precedent-overruling cases found in this selected era.</p>
             </div>
         )}
      </div>
       <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-gray-400 flex justify-between items-center">
         <span className="font-bold text-scc-gold">{precedentCases.length} Landmark Cases</span>
         <span className="italic bg-slate-100 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-semibold">Study List</span>
      </div>
    </div>
  );
}

export default PrecedentTracker;