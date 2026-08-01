import React from 'react';
import { User, Site, Attendance, Payroll, Complaint, Notice } from '../../types';
import { getIqamaExpiryStatus } from '../../utils/iqamaUtils';
import { UserAvatar } from '../UserAvatar';
import { 
  Building2, 
  Users, 
  CalendarCheck, 
  DollarSign, 
  AlertTriangle, 
  Megaphone, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  HardHat,
  Database
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: User;
  users: User[];
  sites: Site[];
  attendance: Attendance[];
  payrolls: Payroll[];
  complaints: Complaint[];
  notices: Notice[];
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  users,
  sites,
  attendance,
  payrolls,
  complaints,
  notices,
  setActiveTab
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Derived metrics
  const totalLaborers = users.filter((u) => u.role === 'Labor').length;
  const activeSites = sites.filter((s) => s.status === 'Active').length;

  const todayAttendance = attendance.filter((a) => a.date === todayStr);
  const presentToday = todayAttendance.filter((a) => a.status === 'Present').length;
  const halfDayToday = todayAttendance.filter((a) => a.status === 'Half-Day').length;
  const totalMarkedToday = todayAttendance.length;

  const pendingComplaints = complaints.filter((c) => c.status === 'Pending').length;

  const totalMonthlyPayout = payrolls.reduce((sum, p) => sum + p.netSalary, 0);

  // Labor specific
  const mySite = sites.find((s) => s.id === currentUser.siteId);
  const myTodayAttendance = attendance.find((a) => a.userId === currentUser.id && a.date === todayStr);
  const myLatestPayroll = payrolls.find((p) => p.userId === currentUser.id);
  
  // Complaints count today for laborer
  const myComplaintsToday = complaints.filter(
    (c) => c.userId === currentUser.id && c.date.startsWith(todayStr)
  ).length;

  // Filter notices for current user
  const relevantNotices = notices.filter(
    (n) => n.targetGroup === 'All' || n.targetGroup === currentUser.siteId
  );

  return (
    <div id="view-dashboard" className="space-y-6">
      {/* Welcome & Role Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            src={currentUser.avatar}
            name={currentUser.name}
            className="w-14 h-14 rounded-full border-2 border-indigo-400 object-cover flex-shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Welcome back, {currentUser.name}!
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {currentUser.designation || currentUser.role} • {mySite ? `Assigned to: ${mySite.name}` : 'Corporate Headquarters'}
            </p>
          </div>
        </div>

        {currentUser.role !== 'Labor' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const workerLink = `${window.location.origin}/login/worker?companyToken=${currentUser.companyId || 'tenant'}`;
                navigator.clipboard.writeText(workerLink);
                alert(`📋 Dedicated Company Worker Login Link Copied!\n\nShare this unique link with your site workforce:\n${workerLink}\n\nWorkers clicking this link will automatically enter your dedicated company portal to log in with their assigned Serial Number and Password.`);
              }}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <HardHat className="w-4 h-4 text-emerald-200" />
              Copy Worker Login Link
            </button>
            <button
              onClick={() => setActiveTab('sql_workbench')}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Database className="w-4 h-4 text-amber-300" />
              Inspect SQL Database Schema
            </button>
          </div>
        )}
      </div>

      {/* Role-Specific Metric Cards */}
      {currentUser.role === 'Labor' ? (
        /* LABORER DASHBOARD CARD ROW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Today's Attendance</span>
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                myTodayAttendance?.status === 'Present' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : myTodayAttendance?.status === 'Half-Day'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {myTodayAttendance ? myTodayAttendance.status : 'Not Marked Yet'}
              </span>
              <span className="text-xs text-slate-400">{todayStr}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {myTodayAttendance?.notes || 'Marked by site supervisor during morning roll call.'}
            </p>
          </div>

          {/* Daily Rate & Earnings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Your Daily Rate</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              SAR {currentUser.dailyRate.toFixed(2)} <span className="text-xs font-normal text-slate-500">/ day</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              Est. Monthly Net: SAR {myLatestPayroll ? myLatestPayroll.netSalary.toFixed(2) : (currentUser.dailyRate * 22).toFixed(2)}
            </p>
          </div>

          {/* Daily Complaint Status (Max 3/day enforcement indicator) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Daily Complaints Limit</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {myComplaintsToday} / 3 <span className="text-xs font-normal text-slate-500">used today</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full ${myComplaintsToday >= 3 ? 'bg-red-500' : 'bg-indigo-600'}`}
                style={{ width: `${(myComplaintsToday / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Site Notice Board Counter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active Site Notices</span>
              <Megaphone className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {relevantNotices.length} <span className="text-xs font-normal text-slate-500">broadcasts</span>
            </div>
            <button
              onClick={() => setActiveTab('notices')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
            >
              Read announcements <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* SUPER ADMIN / HR / SUPERVISOR METRICS */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active Sites</span>
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{activeSites}</div>
            <span className="text-[11px] text-slate-500">Out of {sites.length} total projects</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Workers</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totalLaborers}</div>
            <span className="text-[11px] text-slate-500">Assigned across sites</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Today's Present</span>
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {presentToday + halfDayToday * 0.5} <span className="text-xs font-normal text-slate-500">/ {totalMarkedToday}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              {totalMarkedToday > 0 ? `${Math.round(((presentToday + halfDayToday * 0.5) / totalMarkedToday) * 100)}% attendance` : 'Awaiting roll call'}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Pending Complaints</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">{pendingComplaints}</div>
            <span className="text-[11px] text-slate-500">Requires HR attention</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 col-span-2 sm:col-span-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Est. Monthly Payroll</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              SAR {totalMonthlyPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500">Current month payout</span>
          </div>
        </div>
      )}

      {/* IQAMA EXPIRY ALERTS WARNING PANEL (Requirement: 15-day / 10-day renewal tracker) */}
      {currentUser.role !== 'Labor' && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Worker Iqama Expiry Tracker & Sponsor Alert Center
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider">
                    {users.filter(u => {
                      const st = getIqamaExpiryStatus(u.iqamaExpiry);
                      return st.status === 'EXPIRED' || st.status === 'URGENT' || st.status === 'WARNING';
                    }).length} Action Required
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Automatically flags worker residence permits expiring in 15 days or less so HR can initiate renewal with third-party sponsors / Kafeel.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('users')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs"
            >
              <Users className="w-4 h-4 text-amber-400" />
              Manage All Workers & Kafeel
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Worker Name</th>
                    <th className="p-3">Iqama ID</th>
                    <th className="p-3">Sponsor / Kafeel Agency</th>
                    <th className="p-3">Expiry Date</th>
                    <th className="p-3">Status & Warning Level</th>
                    <th className="p-3 text-right">Sponsor Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users
                    .filter(u => u.iqamaExpiry || u.sponsorName)
                    .map(u => {
                      const statusInfo = getIqamaExpiryStatus(u.iqamaExpiry);
                      const isAlert = statusInfo.status === 'EXPIRED' || statusInfo.status === 'URGENT' || statusInfo.status === 'WARNING';
                      return { user: u, statusInfo, isAlert };
                    })
                    .sort((a, b) => (a.statusInfo.daysLeft ?? 999) - (b.statusInfo.daysLeft ?? 999))
                    .slice(0, 5)
                    .map(({ user: u, statusInfo, isAlert }) => (
                      <tr 
                        key={u.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          statusInfo.status === 'EXPIRED' 
                            ? 'bg-rose-50/90' 
                            : statusInfo.status === 'URGENT'
                            ? 'bg-rose-50/50'
                            : statusInfo.status === 'WARNING'
                            ? 'bg-amber-50/60'
                            : ''
                        }`}
                      >
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <UserAvatar 
                            src={u.avatar} 
                            name={u.name} 
                            className="w-7 h-7 rounded-full object-cover border border-slate-300"
                          />
                          <div>
                            <div>{u.name}</div>
                            <span className="text-[10px] text-slate-500 font-normal">{u.designation || u.role}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">{u.iqamaId || 'N/A'}</td>
                        <td className="p-3 text-slate-700">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200">
                            {u.sponsorName || 'Direct Hire'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-800 font-semibold">
                          {u.iqamaExpiry || 'Not specified'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              alert(`📩 Renewal notice sent to sponsor "${u.sponsorName || 'Agency'}" for worker ${u.name} (Iqama ID: ${u.iqamaId}).`);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all ${
                              isAlert 
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Initiate Kafeel Renewal
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Quick Actions & Live Site Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Quick Workflows
          </h3>

          <div className="space-y-2.5">
            <button
              onClick={() => setActiveTab('attendance')}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                    Mark Daily Attendance
                  </h4>
                  <p className="text-[11px] text-slate-500">Select site, log Present / Absent / Half-Day</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => setActiveTab('payroll')}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                    Payroll & Salary Calculation
                  </h4>
                  <p className="text-[11px] text-slate-500">Calculate net salary, allowances & advances</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => setActiveTab('complaints')}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                    Complaints & Issues Desk
                  </h4>
                  <p className="text-[11px] text-slate-500">Submit complaint (Max 3/day) or update status</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => setActiveTab('notices')}
              className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                    Site Notices & Bulletins
                  </h4>
                  <p className="text-[11px] text-slate-500">Publish target announcements to sites</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Notices Feed */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-600" />
              Recent Notices & Announcements
            </h3>
            <button
              onClick={() => setActiveTab('notices')}
              className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {relevantNotices.slice(0, 3).map((notice) => (
              <div
                key={notice.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    notice.priority === 'Urgent' 
                      ? 'bg-red-100 text-red-800'
                      : notice.priority === 'Important'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {notice.priority}
                  </span>
                  <span className="text-[11px] text-slate-400">{notice.datePosted}</span>
                </div>

                <h4 className="text-sm font-bold text-slate-900">{notice.title}</h4>
                <p className="text-xs text-slate-600 line-clamp-2">{notice.content}</p>

                <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                  <span>Target: {notice.targetGroup === 'All' ? 'All Sites & Staff' : sites.find(s => s.id === notice.targetGroup)?.name || notice.targetGroup}</span>
                  <span>By {notice.postedBy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
