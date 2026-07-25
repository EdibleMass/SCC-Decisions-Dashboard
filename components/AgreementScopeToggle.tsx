import React from 'react';
import { AgreementScope } from '../utils/analytics';

interface Props {
  scope: AgreementScope;
  onChange: (scope: AgreementScope) => void;
  totalCases: number;
  dividedCases: number;
}

/**
 * Switches the agreement metrics between every case and only those where the
 * panel split.
 *
 * This matters more than it looks: most SCC decisions are unanimous, so under
 * 'all' every pair of justices agrees by default in a large majority of cases
 * and the resulting rates cluster near 1.0 — the network graph reads as
 * uniformly hot and tells you very little. Conditioning on divided cases asks
 * the sharper question: when the Court disagreed, who sided with whom?
 */
const AgreementScopeToggle: React.FC<Props> = ({ scope, onChange, totalCases, dividedCases }) => {
  const pct = totalCases > 0 ? ((dividedCases / totalCases) * 100).toFixed(0) : '0';
  const smallSample = scope === 'divided' && dividedCases > 0 && dividedCases < 30;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Measure agreement across
        </span>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => onChange('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              scope === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All cases
            <span className="ml-1.5 font-mono font-normal opacity-60">{totalCases.toLocaleString()}</span>
          </button>
          <button
            onClick={() => onChange('divided')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              scope === 'divided'
                ? 'bg-white text-scc-blue shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Divided only
            <span className="ml-1.5 font-mono font-normal opacity-60">{dividedCases.toLocaleString()}</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
        {scope === 'all' ? (
          <>
            Only <strong>{pct}%</strong> of cases in this slice were decided over a dissent. Across
            all cases, every pair of justices agrees by default whenever the Court is unanimous, so
            agreement rates cluster high and differences between justices compress.{' '}
            <button
              onClick={() => onChange('divided')}
              className="text-scc-blue font-semibold underline hover:text-scc-gold transition-colors"
            >
              Switch to divided cases
            </button>{' '}
            to see who sides with whom when the Court actually splits.
          </>
        ) : (
          <>
            Restricted to the <strong>{dividedCases.toLocaleString()}</strong> case
            {dividedCases === 1 ? '' : 's'} ({pct}% of this slice) where at least one justice voted
            against the result. This is the discriminating measure — rates spread far wider than
            the all-cases view, so adjust the threshold below accordingly.
          </>
        )}
      </p>

      {smallSample && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <strong>Small sample:</strong> only {dividedCases} divided case
          {dividedCases === 1 ? '' : 's'} in this era. Pairwise rates here are unstable — widen the
          era selection before drawing conclusions.
        </p>
      )}
    </div>
  );
};

export default AgreementScopeToggle;
