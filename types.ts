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
  loading: boolean;
  error: string | null;
}

export enum VoteType {
  Majority = '1',
  Dissent = '2',
  Concurrence = '3',
  JudgmentOfTheCourt = '4',
}

export enum VoteResult {
  NA = '0',
  Majority = '1',
  Dissent = '2',
}