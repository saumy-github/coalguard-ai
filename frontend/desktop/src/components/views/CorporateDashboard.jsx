import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Building2, 
  TrendingUp, 
  ShieldAlert, 
  FileCheck, 
  MapPin, 
  Sparkles, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Filter
} from 'lucide-react';

export const CorporateDashboard = () => {
  const { currentUser, activeSubTab, setActiveSubTab, mines, addToast } = useApp();
  const [selectedSubsidiary, setSelectedSubsidiary] = useState('ALL');

  const filteredMines = selectedSubsidiary === 'ALL' 
    ? mines 
    : mines.filter(m => m.subsidiary === selectedSubsidiary);

  const totalProd = mines.reduce((acc, m) => acc + m.dailyProductionTons, 0);

  // 1. Dashboard Overview
  const renderOverview = () => {
    const summaryCards = [
      {
        title: "Total Mines",
        value: "24",
        subtext: "Across 6 Coal Subsidiaries",
        icon: <Building2 className="w-4 h-4" />,
        status: "safe",
        statusLabel: "ACTIVE"
      },
      {
        title: "Operating Mines",
        value: "21",
        subtext: "3 in Scheduled Maintenance",
        icon: <CheckCircle2 className="w-4 h-4" />,
        status: "optimal",
        statusLabel: "87.5% ONLINE"
      },
      {
        title: "Overall Compliance",
        value: "96.4%",
        subtext: "DGMS & MoEFCC Standard",
        icon: <FileCheck className="w-4 h-4" />,
        status: "safe",
        statusLabel: "CERTIFIED"
      },
      {
        title: "Total Daily Production",
        value: "142k T",
        subtext: "Within Monthly EC Quotas",
        icon: <TrendingUp className="w-4 h-4" />,
        status: "safe",
        statusLabel: "ON TRACK"
      }
    ];

    return (
      <PageLayout
        title="Corporate Executive Overview"
        subtitle="Pan-India coal mining operations, Environmental Clearance (EC) quotas, and ESG safety governance."
        badge="Enterprise Strategy"
        summaryCards={summaryCards}
        headerActions={
          <button
            onClick={() => setActiveSubTab('ai_insights')}
            className="btn-bronze px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Production Forecast</span>
          </button>
        }
      >
        {/* Environmental Clearance (EC) Cap Alert Callout */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/40 bg-amber-950/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> EC Quota Notice
            </span>
            <span className="text-xs font-mono text-[#d6c3b9]">Gevra Mega Opencast Project</span>
          </div>
          <p className="text-xs font-mono text-white">
            Gevra mine is approaching 94.8% of its annual Environmental Clearance ceiling. AI recommends re-distributing 2,500 T/day extraction load to Korba North pit.
          </p>
        </div>

        {/* Subsidiary Performance Summary */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Subsidiary Safety & Compliance Ratings"
            subtitle="Overview by regional operating subsidiary."
            action={
              <button
                onClick={() => setActiveSubTab('my_mines')}
                className="text-xs font-mono text-[#f6b994] hover:underline flex items-center gap-1 font-bold"
              >
                <span>View Mine Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: 'Eastern Coalfields (ECL)', score: '94.2%', mines: '4 Mines', status: 'Safe' },
              { name: 'Bharat Coking Coal (BCCL)', score: '88.5%', mines: '6 Mines', status: 'Notice' },
              { name: 'South Eastern Coal (SECL)', score: '96.8%', mines: '8 Mines', status: 'Safe' },
              { name: 'Northern Coalfields (NCL)', score: '91.0%', mines: '6 Mines', status: 'Safe' }
            ].map((sub, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#181717] border border-[#353534] space-y-2">
                <h4 className="text-xs font-bold text-white font-['Sora']">{sub.name}</h4>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-['Sora'] text-white">{sub.score}</span>
                  <StatusBadge status={sub.status === 'Safe' ? 'safe' : 'warning'} label={sub.status} />
                </div>
                <p className="text-[11px] font-mono text-[#9e8d85]">{sub.mines} Monitored</p>
              </div>
            ))}
          </div>
        </div>

        {/* Operating Mines List */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Active Key Mining Assets"
            subtitle="Real-time daily production and DGMS certification status."
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#353534] text-[#9e8d85]">
                  <th className="pb-3 font-semibold">Mine Name</th>
                  <th className="pb-3 font-semibold">Subsidiary</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Daily Production</th>
                  <th className="pb-3 font-semibold">Compliance Score</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#353534]/50">
                {mines.slice(0, 5).map((m) => (
                  <tr key={m.id} className="hover:bg-[#181717] transition-colors">
                    <td className="py-3 font-bold text-white font-['Sora']">{m.name}</td>
                    <td className="py-3 text-[#d6c3b9]">{m.subsidiary} ({m.state})</td>
                    <td className="py-3 text-[#d6c3b9]">{m.type}</td>
                    <td className="py-3 text-white font-bold">{m.dailyProductionTons.toLocaleString()} T/day</td>
                    <td className="py-3 text-emerald-400 font-bold">{m.complianceScore}%</td>
                    <td className="py-3">
                      <StatusBadge status={m.complianceScore > 90 ? 'safe' : 'warning'} label={m.dgmsStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageLayout>
    );
  };

  // 2. My Mines (Combined Map & Directory)
  const renderMyMines = () => (
    <PageLayout
      title="My Mines & Pan-India Network"
      subtitle="Complete nationwide directory, geographical positions, and active mine status."
      badge="Mine Assets"
    >
      <div className="space-y-6">
        
        {/* Map Visualization Box */}
        <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Pan-India Coal Mining Hubs"
            subtitle="Geographical distribution across West Bengal, Jharkhand, Chhattisgarh, MP, and Odisha."
          />

          <div className="relative w-full h-80 sm:h-96 rounded-2xl bg-[#0e0e0f] border border-[#353534] overflow-hidden p-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(#353534_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
              {mines.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-[#1a1919]/90 border border-[#51443d]/50 hover:border-[#f6b994] transition-all shadow-md">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#f6b994] font-bold">
                    <MapPin className="w-3 h-3" /> {m.subsidiary}
                  </div>
                  <h4 className="text-xs font-bold text-white font-['Sora'] mt-1 truncate">{m.name}</h4>
                  <p className="text-[10px] text-[#9e8d85] font-mono mt-0.5">{m.state}</p>
                  <p className="text-[11px] font-mono font-bold text-emerald-400 mt-1">{m.complianceScore}% Safe</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#353534]/60">
            <div>
              <h3 className="text-base font-bold text-white font-['Sora']">Mine Asset Registry</h3>
              <p className="text-xs text-[#9e8d85] font-mono">Filter by subsidiary or region.</p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#9e8d85]" />
              <select
                value={selectedSubsidiary}
                onChange={(e) => setSelectedSubsidiary(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#181717] border border-[#353534] text-xs font-mono text-white focus:outline-none focus:border-[#f6b994]"
              >
                <option value="ALL">All Subsidiaries</option>
                <option value="ECL">ECL (Eastern Coalfields)</option>
                <option value="BCCL">BCCL (Bharat Coking Coal)</option>
                <option value="SECL">SECL (South Eastern Coal)</option>
                <option value="NCL">NCL (Northern Coalfields)</option>
              </select>
            </div>
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

                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                  <div className="p-2 rounded-lg bg-[#141415]">
                    <span className="text-[10px] text-[#9e8d85]">Workers</span>
                    <p className="text-sm font-bold text-white">{m.activeWorkers}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#141415]">
                    <span className="text-[10px] text-[#9e8d85]">Production</span>
                    <p className="text-sm font-bold text-white">{m.dailyProductionTons} T</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#141415]">
                    <span className="text-[10px] text-[#9e8d85]">Score</span>
                    <p className="text-sm font-bold text-emerald-400">{m.complianceScore}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageLayout>
  );

  // 3. Risks & Incidents
  const renderRisks = () => (
    <PageLayout
      title="Enterprise Risks & Major Incidents"
      subtitle="Track high-risk mine locations, gas exceedance trends, and escalation tickets."
      badge="Risk Governance"
    >
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="High-Priority Risk Areas"
          subtitle="Locations requiring corporate oversight or investment in ventilation/support."
        />

        <div className="space-y-3">
          {[
            {
              mine: 'Umrer Open Pit Complex (WCL)',
              risk: 'Slope Stability & Heavy Haulage Dust',
              level: 'High Attention',
              action: 'DGMS Notice 2026-11: Install automatic laser slope radar.'
            },
            {
              mine: 'Moonidih Deep Seam Mine (BCCL)',
              risk: 'Gassy Seam Degree III Ventilation Pressure',
              level: 'Moderate Risk',
              action: 'Auxiliary fan booster upgraded in February. Methane levels in safe range.'
            }
          ].map((r, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#181717] border border-[#353534] space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white font-['Sora']">{r.mine}</h4>
                <StatusBadge status="warning" label={r.level} />
              </div>
              <p className="text-xs font-mono text-[#d6c3b9]">Primary Risk: {r.risk}</p>
              <p className="text-xs font-mono text-[#9e8d85] pt-1 border-t border-[#353534]/60">
                Action: {r.action}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 4. Compliance
  const renderCompliance = () => (
    <PageLayout
      title="Corporate Compliance & DGMS Index"
      subtitle="Statutory compliance scores across all operating subsidiaries."
      badge="Compliance Index"
    >
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="Subsidiary Compliance Scoreboard"
          subtitle="Ranked according to DGMS quarterly safety criteria."
        />

        <div className="space-y-3">
          {mines.map((m) => (
            <div key={m.id} className="p-4 rounded-xl bg-[#181717] border border-[#353534] flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white font-['Sora']">{m.name}</h4>
                <p className="text-xs text-[#9e8d85] font-mono">{m.subsidiary} • {m.state}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold font-mono text-emerald-400">{m.complianceScore}%</span>
                <StatusBadge status={m.complianceScore > 90 ? 'safe' : 'warning'} label={m.dgmsStatus} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 5. AI Insights
  const renderAIInsights = () => (
    <PageLayout
      title="AI Predictive Insights & Forecasts"
      subtitle="AI recommendations for production optimization while adhering strictly to environmental ceilings."
      badge="AI Insights"
    >
      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#f6b994] font-bold uppercase">
            <Sparkles className="w-4 h-4" /> Strategic AI Recommendation #1
          </div>
          <h3 className="text-base font-bold text-white font-['Sora']">
            Production Balancing for Environmental Clearance (EC) Ceilings
          </h3>
          <p className="text-xs text-[#d6c3b9] font-mono leading-relaxed">
            Gevra Mine is on track to hit its 14.5M ton annual cap by November 15. To maintain continuous dispatch without incurring statutory penalties, AI suggests ramping down Gevra by 2,500 T/day and ramping up Dipka Mine by 2,500 T/day.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-bold uppercase">
            <TrendingUp className="w-4 h-4" /> Safety Predictive Forecast #2
          </div>
          <h3 className="text-base font-bold text-white font-['Sora']">
            Monsoon Inundation Preparedness for Opencast Mines
          </h3>
          <p className="text-xs text-[#d6c3b9] font-mono leading-relaxed">
            Predictive weather telemetry models indicate early heavy rainfall in the Singrauli basin. Sump de-watering pumps in Nigahi pit should be serviced and backup diesel generators tested before June 10.
          </p>
        </div>
      </div>
    </PageLayout>
  );

  // 6. Reports
  const renderReports = () => (
    <PageLayout
      title="Board ESG & Statutory Filings"
      subtitle="Downloadable safety compliance briefs, production audits, and ESG metrics."
      badge="Reports"
    >
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-3">
        <SectionHeader
          title="Generated Executive Briefings"
          subtitle="Ready for board review and Ministry submission."
        />

        <div className="space-y-2.5">
          {[
            { title: 'Monthly ESG Safety & Production Report - March 2026', size: '2.4 MB PDF' },
            { title: 'DGMS Statutory Mine Compliance Index Summary Q1', size: '1.8 MB PDF' },
            { title: 'Environmental Clearance (EC) Quota Utilization Ledger', size: '3.1 MB PDF' }
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

  // 7. Profile
  const renderProfile = () => (
    <PageLayout
      title="Corporate Executive Profile"
      subtitle="Director credentials, strategic oversight role, and board affiliations."
      badge="Executive Record"
    >
      <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-[#353534]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8d5d3e] to-[#4c270c] border border-[#f6b994]/60 flex items-center justify-center text-white text-2xl font-extrabold font-['Sora'] shadow-lg">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-['Sora']">{currentUser?.name}</h3>
            <p className="text-xs font-mono text-[#f6b994]">{currentUser?.roleTitle}</p>
            <p className="text-[11px] font-mono text-[#9e8d85]">{currentUser?.organization}</p>
          </div>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 border-b border-[#353534]/50">
            <span className="text-[#9e8d85]">Executive Badge:</span>
            <span className="text-white font-bold">{currentUser?.badgeNumber}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#353534]/50">
            <span className="text-[#9e8d85]">Department:</span>
            <span className="text-white">{currentUser?.department}</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  switch (activeSubTab) {
    case 'my_mines':
      return renderMyMines();
    case 'risks_incidents':
      return renderRisks();
    case 'compliance':
      return renderCompliance();
    case 'ai_insights':
      return renderAIInsights();
    case 'reports':
      return renderReports();
    case 'profile':
      return renderProfile();
    case 'overview':
    default:
      return renderOverview();
  }
};
