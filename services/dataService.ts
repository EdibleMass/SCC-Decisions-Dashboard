import { CaseData, VoteData, JusticesPresentData, ParsedDataset, JusticeData, AppellantData, RespondentData, IssueData } from '../types';
import { parseCSV } from '../utils/csv';
import { formatJusticeName } from '../utils/justiceMap';

// Google Cloud Storage Bucket URL
const GCS_BASE_URL = 'https://storage.googleapis.com/scc-dashboard-dataset-2023/dataset/';

const FILES: Record<string, string> = {
  cases: GCS_BASE_URL + 'Case.csv',
  votes: GCS_BASE_URL + 'Votes.csv',
  justicesPresent: GCS_BASE_URL + 'JusticesPresent.csv',
  appellants: GCS_BASE_URL + 'Appellants.csv',
  respondents: GCS_BASE_URL + 'Respondents.csv',
  issues: GCS_BASE_URL + 'Issues.csv'
};

export const fetchAllData = async (): Promise<ParsedDataset> => {
  const errors: string[] = [];
  const debugLog: string[] = [];
  const rawData: Record<string, string> = {};

  // Capture current environment context
  debugLog.push(`[Environment] Current Page URL: ${window.location.href}`);
  debugLog.push(`[Config] Fetching data from GCS Bucket: ${GCS_BASE_URL}`);

  try {
    // Fetch all files in parallel
    await Promise.all(
      Object.entries(FILES).map(async ([key, path]) => {
        try {
          const start = performance.now();
          const response = await fetch(path);
          const time = (performance.now() - start).toFixed(0);
          
          const msg = `[${key}] GET ${path} -> Status: ${response.status} (${response.statusText}) [${time}ms]`;
          debugLog.push(msg);

          if (!response.ok) {
            errors.push(`${key} failed: HTTP ${response.status}`);
            return;
          }

          const text = await response.text();
          
          // Heuristic check: If response looks like an HTML error page instead of CSV
          if (text.trim().toLowerCase().startsWith('<!doctype html')) {
             errors.push(`${key} invalid: Server returned HTML (likely 404/Error page) instead of CSV.`);
             debugLog.push(`[${key}] Content Preview: ${text.substring(0, 100).replace(/\n/g, ' ')}...`);
             return;
          }

          rawData[key] = text;
        } catch (err: any) {
          debugLog.push(`[${key}] Network Error: ${err.message}`);
          errors.push(`${key} network error`);
        }
      })
    );

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
      loading: false,
      error: err.message || 'Unknown error occurred loading dataset.',
    };
  }
};