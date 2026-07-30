import React, { useState } from 'react';
import { Attendance, Site, User, AttendanceStatus } from '../../types';
import { 
  CalendarCheck, 
  Building2, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  Sparkles,
  Save,
  Check,
  Printer,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';

interface AttendanceViewProps {
  attendanceList: Attendance[];
  sites: Site[];
  users: User[];
  currentUser: User;
  onSaveAttendance: (records: Attendance[]) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  attendanceList,
  sites,
  users,
  currentUser,
  onSaveAttendance
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  
  // Default to supervisor's assigned site or first site
  const defaultSiteId = currentUser.siteId || (sites.length > 0 ? sites[0].id : '');
  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId);
  const [selectedSponsor, setSelectedSponsor] = useState<string>('All');

  // Checkbox selection state for selective printing
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

  // Local draft state for marking roll call (only active workers)
  const activeSite = sites.find((s) => s.id === selectedSiteId);
  
  // Collect all unique sponsor names across users
  const uniqueSponsors = Array.from(
    new Set(users.map((u) => u.sponsorName).filter((s): s is string => Boolean(s)))
  );

  const siteLaborers = users.filter((u) => {
    const isLabor = u.role === 'Labor';
    const isAssignedToSite = activeSite?.laborerIds.includes(u.id) || u.siteId === selectedSiteId;
    const isActive = u.status !== 'Inactive';
    const matchesSponsor = selectedSponsor === 'All' || u.sponsorName === selectedSponsor;

    return isLabor && isAssignedToSite && isActive && matchesSponsor;
  });

  // Get existing records for this site + date
  const getExistingStatus = (userId: string): AttendanceStatus => {
    const existing = attendanceList.find(
      (a) => a.userId === userId && a.date === selectedDate && a.siteId === selectedSiteId
    );
    return existing ? existing.status : 'Present';
  };

  const getExistingNotes = (userId: string): string => {
    const existing = attendanceList.find(
      (a) => a.userId === userId && a.date === selectedDate && a.siteId === selectedSiteId
    );
    return existing?.notes || '';
  };

  const getExistingOvertime = (userId: string): number => {
    const existing = attendanceList.find(
      (a) => a.userId === userId && a.date === selectedDate && a.siteId === selectedSiteId
    );
    return existing?.overtimeHours || 0;
  };

  const isSelectedDateFriday = React.useMemo(() => {
    try {
      const d = new Date(selectedDate);
      return d.getDay() === 5; // 5 = Friday
    } catch {
      return false;
    }
  }, [selectedDate]);

  const [draftAttendance, setDraftAttendance] = useState<Record<string, { status: AttendanceStatus; notes: string; overtimeHours: number }>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Initialize draft when site/date/sponsor changes
  React.useEffect(() => {
    const initialDraft: Record<string, { status: AttendanceStatus; notes: string; overtimeHours: number }> = {};
    siteLaborers.forEach((lab) => {
      initialDraft[lab.id] = {
        status: getExistingStatus(lab.id),
        notes: getExistingNotes(lab.id),
        overtimeHours: getExistingOvertime(lab.id)
      };
    });
    setDraftAttendance(initialDraft);
  }, [selectedSiteId, selectedDate, selectedSponsor, attendanceList]);

  const toggleSelectWorker = (workerId: string) => {
    if (selectedWorkerIds.includes(workerId)) {
      setSelectedWorkerIds(selectedWorkerIds.filter((id) => id !== workerId));
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, workerId]);
    }
  };

  const toggleSelectAllWorkers = () => {
    if (selectedWorkerIds.length === siteLaborers.length) {
      setSelectedWorkerIds([]);
    } else {
      setSelectedWorkerIds(siteLaborers.map((w) => w.id));
    }
  };

  const handleStatusToggle = (userId: string, newStatus: AttendanceStatus) => {
    setDraftAttendance((prev) => ({
      ...prev,
      [userId]: {
        status: newStatus,
        notes: prev[userId]?.notes || '',
        overtimeHours: prev[userId]?.overtimeHours || 0
      }
    }));
  };

  const handleNotesChange = (userId: string, notes: string) => {
    setDraftAttendance((prev) => ({
      ...prev,
      [userId]: {
        status: prev[userId]?.status || 'Present',
        notes,
        overtimeHours: prev[userId]?.overtimeHours || 0
      }
    }));
  };

  const handleOvertimeChange = (userId: string, hours: number) => {
    setDraftAttendance((prev) => ({
      ...prev,
      [userId]: {
        status: prev[userId]?.status || 'Present',
        notes: prev[userId]?.notes || '',
        overtimeHours: Math.max(0, hours)
      }
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; notes: string; overtimeHours: number }> = {};
    siteLaborers.forEach((lab) => {
      updated[lab.id] = {
        status: 'Present',
        notes: draftAttendance[lab.id]?.notes || '',
        overtimeHours: draftAttendance[lab.id]?.overtimeHours || 0
      };
    });
    setDraftAttendance(updated);
  };

  const handleSaveRollCall = () => {
    const newRecords: Attendance[] = siteLaborers.map((lab) => {
      const draft = draftAttendance[lab.id] || { status: 'Present', notes: '', overtimeHours: 0 };
      return {
        id: `att-${lab.id}-${selectedDate}`,
        userId: lab.id,
        siteId: selectedSiteId,
        date: selectedDate,
        status: draft.status,
        markedBy: currentUser.id,
        notes: draft.notes,
        overtimeHours: draft.overtimeHours,
        isFridayOvertime: isSelectedDateFriday
      };
    });

    onSaveAttendance(newRecords);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // PRINTING HANDLER FOR ATTENDANCE REPORT (ALL OR SELECTED)
  const handlePrintAttendance = (mode: 'all' | 'selected') => {
    const workersToPrint = mode === 'selected'
      ? siteLaborers.filter((w) => selectedWorkerIds.includes(w.id))
      : siteLaborers;

    if (workersToPrint.length === 0) {
      alert('Please select at least one worker to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Attendance Report - ${activeSite?.name || 'Site'}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .company-title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
            .badge { background: #0f172a; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; }
            .meta-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th { background: #0f172a; color: white; text-transform: uppercase; font-size: 10px; padding: 8px 10px; text-align: left; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
            tr:nth-child(even) { background: #f8fafc; }
            .status-present { color: #15803d; font-weight: bold; }
            .status-half { color: #b45309; font-weight: bold; }
            .status-absent { color: #b91c1c; font-weight: bold; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 30px; border-top: 1px solid #cbd5e1; font-size: 11px; }
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
              <div style="font-size: 13px; color: #475569;">Daily Labor Attendance & Shift Verification Sheet</div>
            </div>
            <div>
              <span class="badge">MODE: ${mode === 'all' ? 'FULL SITE ROLL CALL' : 'SELECTED WORKERS FILTER'}</span>
            </div>
          </div>

          <div class="meta-bar">
            <div><strong>Construction Site:</strong> ${activeSite?.name || 'N/A'}</div>
            <div><strong>Attendance Date:</strong> ${selectedDate}</div>
            <div><strong>Sponsor Filter:</strong> ${selectedSponsor}</div>
            <div><strong>Supervisor:</strong> ${currentUser.name}</div>
            <div><strong>Total Workers Logged:</strong> ${workersToPrint.length}</div>
            <div><strong>Standard Shift:</strong> 10 Hours / Day</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Worker Name</th>
                <th>Iqama ID</th>
                <th>Sponsor / Kafeel</th>
                <th>Role / Designation</th>
                <th>Shift Status</th>
                <th>OT Hours</th>
                <th>Supervisor Notes</th>
              </tr>
            </thead>
            <tbody>
              ${workersToPrint.map((lab, index) => {
                const draft = draftAttendance[lab.id] || { status: 'Present', notes: '', overtimeHours: 0 };
                const stClass = draft.status === 'Present' ? 'status-present' : draft.status === 'Half-Day' ? 'status-half' : 'status-absent';
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td><strong>${lab.name}</strong></td>
                    <td><code style="font-weight:bold;">${lab.iqamaId || 'N/A'}</code></td>
                    <td>${lab.sponsorName || 'Direct Hire'}</td>
                    <td>${lab.designation || 'Laborer'}</td>
                    <td class="${stClass}">${draft.status} (${draft.status === 'Present' ? '1.0' : draft.status === 'Half-Day' ? '0.5' : '0.0'})</td>
                    <td><strong>${draft.overtimeHours ? '+' + draft.overtimeHours + ' hrs' : '-'}</strong></td>
                    <td style="font-style:italic;">${draft.notes || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div>____________________________________</div>
              <div>Marked By: ${currentUser.name} (${currentUser.role})</div>
            </div>
            <div>
              <div>____________________________________</div>
              <div>Approved By: HR / Project Manager</div>
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

  // Filter history log for user role
  const displayAttendance = currentUser.role === 'Labor' 
    ? attendanceList.filter((a) => a.userId === currentUser.id)
    : attendanceList;

  // Labor Specific Attendance Summary Stats
  const myPresentCount = displayAttendance.filter((a) => a.status === 'Present').length;
  const myHalfDayCount = displayAttendance.filter((a) => a.status === 'Half-Day').length;
  const myAbsentCount = displayAttendance.filter((a) => a.status === 'Absent').length;
  const myTotalOtHours = displayAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

  // If user is Labor worker, render Personal Attendance Dashboard
  if (currentUser.role === 'Labor') {
    return (
      <div id="view-attendance-labor" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
              My Attendance Record & Work Logs
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Personal attendance history and overtime hours logged by site supervisors.
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full border border-amber-300">
            Worker ID: {currentUser.loginSerial || currentUser.id}
          </span>
        </div>

        {/* Worker Personal Attendance Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Days Present</span>
            <span className="text-2xl font-black text-emerald-600">{myPresentCount} days</span>
            <span className="text-[11px] text-slate-500 block mt-1">Full 1.0 Day Wage</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Half-Days</span>
            <span className="text-2xl font-black text-amber-600">{myHalfDayCount} days</span>
            <span className="text-[11px] text-slate-500 block mt-1">0.5 Day Wage</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Absences</span>
            <span className="text-2xl font-black text-rose-600">{myAbsentCount} days</span>
            <span className="text-[11px] text-slate-500 block mt-1">Unapproved Absence</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Overtime Hours</span>
            <span className="text-2xl font-black text-indigo-600">{myTotalOtHours} hrs</span>
            <span className="text-[11px] text-slate-500 block mt-1">Multiplier Applied</span>
          </div>
        </div>

        {/* Worker Personal Attendance Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-indigo-600" />
            My Logged Roll Call Entries ({displayAttendance.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Assigned Site</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">OT Hours</th>
                  <th className="p-3">Marked By Supervisor</th>
                  <th className="p-3">Supervisor Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No attendance records logged for your worker ID yet.
                    </td>
                  </tr>
                ) : (
                  displayAttendance.slice().reverse().map((att) => {
                    const site = sites.find((s) => s.id === att.siteId);
                    const supervisor = users.find((u) => u.id === att.markedBy);

                    return (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900 font-mono">{att.date}</td>
                        <td className="p-3 text-slate-700 font-semibold">{site?.name || att.siteId}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              att.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : att.status === 'Half-Day'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-700">
                          {att.overtimeHours ? `+${att.overtimeHours} hrs` : '-'}
                        </td>
                        <td className="p-3 text-slate-600">{supervisor?.name || 'Site Supervisor'}</td>
                        <td className="p-3 text-slate-500 italic">{att.notes || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="view-attendance" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            Daily Attendance & Selective Printing Sheet
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Log site labor attendance, filter by Kafeel / Sponsor Agency, and print formatted attendance sheets.
          </p>
        </div>

        {saveSuccessMsg && (
          <div className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" /> Attendance saved successfully!
          </div>
        )}
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Select Construction Site
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <select
              id="select-attendance-site"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.location})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Filter by Sponsor / Kafeel
          </label>
          <div className="relative">
            <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <select
              id="select-attendance-sponsor"
              value={selectedSponsor}
              onChange={(e) => setSelectedSponsor(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Sponsors / Direct Hire</option>
              {uniqueSponsors.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Attendance Date
          </label>
          <input
            id="input-attendance-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0">
          <button
            id="btn-mark-all-present"
            type="button"
            onClick={handleMarkAllPresent}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Mark All Present
          </button>

          <button
            id="btn-save-attendance-rollcall"
            type="button"
            onClick={handleSaveRollCall}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Save className="w-4 h-4" />
            Submit Roll Call
          </button>
        </div>
      </div>

      {/* PRINT ACTION TOOLBAR */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 text-xs">
          <Printer className="w-4 h-4 text-amber-400" />
          <span className="font-bold">Attendance Print Center:</span>
          <span className="text-slate-300">
            {selectedWorkerIds.length} of {siteLaborers.length} workers checked
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePrintAttendance('all')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            Print All ({siteLaborers.length})
          </button>

          <button
            type="button"
            onClick={() => handlePrintAttendance('selected')}
            disabled={selectedWorkerIds.length === 0}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              selectedWorkerIds.length > 0
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Print Selected Workers ({selectedWorkerIds.length})
          </button>
        </div>
      </div>

      {/* Roll Call Matrix for Active Site */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Roll Call Sheet: {activeSite?.name || 'Site'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {siteLaborers.length} assigned laborers • Date: {selectedDate} • Sponsor Filter: {selectedSponsor}
            </p>
          </div>

          <button
            onClick={toggleSelectAllWorkers}
            className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5"
          >
            {selectedWorkerIds.length === siteLaborers.length ? (
              <>
                <CheckSquare className="w-4 h-4 text-indigo-600" /> Deselect All
              </>
            ) : (
              <>
                <Square className="w-4 h-4 text-slate-400" /> Select All for Printing
              </>
            )}
          </button>
        </div>

        {/* Friday Banner if applicable */}
        {isSelectedDateFriday && (
          <div className="mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 rounded-xl flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>
                <strong>Friday Official Holiday:</strong> Friday base salary is automatically paid. Working on Friday will log Overtime Pay.
              </span>
            </div>
            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold uppercase rounded font-mono">
              Friday OT Rate Active
            </span>
          </div>
        )}

        {siteLaborers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium">No laborers found matching this site & sponsor filter.</p>
            <p className="text-xs">Select "All Sponsors" or allocate labor workforce in "Sites".</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {siteLaborers.map((lab) => {
              const currentStatus = draftAttendance[lab.id]?.status || 'Present';
              const currentNotes = draftAttendance[lab.id]?.notes || '';
              const currentOT = draftAttendance[lab.id]?.overtimeHours || 0;
              const isChecked = selectedWorkerIds.includes(lab.id);

              return (
                <div
                  key={lab.id}
                  className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isChecked ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelectWorker(lab.id)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />

                    <img
                      src={lab.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                      alt={lab.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{lab.name}</h4>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px] border border-slate-200">
                          {lab.sponsorName || 'Direct Hire'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {lab.designation || 'Laborer'} • Iqama: <span className="font-mono font-semibold text-slate-800">{lab.iqamaId || 'N/A'}</span> • Rate: <span className="font-semibold text-slate-700">${lab.dailyRate}/day</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Toggle Buttons & Overtime Input */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleStatusToggle(lab.id, 'Present')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          currentStatus === 'Present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Present (1.0)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusToggle(lab.id, 'Half-Day')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          currentStatus === 'Half-Day'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" /> Half-Day (0.5)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusToggle(lab.id, 'Absent')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          currentStatus === 'Absent'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Absent (0.0)
                      </button>
                    </div>

                    {/* Overtime Hours Logger */}
                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-[11px] font-bold text-indigo-900 whitespace-nowrap">OT Hours:</span>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        step="0.5"
                        value={currentOT || ''}
                        onChange={(e) => handleOvertimeChange(lab.id, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-12 px-1.5 py-0.5 bg-white border border-indigo-300 rounded text-xs font-mono font-bold text-indigo-900 text-center focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Optional notes..."
                      value={currentNotes}
                      onChange={(e) => handleNotesChange(lab.id, e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-36"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600" />
          Recent Attendance History Log
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Worker</th>
                <th className="p-3">Date</th>
                <th className="p-3">Site</th>
                <th className="p-3">Status</th>
                <th className="p-3">Marked By</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceList.slice(-10).reverse().map((att) => {
                const worker = users.find((u) => u.id === att.userId);
                const site = sites.find((s) => s.id === att.siteId);
                const supervisor = users.find((u) => u.id === att.markedBy);

                return (
                  <tr key={att.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{worker?.name || att.userId}</td>
                    <td className="p-3 text-slate-600">{att.date}</td>
                    <td className="p-3 text-slate-600">{site?.name || att.siteId}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === 'Present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : att.status === 'Half-Day'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{supervisor?.name || 'Supervisor'}</td>
                    <td className="p-3 text-slate-400 italic">{att.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
