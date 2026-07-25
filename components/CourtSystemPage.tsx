import React, { useEffect, useMemo, useState } from 'react';
import CanadaMap, { RegionDatum } from './CanadaMap';
import {
  fetchCoverage,
  CourtCoverage,
  COURT_TO_PROVINCE,
  PROVINCIAL_COURTS,
  FEDERAL_COURTS,
  UNAVAILABLE_PROVINCES,
} from '../services/a2ajService';
import { PROVINCE_MAP } from '../utils/constants';

/**
 * The Court System page — the wider Canadian court landscape, sourced live from
 * the A2AJ Canadian Legal Data API.
 *
 * Kept deliberately separate from the SCC dashboard. The two corpora are not
 * commensurable: the Lenczner Slaght SCC data is *coded* (votes, issues,
 * dispositions, panel composition, ideological direction) while A2AJ is
 * *documents and citations*. Blending them in one view would invite comparisons
 * the data cannot support.
 *
 * Coverage is uneven by province, and that unevenness is presented as a
 * first-class fact rather than hidden — see the map's hatched regions and the
 * gap notice below.
 */
const CourtSystemPage: React.FC = () => {
  const [coverage, setCoverage] = useState<CourtCoverage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState<string>('All');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCoverage()
      .then(c => { if (!cancelled) { setCoverage(c); setError(null); } })
      .catch(e => { if (!cancelled) setError(e?.message || 'Could not reach the A2AJ API.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const provincialCourts = useMemo(
    () => (coverage ?? [])
      .filter(c => (PROVINCIAL_COURTS as readonly string[]).includes(c.dataset))
      .sort((a, b) => b.count - a.count),
    [coverage]
  );

  const federalCourts = useMemo(
    () => (coverage ?? [])
      .filter(c => (FEDERAL_COURTS as readonly string[]).includes(c.dataset))
      .sort((a, b) => b.count - a.count),
    [coverage]
  );

  const otherTribunals = useMemo(
    () => (coverage ?? [])
      .filter(c =>
        !(PROVINCIAL_COURTS as readonly string[]).includes(c.dataset) &&
        !(FEDERAL_COURTS as readonly string[]).includes(c.dataset))
      .sort((a, b) => b.count - a.count),
    [coverage]
  );

  // Province-level rollup for the choropleth. Provinces A2AJ does not cover are
  // included with available:false so the map can hatch them.
  const mapData = useMemo(() => {
    const m = new Map<string, RegionDatum>();

    for (const court of provincialCourts) {
      const prov = COURT_TO_PROVINCE[court.dataset];
      if (!prov || prov === '14') continue;
      const existing = m.get(prov);
      const value = (existing?.value ?? 0) + court.count;
      m.set(prov, {
        id: prov,
        name: PROVINCE_MAP[prov] ?? prov,
        value,
        primaryLabel: `${value.toLocaleString()} decisions`,
        secondaryLabel: '',
        available: true,
      });
    }

    // Second pass for the court-count / year-range subtitle.
    for (const [prov, datum] of m) {
      const courts = provincialCourts.filter(c => COURT_TO_PROVINCE[c.dataset] === prov);
      const earliest = courts.map(c => c.earliest).filter(Boolean).sort()[0] ?? '';
      const latest = courts.map(c => c.latest).filter(Boolean).sort().slice(-1)[0] ?? '';
      datum.secondaryLabel = `${courts.length} court${courts.length === 1 ? '' : 's'} · ${earliest.slice(0, 4)}–${latest.slice(0, 4)}`;
    }

    for (const [prov, name] of Object.entries(UNAVAILABLE_PROVINCES)) {
      if (!m.has(prov)) {
        m.set(prov, { id: prov, name, value: 0, primaryLabel: '', available: false });
      }
    }

    return m;
  }, [provincialCourts]);

  const selectedCourts = useMemo(() => {
    if (selectedProvince === 'All') return provincialCourts;
    return provincialCourts.filter(c => COURT_TO_PROVINCE[c.dataset] === selectedProvince);
  }, [provincialCourts, selectedProvince]);

  const totals = useMemo(() => {
    const prov = provincialCourts.reduce((s, c) => s + c.count, 0);
    const fed = federalCourts.reduce((s, c) => s + c.count, 0);
    const other = otherTribunals.reduce((s, c) => s + c.count, 0);
    return { prov, fed, other, all: prov + fed + other };
  }, [provincialCourts, federalCourts, otherTribunals]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-scc-blue rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Contacting the A2AJ Canadian Legal Data API…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-16 bg-white border border-amber-200 rounded-xl p-8 text-center shadow-sm">
        <h2 className="text-xl font-serif font-bold text-slate-900 mb-2">
          Court system data unavailable
        </h2>
        <p className="text-slate-600 text-sm mb-4">
          This page reads live from an external service (A2AJ). The SCC dashboard is unaffected and
          continues to work from its own dataset.
        </p>
        <p className="font-mono text-xs bg-slate-50 border border-slate-200 rounded p-3 text-slate-500">
          {error}
        </p>
      </div>
    );
  }

  const CourtTable: React.FC<{ rows: CourtCoverage[]; title: string; subtitle: string }> = ({ rows, title, subtitle }) => {
    const max = Math.max(...rows.map(r => r.count), 1);
    return (
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
        <h3 className="text-xl font-serif text-scc-blue mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
        <div className="space-y-1">
          {rows.map(c => (
            <div key={c.dataset} className="flex items-center gap-3 py-1 hover:bg-slate-50 rounded px-1">
              <div className="w-16 shrink-0 font-mono text-[11px] font-bold text-slate-500">{c.dataset}</div>
              <div className="w-56 shrink-0 text-xs text-slate-700 truncate" title={c.descriptionEn}>
                {c.descriptionEn}
              </div>
              <div className="flex-grow h-4 bg-slate-100 rounded-sm overflow-hidden min-w-[40px]">
                <div className="h-full bg-scc-blue/70 rounded-sm" style={{ width: `${(c.count / max) * 100}%` }} />
              </div>
              <div className="w-20 shrink-0 text-right font-mono text-xs font-semibold text-slate-700">
                {c.count.toLocaleString()}
              </div>
              <div className="w-24 shrink-0 text-right font-mono text-[10px] text-slate-400">
                {c.earliest.slice(0, 4)}–{c.latest.slice(0, 4)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">The Canadian Court System</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Decision volume across {coverage?.length ?? 0} courts and tribunals, live from the A2AJ
            Canadian Legal Data API.
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-2xl font-bold text-slate-800 leading-none">{totals.all.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">total decisions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-scc-blue leading-none">{totals.prov.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">provincial</div>
          </div>
        </div>
      </div>

      {/* Coverage honesty notice — the single most important thing on this page. */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-bold text-amber-900 text-sm mb-2">Coverage is uneven — read the map accordingly</h3>
        <p className="text-sm text-amber-800 leading-relaxed">
          A2AJ has deep coverage of <strong>British Columbia</strong>, <strong>Nova Scotia</strong>,
          and the <strong>Ontario Court of Appeal</strong>, plus the Yukon Court of Appeal. It has{' '}
          <strong>no coverage at all</strong> of Alberta, Quebec, Manitoba, Saskatchewan, New
          Brunswick, Newfoundland and Labrador, PEI, the Northwest Territories, or Nunavut — and no
          Ontario Superior Court. Hatched provinces on the map are gaps in the dataset, not
          jurisdictions with few decisions.
        </p>
        <p className="text-xs text-amber-700 mt-2">
          A province&rsquo;s size here reflects what has been digitised and released for bulk access,
          which is a fact about open legal data in Canada — not about how much litigation happens
          there.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <h3 className="text-xl font-serif text-scc-blue mb-1">Decisions by Province</h3>
          <p className="text-sm text-gray-500 mb-4">
            Click an available province to filter the court list.
          </p>
          <div className="h-[420px]">
            <CanadaMap
              data={mapData}
              selectedId={selectedProvince}
              onSelect={setSelectedProvince}
              unavailableNote="No coverage in this dataset"
            />
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-xl shadow-md border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-serif text-scc-blue">
              {selectedProvince === 'All' ? 'All Provincial Courts' : PROVINCE_MAP[selectedProvince]}
            </h3>
            {selectedProvince !== 'All' && (
              <button
                onClick={() => setSelectedProvince('All')}
                className="text-xs text-slate-500 hover:text-scc-blue underline"
              >
                clear
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {selectedCourts.reduce((s, c) => s + c.count, 0).toLocaleString()} decisions across{' '}
            {selectedCourts.length} court{selectedCourts.length === 1 ? '' : 's'}.
          </p>
          <div className="flex-grow overflow-y-auto space-y-2 min-h-0">
            {selectedCourts.map(c => (
              <a
                key={c.dataset}
                href={`https://www.a2aj.ca/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-slate-200 rounded-lg p-3 hover:border-scc-blue hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold text-scc-blue">{c.dataset}</span>
                  <span className="font-mono text-sm font-bold text-slate-800">
                    {c.count.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">{c.descriptionEn}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  {c.earliest} → {c.latest}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <CourtTable
        rows={provincialCourts}
        title="Provincial & Territorial Courts"
        subtitle="Superior, appellate and first-instance courts available for bulk access."
      />
      <CourtTable
        rows={federalCourts}
        title="Federal Courts"
        subtitle="Including the Supreme Court of Canada — note this is full-text coverage, distinct from the coded SCC dataset powering the rest of this dashboard."
      />
      <CourtTable
        rows={otherTribunals}
        title="Administrative Tribunals"
        subtitle="Federal tribunals and boards included in the same corpus."
      />

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-500 leading-relaxed">
        <p className="font-bold text-slate-600 mb-1">Source & licensing</p>
        <p>
          Data retrieved live from{' '}
          <a href="https://www.a2aj.ca/" target="_blank" rel="noopener noreferrer" className="underline hover:text-scc-blue">
            Access to Algorithmic Justice (A2AJ)
          </a>
          , successor to the Refugee Law Lab&rsquo;s Canadian Legal Data project. Bulk data is
          published at{' '}
          <a href="https://huggingface.co/datasets/a2aj/canadian-case-law" target="_blank" rel="noopener noreferrer" className="underline hover:text-scc-blue">
            huggingface.co/datasets/a2aj/canadian-case-law
          </a>
          .
        </p>
        <p className="mt-2">
          A2AJ&rsquo;s own tooling is MIT-licensed, but each decision carries an upstream licence
          from the originating court and <strong>some restrict commercial use</strong>. This page
          displays only counts, court names and coverage dates — no decision text is retrieved or
          reproduced.
        </p>
      </div>
    </div>
  );
};

export default CourtSystemPage;
