import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { CaseData, IssueData } from '../types';
import { computeDirectionTimeline } from '../utils/insights';
import DirectionCaveat from './DirectionCaveat';

interface Props {
  cases: CaseData[];
  issues: IssueData[];
}

/**
 * Share of issue holdings coded Liberal, by year of decision.
 *
 * A rolling mean is offered alongside the raw series because annual counts are
 * small (the Court decides a few dozen appeals a year) and the year-over-year
 * line is dominated by sampling noise.
 */
const IdeologyTimeline: React.FC<Props> = ({ cases, issues }) => {
  const [smooth, setSmooth] = useState(true);

  const data = useMemo(() => {
    const raw = computeDirectionTimeline(cases, issues);

    // Centred 5-year rolling mean over years that have a defined share.
    const withRolling = raw.map((point, i) => {
      const window = raw.slice(Math.max(0, i - 2), Math.min(raw.length, i + 3))
        .filter(p => p.liberalShare !== null);
      const rolling = window.length
        ? window.reduce((s, p) => s + (p.liberalShare as number), 0) / window.length
        : null;
      return {
        ...point,
        liberalPct: point.liberalShare === null ? null : point.liberalShare * 100,
        rollingPct: rolling === null ? null : rolling * 100,
      };
    });
    return withRolling;
  }, [cases, issues]);

  const summary = useMemo(() => {
    const lib = data.reduce((s, p) => s + p.liberal, 0);
    const con = data.reduce((s, p) => s + p.conservative, 0);
    const uns = data.reduce((s, p) => s + p.unspecifiable, 0);
    return { lib, con, uns, share: lib + con > 0 ? (lib / (lib + con)) * 100 : null };
  }, [data]);

  if (!data.length) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex items-center justify-center text-slate-400">
        No directional coding available for this period.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-serif text-scc-blue mb-1">Ideological Direction Over Time</h3>
          <p className="text-sm text-gray-500">
            Share of coded issue holdings decided in a liberal direction, by year.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800 leading-none">
              {summary.share === null ? '—' : `${summary.share.toFixed(1)}%`}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">
              period average
            </div>
          </div>
          <button
            onClick={() => setSmooth(!smooth)}
            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md border transition-colors ${
              smooth
                ? 'bg-scc-blue text-white border-scc-blue'
                : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
            }`}
            title="Smooth the noisy annual series with a centred 5-year mean"
          >
            5-yr mean
          </button>
        </div>
      </div>

      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} minTickGap={28} />
            <YAxis
              yAxisId="pct"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis yAxisId="count" orientation="right" hide />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(value: any, name: string) => {
                if (value === null || value === undefined) return ['—', name];
                if (name === 'Coded issues') return [value, name];
                return [`${Number(value).toFixed(1)}%`, name];
              }}
              labelFormatter={(y) => `${y}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
            {/* An even split is the natural reference line for this axis. */}
            <ReferenceLine
              yAxisId="pct"
              y={50}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: 'even split', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
            />
            <Bar
              yAxisId="count"
              dataKey="coded"
              name="Coded issues"
              fill="#e2e8f0"
              barSize={6}
              isAnimationActive={false}
            />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="liberalPct"
              name="Liberal share"
              stroke="#1d4ed8"
              strokeWidth={smooth ? 1 : 2}
              strokeOpacity={smooth ? 0.28 : 1}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            {smooth && (
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="rollingPct"
                name="5-year mean"
                stroke="#1d4ed8"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-4 text-[11px] text-slate-500">
          <span>
            <strong className="text-blue-700">{summary.lib.toLocaleString()}</strong> liberal
          </span>
          <span>
            <strong className="text-amber-700">{summary.con.toLocaleString()}</strong> conservative
          </span>
          <span>
            <strong className="text-slate-400">{summary.uns.toLocaleString()}</strong> unspecifiable
            (excluded)
          </span>
        </div>
        <DirectionCaveat compact />
      </div>
      <DirectionCaveat />
    </div>
  );
};

export default IdeologyTimeline;
