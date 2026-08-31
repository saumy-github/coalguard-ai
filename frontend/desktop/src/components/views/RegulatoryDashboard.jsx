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
        icon: <Landmark className="w-4 h-4" />,
        status: "safe",
        statusLabel: "ACTIVE"
      },
      {
        title: "Compliance Rate",
        value: "94.8%",
        subtext: "CMR 2017 Benchmark",
        icon: <FileCheck className="w-4 h-4 text-emerald-400" />,
        status: "safe",
        statusLabel: "GOOD"
      },
      {
        title: "Pending Notices",
        value: "2",
        subtext: "Awaiting Action from Mine",
        icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
        status: "warning",
        statusLabel: "ACTION REQUIRED"
      },
      {
        title: "Surprise Inspections",
        value: "14",
        subtext: "Completed this Quarter",
        icon: <ClipboardCheck className="w-4 h-4" />,
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
            className="btn-bronze px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Issue Statutory Notice</span>
          </button>
        }
      >
        {/* Quick Statutory Notices Overview */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Open Regulatory Notices"
            subtitle="Mines requiring immediate rectification before next inspection cycle."
            action={
              <button
                onClick={() => setActiveSubTab('actions_required')}
                className="text-xs font-mono text-[#f6b994] hover:underline flex items-center gap-1 font-bold"
              >
                <span>View All Actions</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#181717] border border-[#353534] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-['Sora']">Moonidih Deep Seam Mine (BCCL)</span>
                <StatusBadge status="action_required" label="NOTICE PENDING" />
              </div>
              <p className="text-xs font-mono text-[#d6c3b9]">
                Notice Ref: DGMS/DHN/2026/089 - Complete flameproof electrical testing certification for longwall face #2.
              </p>
              <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-[#9e8d85]">
                <span>Issued: 24 Feb 2026</span>
                <span className="text-amber-400 font-bold">Rectification Deadline: 10 March 2026</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#181717] border border-[#353534] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-['Sora']">Umrer Open Pit Complex (WCL)</span>
                <StatusBadge status="in_investigation" label="UNDER REVIEW" />
              </div>
              <p className="text-xs font-mono text-[#d6c3b9]">
                Notice Ref: DGMS/NAG/2026/042 - Bench height compliance verification and haul road dust suppression log audit.
              </p>
              <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-[#9e8d85]">
                <span>Issued: 18 Feb 2026</span>
                <span className="text-emerald-400 font-bold">Mine Response Received ✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mines Safety Directory */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Jurisdiction Mine Registry"
            subtitle="Live status of all active coal operations."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mines.slice(0, 4).map((m) => (
              <div key={m.id} className="p-4 rounded-xl bg-[#181717] border border-[#353534] flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white font-['Sora']">{m.name}</h4>
                  <p className="text-xs text-[#9e8d85] font-mono">{m.subsidiary} • {m.state}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-emerald-400">{m.complianceScore}% Score</span>
                  <div className="mt-1">
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        
        {/* Search Bar */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#141415] border border-[#353534]">
          <Search className="w-4 h-4 text-[#9e8d85]" />
          <input
            type="text"
            value={searchMine}
            onChange={(e) => setSearchMine(e.target.value)}
            placeholder="Search by mine name, state, or operating company..."
            className="w-full bg-transparent text-xs font-mono text-white placeholder-[#9e8d85] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMines.map((m) => (
            <div key={m.id} className="p-4 rounded-xl bg-[#181717] border border-[#353534] space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white font-['Sora']">{m.name}</h4>
                  <p className="text-xs text-[#9e8d85] font-mono">{m.district}, {m.state} ({m.subsidiary})</p>
                </div>
                <StatusBadge status={m.complianceScore > 90 ? 'safe' : 'warning'} label={m.dgmsStatus} />
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1 text-[#d6c3b9]">
                <span>Type: {m.type}</span>
                <span>Workers: {m.activeWorkers}</span>
                <span className="text-emerald-400 font-bold">{m.complianceScore}% Safe</span>
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="CMR 2017 Regulation Enforcement Index"
          subtitle="Mandatory standards and compliance benchmarks."
        />

        <div className="space-y-3">
          {[
            { reg: 'Regulation 153 - Ventilation & Gaseous Limits', status: 'compliant', desc: 'Methane (CH4) below 1.25% in return airway; air velocity > 0.5 m/s across all working faces.' },
            { reg: 'Regulation 129 - Strata Control & Roof Support', status: 'compliant', desc: 'Systematic support rules updated quarterly; continuous load cell monitoring.' },
            { reg: 'Regulation 144 - Explosion-Proof & Flameproof Units', status: 'notice', desc: 'Flameproof electrical enclosure seals verified within mandatory 30-day interval.' }
          ].map((r, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#181717] border border-[#353534] space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white font-['Sora']">{r.reg}</h4>
                <StatusBadge status={r.status === 'compliant' ? 'safe' : 'warning'} label={r.status.toUpperCase()} />
              </div>
              <p className="text-xs font-mono text-[#d6c3b9]">{r.desc}</p>
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="Recent Field Inspection Records"
          subtitle="Conducted by Deputy Director of Mines Safety."
        />

        <div className="space-y-3">
          {inspections.map((insp) => (
            <div key={insp.id} className="p-5 rounded-xl bg-[#181717] border border-[#353534] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white font-['Sora']">{insp.location}</h4>
                  <p className="text-xs font-mono text-[#9e8d85]">
                    Auditor: {insp.inspectorName} • Date: {insp.date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">{insp.score}/100 Score</span>
                  <StatusBadge status={insp.status} />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                {insp.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#141415] text-xs font-mono">
                    <span className="text-[#d6c3b9]">{item.title}</span>
                    <span className={`text-[10px] font-bold ${item.status === 'pass' ? 'text-emerald-400' : 'text-red-400'}`}>
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
      <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 max-w-2xl mx-auto space-y-4">
        <SectionHeader
          title="Serve New Statutory Order"
          subtitle="This order will be dispatched to the Chief Safety Officer and Corporate HQ."
        />

        <form onSubmit={handleIssueNotice} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">Target Coal Mine</label>
            <select
              value={targetMine}
              onChange={(e) => setTargetMine(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
            >
              {mines.map(m => (
                <option key={m.id} value={`${m.name} (${m.subsidiary})`}>
                  {m.name} ({m.subsidiary})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">Regulation Cited</label>
            <input
              type="text"
              required
              value={noticeClause}
              onChange={(e) => setNoticeClause(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">Directives & Rectification Mandate</label>
            <textarea
              rows={3}
              required
              value={noticeDetails}
              onChange={(e) => setNoticeDetails(e.target.value)}
              placeholder="Specify the required engineering or operational changes..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
            />
          </div>

          <button
            type="submit"
            className="w-full btn-bronze py-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2"
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-3">
        <SectionHeader
          title="Past Inspection Logbook"
          subtitle="All records maintained under DGMS digital archival rules."
        />

        <div className="space-y-2.5 text-xs font-mono">
          {[
            { id: 'AUD-2026-088', mine: 'Gevra Mega Opencast (SECL)', date: '14 Jan 2026', outcome: 'Passed with 98% rating' },
            { id: 'AUD-2026-074', mine: 'Kusmunda Open Pit (SECL)', date: '02 Feb 2026', outcome: 'Dust suppression verified compliant' },
            { id: 'AUD-2026-061', mine: 'Moonidih Deep Seam (BCCL)', date: '20 Feb 2026', outcome: 'Notice issued for flameproof check' }
          ].map((a) => (
            <div key={a.id} className="p-3.5 rounded-xl bg-[#181717] border border-[#353534] flex items-center justify-between">
              <div>
                <span className="font-bold text-white">{a.mine}</span>
                <p className="text-[#9e8d85] text-[10px]">{a.id} • {a.date}</p>
              </div>
              <span className="text-[#d6c3b9]">{a.outcome}</span>
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-3">
        <SectionHeader
          title="Official Publications"
          subtitle="Ready for gazette publication and ministry archives."
        />

        <div className="space-y-2.5">
          {[
            { title: 'National Coal Mines Safety Annual Compendium 2025-26', size: '4.2 MB PDF' },
            { title: 'Quarterly DGMS Subterranean Gas & Strata Report', size: '2.9 MB PDF' }
          ].map((rep, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#181717] border border-[#353534] flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white font-['Sora']">{rep.title}</h4>
                <p className="text-[10px] text-[#9e8d85] font-mono mt-0.5">{rep.size}</p>
              </div>
              <button
                onClick={() => addToast('success', 'Download Started', `${rep.title} downloading...`)}
                className="btn-bronze px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
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
      <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-[#353534]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8d5d3e] to-[#4c270c] border border-[#f6b994]/60 flex items-center justify-center text-white text-2xl font-extrabold font-['Sora'] shadow-lg">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'R'}
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-['Sora']">{currentUser?.name}</h3>
            <p className="text-xs font-mono text-[#f6b994]">{currentUser?.roleTitle}</p>
            <p className="text-[11px] font-mono text-[#9e8d85]">{currentUser?.organization}</p>
          </div>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 border-b border-[#353534]/50">
            <span className="text-[#9e8d85]">Inspector Warrant ID:</span>
            <span className="text-white font-bold">{currentUser?.employeeId}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#353534]/50">
            <span className="text-[#9e8d85]">Jurisdiction:</span>
            <span className="text-white">Eastern & Central Mining Zones</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  switch (activeSubTab) {
    case 'mines':
      return renderMines();
    case 'compliance':
      return renderCompliance();
    case 'inspections':
      return renderInspections();
    case 'actions_required':
      return renderActions();
    case 'audit_history':
      return renderAuditHistory();
    case 'reports':
      return renderReports();
    case 'profile':
      return renderProfile();
    case 'overview':
    default:
      return renderOverview();
  }
};
