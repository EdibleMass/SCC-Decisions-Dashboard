import React, { useState } from 'react';

/**
 * The liberal/conservative axis is the most easily misread variable in the
 * dataset, so every panel built on it carries this disclosure. The wording is
 * drawn from the Coding Manual's own framing (Appendix E), which introduces the
 * axis by conceding it "is often ambiguous and can be overly simplistic" and
 * notes it exists largely for parity with the US Supreme Court Database.
 */
const DirectionCaveat: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-slate-400 hover:text-slate-600 underline decoration-dotted transition-colors"
        title="How this axis is coded"
      >
        How is &ldquo;direction&rdquo; coded?
      </button>
    );
  }

  return (
    <div className="mt-3 text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-semibold transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
        On reading this axis
      </button>
      {open && (
        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 leading-relaxed space-y-2">
          <p>
            Direction is coded per issue as <strong>Liberal</strong>, <strong>Conservative</strong>,
            or <strong>Unspecifiable</strong>, following Appendix E of the Lenczner Slaght Coding
            Manual. Broadly, &ldquo;liberal&rdquo; marks outcomes favouring an accused person, a
            rights claimant, a union, a consumer, a debtor, an Indigenous party, or environmental
            protection; &ldquo;conservative&rdquo; marks the reverse.
          </p>
          <p>
            The manual is candid that this characterization{' '}
            <em>&ldquo;is often ambiguous and can be overly simplistic&rdquo;</em> and that it was
            adopted mainly for parity with the US Supreme Court Database. Treat these figures as a
            coarse descriptive summary of coded outcomes, not as a measure of any judge&rsquo;s
            politics.
          </p>
          <p className="text-slate-500">
            Issues coded <strong>Unspecifiable</strong> are shown but excluded from every
            percentage, so a reported share always means &ldquo;of the issues where a direction
            could be assigned.&rdquo;
          </p>
        </div>
      )}
    </div>
  );
};

export default DirectionCaveat;
