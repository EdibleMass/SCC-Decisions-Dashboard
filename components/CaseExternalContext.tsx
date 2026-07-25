import React, { useState } from 'react';
import { CaseData } from '../types';
import {
  lookupByCitation,
  findRelatedAppellateDecisions,
  supportsCitationCount,
  CaseSummary,
  RelatedDecision,
} from '../services/a2ajService';

interface Props {
  caseData: CaseData;
}

/**
 * Optional external context for a single case, drawn from the A2AJ API:
 * downstream citation count, and candidate appellate decisions from the same
 * proceeding.
 *
 * Deliberately OPT-IN. Nothing here fires until the user clicks, so the case
 * modal never blocks on, or fails because of, a third-party service. The rest
 * of the dashboard runs entirely off the local dataset and stays that way.
 *
 * No decision text is retrieved — see stripText() in a2ajService.
 */
const CaseExternalContext: React.FC<Props> = ({ caseData }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const [self, setSelf] = useState<CaseSummary | null>(null);
  const [related, setRelated] = useState<RelatedDecision[]>([]);

  const citation = (caseData.neutralCitation || '').trim() || (caseData.scrCitation || '').trim();
  const countAvailable = supportsCitationCount(caseData.neutralCitation);
  const year = parseInt((caseData.dateDecisionGiven || '').match(/(19|20)\d{2}/)?.[0] || '', 10);

  const load = async () => {
    setState('loading');
    setError('');
    try {
      const [selfRes, relRes] = await Promise.allSettled([
        citation ? lookupByCitation(citation) : Promise.resolve(null),
        findRelatedAppellateDecisions(caseData.caseName, Number.isFinite(year) ? year : undefined),
      ]);
      setSelf(selfRes.status === 'fulfilled' ? selfRes.value : null);
      setRelated(relRes.status === 'fulfilled' ? relRes.value : []);

      if (selfRes.status === 'rejected' && relRes.status === 'rejected') {
        setError('Could not reach the A2AJ service.');
        setState('error');
        return;
      }
      setState('done');
    } catch (e: any) {
      setError(e?.message || 'Unexpected error contacting A2AJ.');
      setState('error');
    }
  };

  return (
    <div className="border-t border-slate-200 pt-5 mt-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Beyond the Supreme Court
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Citation impact and appellate history, from the A2AJ open legal data service.
          </p>
        </div>
        {state === 'idle' && (
          <button
            onClick={load}
            className="px-3 py-1.5 text-xs font-bold rounded-md bg-scc-blue text-white hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap"
          >
            Look up externally
          </button>
        )}
        {state === 'loading' && (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-3.5 h-3.5 border-2 border-slate-200 border-t-scc-blue rounded-full animate-spin" />
            Contacting A2AJ…
          </span>
        )}
      </div>

      {state === 'idle' && (
        <p className="text-xs text-slate-400 italic">
          This queries a third-party service and is not part of the core dataset, so it only runs
          when you ask.
        </p>
      )}

      {state === 'error' && (
        <div className="text-xs bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-amber-800">
          {error} The rest of this case view is unaffected.{' '}
          <button onClick={load} className="underline font-semibold">
            Retry
          </button>
        </div>
      )}

      {state === 'done' && (
        <div className="space-y-4">
          {/* Citation impact */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Downstream citations
            </div>
            {countAvailable && self ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-scc-blue">
                  {self.citingCasesCount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">
                  later decisions cite {self.citation}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong>Not measurable for this case.</strong> A2AJ builds its citation network by
                matching neutral citations (e.g. &ldquo;2008 SCC 9&rdquo;) in decision text.{' '}
                {caseData.neutralCitation?.trim()
                  ? 'This decision was not matched in that network.'
                  : 'This decision predates neutral citations, so it is cited by S.C.R. reference instead and never matches.'}{' '}
                A blank here means <em>unmeasured</em>, not uninfluential — R. v. Oakes returns zero
                by this method.
              </p>
            )}
          </div>

          {/* Appellate journey */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
              Possible appellate history
            </div>
            {related.length === 0 ? (
              <p className="text-xs text-slate-500">
                No candidate appellate decisions found. Coverage is limited to the Ontario, BC, Nova
                Scotia and Yukon courts of appeal, and only from the late 1990s onward.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {related.slice(0, 6).map(r => (
                    <a
                      key={r.citation}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-baseline gap-2 border border-slate-200 rounded-md px-3 py-2 hover:border-scc-blue hover:bg-slate-50 transition-colors"
                    >
                      <span className="font-mono text-[10px] font-bold text-scc-blue shrink-0">
                        {r.dataset}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">
                        {r.citation}
                      </span>
                      <span className="text-xs text-slate-700 truncate flex-grow">{r.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0" title="Party name this result matched on">
                        “{r.matchedOn}”
                      </span>
                    </a>
                  ))}
                </div>
                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2 leading-relaxed">
                  <strong>Candidates, not verified history.</strong> These are name matches on
                  distinctive party names, and the style of cause routinely changes between levels of
                  court. Unrelated proceedings sharing a party name will appear here. Confirm against
                  the linked source before relying on any of them.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseExternalContext;
