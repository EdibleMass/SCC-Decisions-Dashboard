import React, { useMemo, useState } from 'react';
import { VoteData, JusticeData } from '../types';
import { computeCoalitions } from '../utils/insights';

interface Props {
  votes: VoteData[];
  justices: JusticeData[];
}

type Tab = 'leaders' | 'pairs';

/**
 * Opinion-coalition structure from `justiceSignedOnWith`.
 *
 * The agreement matrix asks "did these two justices land on the same side of
 * the result?" This asks a different and sharper question: whose reasons did
 * the rest of the bench actually sign? Two justices can both sit in the
 * majority while joining entirely different opinions.
 *
 * Coding Manual §54 caveat: where an opinion is co-authored or is a judgment of
 * the Court with no named author, the *most senior* justice (lowest ID) is
 * recorded. These edges therefore mean "joined the reasons led by X", which is
 * not always the same as "co-wrote with X".
 */
const CoalitionLeaderboard: React.FC<Props> = ({ votes, justices }) => {
  const [tab, setTab] = useState<Tab>('leaders');

  const { edges, influence } = useMemo(
    () => computeCoalitions(votes, justices, 5),
    [votes, justices]
  );

  if (!influence.length) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex items-center justify-center text-slate-400 text-sm">
        No coalition data for this period.
      </div>
    );
  }

  const maxReceived = Math.max(...influence.map(i => i.joinsReceived), 1);
  const maxEdge = Math.max(...edges.map(e => e.count), 1);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-serif text-scc-blue mb-1">Opinion Coalitions</h3>
          <p className="text-sm text-gray-500">
            Who writes the reasons the rest of the bench signs on to.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setTab('leaders')}
            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${
              tab === 'leaders' ? 'bg-white text-scc-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Opinion leaders
          </button>
          <button
            onClick={() => setTab('pairs')}
            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${
              tab === 'pairs' ? 'bg-white text-scc-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Strongest pairs
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-1 min-h-0">
        {tab === 'leaders' ? (
          <>
            <div className="flex items-center gap-2 px-1 pb-1 mb-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="w-36 shrink-0">Justice</div>
              <div className="flex-grow">Joins received</div>
              <div className="w-12 shrink-0 text-right">Recv</div>
              <div className="w-12 shrink-0 text-right">Given</div>
              <div className="w-14 shrink-0 text-right" title="Joins received as a share of all joins involving this justice">
                Lead %
              </div>
            </div>
            {influence.map((i) => (
              <div
                key={i.justiceID}
                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-slate-50"
                title={`${i.justiceName}: ${i.joinsReceived} joins received from ${i.distinctJoiners} distinct justices; joined others ${i.joinsGiven} times`}
              >
                <div className="w-36 shrink-0 text-xs text-slate-600 truncate">{i.justiceName}</div>
                <div className="flex-grow h-4 bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-scc-blue rounded-sm"
                    style={{ width: `${(i.joinsReceived / maxReceived) * 100}%` }}
                  />
                </div>
                <div className="w-12 shrink-0 text-right text-xs font-mono font-semibold text-slate-700">
                  {i.joinsReceived}
                </div>
                <div className="w-12 shrink-0 text-right text-xs font-mono text-slate-400">
                  {i.joinsGiven}
                </div>
                <div className="w-14 shrink-0 text-right text-xs font-mono font-semibold text-slate-600">
                  {i.leadershipRatio === null ? '—' : `${(i.leadershipRatio * 100).toFixed(0)}%`}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1 pb-1 mb-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="flex-grow">Joiner &rarr; author of reasons</div>
              <div className="w-12 shrink-0 text-right">Times</div>
            </div>
            {edges.slice(0, 80).map((e) => (
              <div
                key={`${e.authorID}-${e.joinerID}`}
                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-slate-50"
              >
                <div className="w-56 shrink-0 text-xs text-slate-600 truncate">
                  <span className="text-slate-500">{e.joinerName}</span>
                  <span className="mx-1 text-slate-300">&rarr;</span>
                  <span className="font-semibold text-slate-800">{e.authorName}</span>
                </div>
                <div className="flex-grow h-4 bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-scc-gold rounded-sm"
                    style={{ width: `${(e.count / maxEdge) * 100}%` }}
                  />
                </div>
                <div className="w-12 shrink-0 text-right text-xs font-mono font-semibold text-slate-700">
                  {e.count}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <p className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed">
        Where reasons are co-authored or issued as a judgment of the Court with no named author, the
        coding manual records the most senior justice on the opinion. Read an edge as &ldquo;joined
        the reasons led by&rdquo; rather than &ldquo;co-wrote with.&rdquo;
      </p>
    </div>
  );
};

export default CoalitionLeaderboard;
