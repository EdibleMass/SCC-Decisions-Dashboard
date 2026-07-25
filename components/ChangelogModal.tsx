import React from 'react';

interface ChangelogModalProps {
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose }) => {
  const changes = [
    {
      version: "v2.0.0",
      desc: "Upgraded the database to the newest version of the Lenczer Slaght Supreme Court of Canada Dataset. Longitudinal scope expanded with decisions and voting metadata extending up to 2025. Updated all judicial indicators, timeline modules, and outcome predictors accordingly."
    },
    {
      version: "v1.3.1",
      desc: "Corrected sorting order for Precedent Tracker (now strictly chronological). Fixed display name inconsistencies for Justices Jamal and Côté."
    },
    {
      version: "v1.3.0",
      desc: "Added Multi-Issue Case View: Complex cases now display tabs for separate legal issues, allowing users to toggle between specific legal questions (e.g., Criminal vs. Constitutional) to see accurate voting splits per issue. Fixed layout obstruction on Case Detail modal."
    },
    {
      version: "v1.2.1",
      desc: "Corrected an issue where statistics and vote counts were inflated for cases involving multiple legal issues."
    },
    { 
      version: "v1.2.0", 
      desc: 'Fixed bug where justices were being incorrectly listed as "concurring" instead of "majority" on individual case previews.' 
    },
    { 
      version: "v1.1.0", 
      desc: "Revised weighted graph spacings and community detection method." 
    },
    { 
      version: "v1.0", 
      desc: "Initial deployment." 
    },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white max-w-lg w-full rounded-xl shadow-2xl p-6 relative">
        <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h3 className="text-xl font-serif font-bold text-slate-900 mb-6">Changelog</h3>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {changes.map((item, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-slate-200">
                    <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${idx === 0 ? 'bg-scc-blue' : 'bg-slate-300'}`}></div>
                    <div className="mb-1">
                        <span className={`font-mono text-sm font-bold ${idx === 0 ? 'text-scc-blue' : 'text-slate-500'}`}>
                            {item.version}
                        </span>
                        {idx === 0 && <span className="ml-2 text-[10px] bg-scc-blue text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Current</span>}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        {item.desc}
                    </p>
                </div>
            ))}
        </div>

        <div className="mt-8 text-center pt-4 border-t border-slate-100">
            <button
                onClick={onClose}
                className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;