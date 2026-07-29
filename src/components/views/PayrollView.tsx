import React, { useState } from 'react';
import { Payroll, User, Attendance, SystemSettings } from '../../types';
import { 
  DollarSign, 
  Calculator, 
  FileText, 
  CheckCircle2, 
  Printer, 
  Plus, 
  Edit3, 
  X,
  TrendingUp,
  CreditCard,
  Building2,
  FileSpreadsheet,
  Download,
  Users,
  Briefcase,
  Fingerprint,
  PenTool,
  Coins
} from 'lucide-react';
import { downloadPayrollExcelApi } from '../../lib/api';

interface PayrollViewProps {
  payrolls: Payroll[];
  users: User[];
  attendance: Attendance[];
  onSavePayroll: (payroll: Payroll) => void;
  currentUserRole: string;
  currentUser?: User;
  settings?: SystemSettings;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  payrolls,
  users,
  attendance,
  onSavePayroll,
  currentUserRole,
  currentUser,
  settings
}) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [roleCategory, setRoleCategory] = useState<'Labor' | 'Staff' | 'All'>('Labor');
  const [activePayslip, setActivePayslip] = useState<Payroll | null>(null);
  const [isBulkPrintMode, setIsBulkPrintMode] = useState<boolean>(false);
  const [editingPayroll, setEditingPayroll] = useState<Partial<Payroll> | null>(null);

  const isLaborUser = currentUser?.role === 'Labor' || currentUserRole === 'Labor';

  // Separate Users by Role Category
  const laborUsers = users.filter((u) => u.role === 'Labor');
  const staffUsers = users.filter((u) => u.role !== 'Labor');

  // Filter payrolls for selected month
  let monthPayrolls = payrolls.filter((p) => p.monthYear === selectedMonth);

  if (isLaborUser && currentUser) {
    // Labor users can strictly ONLY see their own payroll
    monthPayrolls = monthPayrolls.filter((p) => p.userId === currentUser.id);
  } else if (roleCategory === 'Labor') {
    monthPayrolls = monthPayrolls.filter(p => {
      const u = users.find(usr => usr.id === p.userId);
      return u && u.role === 'Labor';
    });
  } else if (roleCategory === 'Staff') {
    monthPayrolls = monthPayrolls.filter(p => {
      const u = users.find(usr => usr.id === p.userId);
      return u && u.role !== 'Labor';
    });
  }

  // Auto Compile Payroll from Attendance for all relevant workers in current category
  const handleCompileMonthlyPayrolls = () => {
    const targetWorkers = roleCategory === 'Labor' ? laborUsers : roleCategory === 'Staff' ? staffUsers : users;

    targetWorkers.forEach((lab) => {
      // Find all attendance records for this worker in selected month
      const userAtt = attendance.filter(
        (a) => a.userId === lab.id && a.date.startsWith(selectedMonth)
      );

      const presentDays = userAtt.filter((a) => a.status === 'Present').length;
      const halfDays = userAtt.filter((a) => a.status === 'Half-Day').length;
      const absentDays = userAtt.filter((a) => a.status === 'Absent').length;

      const totalWorked = presentDays + halfDays * 0.5;

      // Calculate Overtime Hours from attendance
      const otHours = userAtt.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
      const otRateMultiplier = settings?.overtimeMultiplierRate || 2.0;
      const otPay = otHours * (lab.dailyRate / 8) * otRateMultiplier;

      // Automatic Friday Paid Holidays (4 Fridays per month standard)
      const fridayHolidayDays = settings?.fridayPaidHolidayEnabled !== false ? 4 : 0;
      const fridayPay = lab.dailyRate * fridayHolidayDays;

      // Government Holiday Pay
      const govHolidayDays = 1; // Eid / National Day standard
      const govHolidayPay = lab.dailyRate * govHolidayDays;

      // Unapproved Absence Deduction (Deducts 1x, 2x, or 3x daily rate per absent day based on setting)
      const penaltyRate = settings?.absencePenaltyMultiplier || 1.0;
      const absenceDeduction = absentDays * lab.dailyRate * penaltyRate;

      // Existing payroll adjustments or defaults
      const existing = payrolls.find((p) => p.userId === lab.id && p.monthYear === selectedMonth);

      const allowances = existing?.allowances ?? (lab.role === 'Labor' ? 150.0 : 500.0);
      const advances = existing?.advances ?? 0.0;
      const penalties = existing?.penalties ?? 0.0;

      const netSalary = (lab.dailyRate * totalWorked) + fridayPay + govHolidayPay + otPay + allowances - absenceDeduction - advances - penalties;

      const compiled: Payroll = {
        id: existing?.id || `pay-${selectedMonth}-${lab.id}`,
        userId: lab.id,
        monthYear: selectedMonth,
        dailyRate: lab.dailyRate,
        totalDaysWorked: totalWorked,
        presentDays,
        halfDays,
        absentDays,
        fridayHolidayDays,
        fridayPay,
        govHolidayDays,
        govHolidayPay,
        overtimeHours: otHours,
        overtimePay: otPay,
        absenceDeduction,
        allowances,
        advances,
        penalties,
        netSalary: Math.max(0, netSalary),
        status: existing?.status || 'Draft',
        generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };

      onSavePayroll(compiled);
    });
  };

  const handleOpenEditModal = (p: Payroll) => {
    setEditingPayroll({ ...p });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayroll || !editingPayroll.userId) return;

    const dailyRate = editingPayroll.dailyRate || 100;
    const daysWorked = editingPayroll.totalDaysWorked || 0;
    const fridayPay = editingPayroll.fridayPay || (dailyRate * 4);
    const govHolidayPay = editingPayroll.govHolidayPay || dailyRate;
    const overtimePay = editingPayroll.overtimePay || 0;
    const allowances = editingPayroll.allowances || 0;
    const advances = editingPayroll.advances || 0;
    const penalties = editingPayroll.penalties || 0;
    const absenceDeduction = editingPayroll.absenceDeduction || 0;

    const netSalary = (dailyRate * daysWorked) + fridayPay + govHolidayPay + overtimePay + allowances - absenceDeduction - advances - penalties;

    const saved: Payroll = {
      id: editingPayroll.id || `pay-${selectedMonth}-${editingPayroll.userId}`,
      userId: editingPayroll.userId,
      monthYear: editingPayroll.monthYear || selectedMonth,
      dailyRate,
      totalDaysWorked: daysWorked,
      presentDays: editingPayroll.presentDays || Math.floor(daysWorked),
      halfDays: editingPayroll.halfDays || 0,
      absentDays: editingPayroll.absentDays || 0,
      fridayHolidayDays: editingPayroll.fridayHolidayDays || 4,
      fridayPay,
      govHolidayDays: editingPayroll.govHolidayDays || 1,
      govHolidayPay,
      overtimeHours: editingPayroll.overtimeHours || 0,
      overtimePay,
      absenceDeduction,
      allowances,
      advances,
      penalties,
      netSalary: Math.max(0, netSalary),
      status: editingPayroll.status || 'Draft',
      generatedAt: editingPayroll.generatedAt || new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    onSavePayroll(saved);
    setEditingPayroll(null);
  };

  return (
    <div id="view-payroll" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            Payroll & Advanced Payslip Engine (SAR Currency)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Separated Staff & Labor payroll calculation sheets, fingerprint/signature payslip layouts, and Excel exports.
          </p>
        </div>

        {(currentUserRole === 'Super Admin' || currentUserRole === 'HR Admin') && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-export-excel-payroll"
              onClick={() => downloadPayrollExcelApi(selectedMonth, undefined, roleCategory)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-slate-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export {roleCategory} Excel (.xlsx)
            </button>

            <button
              id="btn-print-bulk-payslips"
              onClick={() => setIsBulkPrintMode(true)}
              className="px-3.5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-indigo-700"
            >
              <Printer className="w-4 h-4 text-indigo-300" />
              Bulk Print All Payslips
            </button>

            <button
              id="btn-auto-compile-payroll"
              onClick={handleCompileMonthlyPayrolls}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Calculator className="w-4 h-4" />
              Compile {roleCategory} Sheet ({selectedMonth})
            </button>
          </div>
        )}
      </div>

      {/* Requirement 3: Distinct Staff vs Labor Payroll Separation Tabs (Admin / Supervisor only) */}
      {!isLaborUser && (
        <div className="flex items-center gap-2 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-300 w-fit">
          <button
            onClick={() => setRoleCategory('Labor')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              roleCategory === 'Labor'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-300/50'
            }`}
          >
            <Users className="w-4 h-4" />
            Labor Payroll ({laborUsers.length} Workers)
          </button>

          <button
            onClick={() => setRoleCategory('Staff')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              roleCategory === 'Staff'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-300/50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Staff Payroll ({staffUsers.length} Personnel)
          </button>

          <button
            onClick={() => setRoleCategory('All')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              roleCategory === 'All'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-300/50'
            }`}
          >
            All Combined
          </button>
        </div>
      )}

      {/* Dynamic Formula Banner */}
      <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">SAR Saudi Riyal Payroll Formula</span>
            <span className="font-mono text-xs font-bold text-emerald-300">
              Net Salary = (Daily Wage × Days) + Friday Pay + Gov Holiday Pay + OT Pay + Allowances - Advances - Penalties
            </span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 italic">
          🇸🇦 Currency: SAR (Saudi Riyal) | Official Government Holidays included
        </span>
      </div>

      {/* Month Selector & Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Select Payroll Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          />
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Category Records</span>
            <span className="text-sm font-bold text-slate-800">{monthPayrolls.length}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Disbursed (SAR)</span>
            <span className="text-sm font-bold text-emerald-600">
              SAR {monthPayrolls.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Name / Iqama ID</th>
                <th className="p-3.5">Daily Rate</th>
                <th className="p-3.5">Days Worked</th>
                <th className="p-3.5">Friday Pay</th>
                <th className="p-3.5">Gov Holiday</th>
                <th className="p-3.5">Overtime</th>
                <th className="p-3.5">Allowances</th>
                <th className="p-3.5">Deductions</th>
                <th className="p-3.5">Net Salary (SAR)</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400">
                    No {roleCategory} payroll compiled yet for {selectedMonth}.
                    <p className="text-xs mt-1">Click "Compile {roleCategory} Sheet" above to compute monthly salaries.</p>
                  </td>
                </tr>
              ) : (
                monthPayrolls.map((p) => {
                  const worker = users.find((u) => u.id === p.userId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <img
                          src={worker?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                          alt={worker?.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <span>{worker?.name || p.userId}</span>
                          <span className="block text-[10px] font-mono text-slate-400">Iqama: {worker?.iqamaId || '2940192834'}</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-700">SAR {p.dailyRate.toFixed(2)}</td>

                      <td className="p-3.5 font-bold text-indigo-700">
                        {p.totalDaysWorked} days
                        <span className="block text-[10px] font-normal text-slate-400">
                          ({p.presentDays}P + {p.halfDays}H)
                        </span>
                      </td>

                      <td className="p-3.5 text-indigo-600 font-bold">
                        +SAR {(p.fridayPay || (p.dailyRate * 4)).toFixed(2)}
                      </td>

                      <td className="p-3.5 text-amber-600 font-bold">
                        +SAR {(p.govHolidayPay || p.dailyRate).toFixed(2)}
                      </td>

                      <td className="p-3.5 text-purple-600 font-bold">
                        +SAR {(p.overtimePay || 0).toFixed(2)}
                      </td>

                      <td className="p-3.5 text-emerald-600 font-medium">+SAR {p.allowances.toFixed(2)}</td>

                      <td className="p-3.5 text-rose-600 font-medium">
                        -SAR {(p.advances + p.penalties + (p.absenceDeduction || 0)).toFixed(2)}
                      </td>

                      <td className="p-3.5 font-bold text-base text-slate-900">SAR {p.netSalary.toFixed(2)}</td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'Approved'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => setActivePayslip(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" /> Payslip
                        </button>

                        {(currentUserRole === 'Super Admin' || currentUserRole === 'HR Admin') && (
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Requirement 4: Individual Advanced Payslip Modal View with Fingerprint & Signature Boxes */}
      {activePayslip && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-slate-900" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base tracking-wide uppercase">OFFICIAL WORKFORCE PAYSLIP</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saudi Arabia • SAR Currency Statement</p>
                </div>
              </div>
              <button
                onClick={() => setActivePayslip(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const worker = users.find((u) => u.id === activePayslip.userId);
              return (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Employee Name</span>
                      <p className="font-bold text-slate-900">{worker?.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Role & Designation</span>
                      <p className="font-semibold text-slate-800">{worker?.designation} ({worker?.role})</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Iqama / ID Number</span>
                      <p className="font-mono font-bold text-indigo-700">{worker?.iqamaId || '2549102938'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Pay Period</span>
                      <p className="font-mono font-bold text-slate-800">{activePayslip.monthYear}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span>Daily Wage Rate</span>
                      <span className="font-mono font-bold">SAR {activePayslip.dailyRate.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span>Days Worked ({activePayslip.totalDaysWorked} Days)</span>
                      <span className="font-mono font-bold">
                        SAR {(activePayslip.dailyRate * activePayslip.totalDaysWorked).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200 text-indigo-700">
                      <span>Friday Paid Rest Days</span>
                      <span className="font-mono font-bold">+SAR {(activePayslip.fridayPay || (activePayslip.dailyRate * 4)).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200 text-amber-700">
                      <span>Government Public Holiday Wage</span>
                      <span className="font-mono font-bold">+SAR {(activePayslip.govHolidayPay || activePayslip.dailyRate).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200 text-purple-700">
                      <span>Overtime Work Compensation</span>
                      <span className="font-mono font-bold">+SAR {(activePayslip.overtimePay || 0).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-700">
                      <span>Food & Site Allowances</span>
                      <span className="font-mono font-bold">+SAR {activePayslip.allowances.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200 text-rose-700">
                      <span>Advances & Penalty Deductions</span>
                      <span className="font-mono font-bold">
                        -SAR {(activePayslip.advances + activePayslip.penalties + (activePayslip.absenceDeduction || 0)).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between py-3 border-t-2 border-slate-900 text-sm font-black text-slate-900 bg-slate-50 px-2 rounded-lg">
                      <span>NET SALARY PAYABLE</span>
                      <span className="text-base text-emerald-700 font-mono font-extrabold">SAR {activePayslip.netSalary.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Requirement 4: Physical Box for Fingerprint / Thumb Impression and Signatures */}
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
                    {/* Fingerprint Impression Box */}
                    <div className="border-2 border-dashed border-slate-400 rounded-xl p-3 flex flex-col items-center justify-center text-center bg-slate-50 min-h-[100px]">
                      <Fingerprint className="w-8 h-8 text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Worker Thumb Impression</span>
                      <span className="text-[9px] text-slate-400 italic">Attach physical fingerprint stamp</span>
                    </div>

                    {/* Signature Box */}
                    <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between bg-slate-50 min-h-[100px]">
                      <div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase block">Worker Acknowledgement</span>
                        <p className="text-[9px] text-slate-400">I confirm receipt of full cash/bank salary.</p>
                      </div>

                      <div className="border-t border-slate-400 pt-1 mt-4">
                        <span className="text-[9px] font-mono text-slate-500 block text-center">Authorized HR Signature & Seal</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 flex justify-end gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print Physical Payslip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Print Modal Layout (Requirement 4) */}
      {isBulkPrintMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Bulk Payslip Printer ({roleCategory} Payroll - {selectedMonth})</h3>
                <p className="text-xs text-slate-500">Printing all {monthPayrolls.length} payslips with thumb impression & signature boxes.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" /> Execute Print All
                </button>
                <button onClick={() => setIsBulkPrintMode(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {monthPayrolls.map((p, idx) => {
                const worker = users.find((u) => u.id === p.userId);

                return (
                  <div key={p.id} className="p-6 border-2 border-slate-300 rounded-2xl space-y-4 bg-white page-break-after-always">
                    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-slate-900" />
                        <span className="font-extrabold text-slate-900 text-sm tracking-wide uppercase">SITELABOR WORKFORCE OFFICIAL PAYSLIP</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-indigo-700">Sheet #{idx + 1} | Period: {p.monthYear}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Name</span>
                        <span className="font-bold text-slate-900">{worker?.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Designation</span>
                        <span className="font-semibold text-slate-800">{worker?.designation}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Iqama ID</span>
                        <span className="font-mono font-bold text-indigo-700">{worker?.iqamaId || '2549102938'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Daily Wage</span>
                        <span className="font-mono font-bold text-slate-900">SAR {p.dailyRate.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span>Days Worked ({p.totalDaysWorked} Days)</span>
                          <span className="font-bold">SAR {(p.dailyRate * p.totalDaysWorked).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 text-indigo-700">
                          <span>Friday Paid Rest Days</span>
                          <span className="font-bold">+SAR {(p.fridayPay || (p.dailyRate * 4)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 text-amber-700">
                          <span>Government Holidays</span>
                          <span className="font-bold">+SAR {(p.govHolidayPay || p.dailyRate).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                          <span>Allowances & Overtime</span>
                          <span className="font-bold">+SAR {(p.allowances + (p.overtimePay || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 text-rose-700">
                          <span>Advances & Deductions</span>
                          <span className="font-bold">-SAR {(p.advances + p.penalties + (p.absenceDeduction || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1 font-extrabold text-slate-900 border-t border-slate-900 text-sm">
                          <span>NET PAYABLE</span>
                          <span className="text-emerald-700 font-mono">SAR {p.netSalary.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Physical Thumb Impression & Signature Box */}
                    <div className="pt-2 grid grid-cols-2 gap-4">
                      <div className="border-2 border-dashed border-slate-400 rounded-xl p-2 flex flex-col items-center justify-center text-center bg-slate-50 min-h-[80px]">
                        <Fingerprint className="w-6 h-6 text-slate-400 mb-0.5" />
                        <span className="text-[9px] font-bold text-slate-600 uppercase">Worker Thumb Impression Box</span>
                      </div>

                      <div className="border border-slate-300 rounded-xl p-2 flex flex-col justify-between bg-slate-50 min-h-[80px]">
                        <span className="text-[9px] font-bold text-slate-600 uppercase">Worker & HR Signatures</span>
                        <div className="border-t border-slate-400 pt-0.5 text-center">
                          <span className="text-[8px] font-mono text-slate-500">Authorized Official Stamp</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Payroll Modal */}
      {editingPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Adjust Payroll Adjustments</h3>
              <button onClick={() => setEditingPayroll(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Daily Rate (SAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPayroll.dailyRate || 0}
                  onChange={(e) => setEditingPayroll({ ...editingPayroll, dailyRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Days Worked</label>
                <input
                  type="number"
                  step="0.5"
                  value={editingPayroll.totalDaysWorked || 0}
                  onChange={(e) => setEditingPayroll({ ...editingPayroll, totalDaysWorked: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Allowances (SAR)</label>
                <input
                  type="number"
                  step="1"
                  value={editingPayroll.allowances || 0}
                  onChange={(e) => setEditingPayroll({ ...editingPayroll, allowances: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Advances (SAR)</label>
                  <input
                    type="number"
                    step="1"
                    value={editingPayroll.advances || 0}
                    onChange={(e) => setEditingPayroll({ ...editingPayroll, advances: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Penalties (SAR)</label>
                  <input
                    type="number"
                    step="1"
                    value={editingPayroll.penalties || 0}
                    onChange={(e) => setEditingPayroll({ ...editingPayroll, penalties: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Disbursement Status</label>
                <select
                  value={editingPayroll.status || 'Draft'}
                  onChange={(e) => setEditingPayroll({ ...editingPayroll, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPayroll(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl"
                >
                  Save Salary Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
