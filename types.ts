// types.ts

export interface CaseData {
  primaryCaseID: string;
  caseName: string; // Mapped from FirstOfcaseName
  docketID: string; // Added for linking to SCC website
  dateDecisionGiven: string;
  decisionTypeCAN: string;
  decisionUnanimous: string;
  majorityWriter: string;
  dissentWriter: string;
  panelSize: string;
  provinceOfOrigin: string;
  caseDispositionCan: string;
  declareUnconCAN: string;
  partyWinning: string;
  dateArgument: string;
  precedentOverrule: string; // Added for Precedent Killer Tracker
  neutralCitation?: string;
  scrCitation?: string;
  caseSource?: string;
  lowerCourtSplit?: string;
  // Spaeth US Supreme Court Database crosswalk columns. Populated for ~100% of
  // cases and previously unused; they are what makes SCC/SCOTUS comparison
  // possible without any new coding. See utils/comparative.ts.
  caseDispositionUS?: string;
  decisionTypeUS?: string;
  lowerCourtDispositionUS?: string;
}

export interface AppellantData {
  primaryCaseID: string;
  appellantType: string;
  appellantCategory: string; // Added for David vs Goliath
}

export interface RespondentData {
  primaryCaseID: string;
  respondentType: string;
  respondentCategory: string; // Added for David vs Goliath
}

export interface IssueData {
  primaryCaseID: string;
  issueAreaCan: string; // Changed from issueAreaCAN to match CSV header
  issueID: string; // Unique identifier for the issue
  caseIssueID: string; // Sequential ID (1, 2, 3) within a case
  issueCAN?: string; // Specific issue description code
  // Ideological direction of the Court's holding on this issue.
  // 1 = Conservative, 2 = Liberal, 3 = Unspecifiable (Coding Manual, Appendix E).
  decisionDirection?: string;
  // 0 = N/A, 1 = dissent and majority in opposite directions, 2 = same direction.
  decisionDirectionDissent?: string;
  majorityVotes?: string;
  dissentVotes?: string;
  // Spaeth US Supreme Court Database crosswalk codes, populated for ~100% of issues.
  issueAreaUS?: string;
  issueUS?: string;
}

// A justice who sat on the Court at the time but was absent from this panel.
export interface MissingJusticeData {
  primaryCaseID: string;
  justiceID: string;
  justiceName: string;
}

export interface VoteData {
  ID: string;
  justiceID: string;
  individualVoteType: string;
  justiceDecisionWriting: string;
  individualVoteDirection: string;
  justiceWithMajorityResult: string; // 1 = Majority, 2 = Dissent
  justiceSignedOnWith: string; // ID of the justice this vote supports
  primaryCaseID: string;
  issueID: string; // Link to specific issue
}

export interface JusticeData {
  justiceID: string;
  justiceName: string; // from JusticesPresent or derived
}

export interface JusticesPresentData {
  primaryCaseID: string;
  justiceID: string;
  justiceName: string;
}

// Helper types for parsed data
export interface ParsedDataset {
  cases: CaseData[];
  votes: VoteData[];
  justices: JusticeData[];
  appellants: AppellantData[];
  respondents: RespondentData[]; // Added
  issues: IssueData[];
  missingJustices: MissingJusticeData[];
  // Full panel roster per case. Needed as the denominator for panel-absence
  // rates; previously parsed only to derive the unique justice list.
  justicesPresent: JusticesPresentData[];
  loading: boolean;
  error: string | null;
}

export enum VoteType {
  Majority = '1',
  Dissent = '2',
  Concurrence = '3',
  JudgmentOfTheCourt = '4',
  Plurality = '5',
  ExpressedNoOpinion = '6',
}

// Ideological direction, per Coding Manual Appendix E.
export enum Direction {
  Conservative = '1',
  Liberal = '2',
  Unspecifiable = '3',
}

export enum VoteResult {
  NA = '0',
  Majority = '1',
  Dissent = '2',
}