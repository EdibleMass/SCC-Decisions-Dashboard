import React, { useMemo } from 'react';

interface CaseTimelineProps {
  dateArgument: string;
  dateDecision: string;
}

const CaseTimeline: React.FC<CaseTimelineProps> = ({ dateArgument, dateDecision }) => {
  const stats = useMemo(() => {
    if (!dateArgument || !dateDecision) return null;

    const dArg = new Date(dateArgument);
    const dDec = new Date(dateDecision);

    if (isNaN(dArg.getTime()) || isNaN(dDec.getTime())) return null;

    const diffTime = Math.abs(dDec.getTime() - dArg.getTime());
    const diffMonths = (diffTime / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1);
    
    // Format dates for display
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const argStr = dArg.toLocaleDateString('en-CA', options);
    const decStr = dDec.toLocaleDateString('en-CA', options);

    return { diffMonths, argStr, decStr };
  }, [dateArgument, dateDecision]);

  if (!stats) return null;

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
        <span>Argument</span>
        <span>Judgment</span>
      </div>
      
      <div className="relative flex items-center w-full h-8">
        {/* Left Dot */}
        <div className="w-3 h-3 bg-slate-300 rounded-full z-10"></div>
        
        {/* The Bar */}
        <div className="flex-grow h-0.5 bg-slate-200 relative mx-1">
             {/* Label Pill */}
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold text-scc-blue whitespace-nowrap z-20 shadow-sm">
                 Reserved for {stats.diffMonths} Months
             </div>
        </div>
        
        {/* Right Dot */}
        <div className="w-3 h-3 bg-scc-blue rounded-full z-10 shadow-sm"></div>
      </div>

      <div className="flex items-center justify-between text-sm font-serif text-slate-700 mt-1">
        <span>{stats.argStr}</span>
        <span>{stats.decStr}</span>
      </div>
    </div>
  );
};

export default CaseTimeline;
