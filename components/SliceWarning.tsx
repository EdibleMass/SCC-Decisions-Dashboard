import React from 'react';
import { ISSUE_AREAS } from '../utils/constants';

interface Props {
  /** Cases in the active era + area slice. */
  sliceTotal: number;
  /** Active area code, or 'All'. */
  selectedArea: string;
  /** Clears the area filter. */
  onClear: () => void;
  /** What the warning is about, e.g. "pairwise agreement". */
  subject?: string;
}

/**
 * Warns when the active slice is too thin to support justice-level statistics.
 *
 * Issue areas are severely unbalanced — Criminal Law carries ~1,800 cases while
 * Privacy & Access to Info has 29 in total — and crossing an area with a court
 * era makes it worse: about a third of area/era combinations hold fewer than
 * ten decisions. Case-level panels degrade gracefully at that size, but
 * pairwise measures (agreement, coalitions, absence) are computed over shared
 * cases between two justices, so a thin slice produces confident-looking rates
 * backed by almost nothing.
 *
 * The filter still applies — semantics stay consistent across the dashboard —
 * but the reader is told when not to trust the output.
 */
const SliceWarning: React.FC<Props> = ({ sliceTotal, selectedArea, onClear, subject = 'these statistics' }) => {
  // Only relevant when an area filter is narrowing the slice.
  if (selectedArea === 'All') return null;

  const severe = sliceTotal < 30;
  const caution = sliceTotal < 150;
  if (!caution) return null;

  const areaLabel = ISSUE_AREAS[selectedArea] ?? `Area ${selectedArea}`;

  return (
    <div
      className={`rounded-lg border px-4 py-3 mb-6 text-xs leading-relaxed ${
        severe
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
    >
      <strong>
        {severe ? 'Too few decisions to interpret.' : 'Small sample.'}
      </strong>{' '}
      <strong>{areaLabel}</strong> in this era covers{' '}
      <strong>{sliceTotal.toLocaleString()}</strong> decision{sliceTotal === 1 ? '' : 's'}.{' '}
      {severe ? (
        <>
          {subject.charAt(0).toUpperCase() + subject.slice(1)} are computed over the cases two
          justices heard together, so at this size most pairs share only a handful of decisions —
          or none. Treat anything below as illustrative, not evidence.
        </>
      ) : (
        <>
          {subject.charAt(0).toUpperCase() + subject.slice(1)} rest on the cases two justices heard
          together, which at this size can be very few per pair. Check the shared-case counts before
          drawing conclusions.
        </>
      )}{' '}
      <button onClick={onClear} className="underline font-semibold whitespace-nowrap">
        Clear the area filter
      </button>{' '}
      or widen the era to restore volume.
    </div>
  );
};

export default SliceWarning;
