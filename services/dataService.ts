import { CaseData, VoteData, JusticesPresentData, ParsedDataset, JusticeData, AppellantData, RespondentData, IssueData, MissingJusticeData } from '../types';
import { parseCSV } from '../utils/csv';
import { formatJusticeName } from '../utils/justiceMap';

// Injected by vite.config.ts: the committed local snapshots in dev, the public
// GCS bucket in production. Override with VITE_DATA_BASE_URL.
declare const __DATA_BASE_URL__: string;

const GCS_BASE_URL =
  typeof __DATA_BASE_URL__ !== 'undefined'
    ? __DATA_BASE_URL__
    : 'https://storage.googleapis.com/scc-dashboard-dataset-2023/dataset/';

// Files the dashboard cannot render without. A failure here is fatal.
const REQUIRED_FILES: Record<string, string> = {
  cases: GCS_BASE_URL + 'Case.csv',
  votes: GCS_BASE_URL + 'Votes.csv',
  justicesPresent: GCS_BASE_URL + 'JusticesPresent.csv',
  appellants: GCS_BASE_URL + 'Appellants.csv',
  respondents: GCS_BASE_URL + 'Respondents.csv',
  issues: GCS_BASE_URL + 'Issues.csv'
};

// Files that power individual panels. If one 404s the panel degrades to an
// empty state rather than taking the whole dashboard down with it.
const OPTIONAL_FILES: Record<string, string> = {
  missingJustices: GCS_BASE_URL + 'MissingJustices.csv'
};

export const fetchAllData = async (): Promise<ParsedDataset> => {
  const errors: string[] = [];
  const debugLog: string[] = [];
  const rawData: Record<string, string> = {};

  // Capture current environment context
  debugLog.push(`[Environment] Current Page URL: ${window.location.href}`);
  debugLog.push(`[Config] Fetching data from GCS Bucket: ${GCS_BASE_URL}`);

  const fetchOne = async (key: string, path: string, required: boolean) => {
    try {
      const start = performance.now();
      const response = await fetch(path);
      const time = (performance.now() - start).toFixed(0);

      debugLog.push(`[${key}] GET ${path} -> Status: ${response.status} (${response.statusText}) [${time}ms]`);

      if (!response.ok) {
        if (required) errors.push(`${key} failed: HTTP ${response.status}`);
        return;
      }

      const text = await response.text();

      // Heuristic check: If response looks like an HTML error page instead of CSV
      if (text.trim().toLowerCase().startsWith('<!doctype html')) {
        if (required) errors.push(`${key} invalid: Server returned HTML (likely 404/Error page) instead of CSV.`);
        debugLog.push(`[${key}] Content Preview: ${text.substring(0, 100).replace(/\n/g, ' ')}...`);
        return;
      }

      rawData[key] = text;
    } catch (err: any) {
      debugLog.push(`[${key}] Network Error: ${err.message}`);
      if (required) errors.push(`${key} network error`);
    }
  };

  try {
    // Fetch all files in parallel
    await Promise.all([
      ...Object.entries(REQUIRED_FILES).map(([k, p]) => fetchOne(k, p, true)),
      ...Object.entries(OPTIONAL_FILES).map(([k, p]) => fetchOne(k, p, false))
    ]);

    // If any files failed, throw a comprehensive error with the log
    if (errors.length > 0) {
      throw new Error(`Data Loading Failed.\n\nSummary:\n${errors.join('\n')}\n\n--- Detailed Debug Log ---\n${debugLog.join('\n')}`);
    }

    // Parse CSVs
    const cases = parseCSV<CaseData>(rawData.cases);
    const votes = parseCSV<VoteData>(rawData.votes);
    const justicesPresent = parseCSV<JusticesPresentData>(rawData.justicesPresent);
    const appellants = parseCSV<AppellantData>(rawData.appellants);
    const respondents = parseCSV<RespondentData>(rawData.respondents);
    const issues = parseCSV<IssueData>(rawData.issues);
    const missingJustices = rawData.missingJustices
      ? parseCSV<MissingJusticeData>(rawData.missingJustices)
      : [];

    // Extract unique Justices list from JusticesPresent
    const uniqueJusticesMap = new Map<string, string>();
    justicesPresent.forEach(j => {
      if (j.justiceID && j.justiceName && !uniqueJusticesMap.has(j.justiceID)) {
        uniqueJusticesMap.set(j.justiceID, j.justiceName);
      }
    });

    const justices: JusticeData[] = Array.from(uniqueJusticesMap.entries()).map(([id, name]) => ({
      justiceID: id,
      justiceName: formatJusticeName(name)
    })).sort((a, b) => a.justiceName.localeCompare(b.justiceName));

    return {
      cases,
      votes,
      justices,
      appellants,
      respondents,
      issues,
      missingJustices,
      justicesPresent,
      loading: false,
      error: null,
    };

  } catch (err: any) {
    return {
      cases: [],
      votes: [],
      justices: [],
      appellants: [],
      respondents: [],
      issues: [],
      missingJustices: [],
      justicesPresent: [],
      loading: false,
      error: err.message || 'Unknown error occurred loading dataset.',
    };
  }
};