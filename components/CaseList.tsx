import React, { useState, useMemo } from 'react';
import { EnrichedCase } from '../utils/analytics';
import { DECISION_TYPES } from '../utils/constants';

interface CaseListProps {
  cases: EnrichedCase[];
  justiceName: string;
}

const CaseList: React.FC<CaseListProps> = ({ cases, justiceName }) => {
  const [limit, setLimit] = useState(20);
  
  // Filter States
  const [filterType, setFilterType] = useState<string>('All');
  const [filterUnanimous, setFilterUnanimous] = useState<string>('All');

  // Helper to decode Decision Type
  const getDecisionLabel = (val: string) => {
    const trimmed = val ? val.trim() : '0';
    return DECISION_TYPES[trimmed] || `Type ${trimmed}`;
  };

  // Helper to decode Unanimity
  const getUnanimityLabel = (val: string) => {
    if (val === '1') return 'Unanimous';
    if (val === '0') return 'Split Decision';
    return val;
  };

  // Derive unique options from the data
  const uniqueTypes = useMemo(() => {
    const types = new Set(cases.map(c => c.decisionType).filter(t => t && t !== 'N/A'));
    return Array.from(types).sort();
  }, [cases]);

  const uniqueUnanimity = useMemo(() => {
    const vals = new Set(cases.map(c => c.unanimity).filter(t => t && t !== 'N/A'));
    return Array.from(vals).sort();
  }, [cases]);

  // Filter Logic
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      if (filterType !== 'All' && c.decisionType !== filterType) return false;
      if (filterUnanimous !== 'All' && c.unanimity !== filterUnanimous) return false;
      return true;
    });
  }, [cases, filterType, filterUnanimous]);

  const displayedCases = filteredCases.slice(0, limit);

  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 mt-6 overflow-hidden">
      <div className="bg-scc-blue px-6 py-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h3 className="text-lg font-serif font-semibold text-white">Case History: {justiceName}</h3>
          <span className="text-xs text-white/70">
              Showing {filteredCases.length} of {cases.length} Total Cases
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Decision Type:</label>
            <select 
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setLimit(20); }}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-scc-blue focus:ring focus:ring-scc-blue focus:ring-opacity-50"
            >
                <option value="All">All Types</option>
                {uniqueTypes.map(t => (
                    <option key={t} value={t}>{getDecisionLabel(t)}</option>
                ))}
            </select>
        </div>

        <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Consensus:</label>
            <select 
                value={filterUnanimous}
                onChange={(e) => { setFilterUnanimous(e.target.value); setLimit(20); }}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-scc-blue focus:ring focus:ring-scc-blue focus:ring-opacity-50"
            >
                <option value="All">All Outcomes</option>
                {uniqueUnanimity.map(u => (
                    <option key={u} value={u}>{getUnanimityLabel(u)}</option>
                ))}
            </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-white border-b border-slate-200 text-xs uppercase text-gray-500 font-semibold">
            <tr>
              <th className="px-6 py-3">Year</th>
              <th className="px-6 py-3">Case Name</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3 text-center">Vote</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedCases.length > 0 ? (
                displayedCases.map((c) => (
                <tr key={`${c.primaryCaseID}-${c.caseName}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap font-medium text-gray-900">{c.year}</td>
                    <td className="px-6 py-3 font-medium text-scc-blue truncate max-w-xs md:max-w-md" title={c.caseName}>
                        {c.caseName}
                        <div className="md:hidden text-xs text-gray-400 mt-1">
                            {getDecisionLabel(c.decisionType)} • {getUnanimityLabel(c.unanimity)}
                        </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">
                        {getDecisionLabel(c.decisionType)}
                        <span className="mx-2 text-gray-300">|</span>
                        {getUnanimityLabel(c.unanimity)}
                    </td>
                    <td className="px-6 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${c.voteType === 'Majority' ? 'bg-green-100 text-green-800' : 
                        c.voteType === 'Dissent' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                        {c.voteType}
                    </span>
                    </td>
                </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                        No cases match the selected filters.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {limit < filteredCases.length && (
        <div className="p-4 text-center border-t border-slate-100">
          <button 
            onClick={() => setLimit(prev => prev + 50)}
            className="text-scc-blue hover:text-scc-gold font-medium text-sm transition-colors"
          >
            Load More Cases
          </button>
        </div>
      )}
    </div>
  );
};

export default CaseList;