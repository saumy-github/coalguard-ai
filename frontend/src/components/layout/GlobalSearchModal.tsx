import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, ShieldAlert, FileText, Activity, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import { AI_KNOWLEDGE_BASE } from '../../data/mockData';

export const GlobalSearchModal = () => {
  const { isSearchOpen, setSearchOpen, tickets, sensors, mines, setActiveView, setActiveSubTab } = useApp();
  const [query, setQuery] = useState('');

  if (!isSearchOpen) return null;

  const filteredTickets = tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.category.toLowerCase().includes(query.toLowerCase()) ||
      t.location.toLowerCase().includes(query.toLowerCase())
  );

  const filteredRules = AI_KNOWLEDGE_BASE.filter(
    (r) =>
      r.query.toLowerCase().includes(query.toLowerCase()) ||
      r.regulationCited.toLowerCase().includes(query.toLowerCase())
  );

  const filteredMines = mines.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.state.toLowerCase().includes(query.toLowerCase()) ||
      m.subsidiary.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={() => setSearchOpen(false)} />

      {/* Modal Box */}
      <div className="relative w-full max-w-2xl bg-[#141415] border border-[#51443d]/80 rounded-2xl shadow-2xl overflow-hidden z-10">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#353534] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#f6b994] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search safety rules, incidents, sensors, or mines..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-[#9e8d85] font-mono focus:outline-none"
          />
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 rounded-lg bg-[#252423] text-[#d6c3b9] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          
          {/* Quick Suggestions when empty */}
          {!query && (
            <div className="space-y-3">
              <p className="text-xs font-mono text-[#9e8d85] uppercase tracking-wider">
                Common Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {['Methane threshold', 'Dust control', 'Flameproof check', 'Sector 7G', 'Evacuation procedure'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-3 py-1.5 rounded-lg bg-[#1f1e1e] hover:bg-[#282726] border border-[#353534] text-xs font-mono text-[#d6c3b9] hover:text-[#f6b994] transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Safety Rules Results */}
          {filteredRules.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-mono font-bold text-[#f6b994] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Safety Guidance & Rules
              </p>
              {filteredRules.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-[#1a1919] border border-[#353534] hover:border-[#8d5d3e] transition-all"
                >
                  <h4 className="text-xs font-bold text-white font-['Sora']">{r.query}</h4>
                  <p className="text-[11px] text-[#d6c3b9] font-mono mt-1">{r.dgmsActClause}</p>
                  <span className="inline-block mt-2 text-[10px] font-mono text-[#f6b994] bg-[#8d5d3e]/20 px-2 py-0.5 rounded">
                    {r.regulationCited}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Incidents Results */}
          {filteredTickets.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Incident Tickets
              </p>
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setActiveSubTab('incidents');
                    setSearchOpen(false);
                  }}
                  className="p-3 rounded-xl bg-[#1a1919] border border-[#353534] hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white font-['Sora']">{t.title}</h4>
                    <p className="text-[11px] text-[#9e8d85] font-mono mt-0.5">{t.location} • {t.reportedBy}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#9e8d85]" />
                </div>
              ))}
            </div>
          )}

          {/* Mines Results */}
          {filteredMines.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-mono font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Operating Mines
              </p>
              {filteredMines.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setActiveSubTab('my_mines');
                    setSearchOpen(false);
                  }}
                  className="p-3 rounded-xl bg-[#1a1919] border border-[#353534] hover:border-lime-500/50 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white font-['Sora']">{m.name}</h4>
                    <p className="text-[11px] text-[#9e8d85] font-mono mt-0.5">{m.district}, {m.state} ({m.subsidiary})</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-lime-400">
                    {m.complianceScore}% Score
                  </span>
                </div>
              ))}
            </div>
          )}

          {query && filteredRules.length === 0 && filteredTickets.length === 0 && filteredMines.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs font-mono text-[#9e8d85]">
                No matching records found for "{query}"
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#111112] border-t border-[#353534] text-center text-[10px] font-mono text-[#9e8d85]">
          Press ESC or click outside to close search
        </div>

      </div>

    </div>
  );
};
