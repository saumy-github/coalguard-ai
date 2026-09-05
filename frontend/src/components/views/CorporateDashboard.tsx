import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDashboardDataStore } from '../../store/dashboardDataStore';
import { useUIStore } from '../../store/uiStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
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
  const user = useAuthStore((state) => state.user);
  const { activeSubTab, setActiveSubTab, addToast } = useUIStore();
  const { mines } = useDashboardDataStore();
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
        icon: <Building2 className="w-5 h-5" />,
        status: "safe",
        statusLabel: "ACTIVE"
      },
      {
        title: "Operating Mines",
        value: "21",
        subtext: "3 in Scheduled Maintenance",
        icon: <CheckCircle2 className="w-5 h-5" />,
        status: "optimal",
        statusLabel: "87.5% ONLINE"
      },
      {
        title: "Overall Compliance",
        value: "96.4%",
        subtext: "DGMS & MoEFCC Standard",
        icon: <FileCheck className="w-5 h-5" />,
        status: "safe",
        statusLabel: "CERTIFIED"
      },
      {
        title: "Total Daily Production",
        value: "142k T",
        subtext: "Within Monthly EC Quotas",
        icon: <TrendingUp className="w-5 h-5" />,
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
            className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Production Forecast</span>
          </button>
        }
      >
        {/* Environmental Clearance (EC) Cap Alert Callout */}
        <div className="glass-panel rounded-3xl p-6 border-amber-500/50 bg-amber-500/10 space-y-3 relative overflow-hidden mt-6 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 blur-[50px]"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-sm font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-4 h-4" /> EC Quota Notice
              </span>
              <span className="text-sm font-mono text-amber-100/70">Gevra Mega Opencast Project</span>
            </div>
            <p className="text-sm font-mono text-white/90 leading-relaxed md:max-w-2xl bg-black/20 p-4 rounded-2xl border border-amber-500/20">
              Gevra mine is approaching 94.8% of its annual Environmental Clearance ceiling. AI recommends re-distributing 2,500 T/day extraction load to Korba North pit.
            </p>
          </div>
        </div>

        {/* Subsidiary Performance Summary */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-6">
          <SectionHeader
            title="Subsidiary Safety & Compliance Ratings"
            subtitle="Overview by regional operating subsidiary."
            action={
              <button
                onClick={() => setActiveSubTab('my_mines')}
                className="text-sm text-amber-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>View Mine Map</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { name: 'Eastern Coalfields (ECL)', score: '94.2%', mines: '4 Mines', status: 'Safe' },
              { name: 'Bharat Coking Coal (BCCL)', score: '88.5%', mines: '6 Mines', status: 'Notice' },
              { name: 'South Eastern Coal (SECL)', score: '96.8%', mines: '8 Mines', status: 'Safe' },
              { name: 'Northern Coalfields (NCL)', score: '91.0%', mines: '6 Mines', status: 'Safe' }
            ].map((sub, idx) => (
              <div key={idx} className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between group">
                <h4 className="text-sm font-bold text-white tracking-wide">{sub.name}</h4>
                <div className="flex items-baseline justify-between pt-2">
                  <span className={`text-2xl font-bold font-['Sora'] ${sub.status === 'Safe' ? 'text-amber-400' : 'text-amber-400'}`}>{sub.score}</span>
                  <StatusBadge status={sub.status === 'Safe' ? 'safe' : 'warning'} label={sub.status.toUpperCase()} />
                </div>
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">{sub.mines} Monitored</p>
              </div>
            ))}
          </div>
        </div>

        {/* Operating Mines List */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-6">
          <SectionHeader
            title="Active Key Mining Assets"
            subtitle="Real-time daily production and DGMS certification status."
          />

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm font-mono whitespace-nowrap">
              <thead className="bg-white/5">
                <tr className="text-slate-400 border-b border-white/10">
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Mine Name</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Subsidiary</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Type</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Daily Production</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Compliance Score</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mines.slice(0, 5).map((m) => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 font-bold text-white font-['Sora'] group-hover:text-amber-400 transition-colors">{m.name}</td>
                    <td className="p-4 text-slate-300">{m.subsidiary} ({m.state})</td>
                    <td className="p-4 text-slate-300"><span className="px-2 py-1 rounded bg-white/5 text-xs">{m.type}</span></td>
                    <td className="p-4 text-white font-bold">{m.dailyProductionTons.toLocaleString()} T/day</td>
                    <td className="p-4">
                      <span className={`font-bold ${m.complianceScore > 90 ? 'text-amber-400' : 'text-amber-400'}`}>{m.complianceScore}%</span>
                    </td>
                    <td className="p-4">
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
      <div className="space-y-6 mt-4">

        {/* Map Visualization Box */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <SectionHeader
            title="Pan-India Coal Mining Hubs"
            subtitle="Geographical distribution across West Bengal, Jharkhand, Chhattisgarh, MP, and Odisha."
          />

          <div className="relative w-full h-96 sm:h-[32rem] rounded-3xl bg-[#08080a] border border-white/10 overflow-hidden p-8 flex items-center justify-center shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-transparent to-transparent"></div>

            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-5 w-full max-w-4xl">
              {mines.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all shadow-lg backdrop-blur-md cursor-pointer group">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-orange-400 font-bold uppercase tracking-widest">
                    <MapPin className="w-3.5 h-3.5" /> {m.subsidiary}
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-wide mt-2 truncate group-hover:text-emerald-300 transition-colors">{m.name}</h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">{m.state}</p>
                  <div className="mt-3 inline-block px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                    <p className="text-[11px] font-mono font-bold text-amber-400">{m.complianceScore}% Safe</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Mine Asset Registry</h3>
              <p className="text-sm text-slate-400 font-mono mt-1">Filter by subsidiary or region.</p>
            </div>

            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={selectedSubsidiary}
                onChange={(e) => setSelectedSubsidiary(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-orange-500/50 transition-colors"
              >
                <option value="ALL">All Subsidiaries</option>
                <option value="ECL">ECL (Eastern Coalfields)</option>
                <option value="BCCL">BCCL (Bharat Coking Coal)</option>
                <option value="SECL">SECL (South Eastern Coal)</option>
                <option value="NCL">NCL (Northern Coalfields)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredMines.map((m) => (
              <div key={m.id} className="glass-panel glass-panel-hover p-5 rounded-2xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-white tracking-wide">{m.name}</h4>
                    <p className="text-sm text-slate-400 font-mono mt-1">{m.district}, {m.state} ({m.subsidiary})</p>
                  </div>
                  <StatusBadge status={m.complianceScore > 90 ? 'safe' : 'warning'} label={m.dgmsStatus} />
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm font-mono pt-2">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Workers</span>
                    <p className="text-lg font-bold text-white">{m.activeWorkers}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Production</span>
                    <p className="text-lg font-bold text-white">{m.dailyProductionTons} T</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Score</span>
                    <p className={`text-lg font-bold ${m.complianceScore > 90 ? 'text-amber-400' : 'text-amber-400'}`}>{m.complianceScore}%</p>
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
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="High-Priority Risk Areas"
          subtitle="Locations requiring corporate oversight or investment in ventilation/support."
        />

        <div className="space-y-4">
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
            <div key={idx} className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-3 group">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white tracking-wide">{r.mine}</h4>
                <StatusBadge status={r.level.includes('High') ? 'critical' : 'warning'} label={r.level} />
              </div>
              <p className="text-sm font-mono text-slate-300">
                <span className="text-slate-500 uppercase text-xs tracking-wider mr-2">Primary Risk</span>
                {r.risk}
              </p>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-sm font-mono text-slate-300 mt-2 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-amber-400 font-bold uppercase text-xs tracking-wider block mb-1">Required Action</span>
                  {r.action}
                </div>
              </div>
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
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="Subsidiary Compliance Scoreboard"
          subtitle="Ranked according to DGMS quarterly safety criteria."
        />

        <div className="space-y-4">
          {mines.map((m) => (
            <div key={m.id} className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
              <div>
                <h4 className="text-base font-bold text-white tracking-wide group-hover:text-orange-400 transition-colors">{m.name}</h4>
                <p className="text-sm text-slate-400 font-mono mt-1">{m.subsidiary} • {m.state}</p>
              </div>

              <div className="flex items-center gap-5">
                <span className={`text-xl font-bold font-mono ${m.complianceScore > 90 ? 'text-amber-400' : 'text-amber-400'}`}>{m.complianceScore}%</span>
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
      <div className="space-y-6 mt-4">
        <div className="glass-panel rounded-3xl p-8 border-orange-500/20 space-y-4 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-orange-500/10 blur-[60px]"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-mono text-orange-400 font-bold uppercase tracking-widest mb-3">
              <Sparkles className="w-4 h-4" /> Strategic AI Recommendation #1
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight mb-3">
              Production Balancing for Environmental Clearance (EC) Ceilings
            </h3>
            <p className="text-sm text-slate-300 font-mono leading-relaxed bg-black/20 p-5 rounded-2xl border border-white/5">
              Gevra Mine is on track to hit its 14.5M ton annual cap by November 15. To maintain continuous dispatch without incurring statutory penalties, AI suggests ramping down Gevra by 2,500 T/day and ramping up Dipka Mine by 2,500 T/day.
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 border-stone-500/20 space-y-4 relative overflow-hidden">
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-stone-500/10 blur-[60px]"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-mono text-stone-400 font-bold uppercase tracking-widest mb-3">
              <TrendingUp className="w-4 h-4" /> Safety Predictive Forecast #2
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight mb-3">
              Monsoon Inundation Preparedness for Opencast Mines
            </h3>
            <p className="text-sm text-slate-300 font-mono leading-relaxed bg-black/20 p-5 rounded-2xl border border-white/5">
              Predictive weather telemetry models indicate early heavy rainfall in the Singrauli basin. Sump de-watering pumps in Nigahi pit should be serviced and backup diesel generators tested before June 10.
            </p>
          </div>
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
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="Generated Executive Briefings"
          subtitle="Ready for board review and Ministry submission."
        />

        <div className="space-y-4">
          {[
            { title: 'Monthly ESG Safety & Production Report - March 2026', size: '2.4 MB PDF' },
            { title: 'DGMS Statutory Mine Compliance Index Summary Q1', size: '1.8 MB PDF' },
            { title: 'Environmental Clearance (EC) Quota Utilization Ledger', size: '3.1 MB PDF' }
          ].map((rep, idx) => (
            <div key={idx} className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400">
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

  // 7. Profile
  const renderProfile = () => (
    <PageLayout
      title="Corporate Executive Profile"
      subtitle="Director credentials, strategic oversight role, and board affiliations."
      badge="Executive Record"
    >
      <div className="glass-panel rounded-3xl p-8 max-w-2xl mx-auto space-y-6 mt-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px]"></div>

        <div className="flex items-center gap-5 pb-6 border-b border-white/10 relative z-10">
          <div className="w-20 h-20 rounded-[1.25rem] bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 text-3xl font-extrabold shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            {displayName(user).charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{displayName(user)}</h3>
            <p className="text-sm font-mono text-orange-400 mt-1 uppercase tracking-wider">{userTypeLabel(user?.user_type)}</p>
            <p className="text-xs text-slate-400 mt-1">{user?.organization}</p>
          </div>
        </div>

        <div className="space-y-4 text-sm font-mono text-slate-300 relative z-10">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 uppercase text-xs tracking-wider">Executive Badge</span>
            <span className="text-white font-bold bg-white/5 px-2 py-1 rounded">{user?.badgeNumber}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 uppercase text-xs tracking-wider">Department</span>
            <span className="text-white bg-orange-500/10 text-orange-400 px-2 py-1 rounded">{user?.department}</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  switch (activeSubTab) {
    case 'my_mines': return renderMyMines();
    case 'risks_incidents': return renderRisks();
    case 'compliance': return renderCompliance();
    case 'ai_insights': return renderAIInsights();
    case 'reports': return renderReports();
    case 'profile': return renderProfile();
    case 'overview':
    default: return renderOverview();
  }
};
