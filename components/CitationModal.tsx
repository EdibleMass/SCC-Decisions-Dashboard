import React, { useState } from 'react';

interface CitationModalProps {
  onClose: () => void;
}

const CitationModal: React.FC<CitationModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const citations = [
    {
      label: "Visualizations & Interactive Tools",
      text: "Zhang, Kevin. (2025). SCC Decisions Dashboard (v1.2.0) [Web Application]."
    },
    {
      label: "Underlying Data",
      text: "Veel, P.-E., Glowach, K., Alarie, B., & Green, A. (2023). Lenczner Slaght Supreme Court of Canada Database (Release 2023.01). www.supremecourtdatabase.com."
    },
    {
      label: "Example Footnote",
      text: "Generated using 'SCC Decisions Dashboard' (2025) by K. Zhang, utilizing data from the Lenczner Slaght Supreme Court Database."
    }
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index.toString());
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white max-w-2xl w-full rounded-xl shadow-2xl p-8 relative">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">How to Cite</h3>
        <p className="text-slate-500 mb-6 text-sm">
            Please use the following formats when referencing this dashboard or its data in academic or professional work.
        </p>

        <div className="space-y-6">
            {citations.map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 group relative">
                    <p className="text-xs font-bold text-scc-blue uppercase tracking-wider mb-2">{item.label}</p>
                    <p className="font-mono text-sm text-slate-700 pr-8">{item.text}</p>
                    
                    <button
                        onClick={() => handleCopy(item.text, idx)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-scc-gold transition-colors"
                        title="Copy to clipboard"
                    >
                        {copied === idx.toString() ? (
                            <span className="text-green-600 font-bold text-xs">Copied!</span>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        )}
                    </button>
                </div>
            ))}
        </div>

        <div className="mt-8 text-center pt-6 border-t border-slate-100">
            <button 
                onClick={onClose} 
                className="bg-slate-900 text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default CitationModal;