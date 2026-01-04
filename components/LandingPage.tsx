import React, { useState } from 'react';
import CitationModal from './CitationModal';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [showTerms, setShowTerms] = useState(false);
  const [showCitation, setShowCitation] = useState(false);

  const handleEnter = () => {
    window.scrollTo(0, 0);
    onEnter();
  };

  const scrollToContributors = () => {
    const section = document.getElementById('contributors');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-scc-gold selection:text-white overflow-x-hidden relative animate-fade-in">
      
      {/* 1. HERO SECTION */}
      <section className="relative h-screen flex flex-col items-center justify-center bg-slate-900 text-white overflow-hidden px-6">
        {/* Abstract Background Animation: Network/Citation Tree */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
           <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
              {/* Central Root */}
              <circle cx="400" cy="550" r="4" fill="currentColor" className="animate-pulse" />
              <line x1="400" y1="550" x2="400" y2="450" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
              
              {/* Level 1 Nodes */}
              <circle cx="400" cy="450" r="6" fill="currentColor" />
              
              {/* Branches L1 -> L2 */}
              <line x1="400" y1="450" x2="300" y2="350" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
              <line x1="400" y1="450" x2="500" y2="350" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
              <line x1="400" y1="450" x2="400" y2="300" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />

              {/* Level 2 Nodes */}
              <circle cx="300" cy="350" r="5" fill="currentColor" className="animate-pulse delay-75" />
              <circle cx="500" cy="350" r="5" fill="currentColor" className="animate-pulse delay-150" />
              <circle cx="400" cy="300" r="5" fill="currentColor" className="animate-pulse delay-100" />

              {/* Branches L2 -> L3 (Complex Web) */}
              <line x1="300" y1="350" x2="200" y2="200" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
              <line x1="300" y1="350" x2="280" y2="180" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
              <line x1="500" y1="350" x2="550" y2="200" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
              <line x1="500" y1="350" x2="480" y2="150" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
              
              {/* Level 3 Nodes (Scattered) */}
              <circle cx="200" cy="200" r="3" fill="currentColor" opacity="0.8" />
              <circle cx="280" cy="180" r="3" fill="currentColor" opacity="0.8" />
              <circle cx="550" cy="200" r="3" fill="currentColor" opacity="0.8" />
              <circle cx="480" cy="150" r="3" fill="currentColor" opacity="0.8" />
              
              {/* Cross Connections (Citation Network) */}
              <line x1="200" y1="200" x2="400" y2="300" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.2" strokeDasharray="4 4" />
              <line x1="550" y1="200" x2="400" y2="300" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.2" strokeDasharray="4 4" />
           </svg>
        </div>

        <div className="relative z-10 max-w-5xl text-center space-y-8 animate-fade-in-up">
            <div className="inline-block mb-4">
                <span className="px-3 py-1 border border-scc-gold text-scc-gold text-xs font-mono tracking-[0.2em] uppercase">
                    Vol. 1 • 1954 - 2022
                </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight leading-tight">
                A Mapping of <br/> <span className="text-slate-400 italic font-serif">Canadian</span> Jurisprudence
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
                An aggregated retrospective on the Supreme Court of Canada, translating seventy years of case-law into an interactive dashboard.
            </p>
            
            <div className="pt-8 flex flex-col items-center gap-4">
                <button 
                    onClick={() => setShowTerms(true)} 
                    className="text-xs font-mono text-slate-400 hover:text-scc-gold transition-colors tracking-widest uppercase border-b border-transparent hover:border-scc-gold pb-0.5"
                >
                    Terms of Use & Disclaimer
                </button>
                <button 
                    onClick={handleEnter}
                    className="group relative inline-flex items-center justify-center px-8 py-4 text-sm font-bold text-slate-900 transition-all duration-200 bg-white font-serif tracking-widest hover:bg-scc-gold hover:text-white"
                >
                    ACCESS DASHBOARD
                    <svg className="w-4 h-4 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
            </div>
        </div>
        
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        </div>

        <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 z-20">
            <button 
                onClick={scrollToContributors}
                className="group flex items-start gap-3 text-xs font-mono text-slate-500 hover:text-scc-gold transition-colors uppercase tracking-widest bg-transparent border-none cursor-pointer text-left"
            >
                <span className="w-8 h-px bg-slate-700 group-hover:bg-scc-gold transition-colors hidden sm:block mt-2"></span>
                <div className="flex flex-col gap-1">
                    <span>Created by Kevin Zhang</span>
                    <span className="text-[10px] opacity-70">With Data Courtesy of Lenczner Slaght Database</span>
                </div>
            </button>
        </div>
      </section>

      {/* 2. INTRODUCTION */}
      <section className="py-24 px-6 md:px-12 max-w-5xl mx-auto border-b border-slate-200">
        <div className="flex flex-col md:flex-row gap-12 items-start">
            <div className="md:w-1/3 sticky top-24">
                <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4 leading-tight">
                    The Deluge of Decisions
                </h2>
                <div className="h-1 w-20 bg-scc-gold mb-6"></div>
                <p className="text-sm font-mono text-gray-500 uppercase tracking-wide">
                    The Problem Space
                </p>
            </div>
            <div className="md:w-2/3 prose prose-lg text-slate-600 leading-relaxed font-serif">
                <p>
                    <span className="float-left text-7xl font-bold text-slate-900 mr-4 mt-[-10px] font-serif">W</span>
                    hile the Supreme Court shapes the legal landscape, the history of its decisions remains obscured by the sheer volume of text and decisions rendered. Thousands of cases and shifting judicial ideologies are difficult to parse through individual review alone.
                </p>
                <p>
                    Legal scholars and researchers face a dilemma of scale. Detecting macro-level shifts requires moving from close reading to computational distance. It requires mapping the invisible topology of the law.
                </p>
            </div>
        </div>
      </section>

      {/* 3. SCIENCE PART 1 */}
      <section className="py-24 px-6 md:px-12 bg-slate-100 border-b border-slate-200">
         <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row-reverse gap-16 items-center">
                <div className="md:w-1/2">
                    {/* Transformation Visual: File -> Object */}
                    <div className="bg-white p-6 shadow-xl border border-slate-200 rounded-lg relative overflow-hidden">
                        
                        {/* INPUT: CSV */}
                        <div className="mb-6 relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Input: Raw CSV</span>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-[10px] text-slate-500 leading-relaxed overflow-x-hidden">
                                <div className="whitespace-nowrap opacity-50">1986,R. v. Oakes,1 S.C.R. 103,2,1,0,...</div>
                                <div className="whitespace-nowrap opacity-50">1986,R. v. Big M Drug Mart,1 S.C.R...</div>
                                <div className="h-1 w-full bg-slate-200 mt-2 rounded"></div>
                                <div className="h-1 w-2/3 bg-slate-200 mt-1 rounded"></div>
                            </div>
                        </div>

                        {/* TRANSITION */}
                        <div className="flex justify-center -my-3 relative z-20">
                            <div className="bg-white p-1 rounded-full border border-slate-200 shadow-sm text-scc-blue">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                            </div>
                        </div>

                        {/* OUTPUT: JSON */}
                        <div className="mt-4 relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-scc-gold uppercase tracking-wider">Output: Digital Twin</span>
                            </div>
                            <div className="bg-slate-900 p-3 rounded border border-slate-700 font-mono text-[10px] text-green-400 leading-relaxed shadow-inner">
                                <div><span className="text-purple-400">const</span> <span className="text-blue-300">Case</span> = {"{"}</div>
                                <div className="pl-4"><span className="text-white">caseName:</span> <span className="text-yellow-300">"R. v. Oakes"</span>,</div>
                                <div className="pl-4"><span className="text-white">disposition:</span> <span className="text-yellow-300">"Dismissed"</span>,</div>
                                <div className="pl-4"><span className="text-white">appellant:</span> <span className="text-yellow-300">"Crown"</span>,</div>
                                <div className="pl-4"><span className="text-white">votes:</span> [...]</div>
                                <div>{"}"}</div>
                            </div>
                        </div>

                    </div>
                </div>
                <div className="md:w-1/2">
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">
                        Phase I: Structured Ingestion
                    </h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        The first barrier to insight is structure.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                        The app transforms flat records into relational objects, creating a queryable "Digital Twin" of the Court. This enables the tracking of individual variables from appellant types to dissent patterns, with millisecond precision.
                    </p>
                </div>
            </div>
         </div>
      </section>

      {/* 4. SCIENCE PART 2 */}
      <section className="py-24 px-6 md:px-12 bg-white border-b border-slate-200">
         <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-16 items-center">
                <div className="md:w-1/2 relative">
                     {/* McLachlin Court Graph Visual - SVG Reimplementation */}
                     <div className="w-full h-80 border border-slate-200 rounded-xl bg-slate-50 relative overflow-hidden shadow-inner group">
                        <svg viewBox="0 0 500 300" className="w-full h-full">
                            <defs>
                                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />

                            {/* Links (Agreement > 85%) */}
                            <g stroke="#94a3b8" strokeWidth="1.5" strokeOpacity="0.6">
                                {/* Central Hub (McLachlin) */}
                                <line x1="250" y1="150" x2="200" y2="130" /> {/* BM-SA */}
                                <line x1="250" y1="150" x2="300" y2="130" /> {/* BM-MM */}
                                <line x1="250" y1="150" x2="230" y2="200" /> {/* BM-AK */}
                                <line x1="250" y1="150" x2="280" y2="190" /> {/* BM-RW */}
                                <line x1="250" y1="150" x2="250" y2="90" />  {/* BM-TC */}

                                {/* Liberal Cluster (Abella/Karakatsanis/Gascon) */}
                                <line x1="200" y1="130" x2="230" y2="200" strokeWidth="2" /> {/* SA-AK */}
                                <line x1="200" y1="130" x2="160" y2="170" /> {/* SA-CG */}
                                <line x1="230" y1="200" x2="160" y2="170" /> {/* AK-CG */}

                                {/* Conservative/Dissent Cluster (Moldaver/Cote/Brown) */}
                                <line x1="300" y1="130" x2="280" y2="190" /> {/* MM-RW */}
                                <line x1="300" y1="130" x2="350" y2="120" strokeWidth="2" /> {/* MM-SC */}
                                <line x1="350" y1="120" x2="340" y2="180" strokeWidth="2" /> {/* SC-RB */}
                                <line x1="340" y1="180" x2="280" y2="190" /> {/* RB-RW */}
                            </g>

                            {/* Nodes */}
                            <g className="drop-shadow-sm">
                                {/* BM - Center */}
                                <circle cx="250" cy="150" r="14" fill="#0f172a" stroke="white" strokeWidth="2" />
                                <text x="250" y="150" dy="4" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">BM</text>
                                
                                {/* SA - Left */}
                                <circle cx="200" cy="130" r="12" fill="#C5A900" stroke="white" strokeWidth="2" />
                                <text x="200" y="130" dy="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">SA</text>

                                {/* MM - Right */}
                                <circle cx="300" cy="130" r="12" fill="#003366" stroke="white" strokeWidth="2" />
                                <text x="300" y="130" dy="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">MM</text>

                                {/* AK - Left Down */}
                                <circle cx="230" cy="200" r="12" fill="#C5A900" stroke="white" strokeWidth="2" />
                                <text x="230" y="200" dy="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">AK</text>

                                {/* RW - Right Down */}
                                <circle cx="280" cy="190" r="12" fill="#003366" stroke="white" strokeWidth="2" />
                                <text x="280" y="190" dy="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">RW</text>

                                {/* TC - Top */}
                                <circle cx="250" cy="90" r="11" fill="#64748b" stroke="white" strokeWidth="2" />
                                <text x="250" y="90" dy="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">TC</text>

                                {/* CG - Far Left */}
                                <circle cx="160" cy="170" r="11" fill="#C5A900" stroke="white" strokeWidth="2" />
                                <text x="160" y="170" dy="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">CG</text>

                                {/* SC - Far Right */}
                                <circle cx="350" cy="120" r="11" fill="#003366" stroke="white" strokeWidth="2" />
                                <text x="350" y="120" dy="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">SC</text>

                                {/* RB - Far Right Down */}
                                <circle cx="340" cy="180" r="11" fill="#003366" stroke="white" strokeWidth="2" />
                                <text x="340" y="180" dy="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">RB</text>
                            </g>

                            {/* Overlay Controls Mockup */}
                            <g transform="translate(10, 270)">
                                <rect width="60" height="20" rx="4" fill="white" stroke="#e2e8f0" />
                                <text x="30" y="13" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="mono">ZOOM: 1x</text>
                            </g>
                        </svg>

                        {/* Hover Legend Overlay */}
                        <div className="absolute top-2 right-2 flex gap-2">
                            <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-400 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                                <span className="w-2 h-2 rounded-full bg-[#003366]"></span> Bloc A
                            </span>
                             <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-400 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                                <span className="w-2 h-2 rounded-full bg-[#C5A900]"></span> Bloc B
                            </span>
                        </div>
                     </div>
                     <p className="mt-2 text-center text-xs text-gray-400 font-mono">
                         Fig. 2: Sample topology of the McLachlin Court (85% Agreement Threshold)
                     </p>
                </div>
                <div className="md:w-1/2">
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">
                        Phase II: Doctrinal Mapping
                    </h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        To visualize alignment, the dashboard moves beyond binary win/loss metrics. It employs a Force-Directed Graph algorithm to model the Court as a physical system, where judicial agreement acts as a gravitational force.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                        Underlying this visualization is a modified Label Propagation algorithm. This iterative process identifies communities of consensus (e.g., "The Laskin Court Dissenters") based purely on decision adjacency, revealing the hidden structure of the court without human bias.
                    </p>
                </div>
            </div>
         </div>
      </section>

      {/* 5. SCIENCE PART 3 (NEW) */}
      <section className="py-24 px-6 md:px-12 bg-slate-100 border-b border-slate-200">
         <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row-reverse gap-16 items-center">
                <div className="md:w-1/2">
                    {/* Visual: Matrix/Heatmap Mockup */}
                    <div className="bg-white p-6 shadow-xl border border-slate-200 rounded-lg relative overflow-hidden h-64 flex flex-col items-center justify-center">
                        <div className="grid grid-cols-6 gap-2 rotate-45 transform scale-90">
                            {Array.from({ length: 36 }).map((_, i) => {
                                 // Simulated Heatmap
                                 const isMid = i > 12 && i < 24;
                                 const color = isMid ? 'bg-scc-gold' : 'bg-scc-blue';
                                 const opacity = Math.max(0.3, (Math.cos(i) + 1) / 2); 
                                 return (
                                     <div key={i} className={`w-6 h-6 rounded-sm ${color}`} style={{ opacity }} />
                                 )
                            })}
                        </div>
                        <div className="absolute bottom-3 right-4 text-[10px] font-mono text-slate-400">
                            Pairwise Agreement
                        </div>
                    </div>
                </div>
                <div className="md:w-1/2">
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">
                        Phase III: Judicial Ideology - Compass
                    </h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        The judicial mind does not operate in isolation. The dashboard’s <strong>Agreement Matrix</strong> and <strong>Justice Comparator</strong> modules quantify the 'chemistry' of the bench. By iterating through thousands of voting vectors, the system calculates pairwise concurrence rates with floating-point precision, identifying alliances and ideological splits.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                        Furthermore, the <strong>Ideological Compass</strong> abandons subjective labeling. Instead, it mathematically maps voting records onto a Cartesian plane—plotting 'Pro-State' vs. 'Pro-Individual' alignments against specific legal issue areas—to reveal the true jurisprudential drift of a judge.
                    </p>
                </div>
            </div>
         </div>
      </section>

      {/* 5b. COMPASS METHODOLOGY (NEW) */}
      <section className="py-20 px-6 md:px-12 bg-slate-900 text-slate-300 border-b border-slate-800">
         <div className="max-w-5xl mx-auto">
             <div className="mb-12">
                 <h2 className="text-3xl font-serif font-bold text-white mb-4">
                    Algorithm Spotlight: The Compass
                 </h2>
                 <div className="h-1 w-20 bg-scc-blue mb-6"></div>
                 <p className="text-lg leading-relaxed max-w-3xl">
                    Unlike traditional political spectrums, the Ideological Compass calculates judicial alignment dynamically based on case subject matter and voting direction. It is an aggregation of thousands of coded data points.
                 </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 {/* Y-AXIS EXPLANATION */}
                 <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                     <div className="flex items-center gap-3 mb-4">
                         <div className="p-2 bg-slate-700 rounded text-white font-mono text-sm">Y-AXIS</div>
                         <h3 className="text-xl font-bold text-white">Civil Liberties & Criminal</h3>
                     </div>
                     <p className="text-sm mb-4">
                        Maps the tension between State Power and Individual Rights.
                     </p>
                     <ul className="space-y-2 text-xs font-mono text-slate-400">
                         <li className="flex justify-between border-b border-slate-700 pb-1">
                             <span>Inputs:</span>
                             <span>Criminal Law, Charter Rights, Immigration</span>
                         </li>
                         <li className="flex justify-between border-b border-slate-700 pb-1">
                             <span>Pro-State (+1)</span>
                         </li>
                         <li className="flex justify-between">
                             <span>Pro-Accused (-1)</span>
                         </li>
                     </ul>
                 </div>

                 {/* X-AXIS EXPLANATION */}
                 <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                     <div className="flex items-center gap-3 mb-4">
                         <div className="p-2 bg-slate-700 rounded text-white font-mono text-sm">X-AXIS</div>
                         <h3 className="text-xl font-bold text-white">Economic & Private Law</h3>
                     </div>
                     <p className="text-sm mb-4">
                        Maps the tension between Corporate/Institutional interests and Individuals.
                     </p>
                     <ul className="space-y-2 text-xs font-mono text-slate-400">
                         <li className="flex justify-between border-b border-slate-700 pb-1">
                             <span>Inputs:</span>
                             <span>Tax, Commercial, IP, Torts, Property</span>
                         </li>
                         <li className="flex justify-between border-b border-slate-700 pb-1">
                             <span>Pro-Business (+1)</span>
                         </li>
                         <li className="flex justify-between">
                             <span>Pro-Individual (-1)</span>
                         </li>
                     </ul>
                 </div>
             </div>
             
             <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded text-xs text-center font-mono text-slate-500">
                 Formula: Score = (Σ DirectionCodes) / TotalRelevantCases
             </div>
         </div>
      </section>

      {/* 6. SCIENCE PART 4 (NEW) */}
      <section className="py-24 px-6 md:px-12 bg-white">
         <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-16 items-center">
                <div className="md:w-1/2">
                     {/* Visual: Stats Bars Mockup */}
                     <div className="bg-white p-6 shadow-xl border border-slate-200 rounded-lg relative overflow-hidden h-64 flex flex-col justify-end px-12 pb-8 gap-4">
                        <div className="flex items-end justify-between gap-4 h-full">
                            <div className="w-8 bg-slate-200 h-[40%] rounded-t relative group shadow-sm">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400">40%</div>
                            </div>
                            <div className="w-8 bg-scc-gold h-[80%] rounded-t relative group shadow-sm">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-scc-gold">80%</div>
                            </div>
                            <div className="w-8 bg-slate-200 h-[60%] rounded-t relative group shadow-sm">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400">60%</div>
                            </div>
                            <div className="w-8 bg-scc-blue h-[95%] rounded-t relative group shadow-sm">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-scc-blue">95%</div>
                            </div>
                        </div>
                        <div className="h-px bg-slate-200 w-full"></div>
                        <div className="text-[10px] font-mono text-center text-slate-400 uppercase tracking-widest">
                            Longitudinal Outcome Distribution
                        </div>
                    </div>
                </div>
                <div className="md:w-1/2">
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">
                        Phase IV: Outcome Modeling
                    </h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        For the practitioner, predictability is paramount. The <strong>Wait Time Estimator</strong> utilizes historical docket data to generate probability distributions for judgment delivery times, segmented by legal area.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                        Simultaneously, the <strong>Reversal Rate Calculator</strong> and <strong>David vs. Goliath</strong> engine analyze case dispositions to determine the statistical likelihood of an appeal succeeding based on the lower court's jurisdiction and the specific pairing of litigating parties (e.g., Individual vs. Crown).
                    </p>
                </div>
            </div>
         </div>
      </section>

      {/* 7. IMPACT & RESULTS */}
      <section className="py-20 bg-scc-blue text-white">
         <div className="max-w-6xl mx-auto px-6">
             <div className="text-center mb-16">
                 <h2 className="text-3xl font-serif font-bold mb-4">The Empirical Record</h2>
                 <p className="text-blue-200 max-w-2xl mx-auto">
                     The dashboard aggregates data across eras, revealing the scale of the Court's work.
                 </p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-blue-800">
                 <div className="p-4">
                     <div className="text-5xl font-serif font-bold text-scc-gold mb-2">70+</div>
                     <div className="text-sm font-mono uppercase tracking-widest text-blue-200">Years of History</div>
                 </div>
                 <div className="p-4">
                     <div className="text-5xl font-serif font-bold text-scc-gold mb-2">6,800+</div>
                     <div className="text-sm font-mono uppercase tracking-widest text-blue-200">Decisions Analyzed</div>
                 </div>
                 <div className="p-4">
                     <div className="text-5xl font-serif font-bold text-scc-gold mb-2">98%</div>
                     <div className="text-sm font-mono uppercase tracking-widest text-blue-200">Processing Accuracy</div>
                 </div>
             </div>
         </div>
      </section>

      {/* 8. AUTHORS */}
      <section id="contributors" className="py-24 px-6 md:px-12 bg-white border-t-8 border-scc-gold">
         <div className="max-w-4xl mx-auto">
             <div className="text-center mb-12">
                 <h2 className="text-2xl font-serif font-bold text-slate-900">Contributors & Methodology</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 {/* Developer Card */}
                 <div className="group">
                     <div className="border-t-2 border-slate-900 pt-4">
                         <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-scc-blue transition-colors">Kevin Zhang</h3>
                         <p className="text-xs font-mono text-scc-gold mb-4 uppercase">Creator</p>
                         <p className="text-sm text-slate-600 leading-relaxed mb-2">
                            J.D. Candidate, University of Victoria Faculty of Law.<br/>
                            B.A. Cognitive Systems, University of British Columbia.
                         </p>
                         <p className="text-sm font-mono text-gray-400">
                            info@kevin-zhang.ca
                         </p>
                     </div>
                 </div>

                 {/* Dataset Card */}
                 <div className="group">
                     <div className="border-t-2 border-slate-900 pt-4">
                         <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-scc-blue transition-colors">Lenczner Slaght Dataset</h3>
                         <p className="text-xs font-mono text-scc-gold mb-4 uppercase">Primary Data Source</p>
                         <p className="text-sm text-slate-600 leading-relaxed mb-4">
                            The Supreme Court of Canada Database. A comprehensive dataset coding every SCC decision since 1954, maintained for empirical legal research.
                         </p>
                         <p className="text-[10px] text-gray-400 font-mono leading-tight">
                            Paul-Erik Veel, Katie Glowach, Benjamin Alarie, and Andrew Green, Lenczner Slaght Supreme Court of Canada Database, Release [2023.01]. Available at: <a href="http://www.supremecourtdatabase.com" target="_blank" rel="noopener noreferrer" className="hover:text-scc-blue underline">www.supremecourtdatabase.com</a>
                         </p>
                         <p className="text-[10px] text-slate-400 italic mt-2">
                             (This dashboard is unaffiliated with Lenczner Slaght)
                         </p>
                     </div>
                 </div>
             </div>
             
             <div className="mt-20 text-center">
                 <button 
                    onClick={handleEnter}
                    className="inline-block border-b-2 border-slate-900 pb-1 text-slate-900 font-bold hover:text-scc-blue hover:border-scc-blue transition-all"
                 >
                     Enter The Dashboard &rarr;
                 </button>
             </div>
         </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-500 py-10 border-t border-slate-800 text-center text-xs">
         <div className="max-w-4xl mx-auto px-4">
             <p className="text-slate-400 mb-2">© {new Date().getFullYear()} SCC Decisions Dashboard. All rights reserved.</p>
             <p className="leading-relaxed">
                Disclaimer: This dashboard utilizes historical data which may contain errors or omissions. 
                Please cross-reference all findings with official Supreme Court of Canada judgments.
             </p>
             <div className="mt-4 flex justify-center gap-6">
                <button onClick={() => setShowTerms(true)} className="underline hover:text-white transition-colors">
                    Terms of Use
                </button>
                <button onClick={() => setShowCitation(true)} className="underline hover:text-white transition-colors">
                    How to Cite
                </button>
             </div>
         </div>
      </footer>

      {/* TERMS MODAL */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-white max-w-lg w-full rounded-xl shadow-2xl p-6 relative">
                <button 
                    onClick={() => setShowTerms(false)} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h3 className="text-xl font-serif font-bold text-slate-900 mb-4">Terms of Use</h3>
                <div className="prose prose-sm text-slate-600 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <p>
                        This dashboard is made available for educational and informational purposes. Neither the Creator (Kevin Zhang) nor any data source providers assume any liability for errors in the software, the visualization algorithms, or the underlying data. This dashboard is unaffiliated with Lenczner Slaght.
                    </p>
                    <p>
                        <strong>No representations, warranties, or undertakings are made regarding the accuracy, completeness, or currency of the analysis presented herein.</strong> While the dashboard may be updated to reflect new Supreme Court decisions or codebase improvements, there is no obligation to do so at any particular interval or at all.
                    </p>
                    <p>
                        By accessing and using this application, you acknowledge these terms and release the Creator from any liability relating to your use of the dashboard, including but not limited to any damages or academic consequences that you might suffer as a result of reliance on the visualizations or data contained within.
                    </p>
                </div>

                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Using this for research?</span>
                    <button 
                        onClick={() => { setShowTerms(false); setShowCitation(true); }}
                        className="text-scc-blue hover:text-scc-gold text-sm font-bold underline"
                    >
                        Citation Guidelines
                    </button>
                </div>

                <div className="mt-6 text-center pt-4 border-t border-slate-100">
                    <button 
                        onClick={() => setShowTerms(false)} 
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* CITATION MODAL */}
      {showCitation && <CitationModal onClose={() => setShowCitation(false)} />}
    </div>
  );
};

export default LandingPage;