import React, { useState } from 'react';
import { Attendance, Site, User, AttendanceStatus, Payroll } from '../../types';
import { UserAvatar } from '../UserAvatar';
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
  Square,
  DollarSign,
  Calendar,
  TrendingUp,
  Coins,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AttendanceViewProps {
  attendanceList: Attendance[];
  sites: Site[];
  users: User[];
  currentUser: User;
  onSaveAttendance: (records: Attendance[]) => void;
  payrolls?: Payroll[];
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  attendanceList,
  sites,
  users,
  currentUser,
  onSaveAttendance,
  payrolls = []
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(todayStr.substring(0, 7)); // YYYY-MM
  const [viewMode, setViewMode] = useState<'daily' | 'matrix'>('matrix');
  
  // Default to supervisor's assigned site or first site
  const defaultSiteId = currentUser.siteId || (sites.length > 0 ? sites[0].id : '');
  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId);
  const [selectedSponsor, setSelectedSponsor] = useState<string>('All');

  // Checkbox selection state for selective printing
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

  // Calculate days in selected month
  const [yearNum, monthNum] = React.useMemo(() => {
    const parts = selectedMonth.split('-');
    return [parseInt(parts[0], 10) || 2026, parseInt(parts[1], 10) || 7];
  }, [selectedMonth]);

  const daysInMonth = React.useMemo(() => {
    return new Date(yearNum, monthNum, 0).getDate();
  }, [yearNum, monthNum]);

  const daysArray = React.useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const getDayInitial = (day: number) => {
    const d = new Date(yearNum, monthNum - 1, day);
    return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
  };

  const isFridayDay = (day: number) => {
    const d = new Date(yearNum, monthNum - 1, day);
    return d.getDay() === 5;
  };

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

  // PRINTING HANDLER FOR FULL MONTHLY ATTENDANCE MATRIX (A4 LANDSCAPE)
  const handlePrintMonthlyMatrix = (mode: 'all' | 'selected') => {
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
          <title>Monthly Attendance Matrix (1-31) - ${selectedMonth}</title>
          <style>
            @page { size: A4 landscape; margin: 5mm; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 15px; color: #0f172a; line-height: 1.2; font-size: 10px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .company-title { font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
            .badge { background: #0f172a; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .meta-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; font-size: 10px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 5px; table-layout: auto; }
            th, td { border: 1px solid #cbd5e1; text-align: center; padding: 3px 2px; }
            th { background: #0f172a; color: white; text-transform: uppercase; font-size: 8px; font-weight: bold; }
            .th-worker { text-align: left; padding-left: 6px; }
            .td-worker { text-align: left; padding-left: 6px; font-weight: bold; }
            .is-friday { background: #e0f2fe !important; font-weight: bold; }
            .st-p { color: #15803d; font-weight: bold; }
            .st-hd { color: #b45309; font-weight: bold; }
            .st-a { color: #b91c1c; font-weight: bold; }
            .st-none { color: #cbd5e1; }
            .signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 10px; }
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
              <div style="font-size: 11px; color: #475569;">Full Monthly 1-31 Days Labor Attendance Matrix Sheet</div>
            </div>
            <div>
              <span class="badge">MONTH: ${selectedMonth} (A4 LANDSCAPE)</span>
            </div>
          </div>

          <div class="meta-bar">
            <div><strong>Construction Site:</strong> ${activeSite?.name || 'All Sites'}</div>
            <div><strong>Sponsor Agency:</strong> ${selectedSponsor}</div>
            <div><strong>Total Workforce:</strong> ${workersToPrint.length} Workers</div>
            <div><strong>Generated Date:</strong> ${todayStr}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="th-worker" style="width: 60px;">ID</th>
                <th class="th-worker" style="width: 120px;">Worker Name</th>
                <th style="width: 70px;">Kafeel / Sponsor</th>
                ${daysArray.map(d => {
                  const fri = isFridayDay(d);
                  return `<th class="${fri ? 'is-friday' : ''}">${d}<br/><span style="font-weight:normal; font-size:7px;">${getDayInitial(d)}</span></th>`;
                }).join('')}
                <th style="background:#065f46; width: 25px;">P</th>
                <th style="background:#92400e; width: 25px;">HD</th>
                <th style="background:#991b1b; width: 25px;">A</th>
                <th style="background:#3730a3; width: 35px;">OT</th>
              </tr>
            </thead>
            <tbody>
              ${workersToPrint.map((lab) => {
                let pCnt = 0;
                let hdCnt = 0;
                let aCnt = 0;
                let otSum = 0;

                const dayCells = daysArray.map(d => {
                  const dStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                  const rec = attendanceList.find(a => a.userId === lab.id && a.date === dStr);
                  const fri = isFridayDay(d);

                  if (rec) {
                    if (rec.status === 'Present') { pCnt++; }
                    else if (rec.status === 'Half-Day') { hdCnt++; }
                    else if (rec.status === 'Absent') { aCnt++; }
                    if (rec.overtimeHours) { otSum += rec.overtimeHours; }
                  }

                  let badge = '-';
                  let cls = 'st-none';
                  if (rec?.status === 'Present') { badge = 'P'; cls = 'st-p'; }
                  else if (rec?.status === 'Half-Day') { badge = 'HD'; cls = 'st-hd'; }
                  else if (rec?.status === 'Absent') { badge = 'A'; cls = 'st-a'; }

                  return `<td class="${fri ? 'is-friday ' : ''}${cls}">${badge}</td>`;
                }).join('');

                return `
                  <tr>
                    <td class="td-worker" style="font-family: monospace;">${lab.loginSerial || lab.id.slice(-6)}</td>
                    <td class="td-worker">${lab.name}</td>
                    <td style="font-size:8px;">${lab.sponsorName || 'Direct'}</td>
                    ${dayCells}
                    <td style="font-weight:bold; background:#ecfdf5; color:#047857;">${pCnt}</td>
                    <td style="font-weight:bold; background:#fffbeb; color:#b45309;">${hdCnt}</td>
                    <td style="font-weight:bold; background:#fef2f2; color:#b91c1c;">${aCnt}</td>
                    <td style="font-weight:bold; background:#e0e7ff; color:#3730a3;">${otSum ? '+' + otSum : '0'}</td>
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
              <div>Site Manager / HR Stamp & Signature</div>
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
    // Generate calendar cells for selected Month
    const firstDayIndex = new Date(yearNum, monthNum - 1, 1).getDay();
    const totalDaysInMonth = new Date(yearNum, monthNum, 0).getDate();
    
    const calendarCells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      calendarCells.push({ day: null, dateStr: '' });
    }
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      calendarCells.push({ day: d, dateStr });
    }

    // Get salary details
    const myMonthPayroll = payrolls.find(
      (p) => p.userId === currentUser.id && p.monthYear === selectedMonth
    );

    const dailyRate = currentUser.dailyRate || 60.0;
    const monthAttendance = displayAttendance.filter((a) => a.date.startsWith(selectedMonth));
    const currentMonthPresentCount = monthAttendance.filter((a) => a.status === 'Present').length;
    const currentMonthHalfDayCount = monthAttendance.filter((a) => a.status === 'Half-Day' || a.status === 'Half Day').length;
    const currentMonthAbsentCount = monthAttendance.filter((a) => a.status === 'Absent').length;
    const currentMonthOtHours = monthAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

    const hasPayroll = !!myMonthPayroll;
    const baseSalary = hasPayroll
      ? (myMonthPayroll.dailyRate * (myMonthPayroll.presentDays + myMonthPayroll.halfDays * 0.5))
      : (dailyRate * (currentMonthPresentCount + currentMonthHalfDayCount * 0.5));

    const overtimeAllowance = hasPayroll
      ? (myMonthPayroll.overtimePay || 0)
      : (currentMonthOtHours * (dailyRate / 8) * 2.0);

    const advancesDeducted = hasPayroll
      ? (myMonthPayroll.advances || 0)
      : 0;

    const penalties = hasPayroll ? (myMonthPayroll.penalties || 0) : 0;
    const allowances = hasPayroll ? (myMonthPayroll.allowances || 0) : 0;
    const fridayPay = hasPayroll ? (myMonthPayroll.fridayPay || 0) : 0;
    const govHolidayPay = hasPayroll ? (myMonthPayroll.govHolidayPay || 0) : 0;

    const finalNetSalary = hasPayroll
      ? myMonthPayroll.netSalary
      : Math.max(0, baseSalary + overtimeAllowance + allowances + fridayPay + govHolidayPay - advancesDeducted - penalties);

    const getMonthName = (mNum: number) => {
      return [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ][mNum - 1] || '';
    };

    return (
      <div id="view-attendance-labor" className="space-y-6">
        {/* Worker Portal Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-indigo-600" />
              My Attendance Record & Work Logs
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Personal attendance history, monthly calendar visualization, and private salary breakdown.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-200">
              👷 Worker ID: {currentUser.loginSerial || currentUser.id}
            </span>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">View Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Worker Personal Attendance Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Days Present</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{myPresentCount} days</span>
            <span className="text-[11px] text-slate-500 block mt-1">Full 1.0 Day Wage</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Half-Days</span>
            <span className="text-2xl font-black text-amber-500 mt-1 block">{myHalfDayCount} days</span>
            <span className="text-[11px] text-slate-500 block mt-1">0.5 Day Wage</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Absences</span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{myAbsentCount} days</span>
            <span className="text-[11px] text-slate-500 block mt-1">Unapproved Absence</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Overtime Hours</span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">{myTotalOtHours} hrs</span>
            <span className="text-[11px] text-slate-500 block mt-1">Multiplier Applied</span>
          </div>
        </div>

        {/* Calendar View & Personalized My Salary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View Attendance Section */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Calendar View Attendance — {getMonthName(monthNum)} {yearNum}
              </h3>
            </div>

            {/* Grid Calendar Layout */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold border-t border-slate-100 pt-3">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dHeader) => (
                <div key={dHeader} className="py-2 text-slate-400 text-[10px] uppercase tracking-wider">
                  {dHeader}
                </div>
              ))}

              {/* Day Cells */}
              {calendarCells.map((cell, idx) => {
                const isToday = cell.dateStr === todayStr;
                const att = cell.day ? displayAttendance.find(a => a.date === cell.dateStr) : null;
                
                // Color Dot Logic
                let dotColor = '';
                let statusLabel = '';
                if (att) {
                  const statusLower = att.status?.toLowerCase();
                  if (att.overtimeHours && att.overtimeHours > 0) {
                    dotColor = 'bg-[#a855f7]'; // Overtime
                    statusLabel = 'Overtime';
                  } else if (statusLower === 'leave') {
                    dotColor = 'bg-[#06b6d4]'; // Leave
                    statusLabel = 'Leave';
                  } else if (statusLower === 'present') {
                    dotColor = 'bg-[#22c55e]'; // Present
                    statusLabel = 'Present';
                  } else if (statusLower === 'absent') {
                    dotColor = 'bg-[#ef4444]'; // Absent
                    statusLabel = 'Absent';
                  } else if (statusLower === 'half-day' || statusLower === 'half day') {
                    dotColor = 'bg-[#eab308]'; // Half Day
                    statusLabel = 'Half Day';
                  } else {
                    dotColor = 'bg-slate-400';
                    statusLabel = att.status;
                  }
                }

                return (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    className={`min-h-[56px] p-1 border rounded-xl flex flex-col justify-between transition-all ${
                      cell.day
                        ? isToday
                          ? 'bg-indigo-50/50 border-indigo-500 text-indigo-950 font-black'
                          : 'bg-slate-50/50 border-slate-200 text-slate-800'
                        : 'bg-slate-50/20 border-transparent text-slate-300'
                    }`}
                  >
                    {cell.day ? (
                      <>
                        <span className="text-[11px] self-start leading-none">{cell.day}</span>
                        {dotColor ? (
                          <div className="flex flex-col items-center gap-0.5 mt-auto">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-xs`} title={statusLabel} />
                            {att && att.overtimeHours && att.overtimeHours > 0 ? (
                              <span className="text-[8px] font-extrabold text-purple-700 leading-none">
                                +{att.overtimeHours}h
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[8px] text-slate-300 italic self-center mt-auto">—</span>
                        )}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Colored Dots Legend */}
            <div className="flex flex-wrap gap-4 items-center justify-center bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[11px] font-bold text-slate-600 mt-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                <span>Half Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
                <span>Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
                <span>Overtime</span>
              </div>
            </div>
          </div>

          {/* Personalized "My Salary" Card Only */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Coins className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">My Salary Card</h3>
                  <p className="text-[10px] text-slate-400 font-medium">{getMonthName(monthNum)} {yearNum}</p>
                </div>
              </div>

              {/* Salary Breakdown Elements */}
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Daily Rate SAR</span>
                  <span className="font-mono font-bold text-slate-200">SAR {dailyRate.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Base Earned ({currentMonthPresentCount + currentMonthHalfDayCount * 0.5} Days)</span>
                  <span className="font-mono font-bold text-slate-200">SAR {baseSalary.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Overtime Allowance</span>
                  <span className="font-mono font-bold text-[#a855f7]">SAR {overtimeAllowance.toFixed(2)}</span>
                </div>
                {allowances > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Other Allowances</span>
                    <span className="font-mono font-bold text-emerald-400">SAR {allowances.toFixed(2)}</span>
                  </div>
                )}
                {fridayPay > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Friday Paid Holidays</span>
                    <span className="font-mono font-bold text-emerald-400">SAR {fridayPay.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                  <span className="text-slate-400">Advances Deducted</span>
                  <span className="font-mono font-bold text-rose-400">-SAR {advancesDeducted.toFixed(2)}</span>
                </div>
                {penalties > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Penalties / Deductions</span>
                    <span className="font-mono font-bold text-rose-400">-SAR {penalties.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Giant spotlight Net Salary Box */}
            <div className="mt-8 pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block text-center">
                Final Net Salary
              </span>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl py-4 px-3 text-center">
                <span className="text-3xl font-black text-[#22c55e] font-mono block">
                  SAR {finalNetSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {hasPayroll ? '✅ Final Compiled Salary Statement' : '📊 Calculated Live Estimate'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Worker Personal Attendance Log List */}
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
            Attendance Management & 1-31 Calendar Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Log site labor attendance, view full 1-31 day monthly matrix grids, and print formatted A4 Landscape sheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccessMsg && (
            <div className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" /> Attendance saved successfully!
            </div>
          )}
          {/* View Mode Toggle */}
          <div className="bg-slate-200 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" /> 1-31 Monthly Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'daily' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Daily Roll Call
            </button>
          </div>
        </div>
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

        {viewMode === 'daily' ? (
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
        ) : (
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Matrix Month
            </label>
            <input
              id="input-attendance-month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0">
          {viewMode === 'daily' ? (
            <>
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
            </>
          ) : (
            <button
              type="button"
              onClick={() => handlePrintMonthlyMatrix('all')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4 text-emerald-200" />
              Print Matrix (A4 Landscape)
            </button>
          )}
        </div>
      </div>

      {/* PRINT ACTION TOOLBAR */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 text-xs">
          <Printer className="w-4 h-4 text-amber-400" />
          <span className="font-bold">Selective Printing Controls:</span>
          <span className="text-slate-300">
            {selectedWorkerIds.length} of {siteLaborers.length} workers checked
          </span>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'daily' ? (
            <>
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
                Print Selected ({selectedWorkerIds.length})
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handlePrintMonthlyMatrix('all')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                Print Full Matrix ({siteLaborers.length})
              </button>

              <button
                type="button"
                onClick={() => handlePrintMonthlyMatrix('selected')}
                disabled={selectedWorkerIds.length === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  selectedWorkerIds.length > 0
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                Print Selected Matrix ({selectedWorkerIds.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* FULL MONTHLY 1-31 MATRIX GRID VIEW OR DAILY ROLL CALL SHEET */}
      {viewMode === 'matrix' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-2">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-400" />
                Full 1-31 Monthly Attendance Matrix Grid ({selectedMonth})
              </h3>
              <p className="text-[11px] text-slate-400">
                Click any status cell to cycle (P → HD → A → -) and immediately update work logs.
              </p>
            </div>

            <button
              onClick={toggleSelectAllWorkers}
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-1.5"
            >
              {selectedWorkerIds.length === siteLaborers.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-indigo-400" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" /> Select All for Matrix Print
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto p-2">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                  <th className="p-2 text-left w-6 border border-slate-200">Sel</th>
                  <th className="p-2 text-left w-24 border border-slate-200">Worker ID</th>
                  <th className="p-2 text-left w-40 border border-slate-200">Worker Name</th>
                  <th className="p-2 text-left w-28 border border-slate-200">Sponsor / Kafeel</th>
                  {daysArray.map((d) => {
                    const fri = isFridayDay(d);
                    return (
                      <th
                        key={d}
                        className={`p-1 border border-slate-200 min-w-[28px] ${
                          fri ? 'bg-indigo-100 text-indigo-900 font-black' : ''
                        }`}
                      >
                        <div>{d}</div>
                        <div className="text-[8px] font-normal uppercase text-slate-500">{getDayInitial(d)}</div>
                      </th>
                    );
                  })}
                  <th className="p-2 bg-emerald-100 text-emerald-900 border border-slate-200 w-10">P</th>
                  <th className="p-2 bg-amber-100 text-amber-900 border border-slate-200 w-10">HD</th>
                  <th className="p-2 bg-rose-100 text-rose-900 border border-slate-200 w-10">A</th>
                  <th className="p-2 bg-indigo-100 text-indigo-900 border border-slate-200 w-12">OT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {siteLaborers.length === 0 ? (
                  <tr>
                    <td colSpan={daysArray.length + 8} className="p-8 text-center text-slate-400">
                      No workers found matching selected site & sponsor filter.
                    </td>
                  </tr>
                ) : (
                  siteLaborers.map((lab) => {
                    let pTotal = 0;
                    let hdTotal = 0;
                    let aTotal = 0;
                    let otTotal = 0;
                    const isChecked = selectedWorkerIds.includes(lab.id);

                    const dayCells = daysArray.map((d) => {
                      const dStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                      const rec = attendanceList.find((a) => a.userId === lab.id && a.date === dStr);
                      const fri = isFridayDay(d);

                      if (rec) {
                        if (rec.status === 'Present') pTotal++;
                        else if (rec.status === 'Half-Day') hdTotal++;
                        else if (rec.status === 'Absent') aTotal++;
                        if (rec.overtimeHours) otTotal += rec.overtimeHours;
                      }

                      const handleCellClick = () => {
                        if (currentUser.role === 'Labor') return; // Read-only for labor
                        let nextStatus: AttendanceStatus = 'Present';
                        if (!rec || rec.status === 'Present') nextStatus = 'Half-Day';
                        else if (rec.status === 'Half-Day') nextStatus = 'Absent';
                        else if (rec.status === 'Absent') nextStatus = 'Present';

                        onSaveAttendance([
                          {
                            id: rec?.id || `att-${lab.id}-${dStr}`,
                            userId: lab.id,
                            siteId: selectedSiteId,
                            date: dStr,
                            status: nextStatus,
                            markedBy: currentUser.id,
                            notes: rec?.notes || '',
                            overtimeHours: rec?.overtimeHours || 0
                          }
                        ]);
                      };

                      return (
                        <td
                          key={d}
                          onClick={handleCellClick}
                          title={`${lab.name} - ${dStr}: ${rec?.status || 'Unmarked'}. Click to cycle.`}
                          className={`p-1 border border-slate-200 cursor-pointer select-none transition-colors ${
                            fri ? 'bg-indigo-50/50' : ''
                          }`}
                        >
                          {rec?.status === 'Present' ? (
                            <span className="px-1 py-0.5 rounded bg-emerald-500 text-white font-black text-[9px] block">
                              P
                            </span>
                          ) : rec?.status === 'Half-Day' ? (
                            <span className="px-1 py-0.5 rounded bg-amber-500 text-white font-black text-[9px] block">
                              HD
                            </span>
                          ) : rec?.status === 'Absent' ? (
                            <span className="px-1 py-0.5 rounded bg-rose-600 text-white font-black text-[9px] block">
                              A
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-[9px] block">-</span>
                          )}
                        </td>
                      );
                    });

                    return (
                      <tr key={lab.id} className={isChecked ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}>
                        <td className="p-2 text-center border border-slate-200">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectWorker(lab.id)}
                            className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 text-left font-mono font-bold text-slate-800 border border-slate-200">
                          {lab.loginSerial || lab.id.slice(-6)}
                        </td>
                        <td className="p-2 text-left font-bold text-slate-900 border border-slate-200">
                          {lab.name}
                        </td>
                        <td className="p-2 text-left text-slate-500 text-[10px] border border-slate-200">
                          {lab.sponsorName || 'Direct Hire'}
                        </td>
                        {dayCells}
                        <td className="p-2 font-black text-emerald-700 bg-emerald-50 border border-slate-200">{pTotal}</td>
                        <td className="p-2 font-black text-amber-700 bg-amber-50 border border-slate-200">{hdTotal}</td>
                        <td className="p-2 font-black text-rose-700 bg-rose-50 border border-slate-200">{aTotal}</td>
                        <td className="p-2 font-black text-indigo-700 bg-indigo-50 border border-slate-200">
                          {otTotal ? `+${otTotal}` : '0'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Roll Call Matrix for Active Site */
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

                      <UserAvatar
                        src={lab.avatar}
                        name={lab.name}
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
      )}

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
