import React, { useState, useEffect, useRef } from 'react';
import { CaseData, IssueData } from '../types';
import { ISSUE_AREAS } from '../utils/constants';

interface SearchBarProps {
  cases: CaseData[];
  issues: IssueData[];
  onSelectCase: (caseId: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ cases, issues, onSelectCase }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CaseData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Map Case ID to Issue Area for the Badge
  const issueMap = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    // Build map once
    issues.forEach(i => {
      if (i.primaryCaseID && i.issueAreaCan) {
        issueMap.current.set(i.primaryCaseID, ISSUE_AREAS[i.issueAreaCan.trim()] || 'General');
      }
    });
  }, [issues]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const matches = cases.filter(c => 
      (c.caseName && c.caseName.toLowerCase().includes(lowerQuery)) ||
      (c.neutralCitation && c.neutralCitation.toLowerCase().includes(lowerQuery)) ||
      (c.scrCitation && c.scrCitation.toLowerCase().includes(lowerQuery))
    ).slice(0, 8); // Limit to 8 results

    setResults(matches);
    setIsOpen(true);
  }, [query, cases]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto z-50">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 group-focus-within:text-scc-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          className="block w-full pl-10 pr-12 py-2.5 text-slate-900 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:border-scc-blue focus:ring-4 focus:ring-scc-blue/20 sm:text-sm shadow-xl transition-shadow"
          placeholder="Search cases (e.g., 'Oakes', '1986 SCC 7')..."
          value={query}
          onChange={(e) => {
             setQuery(e.target.value);
             setIsOpen(true);
          }}
          onFocus={() => {
              if (query.length >= 2) setIsOpen(true);
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-gray-400 text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50">
            ⌘K
          </span>
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white shadow-2xl max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm text-slate-800">
          {results.map((c) => {
            const area = issueMap.current.get(c.primaryCaseID) || 'General';
            return (
              <li
                key={c.primaryCaseID}
                className="cursor-pointer select-none relative py-3 pl-3 pr-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 group transition-colors"
                onClick={() => {
                  onSelectCase(c.primaryCaseID);
                  setIsOpen(false);
                  setQuery('');
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-serif font-semibold text-scc-blue group-hover:text-blue-700">
                      {c.caseName}
                    </span>
                    <span className="text-xs text-gray-500 font-mono mt-0.5">
                      {c.neutralCitation || c.scrCitation || c.dateDecisionGiven}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                    ${area === 'Criminal Law' ? 'bg-red-50 text-red-700' : 
                      area.includes('Constitutional') ? 'bg-purple-50 text-purple-700' : 
                      'bg-blue-50 text-blue-700'}`}>
                    {area}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;