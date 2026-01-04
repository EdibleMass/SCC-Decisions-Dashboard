import React from 'react';

const Loading: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-scc-blue"></div>
    <p className="mt-4 text-scc-blue font-serif text-lg">Loading Court Data...</p>
  </div>
);

export default Loading;
