import React, { useMemo } from 'react';
import { VoteData, VoteResult } from '../types';
import ComparisonChart from './ComparisonChart';

interface ComparisonViewProps {
  justice1Name: string;
  justice2Name: string;
  votes1: VoteData[];
  votes2: VoteData[];
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ justice1Name, justice2Name, votes1, votes2 }) => {
  
  const comparisonStats = useMemo(() => {
    // 0. Deduplicate Helper
    // Flatten multiple vote rows per case (multi-issue) to single unique vote per justice per case
    const dedupe = (list: VoteData[]) => {
      const seen = new Set<string>();
      return list.filter(v => {
        if (seen.has(v.primaryCaseID)) return false;
        seen.add(v.primaryCaseID);
        return true;
      });
    };

    const uniqueVotes1 = dedupe(votes1);
    const uniqueVotes2 = dedupe(votes2);

    // Map votes by caseID for quick lookup
    const v1Map = new Map<string, string>();
    uniqueVotes1.forEach(v => v1Map.set(v.primaryCaseID, v.justiceWithMajorityResult));

    let sharedCases = 0;
    let agreed = 0;
    let disagreed = 0;

    uniqueVotes2.forEach(v2 => {
      const v1Result = v1Map.get(v2.primaryCaseID);
      // We only care if both have a valid majority/dissent vote (1 or 2)
      if (v1Result && (v1Result === VoteResult.Majority || v1Result === VoteResult.Dissent) &&
          (v2.justiceWithMajorityResult === VoteResult.Majority || v2.justiceWithMajorityResult === VoteResult.Dissent)) {
        
        sharedCases++;
        if (v1Result === v2.justiceWithMajorityResult) {
          agreed++;
        } else {
          disagreed++;
        }
      }
    });

    return { sharedCases, agreed, disagreed };
  }, [votes1, votes2]);

  const agreementRate = comparisonStats.sharedCases > 0 
    ? ((comparisonStats.agreed / comparisonStats.sharedCases) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 mt-6">
      <h3 className="text-xl font-serif text-scc-blue mb-4 border-b pb-2">
        Comparison: <span className="font-semibold">{justice1Name}</span> vs <span className="font-semibold">{justice2Name}</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="col-span-1 text-center space-y-4">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-sm text-indigo-800 font-semibold uppercase">Shared Cases</p>
            <p className="text-4xl font-bold text-indigo-900">{comparisonStats.sharedCases}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800 font-semibold uppercase">Agreement Rate</p>
            <p className="text-4xl font-bold text-green-900">{agreementRate}%</p>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2">
           <h4 className="text-sm font-semibold text-gray-600 mb-2 text-center">Agreement Breakdown</h4>
           <ComparisonChart 
             agreementCount={comparisonStats.agreed}
             disagreementCount={comparisonStats.disagreed} 
           />
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;