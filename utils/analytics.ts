import * as d3 from 'd3';
import { CaseData, VoteData, JusticeData, VoteResult } from '../types';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  group?: number;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number; // Agreement rate (0-1)
  weight: number; // Number of shared agreements
}

export interface MatrixCell {
  x: string; // ID of justice on X axis
  y: string; // ID of justice on Y axis
  rate: number; // 0 to 1
  shared: number; // Count of shared cases
  agreed: number; // Count of agreements
}

// Which cases feed the agreement metrics.
//
// 'all'     — every case. 59.7% of the corpus is unanimous, so every pair of
//             justices "agrees" in three-fifths of cases before any judicial
//             preference enters. Rates cluster near 1.0 and the graph reads as
//             uniformly hot, which is why the threshold defaults to 0.90.
// 'divided' — only cases where the panel actually split. This is the
//             discriminating measure: it asks "when the Court disagreed, who
//             sided with whom?"
export type AgreementScope = 'all' | 'divided';

// Group votes by case, optionally keeping only cases where the panel split.
// Divided-ness is derived from the votes themselves rather than the case-level
// decisionUnanimous flag so it stays consistent with whatever slice of votes
// the caller passed in.
const groupVotesByCase = (votes: VoteData[], scope: AgreementScope): Map<string, VoteData[]> => {
  const casesMap = new Map<string, VoteData[]>();
  votes.forEach(v => {
    if (!casesMap.has(v.primaryCaseID)) {
      casesMap.set(v.primaryCaseID, []);
    }
    casesMap.get(v.primaryCaseID)?.push(v);
  });

  if (scope === 'all') return casesMap;

  const divided = new Map<string, VoteData[]>();
  casesMap.forEach((caseVotes, caseId) => {
    let hasMajority = false;
    let hasDissent = false;
    for (const v of caseVotes) {
      if (v.justiceWithMajorityResult === VoteResult.Majority) hasMajority = true;
      else if (v.justiceWithMajorityResult === VoteResult.Dissent) hasDissent = true;
      if (hasMajority && hasDissent) break;
    }
    if (hasMajority && hasDissent) divided.set(caseId, caseVotes);
  });
  return divided;
};

// Number of cases in a vote slice that were actually divided. Used to warn the
// user when a filter leaves too little signal to interpret.
export const countDividedCases = (votes: VoteData[]): number =>
  groupVotesByCase(votes, 'divided').size;

export const generateNetworkData = (
  votes: VoteData[],
  justices: JusticeData[],
  minSharedCases: number = 10,
  scope: AgreementScope = 'all'
): { nodes: GraphNode[]; links: GraphLink[] } => {

  const nodes: GraphNode[] = justices.map(j => ({ id: j.justiceID, name: j.justiceName }));
  const links: GraphLink[] = [];

  // 1. Group votes by Case
  const casesMap = groupVotesByCase(votes, scope);

  // 2. Calculate pairwise agreement
  const pairStats = new Map<string, { agreed: number; total: number }>();

  casesMap.forEach((caseVotes) => {
    // We only care about Majority (1) vs Dissent (2)
    const validVotes = caseVotes.filter(v => v.justiceWithMajorityResult === VoteResult.Majority || v.justiceWithMajorityResult === VoteResult.Dissent);
    
    // Deduplicate votes per justice in a single case to handle data anomalies
    const uniqueJusticeVotes = new Map<string, VoteData>();
    validVotes.forEach(v => {
        if (!uniqueJusticeVotes.has(v.justiceID)) {
            uniqueJusticeVotes.set(v.justiceID, v);
        }
    });
    const uniqueVotes = Array.from(uniqueJusticeVotes.values());

    for (let i = 0; i < uniqueVotes.length; i++) {
      for (let j = i + 1; j < uniqueVotes.length; j++) {
        const v1 = uniqueVotes[i];
        const v2 = uniqueVotes[j];
        
        // Sort IDs to ensure consistent key (A-B is same as B-A)
        const ids = [v1.justiceID, v2.justiceID].sort();
        const key = `${ids[0]}-${ids[1]}`;

        if (!pairStats.has(key)) {
          pairStats.set(key, { agreed: 0, total: 0 });
        }
        
        const stats = pairStats.get(key)!;
        stats.total += 1;
        if (v1.justiceWithMajorityResult === v2.justiceWithMajorityResult) {
          stats.agreed += 1;
        }
      }
    }
  });

  // 3. Convert to D3 Links
  pairStats.forEach((stats, key) => {
    const [source, target] = key.split('-');
    if (stats.total >= minSharedCases) {
        const agreementRate = stats.agreed / stats.total;
        links.push({
            source,
            target,
            value: agreementRate,
            weight: stats.agreed
        });
    }
  });

  return { nodes, links };
};

export const generateMatrixData = (
  votes: VoteData[],
  justices: JusticeData[],
  scope: AgreementScope = 'all'
): MatrixCell[] => {
  const cells: MatrixCell[] = [];

  // 1. Group votes by Case
  const casesMap = groupVotesByCase(votes, scope);

  // 2. Initialize pair stats map for ALL pairs (including self)
  // We need a key like "ID1|ID2" to store stats
  const pairStats = new Map<string, { agreed: number; total: number }>();

  // Initialize all permutations to 0 so the grid is complete
  justices.forEach(j1 => {
    justices.forEach(j2 => {
      pairStats.set(`${j1.justiceID}|${j2.justiceID}`, { agreed: 0, total: 0 });
    });
  });

  // 3. Iterate cases
  casesMap.forEach((caseVotes) => {
    const validVotes = caseVotes.filter(v => 
      v.justiceWithMajorityResult === VoteResult.Majority || 
      v.justiceWithMajorityResult === VoteResult.Dissent
    );

    // Deduplicate votes per justice in a single case
    const uniqueJusticeVotes = new Map<string, VoteData>();
    validVotes.forEach(v => {
        if (!uniqueJusticeVotes.has(v.justiceID)) {
            uniqueJusticeVotes.set(v.justiceID, v);
        }
    });
    const uniqueVotes = Array.from(uniqueJusticeVotes.values());

    // Double loop to compare everyone against everyone in this case
    for (const v1 of uniqueVotes) {
      for (const v2 of uniqueVotes) {
        const key = `${v1.justiceID}|${v2.justiceID}`;
        const stats = pairStats.get(key);
        if (stats) {
          stats.total += 1;
          if (v1.justiceWithMajorityResult === v2.justiceWithMajorityResult) {
            stats.agreed += 1;
          }
        }
      }
    }
  });

  // 4. Build Cells
  justices.forEach(j1 => {
    justices.forEach(j2 => {
      const stats = pairStats.get(`${j1.justiceID}|${j2.justiceID}`);
      let rate = 0;
      
      if (j1.justiceID === j2.justiceID) {
        rate = 1.0; // Identity is always 100%
      } else if (stats && stats.total > 0) {
        rate = stats.agreed / stats.total;
      }

      cells.push({
        x: j1.justiceID,
        y: j2.justiceID,
        rate: rate,
        shared: stats ? stats.total : 0,
        agreed: stats ? stats.agreed : 0
      });
    });
  });

  return cells;
};

export interface EnrichedCase {
  primaryCaseID: string;
  caseName: string;
  year: string;
  voteType: string; // Majority, Dissent, etc.
  resultCode: string;
  decisionType: string; // e.g., Oral, Reserved
  unanimity: string; // e.g. 0 or 1
}

export const getJusticeCases = (justiceID: string, allVotes: VoteData[], allCases: CaseData[]): EnrichedCase[] => {
  const justiceVotes = allVotes.filter(v => v.justiceID === justiceID);
  const caseLookup = new Map(allCases.map(c => [c.primaryCaseID, c]));
  
  const seenCases = new Set<string>();
  const results: EnrichedCase[] = [];

  for (const v of justiceVotes) {
    // Deduplication: Only add the case once per justice
    if (seenCases.has(v.primaryCaseID)) continue;
    seenCases.add(v.primaryCaseID);

    const caseInfo = caseLookup.get(v.primaryCaseID);
    
    let label = 'Unknown';
    if (v.justiceWithMajorityResult === '1') label = 'Majority';
    else if (v.justiceWithMajorityResult === '2') label = 'Dissent';
    else label = 'Other'; // Catch-all for data quirks

    // Extract year from date string (YYYY-MM-DD) or similar
    let year = '';
    if (caseInfo?.dateDecisionGiven) {
        const match = caseInfo.dateDecisionGiven.match(/\d{4}/);
        year = match ? match[0] : caseInfo.dateDecisionGiven;
    }

    results.push({
      primaryCaseID: v.primaryCaseID,
      caseName: caseInfo?.caseName || 'Unknown Case',
      year: year,
      voteType: label,
      resultCode: v.justiceWithMajorityResult,
      decisionType: caseInfo?.decisionTypeCAN || 'N/A',
      unanimity: caseInfo?.decisionUnanimous || 'N/A',
    });
  }

  return results.sort((a, b) => (b.year > a.year ? 1 : -1)); // Newest first
};