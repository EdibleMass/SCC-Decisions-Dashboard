// SCC / SCOTUS comparison built on the Spaeth crosswalk columns.
//
// The Lenczner Slaght dataset was deliberately modelled on the US Supreme Court
// Database (Spaeth) and carries parallel US-coded columns that are populated,
// not stubs:
//
//   Case.caseDispositionUS        6,405 / 6,415
//   Case.decisionTypeUS           6,414 / 6,415
//   Case.lowerCourtDispositionUS  6,300 / 6,415
//   Issues.issueAreaUS            7,239 / 7,240
//
// Somebody did the crosswalk coding already. That makes matched-issue-area
// comparison possible with no scraping and no new coding — the SCC side, at
// least. See CAVEATS in components/ComparativePage.tsx for what this can and
// cannot support.

import { CaseData, IssueData } from '../types';
import { US_ISSUE_AREAS as US_AREA_NAMES } from './constants';

export interface IssueAreaComparison {
  areaCode: string;
  areaName: string;
  sccIssues: number;
  sccShare: number;      // share of all SCC coded issues
  sccReversalRate: number | null;
  sccCases: number;
}

/** Spaeth disposition codes that represent the lower court being disturbed. */
const REVERSING_DISPOSITIONS = new Set(['3', '4', '5', '6', '7', '8']);

/**
 * SCC caseload and reversal rate by *US* issue area, so the shape can be laid
 * against SCOTUS figures coded on the same scheme.
 */
export const computeUsIssueAreaProfile = (
  cases: CaseData[],
  issues: IssueData[]
): IssueAreaComparison[] => {
  const caseById = new Map(cases.map(c => [c.primaryCaseID, c]));

  interface Acc { issues: number; cases: Set<string>; reversed: number; disposed: number; }
  const byArea = new Map<string, Acc>();

  for (const iss of issues) {
    const c = caseById.get(iss.primaryCaseID);
    if (!c) continue;
    const area = (iss.issueAreaUS ?? '').trim();
    if (!area || area === '0') continue;

    if (!byArea.has(area)) {
      byArea.set(area, { issues: 0, cases: new Set(), reversed: 0, disposed: 0 });
    }
    const a = byArea.get(area)!;
    a.issues++;

    // Reversal is a case-level property; count each case once per area.
    if (!a.cases.has(c.primaryCaseID)) {
      a.cases.add(c.primaryCaseID);
      const disp = c.caseDispositionUS;
      if (disp && disp !== '0' && disp !== '') {
        a.disposed++;
        if (REVERSING_DISPOSITIONS.has(disp)) a.reversed++;
      }
    }
  }

  const totalIssues = Array.from(byArea.values()).reduce((s, a) => s + a.issues, 0);

  return Array.from(byArea.entries())
    .map(([areaCode, a]) => ({
      areaCode,
      areaName: US_AREA_NAMES[areaCode] ?? `Area ${areaCode}`,
      sccIssues: a.issues,
      sccShare: totalIssues > 0 ? a.issues / totalIssues : 0,
      sccReversalRate: a.disposed > 0 ? a.reversed / a.disposed : null,
      sccCases: a.cases.size,
    }))
    .sort((x, y) => y.sccIssues - x.sccIssues);
};

export interface DispositionRow {
  code: string;
  label: string;
  count: number;
  share: number;
}

/** Distribution of SCC outcomes on the Spaeth disposition scheme. */
export const computeUsDispositionProfile = (
  cases: CaseData[],
  labels: Record<string, string>
): DispositionRow[] => {
  const counts = new Map<string, number>();
  let total = 0;
  for (const c of cases) {
    const d = c.caseDispositionUS?.trim();
    if (!d || d === '0') continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
    total++;
  }
  return Array.from(counts.entries())
    .map(([code, count]) => ({
      code,
      label: labels[code] ?? `Code ${code}`,
      count,
      share: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Overall SCC reversal rate on the US disposition scheme — the single number
 * most directly comparable to the familiar SCOTUS figure.
 */
export const computeUsReversalRate = (cases: CaseData[]): { rate: number | null; n: number } => {
  let reversed = 0;
  let n = 0;
  for (const c of cases) {
    const d = c.caseDispositionUS?.trim();
    if (!d || d === '0') continue;
    n++;
    if (REVERSING_DISPOSITIONS.has(d)) reversed++;
  }
  return { rate: n > 0 ? reversed / n : null, n };
};
