import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import {
  Landmark,
  FileCheck,
  AlertCircle,
  ClipboardCheck,
  History,
  FileText,
  Download,
  Search,
  ShieldCheck,
  Send,
  User,
  MapPin,
  ChevronRight
} from 'lucide-react';

export const RegulatoryDashboard = () => {
  const { currentUser, activeSubTab, setActiveSubTab, mines, inspections, addToast } = useApp();
  const [searchMine, setSearchMine] = useState('');

  // Notice issuance state
  const [targetMine, setTargetMine] = useState('Moonidih Deep Seam (BCCL)');
  const [noticeClause, setNoticeClause] = useState('CMR 2017 - Regulation 153 (Ventilation)');
  const [noticeDetails, setNoticeDetails] = useState('');

  const handleIssueNotice = (e) => {
    e.preventDefault();
    if (!noticeDetails.trim()) return;
    addToast('success', 'Statutory Notice Issued', `Official DGMS Notice served to ${targetMine}.`);
    setNoticeDetails('');
    setActiveSubTab('actions_required');
  };

  const filteredMines = mines.filter(m =>
    m.name.toLowerCase().includes(searchMine.toLowerCase()) ||
    m.subsidiary.toLowerCase().includes(searchMine.toLowerCase()) ||
    m.state.toLowerCase().includes(searchMine.toLowerCase())
  );

  // 1. Dashboard Overview
  const renderOverview = () => {
    const summaryCards = [
      {
        title: "Monitored Mines",
        value: "24",
        subtext: "Under DGMS Jurisdiction",
        icon: <Landmark className="w-5 h-5" />,
        status: "safe",
        statusLabel: "ACTIVE"
      },
      {
        title: "Compliance Rate",
        value: "94.8%",
        subtext: "CMR 2017 Benchmark",
        icon: <FileCheck className="w-5 h-5 text-amber-400" />,
        status: "safe",
        statusLabel: "GOOD"
      },
      {
        title: "Pending Notices",
        value: "2",
        subtext: "Awaiting Action from Mine",
        icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
        status: "warning",
        statusLabel: "ACTION REQUIRED"
      },
      {
        title: "Surprise Inspections",
        value: "14",
        subtext: "Completed this Quarter",
        icon: <ClipboardCheck className="w-5 h-5" />,
        status: "optimal",
        statusLabel: "COMPLETED"
      }
    ];

    return (
      <PageLayout
        title="DGMS Regulatory Authority Dashboard"
        subtitle="Statutory oversight, safety audits, and enforcement of Coal Mines Regulations (CMR 2017)."
        badge="DGMS Oversight"
        summaryCards={summaryCards}
        headerActions={
          <button
            onClick={() => setActiveSubTab('actions_required')}
            className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Issue Statutory Notice</span>
          </button>
        }
      >
        {/* Quick Statutory Notices Overview */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none"></div>

          <SectionHeader
            title="Open Regulatory Notices"
            subtitle="Mines requiring immediate rectification before next inspection cycle."
            action={
              <button
                onClick={() => setActiveSubTab('actions_required')}
                className="text-sm text-amber-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>View All Actions</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            }
          />

          <div className="space-y-4">
            <div className="glass-panel glass-panel-hover p-5 rounded-2xl space-y-3 group">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-white tracking-wide">Moonidih Deep Seam Mine (BCCL)</span>
                <StatusBadge status="action_required" label="NOTICE PENDING" />
              </div>
              <p className="text-sm font-mono text-slate-300 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                Notice Ref: DGMS/DHN/2026/089 - Complete flameproof electrical testing certification for longwall face #2.
              </p>
              <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-500">
                <span>Issued: <span className="text-slate-300">24 Feb 2026</span></span>
                <span className="text-amber-400 font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">Rectification Deadline: 10 March 2026</span>
              </div>
            </div>

            <div className="glass-panel glass-panel-hover p-5 rounded-2xl space-y-3 group mt-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-white tracking-wide">Umrer Open Pit Complex (WCL)</span>
                <StatusBadge status="in_investigation" label="UNDER REVIEW" />
              </div>
              <p className="text-sm font-mono text-slate-300 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                Notice Ref: DGMS/NAG/2026/042 - Bench height compliance verification and haul road dust suppression log audit.
              </p>
              <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-500">
                <span>Issued: <span className="text-slate-300">18 Feb 2026</span></span>
                <span className="text-amber-400 font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">Mine Response Received ✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mines Safety Directory */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-6">
          <SectionHeader
            title="Jurisdiction Mine Registry"
            subtitle="Live status of all active coal operations."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {mines.slice(0, 4).map((m) => (
              <div key={m.id} className="glass-panel glass-panel-hover p-5 rounded-2xl flex items-center justify-between gap-4 group">
                <div>
                  <h4 className="text-base font-bold text-white tracking-wide group-hover:text-orange-400 transition-colors">{m.name}</h4>
                  <p className="text-sm text-slate-400 font-mono mt-1">{m.subsidiary} • {m.state}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-amber-400">{m.complianceScore}% Score</span>
                  <div className="mt-2">
                    <StatusBadge status={m.complianceScore > 90 ? 'safe' : 'warning'} label={m.dgmsStatus} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  };

  // 2. Mines
  const renderMines = () => (
    <PageLayout
      title="All Monitored Coal Mines"
      subtitle="Complete database of licensed coal extraction facilities and compliance ratings."
      badge="Mine Registry"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">

        {/* Search Bar */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/40 border border-white/10 focus-within:border-orange-500/50 transition-colors">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchMine}
            onChange={(e) => setSearchMine(e.target.value)}
            placeholder="Search by mine name, state, or operating company..."
            className="w-full bg-transparent text-sm font-mono text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMines.map((m) => (
            <div key={m.id} className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-4 group">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-white tracking-wide">{m.name}</h4>
                  <p className="text-sm text-slate-400 font-mono mt-1">{m.district}, {m.state} ({m.subsidiary})</p>
                </div>
                <StatusBadge status={m.complianceScore > 90 ? 'safe' : 'warning'} label={m.dgmsStatus} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-3 border-t border-white/5 text-slate-400 uppercase tracking-wider">
                <span className="bg-black/20 px-2 py-1 rounded">Type: <span className="text-slate-200">{m.type}</span></span>
                <span className="bg-black/20 px-2 py-1 rounded">Workers: <span className="text-slate-200">{m.activeWorkers}</span></span>
                <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">{m.complianceScore}% Safe</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 3. Compliance
  const renderCompliance = () => (
    <PageLayout
      title="Statutory Compliance Audits"
      subtitle="Verification against Coal Mines Regulations 2017 standards."
      badge="CMR 2017"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="CMR 2017 Regulation Enforcement Index"
          subtitle="Mandatory standards and compliance benchmarks."
        />

        <div className="space-y-4">
          {[
            { reg: 'Regulation 153 - Ventilation & Gaseous Limits', status: 'compliant', desc: 'Methane (CH4) below 1.25% in return airway; air velocity > 0.5 m/s across all working faces.' },
            { reg: 'Regulation 129 - Strata Control & Roof Support', status: 'compliant', desc: 'Systematic support rules updated quarterly; continuous load cell monitoring.' },
            { reg: 'Regulation 144 - Explosion-Proof & Flameproof Units', status: 'notice', desc: 'Flameproof electrical enclosure seals verified within mandatory 30-day interval.' }
          ].map((r, idx) => (
            <div key={idx} className="glass-panel glass-panel-hover p-5 rounded-2xl space-y-3 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-base font-bold text-white tracking-wide">{r.reg}</h4>
                <StatusBadge status={r.status === 'compliant' ? 'safe' : 'warning'} label={r.status.toUpperCase()} />
              </div>
              <p className="text-sm font-mono text-slate-300 bg-black/20 p-4 rounded-xl border border-white/5">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 4. Inspections
  const renderInspections = () => (
    <PageLayout
      title="Surprise & Scheduled Inspections"
      subtitle="Official DGMS inspection audit records and scorecards."
      badge="DGMS Audits"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="Recent Field Inspection Records"
          subtitle="Conducted by Deputy Director of Mines Safety."
        />

        <div className="space-y-5">
          {inspections.map((insp) => (
            <div key={insp.id} className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-4 group">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h4 className="text-base font-bold text-white tracking-wide">{insp.location}</h4>
                  <p className="text-sm font-mono text-slate-400 mt-1">
                    Auditor: {insp.inspectorName} • Date: {insp.date}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-sm font-mono font-bold text-amber-400">{insp.score}/100</span>
                  </div>
                  <StatusBadge status={insp.status} />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/10">
                {insp.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 text-sm font-mono transition-colors group-hover:border-white/10">
                    <span className="text-slate-300">{item.title}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md tracking-widest uppercase ${item.status === 'pass' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-lime-500/20 text-lime-400 border border-lime-500/30'}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 5. Actions Required
  const renderActions = () => (
    <PageLayout
      title="Issue Statutory Notices & Enforce Actions"
      subtitle="Serve direct corrective orders to mine management under Mines Act 1952."
      badge="Notice Issuance"
    >
      <div className="glass-panel rounded-3xl p-8 max-w-2xl mx-auto space-y-6 mt-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none"></div>

        <SectionHeader
          title="Serve New Statutory Order"
          subtitle="This order will be dispatched to the Chief Safety Officer and Corporate HQ."
        />

        <form onSubmit={handleIssueNotice} className="space-y-6 relative z-10">
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Target Coal Mine</label>
            <select
              value={targetMine}
              onChange={(e) => setTargetMine(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
            >
              {mines.map(m => (
                <option key={m.id} value={`${m.name} (${m.subsidiary})`}>
                  {m.name} ({m.subsidiary})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Regulation Cited</label>
            <input
              type="text"
              required
              value={noticeClause}
              onChange={(e) => setNoticeClause(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Directives & Rectification Mandate</label>
            <textarea
              rows={4}
              required
              value={noticeDetails}
              onChange={(e) => setNoticeDetails(e.target.value)}
              placeholder="Specify the required engineering or operational changes..."
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50 transition-colors resize-none placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Issue & Dispatch Notice</span>
          </button>
        </form>
      </div>
    </PageLayout>
  );

  // 6. Audit History
  const renderAuditHistory = () => (
    <PageLayout
      title="Statutory Audit History"
      subtitle="Historical records of past inspections, issued notices, and resolved compliance items."
      badge="Audit History"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="Past Inspection Logbook"
          subtitle="All records maintained under DGMS digital archival rules."
        />

        <div className="space-y-4">
          {[
            { id: 'AUD-2026-088', mine: 'Gevra Mega Opencast (SECL)', date: '14 Jan 2026', outcome: 'Passed with 98% rating' },
            { id: 'AUD-2026-074', mine: 'Kusmunda Open Pit (SECL)', date: '02 Feb 2026', outcome: 'Dust suppression verified compliant' },
            { id: 'AUD-2026-061', mine: 'Moonidih Deep Seam (BCCL)', date: '20 Feb 2026', outcome: 'Notice issued for flameproof check' }
          ].map((a) => (
            <div key={a.id} className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
              <div>
                <span className="text-base font-bold text-white tracking-wide">{a.mine}</span>
                <p className="text-slate-400 text-xs font-mono mt-1 uppercase tracking-widest">{a.id} • {a.date}</p>
              </div>
              <span className={`text-sm font-mono px-3 py-1.5 rounded-lg border ${a.outcome.includes('Notice') ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>{a.outcome}</span>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 7. Reports
  const renderReports = () => (
    <PageLayout
      title="DGMS Regulatory Reports"
      subtitle="Download official safety inspection certificates and quarterly regulatory digests."
      badge="Regulatory Reports"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="Official Publications"
          subtitle="Ready for gazette publication and ministry archives."
        />

        <div className="space-y-4">
          {[
            { title: 'National Coal Mines Safety Annual Compendium 2025-26', size: '4.2 MB PDF' },
            { title: 'Quarterly DGMS Subterranean Gas & Strata Report', size: '2.9 MB PDF' }
          ].map((rep, idx) => (
            <div key={idx} className="glass-panel glass-panel-hover p-5 rounded-2xl flex items-center justify-between gap-4 group">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-wide group-hover:text-cyan-300 transition-colors">{rep.title}</h4>
                  <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-widest">{rep.size}</p>
                </div>
              </div>
              <button
                onClick={() => addToast('success', 'Download Started', `${rep.title} downloading...`)}
                className="btn-primary-earth px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 8. Profile
  const renderProfile = () => (
    <PageLayout
      title="Regulatory Inspector Profile"
      subtitle="DGMS official authorization, warrant details, and jurisdictional zones."
      badge="Inspector Record"
    >
      <div className="glass-panel rounded-3xl p-8 max-w-2xl mx-auto space-y-6 mt-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]"></div>

        <div className="flex items-center gap-5 pb-6 border-b border-white/10 relative z-10">
          <div className="w-20 h-20 rounded-[1.25rem] bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'R'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{currentUser?.name}</h3>
            <p className="text-sm font-mono text-amber-400 mt-1 uppercase tracking-wider">{currentUser?.roleTitle}</p>
            <p className="text-xs text-slate-400 mt-1">{currentUser?.organization}</p>
          </div>
        </div>

        <div className="space-y-4 text-sm font-mono text-slate-300 relative z-10">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 uppercase text-xs tracking-wider">Inspector Warrant ID</span>
            <span className="text-white font-bold bg-white/5 px-2 py-1 rounded">{currentUser?.employeeId}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 uppercase text-xs tracking-wider">Jurisdiction</span>
            <span className="text-white bg-amber-500/10 text-amber-400 px-2 py-1 rounded">Eastern & Central Mining Zones</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  switch (activeSubTab) {
    case 'mines': return renderMines();
    case 'compliance': return renderCompliance();
    case 'inspections': return renderInspections();
    case 'actions_required': return renderActions();
    case 'audit_history': return renderAuditHistory();
    case 'reports': return renderReports();
    case 'profile': return renderProfile();
    case 'overview':
    default: return renderOverview();
  }
};
