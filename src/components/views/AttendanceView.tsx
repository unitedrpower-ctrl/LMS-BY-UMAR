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
  Check
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

  // Local draft state for marking roll call (only active workers)
  const activeSite = sites.find((s) => s.id === selectedSiteId);
  const siteLaborers = users.filter(
    (u) => u.role === 'Labor' && 
           (activeSite?.laborerIds.includes(u.id) || u.siteId === selectedSiteId) &&
           u.status !== 'Inactive'
  );

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

  // Initialize draft when site/date changes
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
  }, [selectedSiteId, selectedDate, attendanceList]);

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
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Days Present</span>
            <span className="text-2xl font-black text-emerald-600">{myPresentCount} days</span>
            <span className="text-[11px] text-slate-500 block mt-1">Full 1.0 Day Wage</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Half-Days</span>
            <span className="text-2xl font-black text-amber-600">{myHalfDayCount} days</span>
            <span className="text-[11px] text-slate-500 block mt-1">0.5 Day Wage</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Absences</span>
            <span className="text-2xl font-black text-rose-600">{myAbsentCount} days</span>
            <span className="text-[11px] text-slate-500 block mt-1">Unapproved Absence</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Overtime Hours</span>
            <span className="text-2xl font-black text-indigo-600">{myTotalOtHours} hrs</span>
            <span className="text-[11px] text-slate-500 block mt-1">Multiplier Applied</span>
          </div>
        </div>

        {/* Worker Personal Attendance Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
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
            Daily Attendance & Roll Call
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Log site labor attendance (Present, Absent, Half-Day) for payroll compilation.
          </p>
        </div>

        {saveSuccessMsg && (
          <div className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" /> Attendance saved successfully!
          </div>
        )}
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
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

        <div className="flex items-end justify-end gap-2 pt-2 sm:pt-0">
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
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Save className="w-4 h-4" />
            Submit Roll Call
          </button>
        </div>
      </div>

      {/* Roll Call Matrix for Active Site */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Roll Call Sheet: {activeSite?.name || 'Site'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {siteLaborers.length} assigned laborers • Date: {selectedDate}
            </p>
          </div>
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
            <p className="text-sm font-medium">No laborers assigned to this site yet.</p>
            <p className="text-xs">Go to "Sites" tab to allocate labor workforce.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {siteLaborers.map((lab) => {
              const currentStatus = draftAttendance[lab.id]?.status || 'Present';
              const currentNotes = draftAttendance[lab.id]?.notes || '';
              const currentOT = draftAttendance[lab.id]?.overtimeHours || 0;

              return (
                <div
                  key={lab.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={lab.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                      alt={lab.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{lab.name}</h4>
                      <p className="text-xs text-slate-500">
                        {lab.designation || 'Laborer'} • Rate: <span className="font-semibold text-slate-700">${lab.dailyRate}/day</span>
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
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
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
