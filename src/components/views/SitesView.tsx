import React, { useState } from 'react';
import { Site, User, Attendance } from '../../types';
import { useI18n } from '../../lib/i18n';
import { UserAvatar } from '../UserAvatar';
import { 
  Building2, 
  Plus, 
  Users, 
  MapPin, 
  HardHat, 
  UserCheck, 
  CheckCircle2, 
  Search, 
  X, 
  Clock, 
  Calculator, 
  Calendar, 
  Printer, 
  FileText, 
  TrendingUp, 
  ChevronRight 
} from 'lucide-react';

interface SitesViewProps {
  sites: Site[];
  users: User[];
  attendance?: Attendance[];
  onSaveSite: (site: Site) => void;
  currentUserRole: string;
}

export const SitesView: React.FC<SitesViewProps> = ({
  sites,
  users,
  attendance = [],
  onSaveSite,
  currentUserRole
}) => {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [selectedSiteForMetrics, setSelectedSiteForMetrics] = useState<Site | null>(null);

  const [editingSite, setEditingSite] = useState<Partial<Site>>({
    name: '',
    location: '',
    status: 'Active',
    laborerIds: []
  });

  const supervisors = users.filter((u) => u.role === 'Site Supervisor');
  const allLaborers = users.filter((u) => u.role === 'Labor');

  const filteredSites = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingSite({
      id: `site-${Date.now()}`,
      name: '',
      location: '',
      status: 'Active',
      laborerIds: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (site: Site) => {
    setEditingSite({ ...site });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite.name || !editingSite.location) return;

    onSaveSite({
      id: editingSite.id || `site-${Date.now()}`,
      name: editingSite.name,
      location: editingSite.location,
      supervisorId: editingSite.supervisorId,
      laborerIds: editingSite.laborerIds || [],
      status: editingSite.status || 'Active',
      budget: editingSite.budget || 500000
    });

    setIsModalOpen(false);
  };

  const toggleLaborerSelection = (laborerId: string) => {
    const current = editingSite.laborerIds || [];
    if (current.includes(laborerId)) {
      setEditingSite({
        ...editingSite,
        laborerIds: current.filter((id) => id !== laborerId)
      });
    } else {
      setEditingSite({
        ...editingSite,
        laborerIds: [...current, laborerId]
      });
    }
  };

  // Helper to compute site monthly man-hour aggregation
  const computeSiteMetrics = (siteId: string, monthStr: string) => {
    // Filter attendance for this site and selected month (YYYY-MM)
    const siteAtt = attendance.filter(
      (a) => a.siteId === siteId && a.date.startsWith(monthStr)
    );

    let totalPresentDays = 0;
    let totalHalfDays = 0;
    let totalAbsences = 0;
    let totalOvertimeHours = 0;

    siteAtt.forEach((a) => {
      if (a.status === 'Present') totalPresentDays += 1;
      else if (a.status === 'Half-Day') totalHalfDays += 1;
      else if (a.status === 'Absent') totalAbsences += 1;

      if (a.overtimeHours) totalOvertimeHours += a.overtimeHours;
    });

    const totalWorkerDays = totalPresentDays + totalHalfDays * 0.5;
    // Standard 10-hour shift calculation per worker per day
    const standardShiftHours = totalPresentDays * 10 + totalHalfDays * 5;
    const totalWorkingHours = standardShiftHours + totalOvertimeHours;

    // Daily breakdown table generation
    const dailyMap: Record<string, { presentCount: number; halfDayCount: number; overtimeHrs: number }> = {};
    siteAtt.forEach((a) => {
      if (!dailyMap[a.date]) {
        dailyMap[a.date] = { presentCount: 0, halfDayCount: 0, overtimeHrs: 0 };
      }
      if (a.status === 'Present') dailyMap[a.date].presentCount += 1;
      if (a.status === 'Half-Day') dailyMap[a.date].halfDayCount += 1;
      if (a.overtimeHours) dailyMap[a.date].overtimeHrs += a.overtimeHours;
    });

    const sortedDates = Object.keys(dailyMap).sort();
    let cumulativeHours = 0;

    const dailyBreakdown = sortedDates.map((d, index) => {
      const dayData = dailyMap[d];
      const dailyWorkerCount = dayData.presentCount + dayData.halfDayCount;
      const dailyHours = dayData.presentCount * 10 + dayData.halfDayCount * 5 + dayData.overtimeHrs;
      cumulativeHours += dailyHours;

      return {
        dayLabel: `Day ${index + 1} (${d})`,
        date: d,
        presentCount: dayData.presentCount,
        halfDayCount: dayData.halfDayCount,
        dailyWorkerCount,
        dailyHours,
        cumulativeHours
      };
    });

    return {
      totalWorkerDays,
      totalPresentDays,
      totalHalfDays,
      totalAbsences,
      totalOvertimeHours,
      standardShiftHours,
      totalWorkingHours,
      dailyBreakdown,
      logsCount: siteAtt.length
    };
  };

  const handlePrintSiteInvoice = (site: Site) => {
    const metrics = computeSiteMetrics(site.id, selectedMonth);
    const supervisor = users.find((u) => u.id === site.supervisorId);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Site Client Man-Hour & Invoice Timesheet - ${site.name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; pb: 15px; margin-bottom: 20px; }
            .company-title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
            .doc-subtitle { font-size: 13px; color: #475569; }
            .badge { background: #0f172a; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; }
            .grid-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
            .card-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .card-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
            th { background: #0f172a; color: white; text-transform: uppercase; font-size: 10px; padding: 8px 10px; text-align: left; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
            tr:nth-child(even) { background: #f8fafc; }
            .total-row { background: #e2e8f0 !important; font-weight: bold; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; pt: 30px; border-top: 1px solid #cbd5e1; font-size: 11px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-title">LMS Labor Management System</div>
              <div class="doc-subtitle">Client Monthly Workday & Man-Hour Invoice Timesheet</div>
            </div>
            <div>
              <span class="badge">MONTH: ${selectedMonth}</span>
            </div>
          </div>

          <div style="margin-bottom: 15px; font-size: 12px;">
            <strong>Site Name:</strong> ${site.name} (${site.id}) | <strong>Location:</strong> ${site.location} | <strong>Supervisor:</strong> ${supervisor?.name || 'Unassigned'}
          </div>

          <div class="grid-cards">
            <div class="card">
              <div class="card-label">Total Worker-Days</div>
              <div class="card-val">${metrics.totalWorkerDays.toFixed(1)} Days</div>
            </div>
            <div class="card">
              <div class="card-label">Total Shift Hours (10h/d)</div>
              <div class="card-val">${metrics.standardShiftHours} Hrs</div>
            </div>
            <div class="card">
              <div class="card-label">Overtime Hours</div>
              <div class="card-val">${metrics.totalOvertimeHours} Hrs</div>
            </div>
            <div class="card">
              <div class="card-label">Total Cumulative Hours</div>
              <div class="card-val">${metrics.totalWorkingHours} Man-Hrs</div>
            </div>
          </div>

          <h3 style="font-size: 14px; margin-bottom: 8px;">Daily Worker Deployment & Cumulative Man-Hours Log</h3>
          <table>
            <thead>
              <tr>
                <th>Day / Date</th>
                <th>Workers Logged</th>
                <th>Full Shifts (10h)</th>
                <th>Half Shifts (5h)</th>
                <th>Daily Total Hours</th>
                <th>Cumulative Monthly Hours</th>
              </tr>
            </thead>
            <tbody>
              ${metrics.dailyBreakdown.map((row) => `
                <tr>
                  <td><strong>${row.dayLabel}</strong></td>
                  <td>${row.dailyWorkerCount} Workers</td>
                  <td>${row.presentCount}</td>
                  <td>${row.halfDayCount}</td>
                  <td><strong>${row.dailyHours} Hrs</strong></td>
                  <td><strong>${row.cumulativeHours} Hrs</strong></td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>TOTAL MONTHLY CUMULATIVE</td>
                <td>${metrics.totalWorkerDays.toFixed(1)} Worker-Days</td>
                <td>${metrics.totalPresentDays} Shifts</td>
                <td>${metrics.totalHalfDays} Half-Shifts</td>
                <td>${metrics.totalWorkingHours} Hrs</td>
                <td>${metrics.totalWorkingHours} Man-Hours</td>
              </tr>
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div>____________________________________</div>
              <div>Prepared By: Site Supervisor (${supervisor?.name || 'Authorized Supervisor'})</div>
            </div>
            <div>
              <div>____________________________________</div>
              <div>Client Representative Signature & Stamp</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div id="view-sites" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Sites & Workday Man-Hour Aggregator
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track site labor deployment, standard 10-hour shift calculations, and monthly client billable man-hours.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-600">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="font-bold text-slate-900 focus:outline-none"
            />
          </div>

          {(currentUserRole === 'Super Admin' || currentUserRole === 'HR Admin' || currentUserRole === 'Owner') && (
            <button
              id="btn-add-new-site"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              Create New Site
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          id="input-search-sites"
          type="text"
          placeholder="Search sites by name or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSites.map((site) => {
          const supervisor = users.find((u) => u.id === site.supervisorId);
          const siteLaborers = users.filter((u) => site.laborerIds.includes(u.id));
          const metrics = computeSiteMetrics(site.id, selectedMonth);

          return (
            <div
              key={site.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      {site.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {site.name}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      site.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : site.status === 'On Hold'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {site.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  <span className="truncate">{site.location}</span>
                </div>

                {/* Supervisor Block */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Supervisor</span>
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-slate-800">
                      {supervisor ? supervisor.name : 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Dynamic Monthly Workday & Hours Aggregator Card */}
                <div className="p-3 bg-gradient-to-br from-indigo-900 to-slate-900 text-slate-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-amber-300" />
                      Monthly Work & Hours ({selectedMonth})
                    </span>
                    <span>10h Shift Std.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-800">
                    <div className="bg-slate-800/80 p-1.5 rounded-lg">
                      <div className="text-[10px] text-slate-400 font-medium">Worker-Days Deployed</div>
                      <div className="text-base font-black text-emerald-400">
                        {metrics.totalWorkerDays.toFixed(1)} <span className="text-[10px] font-normal text-slate-300">Days</span>
                      </div>
                    </div>

                    <div className="bg-slate-800/80 p-1.5 rounded-lg">
                      <div className="text-[10px] text-slate-400 font-medium">Total Working Hours</div>
                      <div className="text-base font-black text-amber-300">
                        {metrics.totalWorkingHours} <span className="text-[10px] font-normal text-slate-300">Hrs</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Allocated Laborers count */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium flex items-center gap-1">
                      <HardHat className="w-3.5 h-3.5 text-indigo-600" /> Assigned Laborers
                    </span>
                    <span className="font-bold text-slate-900">{siteLaborers.length} active</span>
                  </div>

                  <div className="flex -space-x-2 overflow-hidden py-0.5">
                    {siteLaborers.slice(0, 5).map((lab) => (
                      <UserAvatar
                        key={lab.id}
                        src={lab.avatar}
                        name={lab.name}
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                      />
                    ))}
                    {siteLaborers.length > 5 && (
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold ring-2 ring-white">
                        +{siteLaborers.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedSiteForMetrics(site)}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Client Man-Hours breakdown
                </button>

                {(currentUserRole === 'Super Admin' || currentUserRole === 'HR Admin' || currentUserRole === 'Owner') && (
                  <button
                    onClick={() => handleOpenEditModal(site)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED MAN-HOURS & CLIENT INVOICING BREAKDOWN MODAL */}
      {selectedSiteForMetrics && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">Site Man-Hours & Receivables Report</span>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedSiteForMetrics.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSiteForMetrics(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Monthly Work Summary Card */}
            {(() => {
              const metrics = computeSiteMetrics(selectedSiteForMetrics.id, selectedMonth);
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Worker-Days Deployed</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        {metrics.totalWorkerDays.toFixed(1)} <span className="text-xs text-slate-500 font-normal">Days</span>
                      </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase">Standard Shift (10h)</span>
                      <div className="text-lg font-black text-indigo-900 mt-1">
                        {metrics.standardShiftHours} <span className="text-xs text-indigo-600 font-normal">Hours</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-amber-800 uppercase">Overtime Logged</span>
                      <div className="text-lg font-black text-amber-900 mt-1">
                        {metrics.totalOvertimeHours} <span className="text-xs text-amber-700 font-normal">Hours</span>
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase">Cumulative Man-Hours</span>
                      <div className="text-lg font-black text-emerald-900 mt-1">
                        {metrics.totalWorkingHours} <span className="text-xs text-emerald-700 font-normal">Man-Hrs</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-indigo-600" />
                      Daily Worker Count & Man-Hours Breakdown ({selectedMonth})
                    </h4>

                    <button
                      onClick={() => handlePrintSiteInvoice(selectedSiteForMetrics)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      Print Client Invoice / Timesheet
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-3">Day & Date</th>
                          <th className="p-3">Workers Deployed</th>
                          <th className="p-3">Full Shifts (10h)</th>
                          <th className="p-3">Half Shifts (5h)</th>
                          <th className="p-3">Daily Hours</th>
                          <th className="p-3 text-right">Cumulative Monthly Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {metrics.dailyBreakdown.length > 0 ? (
                          metrics.dailyBreakdown.map((row) => (
                            <tr key={row.date} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900">{row.dayLabel}</td>
                              <td className="p-3 text-indigo-700 font-bold">{row.dailyWorkerCount} workers</td>
                              <td className="p-3 text-slate-700">{row.presentCount}</td>
                              <td className="p-3 text-slate-700">{row.halfDayCount}</td>
                              <td className="p-3 font-bold text-slate-900">{row.dailyHours} hrs</td>
                              <td className="p-3 text-right font-black text-slate-900">{row.cumulativeHours} hrs</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                              No attendance records logged for this site in {selectedMonth}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal for Add / Edit Site */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingSite.id ? 'Edit Site Configuration' : 'Create Construction Site'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Site Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Tower Phase 2"
                  value={editingSite.name || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Site Location Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. King Fahd Road, Sector 4, Riyadh"
                  value={editingSite.location || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Site Status
                  </label>
                  <select
                    value={editingSite.status || 'Active'}
                    onChange={(e) => setEditingSite({ ...editingSite, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Site Supervisor
                  </label>
                  <select
                    value={editingSite.supervisorId || ''}
                    onChange={(e) => setEditingSite({ ...editingSite, supervisorId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="">Select Supervisor...</option>
                    {supervisors.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Allocate Laborers to Site ({editingSite.laborerIds?.length || 0} selected)
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                  {allLaborers.map((lab) => {
                    const isSelected = editingSite.laborerIds?.includes(lab.id);
                    return (
                      <div
                        key={lab.id}
                        onClick={() => toggleLaborerSelection(lab.id)}
                        className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-indigo-50 border border-indigo-200 font-bold text-indigo-900' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={lab.avatar}
                            name={lab.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div>
                            <div>{lab.name}</div>
                            <span className="text-[10px] text-slate-400 font-normal">{lab.designation}</span>
                          </div>
                        </div>

                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  Save Site Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
