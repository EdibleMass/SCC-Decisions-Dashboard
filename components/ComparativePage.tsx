import React, { useMemo } from 'react';
import { CaseData, IssueData } from '../types';
import {
  computeUsIssueAreaProfile,
  computeUsDispositionProfile,
  computeUsReversalRate,
} from '../utils/comparative';
import { US_DISPOSITIONS } from '../utils/constants';

interface Props {
  cases: CaseData[];
  issues: IssueData[];
}

/**
 * Comparative view: the SCC expressed in the US Supreme Court Database's own
 * coding scheme.
 *
 * ---------------------------------------------------------------------------
 * CAVEATS — this page shows the SCC side of a comparison, not the comparison
 * ---------------------------------------------------------------------------
 * The Lenczner Slaght dataset carries populated Spaeth crosswalk columns, so we
 * can render Canadian caseload and outcomes on the US scheme. We deliberately
 * do NOT ship hardcoded SCOTUS numbers alongside them, because:
 *
 *   1. The two courts' jurisdictions differ structurally. SCOTUS is almost
 *      entirely certiorari-driven and hears ~60-70 cases a year; the SCC hears
 *      appeals as of right in criminal matters and decides roughly 50-80.
 *      A raw reversal-rate gap mostly measures docket control, not doctrine.
 *   2. Spaeth's issue areas were designed around US constitutional structure.
 *      "First Amendment" and "Federalism" do not map cleanly onto Charter and
 *      division-of-powers litigation even when a crosswalk code was assigned.
 *   3. Live SCOTUS figures should be loaded from the Supreme Court Database
 *      itself rather than frozen into this bundle where they would silently go
 *      stale.
 *
 * The intended next step is to load SCDB's own export and render both series
 * side by side — see handoff.md. Until then this page is framed as "the SCC in
 * US coding terms", which is honest about what is actually on screen.
 */
const ComparativePage: React.FC<Props> = ({ cases, issues }) => {
  const areaProfile = useMemo(() => computeUsIssueAreaProfile(cases, issues), [cases, issues]);
  const dispositions = useMemo(
    () => computeUsDispositionProfile(cases, US_DISPOSITIONS),
    [cases]
  );
  const reversal = useMemo(() => computeUsReversalRate(cases), [cases]);

  const maxIssues = Math.max(...areaProfile.map(a => a.sccIssues), 1);
  const maxDisp = Math.max(...dispositions.map(d => d.count), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">
            Comparative: the SCC in US Coding Terms
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            Canadian decisions expressed on the US Supreme Court Database (Spaeth) scheme.
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-2xl font-bold text-slate-800 leading-none">
              {reversal.rate === null ? '—' : `${(reversal.rate * 100).toFixed(1)}%`}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">
              lower court disturbed
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-scc-blue leading-none">
              {reversal.n.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">
              cases coded
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-2">Why this page exists</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          The Lenczner Slaght SCC Database was built to mirror the{' '}
          <a
            href="http://scdb.wustl.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-scc-blue underline hover:text-scc-gold"
          >
            US Supreme Court Database
          </a>
          , and carries parallel US-coded columns — <code className="text-xs bg-white px-1 rounded border">issueAreaUS</code>,{' '}
          <code className="text-xs bg-white px-1 rounded border">caseDispositionUS</code>,{' '}
          <code className="text-xs bg-white px-1 rounded border">decisionTypeUS</code> — populated on
          essentially every record. Someone did that crosswalk coding deliberately, and until now
          nothing in this dashboard used it.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-bold text-amber-900 text-sm mb-2">
          What this page does <em>not</em> show
        </h3>
        <p className="text-sm text-amber-800 leading-relaxed">
          These are Canadian figures on an American scale — <strong>not</strong> a head-to-head
          comparison. Live SCOTUS series are not bundled here, deliberately: the two courts&rsquo;
          dockets are structurally different (SCOTUS is almost entirely certiorari-driven, while the
          SCC hears criminal appeals as of right), so a raw reversal-rate gap would mostly measure
          docket control rather than anything doctrinal. Spaeth&rsquo;s categories also carry US
          constitutional assumptions — &ldquo;First Amendment&rdquo; and &ldquo;Federalism&rdquo; do
          not map cleanly onto Charter and division-of-powers litigation.
        </p>
        <p className="text-xs text-amber-700 mt-2">
          Adding the real SCOTUS series from the SCDB export is the intended next step; see
          handoff.md.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue areas */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <h3 className="text-xl font-serif text-scc-blue mb-1">Caseload by US Issue Area</h3>
          <p className="text-sm text-gray-500 mb-4">
            SCC issues mapped onto Spaeth&rsquo;s 14 categories.
          </p>
          <div className="space-y-1">
            {areaProfile.map(a => (
              <div key={a.areaCode} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-slate-50">
                <div className="w-36 shrink-0 text-xs text-slate-600 truncate" title={a.areaName}>
                  {a.areaName}
                </div>
                <div className="flex-grow h-4 bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-scc-blue/70 rounded-sm"
                    style={{ width: `${(a.sccIssues / maxIssues) * 100}%` }}
                  />
                </div>
                <div className="w-14 shrink-0 text-right font-mono text-xs font-semibold text-slate-700">
                  {a.sccIssues.toLocaleString()}
                </div>
                <div
                  className="w-12 shrink-0 text-right font-mono text-[10px] text-slate-400"
                  title="Share of cases in this area where the lower court was disturbed"
                >
                  {a.sccReversalRate === null ? '—' : `${(a.sccReversalRate * 100).toFixed(0)}%`}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
            Right-hand column is the share of cases in that area where the lower court was reversed,
            vacated, or varied, on the Spaeth disposition scheme.
          </p>
        </div>

        {/* Dispositions */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <h3 className="text-xl font-serif text-scc-blue mb-1">Outcomes on the Spaeth Scheme</h3>
          <p className="text-sm text-gray-500 mb-4">
            How SCC dispositions distribute across US disposition codes.
          </p>
          <div className="space-y-1">
            {dispositions.map(d => (
              <div key={d.code} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-slate-50">
                <div className="w-8 shrink-0 font-mono text-[11px] text-slate-400">{d.code}</div>
                <div className="w-40 shrink-0 text-xs text-slate-600 truncate" title={d.label}>
                  {d.label}
                </div>
                <div className="flex-grow h-4 bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-scc-gold rounded-sm"
                    style={{ width: `${(d.count / maxDisp) * 100}%` }}
                  />
                </div>
                <div className="w-14 shrink-0 text-right font-mono text-xs font-semibold text-slate-700">
                  {d.count.toLocaleString()}
                </div>
                <div className="w-10 shrink-0 text-right font-mono text-[10px] text-slate-400">
                  {(d.share * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-500 leading-relaxed">
        <p className="font-bold text-slate-600 mb-1">Sources</p>
        <p>
          Canadian coding: Lenczner Slaght Supreme Court of Canada Database. US coding scheme:
          Harold J. Spaeth et al.,{' '}
          <a href="http://scdb.wustl.edu/" target="_blank" rel="noopener noreferrer" className="underline hover:text-scc-blue">
            The Supreme Court Database
          </a>
          , Washington University Law. Crosswalk codes are as supplied in the Canadian dataset; this
          dashboard does not re-code them.
        </p>
      </div>
    </div>
  );
};

export default ComparativePage;
