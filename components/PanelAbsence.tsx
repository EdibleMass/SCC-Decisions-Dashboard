import React, { useMemo, useState } from 'react';
import { CaseData, JusticeData, JusticesPresentData, MissingJusticeData } from '../types';
import { computeAbsenceProfiles } from '../utils/insights';

interface Props {
  cases: CaseData[];
  justicesPresent: JusticesPresentData[];
  missingJustices: MissingJusticeData[];
  justices: JusticeData[];
}

type Mode = 'all' | 'full';

/**
 * Panel absence — deliberately NOT labelled "recusal".
 *
 * The SCC hears most appeals in panels of five or seven drawn from nine
 * members, so the overwhelming majority of absences are routine panel
 * assignment and say nothing about conflicts of interest. Reporting a raw
 * absence rate on its own would strongly imply otherwise.
 *
 * The honest signal is absence from a *full nine-justice panel*: when the Court
 * convenes all nine, a member who is not there did not simply lose a rotation.
 * Both denominators are shown side by side so the difference is visible rather
 * than asserted — in this dataset several justices with 50%+ raw absence have
 * 0% full-panel absence.
 */
const PanelAbsence: React.FC<Props> = ({ cases, justicesPresent, missingJustices, justices }) => {
  const [mode, setMode] = useState<Mode>('full');

  const profiles = useMemo(
    () => computeAbsenceProfiles(cases, justicesPresent, missingJustices, justices),
    [cases, justicesPresent, missingJustices, justices]
  );

  const ranked = useMemo(() => {
    const list = [...profiles];
    if (mode === 'full') {
      return list
        .filter(p => p.fullPanelEligible >= 10)
        .sort((a, b) => (b.fullPanelAbsenceRate ?? 0) - (a.fullPanelAbsenceRate ?? 0));
    }
    return list.sort((a, b) => b.absenceRate - a.absenceRate);
  }, [profiles, mode]);

  if (!missingJustices.length) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex items-center justify-center text-center text-slate-400 text-sm px-8">
        Panel absence data (MissingJustices.csv) is unavailable.
      </div>
    );
  }

  const maxRate = Math.max(
    ...ranked.map(p => (mode === 'full' ? p.fullPanelAbsenceRate ?? 0 : p.absenceRate)),
    0.01
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full flex flex-col">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-serif text-scc-blue mb-1">Panel Absence</h3>
          <p className="text-sm text-gray-500">
            How often a sitting member of the Court was not on the panel.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setMode('full')}
            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${
              mode === 'full' ? 'bg-white text-scc-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Full bench only
          </button>
          <button
            onClick={() => setMode('all')}
            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${
              mode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All panels
          </button>
        </div>
      </div>

      <div
        className={`text-xs rounded-lg px-3 py-2 mb-3 leading-relaxed border ${
          mode === 'all'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}
      >
        {mode === 'all' ? (
          <>
            <strong>Read with care.</strong> The Court usually sits in panels of five or seven, so
            most absences here are ordinary panel assignment, not recusal. A high rate in this view
            is largely a statement about how often a justice was rostered.
          </>
        ) : (
          <>
            Restricted to cases with a <strong>nine-justice panel</strong>, where no routine
            trimming took place. Absence from a full bench is the more meaningful signal — though it
            still reflects illness, travel, and vacancy as well as recusal, and the dataset does not
            record a reason.
          </>
        )}
      </div>

      <div className="flex-grow overflow-y-auto pr-1 min-h-0">
        {ranked.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Not enough full-bench cases in this period.
          </div>
        ) : (
          ranked.map((p) => {
            const rate = mode === 'full' ? p.fullPanelAbsenceRate ?? 0 : p.absenceRate;
            const absent = mode === 'full' ? p.fullPanelAbsent : p.absent;
            const eligible = mode === 'full' ? p.fullPanelEligible : p.eligible;
            return (
              <div
                key={p.justiceID}
                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-slate-50"
                title={`${p.justiceName}: absent from ${absent} of ${eligible} eligible ${
                  mode === 'full' ? 'full-bench cases' : 'cases'
                }`}
              >
                <div className="w-36 shrink-0 text-xs text-slate-600 truncate">{p.justiceName}</div>
                <div className="flex-grow h-4 bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${(rate / maxRate) * 100}%`,
                      backgroundColor: mode === 'full' ? '#0f766e' : '#94a3b8',
                    }}
                  />
                </div>
                <div className="w-12 shrink-0 text-right text-xs font-mono font-semibold text-slate-700">
                  {(rate * 100).toFixed(1)}%
                </div>
                <div className="w-16 shrink-0 text-right text-[10px] font-mono text-slate-400">
                  {absent}/{eligible}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PanelAbsence;
