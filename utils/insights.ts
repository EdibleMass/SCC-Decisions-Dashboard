// Analytics over dataset variables that the dashboard previously never touched:
// ideological direction, panel absence, and opinion-coalition structure.
//
// A standing caveat for everything in the direction section: the Coding Manual
// (Appendix E) introduces the liberal/conservative axis by saying the
// characterization "is often ambiguous and can be overly simplistic." It exists
// mainly for parity with the US Supreme Court Database. Every UI built on these
// functions must carry that caveat rather than presenting the axis as settled
// fact.

import {
  CaseData,
  IssueData,
  VoteData,
  JusticeData,
  MissingJusticeData,
  JusticesPresentData,
  Direction,
} from '../types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export const yearOf = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const m = dateStr.match(/(18|19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : null;
};

/** Directional tallies, always excluding Unspecifiable from the ratio. */
export interface DirectionTally {
  liberal: number;
  conservative: number;
  unspecifiable: number;
  /** liberal / (liberal + conservative); null when the denominator is 0. */
  liberalShare: number | null;
  coded: number; // liberal + conservative
  total: number; // including unspecifiable
}

const emptyTally = (): DirectionTally => ({
  liberal: 0,
  conservative: 0,
  unspecifiable: 0,
  liberalShare: null,
  coded: 0,
  total: 0,
});

const addDirection = (t: DirectionTally, code: string | undefined) => {
  if (code === Direction.Liberal) t.liberal++;
  else if (code === Direction.Conservative) t.conservative++;
  else if (code === Direction.Unspecifiable) t.unspecifiable++;
  else return; // 0 / blank / unknown contributes nothing
  t.total++;
};

const finalize = (t: DirectionTally): DirectionTally => {
  t.coded = t.liberal + t.conservative;
  t.liberalShare = t.coded > 0 ? t.liberal / t.coded : null;
  return t;
};

// ---------------------------------------------------------------------------
// Court-level ideological direction over time
// ---------------------------------------------------------------------------

export interface DirectionYearPoint {
  year: number;
  liberal: number;
  conservative: number;
  unspecifiable: number;
  liberalShare: number | null; // 0..1
  coded: number;
}

/**
 * Share of issue holdings coded Liberal, per year of decision.
 *
 * Operates on issues (not cases) because direction is coded per issue and a
 * case may raise several. Unspecifiable holdings are reported but excluded
 * from the ratio, so the line means "of the issues where a direction could be
 * assigned, what share went liberal".
 */
export const computeDirectionTimeline = (
  cases: CaseData[],
  issues: IssueData[],
  minCodedPerYear = 5
): DirectionYearPoint[] => {
  const yearByCase = new Map<string, number>();
  for (const c of cases) {
    const y = yearOf(c.dateDecisionGiven);
    if (y !== null) yearByCase.set(c.primaryCaseID, y);
  }

  const byYear = new Map<number, DirectionTally>();
  for (const iss of issues) {
    const y = yearByCase.get(iss.primaryCaseID);
    if (y === undefined) continue;
    if (!byYear.has(y)) byYear.set(y, emptyTally());
    addDirection(byYear.get(y)!, iss.decisionDirection);
  }

  return Array.from(byYear.entries())
    .map(([year, t]) => {
      finalize(t);
      return {
        year,
        liberal: t.liberal,
        conservative: t.conservative,
        unspecifiable: t.unspecifiable,
        liberalShare: t.coded >= minCodedPerYear ? t.liberalShare : null,
        coded: t.coded,
      };
    })
    .sort((a, b) => a.year - b.year);
};

/** Direction split within each Canadian issue area, for the selected slice. */
export interface DirectionByAreaRow {
  areaCode: string;
  liberal: number;
  conservative: number;
  unspecifiable: number;
  liberalShare: number | null;
  coded: number;
}

export const computeDirectionByIssueArea = (
  cases: CaseData[],
  issues: IssueData[]
): DirectionByAreaRow[] => {
  const caseIds = new Set(cases.map(c => c.primaryCaseID));
  const byArea = new Map<string, DirectionTally>();

  for (const iss of issues) {
    if (!caseIds.has(iss.primaryCaseID)) continue;
    const area = iss.issueAreaCan;
    if (!area) continue;
    if (!byArea.has(area)) byArea.set(area, emptyTally());
    addDirection(byArea.get(area)!, iss.decisionDirection);
  }

  return Array.from(byArea.entries())
    .map(([areaCode, t]) => {
      finalize(t);
      return {
        areaCode,
        liberal: t.liberal,
        conservative: t.conservative,
        unspecifiable: t.unspecifiable,
        liberalShare: t.liberalShare,
        coded: t.coded,
      };
    })
    .filter(r => r.coded > 0)
    .sort((a, b) => b.coded - a.coded);
};

// ---------------------------------------------------------------------------
// Per-justice ideological profile
// ---------------------------------------------------------------------------

export interface JusticeDirectionProfile {
  justiceID: string;
  justiceName: string;
  liberal: number;
  conservative: number;
  unspecifiable: number;
  liberalShare: number | null;
  coded: number;
}

/**
 * Per-justice directional profile from `individualVoteDirection` (populated on
 * 48,551 of 49,353 votes). This is the justice's own recorded vote direction,
 * which is strictly better than inferring ideology from the Court's holding.
 *
 * Votes are deduplicated per (justice, case): a justice with several issue-level
 * vote rows in one case would otherwise be weighted by how many issues that
 * case happened to raise.
 */
export const computeJusticeDirectionProfiles = (
  votes: VoteData[],
  justices: JusticeData[],
  minCoded = 20
): JusticeDirectionProfile[] => {
  const nameById = new Map(justices.map(j => [j.justiceID, j.justiceName]));
  const byJustice = new Map<string, DirectionTally>();
  const seen = new Set<string>();

  for (const v of votes) {
    const key = `${v.justiceID}|${v.primaryCaseID}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (!byJustice.has(v.justiceID)) byJustice.set(v.justiceID, emptyTally());
    addDirection(byJustice.get(v.justiceID)!, v.individualVoteDirection);
  }

  return Array.from(byJustice.entries())
    .map(([justiceID, t]) => {
      finalize(t);
      return {
        justiceID,
        justiceName: nameById.get(justiceID) || 'Unknown',
        liberal: t.liberal,
        conservative: t.conservative,
        unspecifiable: t.unspecifiable,
        liberalShare: t.liberalShare,
        coded: t.coded,
      };
    })
    .filter(p => p.coded >= minCoded)
    .sort((a, b) => (b.liberalShare ?? 0) - (a.liberalShare ?? 0));
};

// ---------------------------------------------------------------------------
// Panel absence
// ---------------------------------------------------------------------------

/**
 * IMPORTANT FRAMING: MissingJustices records that a sitting member of the Court
 * was not on a given panel. That is NOT the same as recusal. The SCC routinely
 * hears cases in panels of five or seven drawn from nine members, so most
 * absences are ordinary panel assignment, not conflict of interest.
 *
 * Absence from a *full nine-justice panel* is the interesting signal, since a
 * nine-member panel means no routine trimming took place. Both figures are
 * reported so the UI can show the honest denominator.
 */
export interface AbsenceProfile {
  justiceID: string;
  justiceName: string;
  sat: number;
  absent: number;
  eligible: number; // sat + absent
  absenceRate: number; // absent / eligible
  /** Restricted to cases whose panelSize is 9. */
  fullPanelSat: number;
  fullPanelAbsent: number;
  fullPanelEligible: number;
  fullPanelAbsenceRate: number | null;
}

export const computeAbsenceProfiles = (
  cases: CaseData[],
  justicesPresent: JusticesPresentData[],
  missingJustices: MissingJusticeData[],
  justices: JusticeData[],
  minEligible = 25
): AbsenceProfile[] => {
  const caseIds = new Set(cases.map(c => c.primaryCaseID));
  const fullPanelCaseIds = new Set(
    cases.filter(c => c.panelSize === '9').map(c => c.primaryCaseID)
  );
  const nameById = new Map(justices.map(j => [j.justiceID, j.justiceName]));

  interface Acc {
    sat: number;
    absent: number;
    fpSat: number;
    fpAbsent: number;
  }
  const acc = new Map<string, Acc>();
  const get = (id: string): Acc => {
    if (!acc.has(id)) acc.set(id, { sat: 0, absent: 0, fpSat: 0, fpAbsent: 0 });
    return acc.get(id)!;
  };

  // Deduplicate: a justice should count once per case on each side.
  const seenPresent = new Set<string>();
  for (const jp of justicesPresent) {
    if (!caseIds.has(jp.primaryCaseID)) continue;
    const key = `${jp.justiceID}|${jp.primaryCaseID}`;
    if (seenPresent.has(key)) continue;
    seenPresent.add(key);
    const a = get(jp.justiceID);
    a.sat++;
    if (fullPanelCaseIds.has(jp.primaryCaseID)) a.fpSat++;
  }

  const seenMissing = new Set<string>();
  for (const mj of missingJustices) {
    if (!caseIds.has(mj.primaryCaseID)) continue;
    const key = `${mj.justiceID}|${mj.primaryCaseID}`;
    if (seenMissing.has(key)) continue;
    seenMissing.add(key);
    const a = get(mj.justiceID);
    a.absent++;
    if (fullPanelCaseIds.has(mj.primaryCaseID)) a.fpAbsent++;
  }

  return Array.from(acc.entries())
    .map(([justiceID, a]) => {
      const eligible = a.sat + a.absent;
      const fpEligible = a.fpSat + a.fpAbsent;
      return {
        justiceID,
        justiceName: nameById.get(justiceID) || 'Unknown',
        sat: a.sat,
        absent: a.absent,
        eligible,
        absenceRate: eligible > 0 ? a.absent / eligible : 0,
        fullPanelSat: a.fpSat,
        fullPanelAbsent: a.fpAbsent,
        fullPanelEligible: fpEligible,
        fullPanelAbsenceRate: fpEligible > 0 ? a.fpAbsent / fpEligible : null,
      };
    })
    .filter(p => p.eligible >= minEligible)
    .sort((a, b) => b.absenceRate - a.absenceRate);
};

// ---------------------------------------------------------------------------
// Opinion coalitions (justiceSignedOnWith)
// ---------------------------------------------------------------------------

/**
 * `justiceSignedOnWith` names the justice whose reasons this justice joined
 * (0 = wrote their own). That is richer than the binary majority/dissent split
 * driving the network graph: two justices can both sit in the majority while
 * joining entirely different sets of reasons.
 *
 * Per the Coding Manual §54, when an opinion is co-authored or unattributed the
 * *most senior* justice (lowest ID) is recorded, so these edges are "joined the
 * reasons led by X", not necessarily "co-wrote with X".
 */
export interface CoalitionEdge {
  authorID: string;
  authorName: string;
  joinerID: string;
  joinerName: string;
  count: number;
}

export interface AuthorInfluence {
  justiceID: string;
  justiceName: string;
  /** Times other justices joined this justice's reasons. */
  joinsReceived: number;
  /** Distinct justices who ever joined them. */
  distinctJoiners: number;
  /** Times this justice joined someone else's reasons. */
  joinsGiven: number;
  /** joinsReceived / (joinsReceived + joinsGiven); high = opinion leader. */
  leadershipRatio: number | null;
}

export const computeCoalitions = (
  votes: VoteData[],
  justices: JusticeData[],
  minCount = 5
): { edges: CoalitionEdge[]; influence: AuthorInfluence[] } => {
  const nameById = new Map(justices.map(j => [j.justiceID, j.justiceName]));
  const pair = new Map<string, number>();
  const received = new Map<string, number>();
  const given = new Map<string, number>();
  const joinersOf = new Map<string, Set<string>>();

  // Deduplicate per (justice, case): issue-level rows repeat the same join.
  const seen = new Set<string>();

  for (const v of votes) {
    const author = v.justiceSignedOnWith;
    // '0' means the justice wrote their own reasons — no edge.
    if (!author || author === '0') continue;
    if (author === v.justiceID) continue; // defensive: self-join is not a coalition

    const key = `${v.justiceID}|${v.primaryCaseID}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const pk = `${author}|${v.justiceID}`;
    pair.set(pk, (pair.get(pk) || 0) + 1);
    received.set(author, (received.get(author) || 0) + 1);
    given.set(v.justiceID, (given.get(v.justiceID) || 0) + 1);
    if (!joinersOf.has(author)) joinersOf.set(author, new Set());
    joinersOf.get(author)!.add(v.justiceID);
  }

  const edges: CoalitionEdge[] = Array.from(pair.entries())
    .map(([k, count]) => {
      const [authorID, joinerID] = k.split('|');
      return {
        authorID,
        authorName: nameById.get(authorID) || `#${authorID}`,
        joinerID,
        joinerName: nameById.get(joinerID) || `#${joinerID}`,
        count,
      };
    })
    .filter(e => e.count >= minCount)
    .sort((a, b) => b.count - a.count);

  const allIds = new Set<string>([...received.keys(), ...given.keys()]);
  const influence: AuthorInfluence[] = Array.from(allIds)
    .map(id => {
      const r = received.get(id) || 0;
      const g = given.get(id) || 0;
      return {
        justiceID: id,
        justiceName: nameById.get(id) || `#${id}`,
        joinsReceived: r,
        distinctJoiners: joinersOf.get(id)?.size || 0,
        joinsGiven: g,
        leadershipRatio: r + g > 0 ? r / (r + g) : null,
      };
    })
    .filter(i => i.joinsReceived + i.joinsGiven >= minCount)
    .sort((a, b) => b.joinsReceived - a.joinsReceived);

  return { edges, influence };
};

/**
 * Coalition blocs within a single case: each opinion author and the justices
 * who joined them. Used by the case-detail view to show how the panel actually
 * grouped, rather than just how many were in the majority.
 */
export interface CaseBloc {
  authorID: string;
  members: string[]; // justice IDs who joined (not including the author)
  isMajority: boolean;
}

export const computeCaseBlocs = (caseVotes: VoteData[]): CaseBloc[] => {
  const byAuthor = new Map<string, Set<string>>();
  const authorResult = new Map<string, string>();

  // Deduplicate to one vote row per justice for this case.
  const uniq = new Map<string, VoteData>();
  for (const v of caseVotes) {
    if (!uniq.has(v.justiceID)) uniq.set(v.justiceID, v);
  }

  for (const v of uniq.values()) {
    const author = v.justiceSignedOnWith && v.justiceSignedOnWith !== '0'
      ? v.justiceSignedOnWith
      : v.justiceID; // wrote their own reasons: they lead their own bloc
    if (!byAuthor.has(author)) byAuthor.set(author, new Set());
    if (author !== v.justiceID) byAuthor.get(author)!.add(v.justiceID);
    // Record the result side from whichever vote row anchors this bloc.
    if (author === v.justiceID || !authorResult.has(author)) {
      authorResult.set(author, v.justiceWithMajorityResult);
    }
  }

  return Array.from(byAuthor.entries())
    .map(([authorID, members]) => ({
      authorID,
      members: Array.from(members),
      isMajority: authorResult.get(authorID) === '1',
    }))
    .sort((a, b) => b.members.length - a.members.length);
};
