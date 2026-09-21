import React from 'react';
import { ISSUE_AREAS } from '../utils/constants';

interface Props {
  value: string;                    // 'All' or an issueAreaCan code
  onChange: (value: string) => void;
  /** Case counts per area code within the current era. */
  counts: Record<string, number>;
  /** Cases in the current era, before the area slice. */
  eraTotal: number;
  /** Cases after both filters. */
  sliceTotal: number;
}

/**
 * Issue-area slice for the whole dashboard, sitting beside the era selector.
 *
 * A dropdown rather than a button row: there are 21 areas, and the era
 * selector already wraps to two rows. Counts are shown inline and reflect the
 * *current era*, so the size of a slice is visible before it is chosen — the
 * distribution is severely skewed (Criminal Law is ~28% of the corpus, Privacy
 * & Access to Info is 29 cases in total), and crossing a small area with a
 * short era can leave only a handful of decisions.
 */
const IssueAreaFilter: React.FC<Props> = ({ value, onChange, counts, eraTotal, sliceTotal }) => {
  // Only offer areas that actually appear in the current era, so the user
  // can't pick a guaranteed-empty slice.
  const options = Object.entries(ISSUE_AREAS)
    .map(([code, label]) => ({ code, label, count: counts[code] ?? 0 }))
    .filter(o => o.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  const active = value !== 'All';
  const activeLabel = active ? ISSUE_AREAS[value] ?? `Area ${value}` : '';

  return (
    <div className="flex flex-col gap-2 w-full xl:w-auto">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Legal Area
        </span>
        {active && (
          <button
            onClick={() => onChange('All')}
            className="text-xs px-3 py-1 rounded-full font-bold bg-scc-blue text-white hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
            title="Clear the legal area filter"
          >
            {activeLabel}
            <span aria-hidden="true" className="text-white/70">&times;</span>
          </button>
        )}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full xl:w-64 pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-scc-blue focus:border-scc-blue transition-shadow cursor-pointer"
        aria-label="Filter the dashboard by legal area"
      >
        <option value="All">All Legal Areas ({eraTotal.toLocaleString()})</option>
        {options.map(o => (
          <option key={o.code} value={o.code}>
            {o.label} ({o.count.toLocaleString()})
          </option>
        ))}
      </select>

      <p className="text-[10px] text-slate-400 leading-snug max-w-xs">
        {active ? (
          <>
            <strong className="text-slate-500">{sliceTotal.toLocaleString()}</strong> decision
            {sliceTotal === 1 ? '' : 's'} in this slice. A case can raise more than one issue, so
            area counts overlap slightly and sum to more than the corpus.
          </>
        ) : (
          'Slices every panel below. Counts reflect the selected era.'
        )}
      </p>
    </div>
  );
};

export default IssueAreaFilter;
