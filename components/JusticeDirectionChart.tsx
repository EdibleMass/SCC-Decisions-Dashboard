import React, { useMemo, useState } from 'react';
import { VoteData, JusticeData } from '../types';
import { computeJusticeDirectionProfiles } from '../utils/insights';
import DirectionCaveat from './DirectionCaveat';

interface Props {
  votes: VoteData[];
  justices: JusticeData[];
  /** Optionally highlight one justice (used from the Justices view). */
  highlightJusticeID?: string;
}

/**
 * Per-justice liberal share, ranked. Built from `individualVoteDirection` — the
 * justice's own recorded vote direction — rather than the Court's holding, so a
 * dissenter is scored on how they voted, not on what the majority did.
 *
 * Rendered as a diverging bar around the 50% line: the visual question is
 * "which side of an even split does this justice sit on, and by how much",
 * which a plain 0-100 bar obscures.
 */
const JusticeDirectionChart: React.FC<Props> = ({ votes, justices, highlightJusticeID }) => {
  const [minVotes, setMinVotes] = useState(50);

  const profiles = useMemo(
    () => computeJusticeDirectionProfiles(votes, justices, minVotes),
    [votes, justices, minVotes]
  );

  if (!profiles.length) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex items-center justify-center text-center text-slate-400 text-sm px-8">
        No justice has at least {minVotes} directionally-coded votes in this period.
      </div>
    );
  }

  // Scale bar width against the largest deviation so small real differences
  // stay legible instead of all collapsing toward the centre.
  const maxDev = Math.max(
    ...profiles.map(p => Math.abs((p.liberalShare ?? 0.5) - 0.5)),
    0.05
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-serif text-scc-blue mb-1">Directional Profile by Justice</h3>
          <p className="text-sm text-gray-500">
            Share of each justice&rsquo;s own coded votes cast in a liberal direction.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-slate-500 whitespace-nowrap">
          min votes
          <select
            value={minVotes}
            onChange={(e) => setMinVotes(Number(e.target.value))}
            className="border border-slate-300 rounded-md px-2 py-1 bg-slate-50 font-semibold"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-2 px-1">
        <span className="text-amber-700">&larr; more conservative</span>
        <span className="text-slate-400">even</span>
        <span className="text-blue-700">more liberal &rarr;</span>
      </div>

      <div className="flex-grow overflow-y-auto pr-1 min-h-0">
        {profiles.map((p) => {
          const share = p.liberalShare ?? 0.5;
          const dev = share - 0.5;
          const widthPct = (Math.abs(dev) / maxDev) * 50;
          const isLiberal = dev >= 0;
          const highlighted = p.justiceID === highlightJusticeID;

          return (
            <div
              key={p.justiceID}
              className={`flex items-center gap-2 py-1 px-1 rounded transition-colors ${
                highlighted ? 'bg-scc-gold/10 ring-1 ring-scc-gold/40' : 'hover:bg-slate-50'
              }`}
              title={`${p.justiceName}: ${p.liberal} liberal / ${p.conservative} conservative votes (${p.unspecifiable} unspecifiable, excluded)`}
            >
              <div
                className={`w-36 shrink-0 text-xs truncate ${
                  highlighted ? 'font-bold text-slate-900' : 'text-slate-600'
                }`}
              >
                {p.justiceName}
              </div>

              <div className="flex-grow relative h-4">
                {/* centre line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300" />
                <div
                  className="absolute top-0.5 bottom-0.5 rounded-sm"
                  style={{
                    backgroundColor: isLiberal ? '#1d4ed8' : '#b45309',
                    opacity: highlighted ? 1 : 0.75,
                    left: isLiberal ? '50%' : `${50 - widthPct}%`,
                    width: `${widthPct}%`,
                  }}
                />
              </div>

              <div className="w-12 shrink-0 text-right text-xs font-mono font-semibold text-slate-700">
                {(share * 100).toFixed(0)}%
              </div>
              <div className="w-10 shrink-0 text-right text-[10px] font-mono text-slate-400">
                n={p.coded}
              </div>
            </div>
          );
        })}
      </div>

      <DirectionCaveat />
    </div>
  );
};

export default JusticeDirectionChart;
