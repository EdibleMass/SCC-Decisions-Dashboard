import { CaseData, VoteData, JusticesPresentData, ParsedDataset, JusticeData, AppellantData, RespondentData, IssueData } from '../types';
import { parseCSV } from '../utils/csv';
import { formatJusticeName } from '../utils/justiceMap';

// Standard Lenczner Slaght Dataset Filenames
// Using absolute paths to ensure we look at the root of the serving domain
const FILES: Record<string, string> = {
  cases: '/dataset/Case.csv',
  votes: '/dataset/Votes.csv',
  justicesPresent: '/dataset/JusticesPresent.csv',
  appellants: '/dataset/Appellants.csv', 
  respondents: '/dataset/Respondents.csv',
  issues: '/dataset/Issues.csv'
};

export const fetchAllData = async (): Promise<ParsedDataset> => {
  const errors: string[] = [];
  const debugLog: string[] = [];
  const rawData: Record<string, string> = {};

  // Capture current environment context
  debugLog.push(`[Environment] Current Page URL: ${window.location.href}`);
  debugLog.push(`[Environment] User Agent: ${navigator.userAgent}`);

  try {
    // Fetch all files in parallel
    await Promise.all(
      Object.entries(FILES).map(async ([key, path]) => {
        try {
          const start = performance.now();
          const response = await fetch(path);
          const time = (performance.now() - start).toFixed(0);
          
          const msg = `[${key}] GET ${response.url} -> Status: ${response.status} (${response.statusText}) [${time}ms]`;
          debugLog.push(msg);

          if (!response.ok) {
            errors.push(`${key} failed: HTTP ${response.status}`);
            return;
          }

          const text = await response.text();
          
          // Heuristic check: If response starts with '<', it's likely an HTML 404 page, not a CSV
          if (text.trim().startsWith('<') || text.trim().toLowerCase().startsWith('<!doctype html')) {
             errors.push(`${key} invalid: Server returned HTML (likely 404/Error page) instead of CSV.`);
             debugLog.push(`[${key}] Content Preview (First 100 chars): ${text.substring(0, 100).replace(/\n/g, ' ')}...`);
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