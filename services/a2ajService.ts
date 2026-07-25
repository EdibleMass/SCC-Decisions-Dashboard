// Client for the Access to Algorithmic Justice (A2AJ) Canadian Legal Data API.
//
//   Docs:     https://api.a2aj.ca/docs
//   Project:  https://www.a2aj.ca/
//   Bulk:     https://huggingface.co/datasets/a2aj/canadian-case-law
//
// A2AJ is the maintained successor to the Refugee Law Lab's Canadian Legal Data
// project (that Hugging Face dataset now carries a deprecation notice). It
// publishes ~224,000 decisions across 26 courts and tribunals, and serves them
// from a free, unauthenticated API.
//
// ----------------------------------------------------------------------------
// LICENSING — READ BEFORE ANY COMMERCIAL OR PUBLIC-INDEXED USE
// ----------------------------------------------------------------------------
// A2AJ's own tooling is MIT-licensed, but each decision carries an
// `upstream_license` from the originating court, and some of those restrict
// commercial use. The predecessor Refugee Law Lab dataset was CC BY-NC 4.0 and
// additionally asked that documents not be exposed in a form search engines can
// index, to protect privacy in tribunal decisions.
//
// This dashboard is currently educational and non-commercial, and deliberately
// does NOT retrieve or display decision text — see stripText() below. If that
// ever changes, the per-court upstream_license must be checked first. Tracked
// in handoff.md.
// ----------------------------------------------------------------------------

const A2AJ_BASE = 'https://api.a2aj.ca';
const REQUEST_TIMEOUT_MS = 15000;

/** Court/tribunal codes, grouped for the Court System page. */
export const PROVINCIAL_COURTS = ['BCSC', 'ONCA', 'BCCA', 'NSSC', 'NSCA', 'NSSM', 'NSPC', 'NSFC', 'YKCA'] as const;
export const FEDERAL_COURTS = ['SCC', 'FCA', 'FC', 'TCC', 'CMAC'] as const;

/**
 * Court code -> province code used elsewhere in this app (see PROVINCE_MAP in
 * utils/constants). '14' is the Federal bucket.
 */
export const COURT_TO_PROVINCE: Record<string, string> = {
  BCCA: '2', BCSC: '2',
  ONCA: '7',
  NSCA: '6', NSSC: '6', NSPC: '6', NSFC: '6', NSSM: '6',
  YKCA: '13',
  SCC: '14', FCA: '14', FC: '14', TCC: '14', CMAC: '14',
};

/**
 * Provinces with NO court coverage in A2AJ. Stated explicitly rather than
 * inferred, because the honest presentation of this dataset depends on showing
 * the gaps as gaps. Verified against /coverage on 2026-07-22.
 */
export const UNAVAILABLE_PROVINCES: Record<string, string> = {
  '1': 'Alberta',
  '3': 'Manitoba',
  '4': 'New Brunswick',
  '5': 'Newfoundland and Labrador',
  '8': 'Prince Edward Island',
  '9': 'Quebec',
  '10': 'Saskatchewan',
  '11': 'Northwest Territories',
  '12': 'Nunavut',
};

export interface CourtCoverage {
  dataset: string;
  descriptionEn: string;
  descriptionFr: string;
  earliest: string;
  latest: string;
  count: number;
}

/** Metadata only — never decision text. See stripText(). */
export interface CaseSummary {
  dataset: string;
  citation: string;
  altCitation: string;
  name: string;
  date: string;
  url: string;
  citingCasesCount: number;
  upstreamLicense: string;
}

export class A2AJError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'A2AJError';
  }
}

const request = async <T,>(path: string, params: Record<string, string | number | undefined>): Promise<T> => {
  const url = new URL(A2AJ_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      throw new A2AJError(`A2AJ request failed: HTTP ${res.status}`, res.status);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new A2AJError('A2AJ request timed out.');
    }
    if (err instanceof A2AJError) throw err;
    throw new A2AJError(err?.message || 'Network error contacting A2AJ.');
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Drop full-text fields at the boundary.
 *
 * The API returns `unofficial_text_en` / `unofficial_text_fr` (often 50-120 KB
 * per decision) and match snippets. We deliberately do not carry decision text
 * into application state: it is the part of the corpus with the most
 * restrictive upstream licensing, and the dashboard has no use for it. Doing
 * this once here means no downstream component can accidentally render it.
 */
const stripText = (raw: any): CaseSummary => ({
  dataset: raw.dataset ?? '',
  citation: raw.citation_en || raw.citation_fr || '',
  altCitation: raw.citation2_en || raw.citation2_fr || '',
  name: raw.name_en || raw.name_fr || '',
  date: (raw.document_date_en || raw.document_date_fr || '').slice(0, 10),
  url: raw.url_en || raw.url_fr || '',
  citingCasesCount: typeof raw.citing_cases_count === 'number' ? raw.citing_cases_count : 0,
  upstreamLicense: raw.upstream_license ?? '',
});

// --- Coverage ---------------------------------------------------------------

let coverageCache: CourtCoverage[] | null = null;

/** Per-court document counts and date ranges. Cached for the session. */
export const fetchCoverage = async (): Promise<CourtCoverage[]> => {
  if (coverageCache) return coverageCache;

  const data = await request<{ results: any[] }>('/coverage', { doc_type: 'cases' });
  coverageCache = (data.results ?? []).map(r => ({
    dataset: r.dataset,
    descriptionEn: r.description_en ?? r.dataset,
    descriptionFr: r.description_fr ?? '',
    earliest: (r.earliest_document_date ?? '').slice(0, 10),
    latest: (r.latest_document_date ?? '').slice(0, 10),
    count: r.number_of_documents ?? 0,
  }));
  return coverageCache;
};

// --- Search -----------------------------------------------------------------

export interface SearchOptions {
  query: string;
  dataset?: string;
  size?: number;
  searchType?: 'full_text' | 'name';
  sort?: 'default' | 'newest_first' | 'oldest_first';
  startDate?: string;
  endDate?: string;
}

const searchCache = new Map<string, CaseSummary[]>();

export const searchCases = async (opts: SearchOptions): Promise<CaseSummary[]> => {
  const key = JSON.stringify(opts);
  const cached = searchCache.get(key);
  if (cached) return cached;

  const data = await request<{ results: any[] }>('/search', {
    query: opts.query,
    dataset: opts.dataset,
    size: opts.size ?? 10,
    search_type: opts.searchType ?? 'full_text',
    sort_results: opts.sort ?? 'default',
    doc_type: 'cases',
    start_date: opts.startDate,
    end_date: opts.endDate,
  });

  const results = (data.results ?? []).map(stripText);
  searchCache.set(key, results);
  return results;
};

const citationCache = new Map<string, CaseSummary | null>();

/**
 * Whether a downstream citation count is meaningful for a given citation.
 *
 * A2AJ builds its citation network by matching NEUTRAL citations ("2008 SCC 9")
 * in decision text. Pre-2000 decisions predate neutral citations and are cited
 * by SCR reference instead, so they are never matched and always report zero.
 *
 * This is not a rounding error, it is a cliff. Verified against landmarks:
 *
 *   Dunsmuir      2008 SCC 9              -> 10,305
 *   Vavilov       2019 SCC 65             ->  8,749
 *   R. v. Oakes   [1986] 1 S.C.R. 103     ->      0   (in reality, one of the
 *   Roncarelli    [1959] S.C.R. 121       ->      0    most-cited cases in
 *                                                      Canadian law)
 *
 * A zero here means "not measurable", never "not influential". Callers MUST
 * gate on this before displaying a count, and the UI must say why when it is
 * unavailable — showing Oakes with 0 citations beside Dunsmuir with 10,305
 * would be actively misleading.
 */
export const supportsCitationCount = (neutralCitation?: string): boolean =>
  !!neutralCitation && /^\s*(19|20)\d{2}\s+[A-Z]{2,6}\s+\d+/.test(neutralCitation);

/**
 * Look up one decision by neutral citation (e.g. "2015 SCC 42") to obtain its
 * downstream citation count. Returns null when unmatched — expected for
 * pre-2000 decisions, which predate neutral citations entirely (only 28% of
 * this dataset carries one).
 *
 * Uses /fetch, which is the only endpoint that resolves an exact citation
 * (/search matches names and body text, not citations). /fetch normally returns
 * the entire decision — often 50-120 KB — so `end_char` is pinned to 1: the
 * response carries full metadata and citing_cases_count while transferring
 * essentially no text. See stripText() for why that matters.
 */
export const lookupByCitation = async (citation: string): Promise<CaseSummary | null> => {
  const trimmed = citation.trim();
  if (!trimmed) return null;
  if (citationCache.has(trimmed)) return citationCache.get(trimmed)!;

  let result: CaseSummary | null = null;
  try {
    const data = await request<any>('/fetch', {
      citation: trimmed,
      doc_type: 'cases',
      output_language: 'en',
      start_char: 0,
      end_char: 1, // metadata only — do not pull decision text
    });
    const raw = Array.isArray(data?.results) ? data.results[0] : data;
    if (raw && (raw.citation_en || raw.citation_fr)) result = stripText(raw);
  } catch (err) {
    if (err instanceof A2AJError && err.status === 404) result = null;
    else throw err;
  }

  citationCache.set(trimmed, result);
  return result;
};

// Words that carry no discriminating power in a style of cause.
const STOPWORDS = new Set([
  'the', 'and', 'of', 'in', 're', 'et', 'al', 'v', 'vs', 'ltd', 'ltee', 'inc',
  'corp', 'corporation', 'co', 'company', 'canada', 'canadian', 'attorney',
  'general', 'her', 'his', 'majesty', 'queen', 'king', 'minister', 'city',
  'estate', 'board', 'commission', 'association', 'limited', 'plc', 'llp',
  'holdings', 'group', 'services', 'service', 'systems', 'international',
]);

/**
 * Pull the most distinctive tokens out of a style of cause.
 *
 * The API's name search requires a substring the indexed name actually
 * contains: "Chevron Corp. v. Yaiguaje" returns nothing, while "Yaiguaje"
 * returns the right three ONCA decisions. Long tokens that aren't corporate
 * boilerplate are the best available proxy for a distinctive party name.
 */
export const distinctiveTokens = (caseName: string, limit = 2): string[] => {
  const scored = caseName
    .replace(/\(.*?\)/g, ' ')
    .split(/[\s,;:.]+/)
    .map(t => t.replace(/[^A-Za-zÀ-ÿ'’-]/g, ''))
    .filter(t => t.length >= 4 && !STOPWORDS.has(t.toLowerCase()))
    // Prefer longer, capitalised tokens — proper nouns beat common words.
    .sort((a, b) => {
      const capA = /^[A-ZÀ-Þ]/.test(a) ? 1 : 0;
      const capB = /^[A-ZÀ-Þ]/.test(b) ? 1 : 0;
      if (capA !== capB) return capB - capA;
      return b.length - a.length;
    });

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of scored) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
};

export interface RelatedDecision extends CaseSummary {
  /** Which token matched — shown so the user can judge the match themselves. */
  matchedOn: string;
}

/**
 * Find appellate decisions plausibly belonging to the same proceeding as an SCC
 * case, by searching the provincial appellate corpora for distinctive party
 * names.
 *
 * THIS IS A NAME-MATCH HEURISTIC, NOT AN AUTHORITATIVE CASE HISTORY. Style of
 * cause changes between levels of court — parties are reordered on appeal,
 * intervenors come and go, publication bans replace names with initials — and a
 * common party name (a Crown ministry, a large insurer) will pull in unrelated
 * proceedings. The UI must present these as candidates to verify, never as
 * established appellate history, and must link out to the official source.
 */
export const findRelatedAppellateDecisions = async (
  caseName: string,
  sccYear?: number
): Promise<RelatedDecision[]> => {
  const tokens = distinctiveTokens(caseName, 2);
  if (!tokens.length) return [];

  const appellate = ['ONCA', 'BCCA', 'NSCA', 'YKCA'];
  const jobs: Array<Promise<RelatedDecision[]>> = [];

  for (const token of tokens) {
    for (const ds of appellate) {
      jobs.push(
        searchCases({
          query: token,
          dataset: ds,
          searchType: 'name',
          size: 3,
          // An appeal precedes the SCC decision. Allow a year of slack rather
          // than assuming a fixed lag; leave the lower bound open because
          // proceedings can run for years before reaching Ottawa.
          endDate: sccYear ? `${sccYear + 1}-12-31` : undefined,
        }).then(rs => rs.map(r => ({ ...r, matchedOn: token })))
      );
    }
  }

  const settled = await Promise.allSettled(jobs);
  const all = settled
    .filter((r): r is PromiseFulfilledResult<RelatedDecision[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // De-duplicate: the same decision can match on more than one token.
  const byCitation = new Map<string, RelatedDecision>();
  for (const r of all) {
    if (r.citation && !byCitation.has(r.citation)) byCitation.set(r.citation, r);
  }

  return Array.from(byCitation.values()).sort((a, b) => (b.date > a.date ? 1 : -1));
};
