import React, { useEffect, useState, useMemo } from 'react';
import { fetchAllData } from './services/dataService';
import { ParsedDataset, CaseData } from './types';
import { generateNetworkData, getJusticeCases, generateMatrixData } from './utils/analytics';
import Loading from './components/Loading';
import JusticeStats from './components/JusticeStats';
import ComparisonView from './components/ComparisonView';
import NetworkGraph from './components/NetworkGraph';
import AgreementMatrix from './components/AgreementMatrix';
import CaseList from './components/CaseList';
import ReversalRateChart from './components/ReversalRateChart';
import AppellateReportCard from './components/AppellateReportCard';
import CharterTracker from './components/CharterTracker';
import CrownWinChart from './components/CrownWinChart';
import WorkhorseLeaderboard from './components/WorkhorseLeaderboard';
import WaitTimeEstimator from './components/WaitTimeEstimator';
import DavidVsGoliath from './components/DavidVsGoliath';
import PrecedentTracker from './components/PrecedentTracker';
import SearchBar from './components/SearchBar';
import CaseDetail from './components/CaseDetail';
import CaseComparison from './components/CaseComparison';
import LandingPage from './components/LandingPage';
import SubjectMatterTreemap from './components/SubjectMatterTreemap';
import CitationModal from './components/CitationModal';
import UserGuideModal from './components/UserGuideModal';

// Define Court Eras
type Era = {
  id: string;
  name: string;
  start: string; // YYYY-MM-DD
  end: string;
};

const COURT_ERAS: Era[] = [
  { id: 'rinfret', name: 'Rinfret (1950-54)', start: '1950-01-01', end: '1954-06-30' },
  { id: 'kerwin', name: 'Kerwin (1954-63)', start: '1954-07-01', end: '1963-02-02' },
  { id: 'taschereau', name: 'Taschereau (1963-67)', start: '1963-04-22', end: '1967-08-31' },
  { id: 'cartwright', name: 'Cartwright (1967-70)', start: '1967-09-01', end: '1970-03-22' },
  { id: 'fauteux', name: 'Fauteux (1970-73)', start: '1970-03-23', end: '1973-12-26' },
  { id: 'laskin', name: 'Laskin (1973-84)', start: '1973-12-27', end: '1984-04-17' },
  { id: 'dickson', name: 'Dickson (1984-90)', start: '1984-04-18', end: '1990-06-30' },
  { id: 'lamer', name: 'Lamer (1990-2000)', start: '1990-07-01', end: '2000-01-06' },
  { id: 'mclachlin', name: 'McLachlin (2000-17)', start: '2000-01-07', end: '2017-12-17' },
  { id: 'wagner', name: 'Wagner (2017-Present)', start: '2017-12-18', end: '2099-12-31' },
];

const PRE_CHARTER_IDS = ['rinfret', 'kerwin', 'taschereau', 'cartwright', 'fauteux', 'laskin'];
const CHARTER_IDS = ['laskin', 'dickson', 'lamer', 'mclachlin', 'wagner'];

type ViewMode = 'overview' | 'justice';

const App: React.FC = () => {
  // Navigation State
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showCitation, setShowCitation] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [data, setData] = useState<ParsedDataset>({
    cases: [],
    votes: [],
    justices: [],
    appellants: [],
    respondents: [],
    issues: [],
    loading: true,
    error: null,
  });

  // View State
  const [currentView, setCurrentView] = useState<ViewMode>('overview');

  // Filter State
  const [selectedJustice1, setSelectedJustice1] = useState<string>('');
  const [selectedJustice2, setSelectedJustice2] = useState<string>('');
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [agreementThreshold, setAgreementThreshold] = useState<number>(0.90); // Default to 90%
  const [selectedEra, setSelectedEra] = useState<Era | null>(null);

  // Search/Modal State
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const result = await fetchAllData();
      setData(result);
    };
    load();
  }, []);

  // Filtered Data based on selected Era (Date Range)
  const filteredCases = useMemo(() => {
    if (!selectedEra) return data.cases;

    const start = new Date(selectedEra.start).getTime();
    const end = new Date(selectedEra.end).getTime();

    return data.cases.filter(c => {
      if (!c.dateDecisionGiven) return false;
      const d = new Date(c.dateDecisionGiven).getTime();
      return !isNaN(d) && d >= start && d <= end;
    });
  }, [data.cases, selectedEra]);

  const filteredVotes = useMemo(() => {
    const caseIds = new Set(filteredCases.map(c => c.primaryCaseID));
    return data.votes.filter(v => caseIds.has(v.primaryCaseID));
  }, [data.votes, filteredCases]);

  const activeJustices = useMemo(() => {
    if (filteredVotes.length === 0) return [];
    const activeIds = new Set(filteredVotes.map(v => v.justiceID));
    return data.justices.filter(j => activeIds.has(j.justiceID));
  }, [data.justices, filteredVotes]);

  // Filter votes for Justice 1
  const votes1 = useMemo(() => {
    if (!selectedJustice1) return [];
    return filteredVotes.filter(v => v.justiceID === selectedJustice1);
  }, [selectedJustice1, filteredVotes]);

  // Filter votes for Justice 2
  const votes2 = useMemo(() => {
    if (!selectedJustice2) return [];
    return filteredVotes.filter(v => v.justiceID === selectedJustice2);
  }, [selectedJustice2, filteredVotes]);

  // Network Data
  const networkData = useMemo(() => {
    if (data.loading || filteredVotes.length === 0) return { nodes: [], links: [] };
    return generateNetworkData(filteredVotes, activeJustices, 5); 
  }, [filteredVotes, activeJustices, data.loading]);

  // Matrix Data
  const matrixData = useMemo(() => {
    if (data.loading || filteredVotes.length === 0) return [];
    return generateMatrixData(filteredVotes, activeJustices);
  }, [filteredVotes, activeJustices, data.loading]);

  // Case List for Judge 1
  const caseList1 = useMemo(() => {
    if (!selectedJustice1) return [];
    return getJusticeCases(selectedJustice1, filteredVotes, filteredCases);
  }, [selectedJustice1, filteredVotes, filteredCases]);

  // Selected Case Data
  const selectedCaseData = useMemo(() => {
    if (!selectedCaseId) return null;
    const c = data.cases.find(c => c.primaryCaseID === selectedCaseId);
    if (!c) return null;
    const v = data.votes.filter(vote => vote.primaryCaseID === selectedCaseId);
    return { c, v };
  }, [selectedCaseId, data.cases, data.votes]);

  const getJusticeName = (id: string) => data.justices.find(j => j.justiceID === id)?.justiceName || 'Unknown';

  // --- RENDERING ---

  // 1. Loading State
  if (data.loading) return <Loading />;
  
  // 2. Error State
  if (data.error) return (
    <div className="flex items-center justify-center h-screen bg-white p-10">
      <div className="text-center max-w-5xl w-full">
        <h2 className="text-3xl font-bold mb-4 text-red-600">Error Loading Data</h2>
        <div className="bg-slate-50 border border-slate-300 rounded p-6 text-left font-mono text-xs text-slate-800 overflow-auto max-h-[70vh] whitespace-pre-wrap shadow-inner">
            {data.error}
        </div>
        <p className="text-sm text-gray-500 mt-6">
            If you see HTML/404 errors above, ensure your 'dataset' folder is deployed to the server root and contains the required CSV files.
        </p>
      </div>
    </div>
  );

  // 3. Landing Page
  if (!showDashboard) {
    return <LandingPage onEnter={() => setShowDashboard(true)} />;
  }

  // 4. Main Dashboard
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative animate-fade-in flex flex-col">

      {/* 1. Header Navigation */}
      <nav className="bg-slate-900 text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-20 gap-4">
            
            {/* LEFT: Branding & Tabs */}
            <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
               <div 
                 className="flex items-center gap-3 cursor-pointer group"
                 onClick={() => {
                   setShowDashboard(false);
                   window.scrollTo(0, 0);
                 }}
                 title="Back to Cover"
               >
                 <div className="w-10 h-10 bg-gradient-to-br from-scc-gold to-yellow-600 rounded-lg flex items-center justify-center font-serif font-bold text-2xl text-slate-900 shadow-lg group-hover:scale-105 transition-transform">
                   §
                 </div>
                 <div className="hidden xl:block">
                   <h1 className="text-xl font-serif font-bold tracking-tight group-hover:text-scc-gold transition-colors">SCC Decisions</h1>
                 </div>
               </div>

               {/* View Tabs */}
               <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setCurrentView('overview')}
                    className={`px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-all ${
                      currentView === 'overview' 
                      ? 'bg-slate-700 text-white shadow' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Court Overview
                  </button>
                  <button
                    onClick={() => setCurrentView('justice')}
                    className={`px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-all ${
                      currentView === 'justice' 
                      ? 'bg-slate-700 text-white shadow' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Justices & Comparison
                  </button>
               </div>
            </div>

            {/* CENTER: Search Bar */}
            <div className="flex-1 max-w-2xl px-2 lg:px-6">
                 <SearchBar 
                    cases={data.cases} 
                    issues={data.issues} 
                    onSelectCase={(id) => {
                      setSelectedCaseId(id);
                      setComparisonMode(false); // Reset comparison when picking new case
                    }} 
                />
            </div>
            
            {/* RIGHT: About & Version */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => {
                      setShowDashboard(false);
                      window.scrollTo(0, 0);
                    }}
                    className="hidden md:block text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
                >
                    About
                </button>
                <div className="flex-shrink-0 hidden md:flex bg-slate-800/50 p-1 rounded-lg">
                    <span className="px-3 py-1.5 text-xs font-mono text-slate-400">v1.2.0</span>
                </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. Control Ribbon */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
           <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
              
              {/* Left: Era Selector (Always Visible) */}
              <div className="flex flex-col gap-2 w-full xl:w-auto">
                 <div className="flex items-baseline gap-4 mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Select Court Era ({filteredCases.length} Decisions) <span className="text-[10px] text-red-400 normal-case tracking-normal ml-1 opacity-80">*Dataset ends 2022</span>
                    </span>
                    <button 
                        onClick={() => setSelectedEra(null)}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${!selectedEra 
                            ? 'bg-slate-800 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        All Eras
                    </button>
                 </div>
                 
                 <div className="flex flex-col gap-2">
                    {/* Pre-Charter Row */}
                    <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-slate-400 font-semibold w-16 uppercase">Pre-Charter</span>
                        {PRE_CHARTER_IDS.map(id => {
                            const era = COURT_ERAS.find(e => e.id === id);
                            if (!era) return null;
                            return (
                                <button
                                    key={`pre-${era.id}`}
                                    onClick={() => setSelectedEra(era)}
                                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all border ${
                                        selectedEra?.id === era.id
                                        ? 'bg-scc-blue text-white border-scc-blue shadow-md transform scale-105'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                >
                                    {era.name}
                                </button>
                            );
                        })}
                    </div>
                    {/* Charter Row */}
                    <div className="flex flex-wrap gap-1 items-center">
                         <span className="text-[10px] text-scc-gold font-bold w-16 uppercase">Charter Era</span>
                         {CHARTER_IDS.map(id => {
                             const era = COURT_ERAS.find(e => e.id === id);
                             if (!era) return null;
                             return (
                                <button
                                    key={`charter-${era.id}`}
                                    onClick={() => setSelectedEra(era)}
                                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all border ${
                                        selectedEra?.id === era.id
                                        ? 'bg-scc-gold text-white border-yellow-600 shadow-md transform scale-105'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                >
                                    {era.name}
                                </button>
                            );
                        })}
                    </div>
                 </div>
              </div>

              {/* Right: Justice Selectors (ONLY ON JUSTICE VIEW) */}
              {currentView === 'justice' && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto mt-4 xl:mt-0 animate-fade-in-left">
                     <div className="relative w-full sm:w-64">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Primary Justice</label>
                        <select
                            value={selectedJustice1}
                            onChange={(e) => {
                                setSelectedJustice1(e.target.value);
                                // Reset comparison if changing primary to keep state clean
                                setSelectedJustice2('');
                                setIsComparing(false);
                            }}
                            className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-scc-blue focus:border-scc-blue appearance-none transition-shadow"
                        >
                            <option value="">Select Justice...</option>
                            {activeJustices.map((j) => (
                                <option key={j.justiceID} value={j.justiceID}>{j.justiceName}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pt-5 pointer-events-none text-slate-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                     </div>
                  </div>
              )}
           </div>
        </div>
      </div>

      {/* 3. Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex-grow w-full">
        
           <div className="animate-fade-in-up">
              {currentView === 'overview' ? (
                // === MODE: COURT OVERVIEW ===
                <div className="space-y-8">
                    {/* Header */}
                    <div className="flex items-end justify-between border-b border-slate-200 pb-2 mb-4">
                        <h2 className="text-2xl font-serif font-bold text-slate-900">Court Overview</h2>
                        <span className="text-sm text-slate-500 italic">Global statistics for selected period</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                        {/* Row 1: Key Metrics */}
                        <div className="lg:col-span-8 h-[32rem]">
                             <WaitTimeEstimator cases={filteredCases} issues={data.issues} />
                        </div>
                        <div className="lg:col-span-4 h-[32rem]">
                             {/* Expanded Appellate Report Card */}
                             <AppellateReportCard cases={filteredCases} />
                        </div>
                        
                        {/* Row 2: Subject Matter & Reversal */}
                        <div className="lg:col-span-8 h-[32rem]">
                             <SubjectMatterTreemap cases={filteredCases} issues={data.issues} />
                        </div>
                         <div className="lg:col-span-4 h-[32rem]">
                             <ReversalRateChart cases={filteredCases} />
                        </div>

                        {/* Row 3: Deep Dives */}
                        <div className="lg:col-span-8 h-[32rem]">
                             <DavidVsGoliath 
                               cases={filteredCases} 
                               appellants={data.appellants} 
                               respondents={data.respondents} 
                             />
                        </div>
                        <div className="lg:col-span-4 h-[32rem]">
                             <CrownWinChart cases={filteredCases} appellants={data.appellants} issues={data.issues} />
                        </div>
                        
                        {/* Row 4: Charter & Leaderboard */}
                        <div className="lg:col-span-8 h-[32rem]">
                             <CharterTracker cases={filteredCases} />
                        </div>
                        <div className="lg:col-span-4 h-[32rem]">
                            <PrecedentTracker cases={filteredCases} />
                        </div>

                        <div className="lg:col-span-12 h-[36rem]">
                             <WorkhorseLeaderboard cases={filteredCases} justices={data.justices} />
                        </div>
                    </div>

                    {/* CONSENSUS & ALIGNMENT */}
                    <div className="border-t border-slate-200 pt-8 mt-8">
                        <h2 className="text-2xl font-serif font-bold text-slate-900 mb-6">Bench Alignment & Consensus</h2>
                        
                        <div className="grid grid-cols-1 gap-8">
                            {/* NETWORK GRAPH */}
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                                <div className="mb-4">
                                    <h3 className="text-xl font-serif text-scc-blue">The Bench Alignment Protocol</h3>
                                    <p className="text-gray-600">Force-directed graph of judicial agreement.</p>
                                </div>
                                {networkData.nodes.length > 0 ? (
                                    <NetworkGraph 
                                      nodes={networkData.nodes} 
                                      links={networkData.links} 
                                      threshold={agreementThreshold} 
                                      onThresholdChange={setAgreementThreshold}
                                      isEraSelected={!!selectedEra}
                                    />
                                ) : (
                                    <div className="h-96 flex items-center justify-center text-gray-400">No data available for this range.</div>
                                )}
                            </div>

                            {/* AGREEMENT MATRIX */}
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                                <div className="mb-6">
                                    <h3 className="text-xl font-serif text-scc-blue">Agreement Matrix</h3>
                                    <p className="text-gray-600">Pairwise frequency of agreement.</p>
                                </div>
                                {matrixData.length > 0 ? (
                                    <AgreementMatrix 
                                      data={matrixData} 
                                      justices={activeJustices} 
                                      isEraSelected={!!selectedEra}
                                    />
                                ) : (
                                    <div className="h-96 flex items-center justify-center text-gray-400">No data available for this range.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
              ) : (
                // === MODE: JUSTICE ANALYSIS ===
                <>
                {!selectedJustice1 ? (
                    // EMPTY STATE
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                        <div className="bg-slate-100 p-6 rounded-full">
                             <div className="w-16 h-16 bg-gradient-to-br from-scc-gold to-yellow-600 rounded-lg flex items-center justify-center font-serif font-bold text-4xl text-slate-900 shadow-lg">
                                §
                             </div>
                        </div>
                        <h2 className="text-3xl font-serif font-bold text-slate-800">Select a Justice to Begin</h2>
                        <p className="text-gray-500 max-w-md">
                            Use the dropdown in the top right "Control Ribbon" to select a primary justice for analysis. You can then compare them against others on the bench.
                        </p>
                    </div>
                ) : (
                    // JUSTICE CONTENT
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-4 mb-4 gap-4">
                            <div>
                                <h2 className="text-3xl font-serif font-bold text-slate-900">
                                    {getJusticeName(selectedJustice1)}
                                </h2>
                                <p className="text-slate-500 mt-1">
                                    Analysis of {votes1.length} decisions during selected era.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-slate-300 shadow-sm">
                                <span className="text-xs font-bold text-slate-500 uppercase px-2">Compare:</span>
                                <select
                                    value={selectedJustice2}
                                    onChange={(e) => {
                                        setSelectedJustice2(e.target.value);
                                        setIsComparing(!!e.target.value);
                                    }}
                                    className="text-sm border-transparent bg-slate-50 hover:bg-slate-100 rounded-md focus:border-scc-blue focus:ring focus:ring-scc-blue focus:ring-opacity-50 w-48 transition-colors cursor-pointer"
                                >
                                    <option value="">Select Justice...</option>
                                    {activeJustices
                                        .filter(j => j.justiceID !== selectedJustice1)
                                        .map((j) => (
                                            <option key={j.justiceID} value={j.justiceID}>{j.justiceName}</option>
                                        ))}
                                </select>
                                {selectedJustice2 && (
                                    <button 
                                        onClick={() => { setSelectedJustice2(''); setIsComparing(false); }}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        title="Clear comparison"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <JusticeStats justiceName={getJusticeName(selectedJustice1)} votes={votes1} issues={data.issues} cases={filteredCases} />
                            {isComparing && selectedJustice2 ? (
                                <JusticeStats justiceName={getJusticeName(selectedJustice2)} votes={votes2} issues={data.issues} cases={filteredCases} />
                            ) : (
                                <div className="hidden lg:block bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 p-8 flex items-center justify-center text-slate-400">
                                    <div className="text-center">
                                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        <p className="font-medium">Single Justice View</p>
                                        <p className="text-sm">Select a justice above to compare statistics.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Comparison Widget (Conditional) */}
                        {isComparing && selectedJustice2 && (
                            <ComparisonView 
                                justice1Name={getJusticeName(selectedJustice1)}
                                justice2Name={getJusticeName(selectedJustice2)}
                                votes1={votes1}
                                votes2={votes2}
                            />
                        )}

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 gap-6 mt-6">
                            {/* Case List takes full width now as sidebar widgets were removed/moved */}
                            <div>
                                <CaseList cases={caseList1} justiceName={getJusticeName(selectedJustice1)} />
                            </div>
                        </div>
                    </div>
                )}
                </>
              )}
           </div>
      </main>
      
      {/* 4. Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto px-4">
             <p className="mb-2">© {new Date().getFullYear()} SCC Decisions Dashboard. All rights reserved.</p>
             <p className="mb-4">
                Disclaimer: This dashboard utilizes historical data which may contain errors or omissions. 
                Please cross-reference all findings with official Supreme Court of Canada judgments.
             </p>
             <p className="text-[10px] text-slate-300 leading-relaxed max-w-2xl mx-auto border-t border-slate-100 pt-4">
                Primary Data Source: Paul-Erik Veel, Katie Glowach, Benjamin Alarie, and Andrew Green, Lenczner Slaght Supreme Court of Canada Database, Release [2023.01]. Available at: <a href="http://www.supremecourtdatabase.com" className="hover:text-slate-500 transition-colors" target="_blank" rel="noopener noreferrer">www.supremecourtdatabase.com</a>.
             </p>
             <div className="mt-4 flex justify-center gap-6">
                <button onClick={() => setShowTerms(true)} className="underline hover:text-slate-600 transition-colors">
                    Terms of Use
                </button>
                <button onClick={() => setShowGuide(true)} className="underline hover:text-slate-600 transition-colors">
                    User Guide
                </button>
                <button onClick={() => setShowCitation(true)} className="underline hover:text-slate-600 transition-colors">
                    How to Cite
                </button>
             </div>
        </div>
      </footer>

      {/* 5. Global Case Detail / Comparison Modal */}
      {selectedCaseData && (
          comparisonMode ? (
              <CaseComparison 
                  case1={selectedCaseData.c}
                  allCases={data.cases}
                  issues={data.issues}
                  appellants={data.appellants}
                  onClose={() => {
                      setComparisonMode(false);
                      setSelectedCaseId(null);
                  }}
              />
          ) : (
              <CaseDetail 
                caseData={selectedCaseData.c}
                votes={selectedCaseData.v}
                justices={data.justices}
                onClose={() => setSelectedCaseId(null)}
                onCompare={() => setComparisonMode(true)}
              />
          )
      )}

      {/* 6. Terms of Use Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
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

      {/* 7. Citation Modal */}
      {showCitation && <CitationModal onClose={() => setShowCitation(false)} />}

      {/* 8. User Guide Modal */}
      {showGuide && <UserGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
};

export default App;