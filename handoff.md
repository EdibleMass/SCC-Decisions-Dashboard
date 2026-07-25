# SCC Decisions Dashboard — Handoff

**Last updated:** 2026-07-22
**Status:** All work below is implemented, typechecked (`npx tsc --noEmit` clean), builds (`npx vite build`), and was verified in a browser against real data.

This document exists so the work can be picked up cold. It records *why* things are the way they are, not just what changed — several decisions here are load-bearing for the dashboard's accuracy.

---

## 1. Quick start

```bash
npm install
npm run dev
```

The dev server now serves the committed CSV snapshots at `/dataset/*.csv` (see §3.1), so **the app runs fully offline**. Production reads the GCS bucket. Override either with `VITE_DATA_BASE_URL`.

Verification scripts (not a test suite — sanity harnesses that run the real analytics over the real CSVs):

```bash
node scripts/verify-insights.mjs
```

```bash
node scripts/verify-a2aj.mjs
```

---

## 2. ⚠️ Open item: A2AJ licensing must be checked before commercial use

**This is the single thing to resolve before this dashboard is ever used commercially or indexed publicly.**

The Court System page and the per-case external lookup read live from the
[A2AJ Canadian Legal Data API](https://api.a2aj.ca/docs). A2AJ's own tooling is MIT-licensed, **but every decision carries its own `upstream_license` from the originating court, and some restrict commercial use.**

The SCC records return this verbatim:

> "See upstream license, including non-commercial use and other restrictions: https://perma.cc/6Z3Z-UPAC. Note: This is an unofficial reproduction of a Supreme Court of Canada decision, without endorsement or affiliation by the Supreme Court of Canada."

Additional context:

- A2AJ is the successor to the **Refugee Law Lab** Canadian Legal Data project, which is now formally deprecated on Hugging Face. That predecessor was **CC BY-NC 4.0** and additionally asked that documents not be exposed in a form search engines can index, to protect privacy in tribunal decisions.
- The `upstream_license` field varies **per court**, so it must be checked per dataset, not once globally.

**Current mitigation:** the app never retrieves or displays decision text. `stripText()` in `services/a2ajService.ts` discards `unofficial_text_*` and snippets at the API boundary, so no downstream component *can* render it. `lookupByCitation()` calls `/fetch` with `end_char=1` for the same reason — it needs the metadata, not the judgment.

**Before any commercial or search-indexed deployment:** audit `upstream_license` per court, confirm A2AJ's current terms, and decide whether the Court System page stays. Nothing else in the dashboard depends on A2AJ.

---

## 3. What changed

### 3.1 Foundation

| Area | Change | Why |
|---|---|---|
| `utils/csv.ts` | Replaced regex/line-split parser with an RFC 4180 character scanner | The old one split on newlines first, so quoted fields containing newlines corrupted records. Case.csv parsed as **6,417 rows instead of 6,415**, with 4 junk rows carrying empty names and garbage province codes. Now exact across all 5 datasets. |
| `services/dataService.ts` | Split into `REQUIRED_FILES` / `OPTIONAL_FILES`; loads `MissingJustices.csv`; exposes `justicesPresent` | An optional file 404ing used to kill the whole dashboard. Now the affected panel degrades and the rest loads. |
| `vite.config.ts` | Added `localDatasetPlugin`, `__DATA_BASE_URL__` | The repo shipped CSVs the app could never read — it only fetched GCS, so it couldn't run offline. |
| `vite.config.ts` | **Removed `GEMINI_API_KEY` from `define`** | Leftover AI Studio scaffolding inlined a secret into the client bundle for a feature that doesn't exist. Value was a placeholder, so nothing leaked — but it was a trap. If a model feature is added later it must go through a server-side proxy. |
| `.gitignore` | Added `.env`, `.env.*` | `.env.local` was not ignored. |
| `index.html` | Removed `<link href="/index.css">` | That file doesn't exist — 404 on every page load. |

### 3.2 Divided-cases toggle (`AgreementScope`)

`utils/analytics.ts` gained an `AgreementScope = 'all' | 'divided'` parameter on `generateNetworkData` and `generateMatrixData`, surfaced via `components/AgreementScopeToggle.tsx`.

**Why it matters — measured, not asserted:**

| Scope | Pairs | Mean agreement | Range | Spread |
|---|---:|---:|---|---:|
| `all` | 768 | 0.858 | 0.581 – 0.979 | 0.399 |
| `divided` | 546 | **0.568** | 0.152 – 0.884 | **0.732** |

Most SCC decisions are unanimous, so under `all` every pair of justices agrees by default in a large share of cases; rates compress near 1.0 and the network graph reads as uniformly hot. That is why the threshold defaulted to 0.90. Conditioning on divided cases nearly doubles the spread.

The toggle also **resets the threshold** (0.90 → 0.60) on switch, because carrying 0.90 into the divided view would hide every link.

**Note on the two divided-ness measures.** `countDividedCases` derives divided-ness from the votes (someone actually voted against the result) and yields **1,808 cases (28%)**. The case-level `decisionUnanimous` field yields 40.3%, because it also counts cases unanimous in result but split in reasoning. The vote-derived measure is the correct conditioning for an agreement metric; don't "fix" this to match the other number.

### 3.3 Ideological direction (`decisionDirection` / `individualVoteDirection`)

Previously untouched by the app. Now in `utils/insights.ts` + `IdeologyTimeline`, `JusticeDirectionChart`, `DirectionCaveat`.

Codes, from the Coding Manual **Appendix E**: `1 = Conservative`, `2 = Liberal`, `3 = Unspecifiable`.

**Handle with care.** The manual itself introduces this axis by conceding it *"is often ambiguous and can be overly simplistic"* and notes it was adopted mainly for parity with the US Supreme Court Database. `DirectionCaveat.tsx` renders that disclosure on every panel built on it — **do not remove it.** Unspecifiable issues are always excluded from percentages, so a reported share means "of the issues where a direction could be assigned".

Per-justice figures use `individualVoteDirection` (the justice's own vote, populated on 48,551/49,353 votes), not the Court's holding — so a dissenter is scored on how they voted. Votes are deduplicated per (justice, case) so multi-issue cases don't over-weight.

Sanity output: 4,959 coded issues; period average 42.9% liberal; Cartwright most liberal (58.9%), Rothstein most conservative (32.8%).

### 3.4 Panel absence (`MissingJustices.csv`)

13,810 rows that were sitting unused in the repo. Now `computeAbsenceProfiles` + `components/PanelAbsence.tsx`.

**This is deliberately NOT labelled "recusal"** — and that framing is the whole point of the component. The SCC hears most appeals in panels of 5 or 7 drawn from 9 members, so most absences are ordinary panel assignment. Calling this recusal would strongly imply conflicts of interest that the data does not show.

The component defaults to **full-bench-only** (`panelSize === '9'`), where no routine trimming occurred. The data validates the design:

- **Kellock: 59.1% raw absence, but 0.0% full-bench absence.** Pure rostering.

Even the full-bench figure reflects illness, travel, and vacancy as well as recusal, and the dataset records no reason. The UI says so.

### 3.5 Opinion coalitions (`justiceSignedOnWith`)

`computeCoalitions` / `computeCaseBlocs` + `components/CoalitionLeaderboard.tsx`.

Richer than the binary majority/dissent split: two justices can both sit in the majority while joining entirely different reasons.

**Coding Manual §54 caveat:** where an opinion is co-authored, or is a judgment of the Court with no named author, the **most senior justice (lowest ID)** is recorded. So an edge means *"joined the reasons led by X"*, not *"co-wrote with X"*. This is stated in the component footer.

Sanity output: McLachlin received 2,425 joins (60% leadership ratio); Laskin 78%; strongest single edge is Dickson → Laskin, 253 times — historically sensible.

### 3.6 Court System page (A2AJ) — separate destination

`components/CourtSystemPage.tsx`, `services/a2ajService.ts`. New top-level tab, **kept out of the SCC dashboard on purpose**: the SCC data is *coded* (votes, issues, dispositions, direction) while A2AJ is *documents and citations*. Blending them would invite comparisons the data can't support. The era ribbon is hidden on this page because era filtering is meaningless for the external corpus.

Live coverage (verified 2026-07-22): **224,086 decisions, 26 courts**, of which **108,528 provincial**.

| Court | Count | Range |
|---|---:|---|
| BCSC | 52,078 | 2000–2026 |
| ONCA | 24,002 | 1998–2026 |
| BCCA | 14,631 | 1999–2026 |
| NSSC | 9,214 | 2001–2026 |
| NSCA | 4,737 | 1993–2026 |
| NSSM / NSPC / NSFC | 3,589 | 2001–2026 |
| YKCA | 277 | 2000–2026 |

**Coverage is uneven, and the UI treats that as a first-class fact.** There is **no** Alberta, Quebec, Manitoba, Saskatchewan, New Brunswick, NL, PEI, NWT, or Nunavut — and no Ontario Superior Court. `CanadaMap.tsx` was repurposed (it was dead code) into a general choropleth where `available: false` regions render with a **diagonal hatch** and are excluded from the colour scale. Without that, a coverage gap and a genuinely low value both render pale and are indistinguishable. Verified in-browser: 9 hatched, 4 coloured.

The colour ramp is **square-root scaled** because BCSC alone is ~half the provincial corpus and a linear ramp washes everything else out.

### 3.7 US comparative page

`components/ComparativePage.tsx`, `utils/comparative.ts`. Uses the Spaeth crosswalk columns that ship populated and were entirely unused:

- `Case.caseDispositionUS` — 6,405 / 6,415
- `Case.decisionTypeUS` — 6,414 / 6,415
- `Case.lowerCourtDispositionUS` — 6,300 / 6,415
- `Issues.issueAreaUS` — 7,239 / 7,240

Renders SCC caseload and outcomes **on the US scheme**. Verified: 43.4% of coded cases disturbed the lower court (n = 6,405).

**It deliberately does not ship SCOTUS numbers.** The page is framed as "the SCC in US coding terms", not a head-to-head, because (a) SCOTUS is almost entirely certiorari-driven while the SCC hears criminal appeals as of right, so a raw reversal-rate gap mostly measures docket control; (b) Spaeth's categories carry US constitutional assumptions that don't map cleanly onto Charter litigation; (c) hardcoded figures would silently go stale. See §5 for the intended next step.

### 3.8 Citation impact + appellate journey

`components/CaseExternalContext.tsx`, inside the existing case modal. **Opt-in** — no network request fires until the user clicks, so the modal never blocks on or fails because of a third party.

#### ⚠️ The citation-count cliff — most important gotcha in this codebase

A2AJ builds its citation network by matching **neutral citations** in decision text. Pre-2000 decisions predate neutral citations and are cited by S.C.R. reference, so **they always return zero**:

| Case | Citation | `citing_cases_count` |
|---|---|---:|
| Dunsmuir | 2008 SCC 9 | 10,305 |
| Vavilov | 2019 SCC 65 | 8,749 |
| **R. v. Oakes** | [1986] 1 S.C.R. 103 | **0** |
| **Roncarelli v. Duplessis** | [1959] S.C.R. 121 | **0** |

Oakes is among the most-cited decisions in Canadian law. Displaying that zero next to Dunsmuir's 10,305 would be actively misleading. `supportsCitationCount()` gates on the presence of a neutral citation and the UI explains *why* a count is unavailable rather than rendering a zero. **Do not remove this guard.** Verified in-browser: Chevron (2015 SCC 42) shows 52; Roncarelli shows the "not measurable" explanation.

#### Appellate journey is a heuristic

`findRelatedAppellateDecisions` searches appellate corpora for **distinctive party tokens**, because the API's name search needs a substring the indexed name contains — `"Chevron Corp. v. Yaiguaje"` returns nothing, `"Yaiguaje"` returns the right decisions.

Real output for Chevron: `2014 ONCA 40` and `2013 ONCA 758` (genuine appellate history) **plus** `2007 BCCA 557 Gehring v. Chevron Canada` (a false positive sharing a party name). That is inherent to name matching — styles of cause change between levels of court. The UI labels these **"Candidates, not verified history"** and links out to the source. Keep that framing.

---

## 4. Architecture notes

- `App.tsx` is still a ~800-line monolith holding all state. `ViewMode` is now a 4-way union with a `VIEW_TABS` array; SCC-derived views and external-corpus views are visually separated by a divider in the nav.
- New analytics live in `utils/insights.ts` (direction, absence, coalitions) and `utils/comparative.ts` (Spaeth crosswalk), kept out of `utils/analytics.ts` so the diff stays legible.
- `services/a2ajService.ts` is independently failable and caches coverage, searches, and citation lookups for the session.
- `Array.from(map.values())` inferred as `unknown[]` in this TS config; `CanadaMap` uses `map.forEach` with an explicit array instead. Not worth chasing further.

---

## 5. What's still open

**High value, not done:**

1. **Gzip the GCS bucket.** Still the biggest single win and it needs no code — the bucket serves **4.68 MB uncompressed**; gzipped it is **0.97 MB (4.8×)**. `JusticesPresent.csv` alone compresses 9.7×.
   ```bash
   gsutil -m setmeta -h "Content-Encoding:gzip" -h "Cache-Control:public,max-age=86400" "gs://scc-dashboard-dataset-2023/dataset/*.csv"
   ```
   (files must be uploaded pre-gzipped). **Also upload `MissingJustices.csv`** if it should be a required rather than optional file — it is currently present on the bucket and loads fine.

2. **Load real SCOTUS data** into the comparative page from the [Supreme Court Database](http://scdb.wustl.edu/) export, joined on `issueAreaUS`. This is the intended completion of §3.7 and the reason it's framed conservatively today.

3. **Defer the heavy CSVs.** `Votes.csv` (1.8 MB) and `JusticesPresent.csv` (1.2 MB) are only needed for the Justices view and alignment section, but block first paint. ~107k rows are parsed synchronously on the main thread.

4. **Code-split.** The bundle is 889 KB (256 KB gzipped) in one chunk; the four top-level views are natural `React.lazy` boundaries.

**Lower priority:**

- No tests. `scripts/verify-*.mjs` are sanity harnesses, not assertions — worth promoting to real tests with a runner.
- `App.tsx` would benefit from a `DataContext` and moving ~200 lines of inline Terms-of-Use JSX to a constant.
- Tailwind is loaded from CDN (`cdn.tailwindcss.com`), which is not intended for production.
- `utils/justiceMap.ts` maps names by hand with a heuristic fallback; some justices still render as initials (`B. Laskin`).

**Explicitly out of scope (per instruction):** full decision text. Not retrieved, not displayed, stripped at the service boundary. Revisit only alongside §2.

---

## 6. Sources

- **SCC data:** Veel, Glowach, Alarie & Green, *Lenczner Slaght Supreme Court of Canada Database*, Release 2026.01 — <https://www.supremecourtdatabase.com>
- **Coding Manual** (direction codes, §49 vote types, §54 coalitions, Appendix E): <https://litigate.com/assets/uploads/20230823-142619-1764-SCC-Database-Coding-Manual-2023.01.pdf>
- **A2AJ:** <https://www.a2aj.ca/> · API <https://api.a2aj.ca/docs> · bulk <https://huggingface.co/datasets/a2aj/canadian-case-law>
- **US Supreme Court Database (Spaeth):** <http://scdb.wustl.edu/>
- **CanLII API** (considered, not used — metadata-only, key-gated, bulk access is a restricted pilot): <https://github.com/canlii/API_documentation>
