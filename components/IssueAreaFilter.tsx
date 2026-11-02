import React from 'react';
import { ISSUE_AREAS } from '../utils/constants';

interface Props {
  value: string;                    // 'All' or an issueAreaCan code
  onChange: (value: string) => void;
  /** Case counts per area code within the current era. */
  counts: Record<string, number>;
  /** Cases in the current era, before the area slice. */
  eraTotal: number;
}

const OVERLAP_NOTE =
  'Slices every panel below. Counts reflect the selected era. A case can raise more ' +
  'than one issue, so area counts overlap slightly and sum to more than the total.';

/**
 * Issue-area slice for the whole dashboard, rendered as a single compact line
 * inside the era selector's header row.
 *
 * The control ribbon is sticky, so every pixel of height it takes is lost on
 * every scroll position. An earlier stacked version (label row, chip row,
 * select, help paragraph) dropped beneath the era rows below the xl breakpoint
 * and pushed the ribbon to roughly 40% of a laptop-height viewport. Everything
 * that version showed is still here, folded into one line:
 *
 *  - the slice size is the selected option's own "(1,802)" count — that number
 *    is exactly the era+area slice, so a separate count line was redundant;
 *  - the active state is the highlighted select plus a clear button, replacing
 *    the separate chip;
 *  - the overlap note lives in the tooltip.
 *
 * A dropdown rather than buttons because there are 21 areas.
 */
const IssueAreaFilter: React.FC<Props> = ({ value, onChange, counts, eraTotal }) => {
  // Only offer areas present in the current era, so an empty slice can't be picked.
  const options = Object.entries(ISSUE_AREAS)
    .map(([code, label]) => ({ code, label, count: counts[code] ?? 0 }))
    .filter(o => o.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  const active = value !== 'All';

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="issue-area-filter"
        className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
      >
        Legal Area
      </label>

      <div className="relative">
        <select
          id="issue-area-filter"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          title={OVERLAP_NOTE}
          className={`appearance-none pl-2.5 pr-7 py-1 text-xs rounded-md border transition-colors cursor-pointer max-w-[16rem] truncate focus:outline-none focus:ring-2 focus:ring-scc-blue ${
            active
              ? 'bg-blue-50 border-scc-blue text-scc-blue font-semibold'
              : 'bg-white border-slate-200 text-slate-600 font-medium hover:border-slate-300'
          }`}
        >
          <option value="All">All Legal Areas ({eraTotal.toLocaleString()})</option>
          {options.map(o => (
            <option key={o.code} value={o.code}>
              {o.label} ({o.count.toLocaleString()})
            </option>
          ))}
        </select>
        <svg
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${active ? 'text-scc-blue' : 'text-slate-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {active && (
        <button
          onClick={() => onChange('All')}
          className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-scc-blue transition-colors text-sm leading-none"
          aria-label="Clear the legal area filter"
          title="Clear the legal area filter"
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default IssueAreaFilter;
