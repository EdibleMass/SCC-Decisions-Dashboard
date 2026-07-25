import React from 'react';

interface UserGuideModalProps {
  onClose: () => void;
}

const UserGuideModal: React.FC<UserGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl relative flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
           <h2 className="text-2xl font-serif font-bold text-scc-blue">SCC Decisions Dashboard: User Guide</h2>
           <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-full"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-8 overflow-y-auto space-y-8 text-slate-700 leading-relaxed font-sans">
            
            {/* Overview */}
            <section>
                <h3 className="text-xl font-bold text-slate-900 mb-2 border-l-4 border-scc-gold pl-3">Overview</h3>
                <p>
                    The SCC Decisions Dashboard is an interactive legal analytics platform that transforms over 70 years (1954–2025) of Supreme Court of Canada data into actionable insights. It serves as a "Digital Twin" of the Court, allowing researchers, students, and practitioners to visualize judicial behavior, consensus patterns, and case outcomes beyond simple text analysis.
                </p>
            </section>

            <div className="h-px bg-slate-100 w-full"></div>

            {/* 1. Core Navigation */}
            <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-scc-blue pl-3">1. Core Navigation</h3>
                <p className="mb-4">The dashboard operates in two distinct viewing modes, selectable via the top navigation bar:</p>
                
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="font-bold text-scc-blue mb-1">A. Court Overview (Macro View)</h4>
                        <p className="text-sm mb-2">
                            This is the default landing view. It provides high-level statistics regarding the Court as an institution during a selected timeframe.
                        </p>
                        <p className="text-xs text-slate-500 italic"><strong>Best for:</strong> Understanding systemic trends, wait times, reversal rates, and subject matter distribution.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="font-bold text-scc-blue mb-1">B. Justices & Comparison (Micro View)</h4>
                        <p className="text-sm mb-2">
                            This view focuses on specific judges. It allows you to select a "Primary Justice" to analyze their voting record, ideology, and writing habits, or select a second justice to run a direct "Head-to-Head" comparison.
                        </p>
                        <p className="text-xs text-slate-500 italic"><strong>Best for:</strong> Biographies, analyzing specific rivalries, or understanding a judge's ideological leaning.</p>
                    </div>
                </div>
            </section>

            {/* 2. Control Ribbon */}
            <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-scc-blue pl-3">2. The Control Ribbon (Global Filters)</h3>
                <p className="mb-4">Located immediately below the navigation bar, this is the most important control mechanism.</p>
                <ul className="list-disc list-inside space-y-2 text-sm ml-2">
                    <li><strong>Era Selection:</strong> The dashboard requires context. Use the buttons to filter data by Chief Justice eras (e.g., Laskin, McLachlin, Wagner).</li>
                    <li className="list-none ml-4 text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100 mt-1">
                        <strong>Note:</strong> Complex visualizations like the Network Graph require a specific era to be selected to function meaningfuly.
                    </li>
                    <li><strong>Pre-Charter vs. Charter:</strong> Eras are color-coded to distinguish between the pre-1982 (Blue) and post-1982 (Gold) legal landscapes.</li>
                </ul>
            </section>

             {/* 3. Visualizations */}
             <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-scc-blue pl-3">3. Key Visualizations & Modules</h3>
                
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-lg text-slate-800 mb-2">The Bench Alignment Protocol (Network Graph)</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                            <li><strong>What it is:</strong> A physics-based simulation where Justices are represented as nodes.</li>
                            <li><strong>How to read it:</strong> Nodes are pulled together by agreement and pushed apart by disagreement.</li>
                            <li><strong>Clusters:</strong> Tightly packed groups indicate voting blocs (e.g., a conservative majority vs. liberal dissenters).</li>
                            <li><strong>Colors:</strong> Blue nodes represent the dominant bloc; Red nodes represent the secondary/dissenting bloc.</li>
                            <li><strong>Interaction:</strong> Drag nodes to rearrange the physics; use the slider to change the "Agreement Threshold" (e.g., only show links between judges who agree &gt;90% of the time).</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-lg text-slate-800 mb-2">Ideological Compass</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                            <li><strong>What it is:</strong> A scatterplot mapping a Justice's voting record.</li>
                            <li><strong>How to read it:</strong></li>
                            <li className="list-none ml-6"><strong>Y-Axis (Civil/Criminal):</strong> Up is Pro-State (Conservative), Down is Pro-Accused (Liberal).</li>
                            <li className="list-none ml-6"><strong>X-Axis (Economic):</strong> Right is Pro-Business, Left is Pro-Individual.</li>
                        </ul>
                    </div>

                    <div>
                         <h4 className="font-bold text-lg text-slate-800 mb-2">Outcome Predictors</h4>
                         <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                            <li><strong>Wait Time Estimator:</strong> Shows the distribution of months between oral argument and judgment delivery, filtered by legal area.</li>
                            <li><strong>Reversal Rate Calculator:</strong> Displays how often the SCC overturns decisions from specific provincial courts.</li>
                            <li><strong>David vs. Goliath:</strong> Calculates win rates for specific matchups (e.g., Individual vs. Federal Government).</li>
                         </ul>
                    </div>

                    <div>
                         <h4 className="font-bold text-lg text-slate-800 mb-2">Comparison Matrix</h4>
                         <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                            <li><strong>What it is:</strong> A heatmap showing the exact percentage of time every judge agrees with every other judge.</li>
                            <li><strong>How to read it:</strong> Darker blue squares indicate near-total agreement; Gold squares indicate frequent disagreement.</li>
                         </ul>
                    </div>
                </div>
            </section>

            {/* 4. Search & Deep Dives */}
            <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-scc-blue pl-3">4. Search & Deep Dives</h3>
                <ul className="list-disc list-inside text-sm space-y-2 ml-2">
                    <li><strong>Global Search (Cmd/Ctrl + K):</strong> Instantly find specific cases by name or citation (e.g., "R. v. Oakes").</li>
                    <li><strong>Case Details:</strong> Clicking any case in a list opens a dossier containing:
                        <ul className="list-disc list-inside ml-6 mt-1 text-slate-600">
                            <li><strong>Opinion Tree:</strong> Visualizes who wrote the majority, who concurred, and who dissented.</li>
                            <li><strong>Timeline:</strong> Tracks the duration of the case.</li>
                            <li><strong>Comparison Mode:</strong> Allows you to select a second case ("Tale of the Tape") to compare metrics side-by-side.</li>
                        </ul>
                    </li>
                </ul>
            </section>

            {/* Data Source */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs text-slate-500">
                <strong>Data Source:</strong> This dashboard utilizes the Lenczner Slaght Supreme Court of Canada Database. While accurate, it is a historical dataset; always cross-reference with official judgments.
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center flex-shrink-0">
             <button 
                onClick={onClose} 
                className="bg-scc-blue text-white px-8 py-2 rounded-lg text-sm font-bold hover:bg-blue-900 transition-colors shadow-sm"
            >
                Return to Dashboard
            </button>
        </div>
      </div>
    </div>
  );
};

export default UserGuideModal;