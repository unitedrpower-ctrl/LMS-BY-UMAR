import React, { useMemo, useState } from 'react';
import { Attendance, Payroll } from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import {
  CalendarDays,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  Layers,
  ArrowUpRight,
  Filter
} from 'lucide-react';

interface WeeklyAttendancePayrollWidgetProps {
  attendance: Attendance[];
  payrolls: Payroll[];
  onNavigateToAttendance?: () => void;
  onNavigateToPayroll?: () => void;
}

export const WeeklyAttendancePayrollWidget: React.FC<WeeklyAttendancePayrollWidgetProps> = ({
  attendance,
  payrolls,
  onNavigateToAttendance,
  onNavigateToPayroll
}) => {
  const [viewMode, setViewMode] = useState<'combined' | 'attendance' | 'payroll'>('combined');
  const [weeksCount, setWeeksCount] = useState<number>(4); // Last 4, 8, or 12 weeks

  // Helper: compute ISO week string / label for a Date
  const chartData = useMemo(() => {
    // Generate the last N weeks
    const today = new Date();
    // Normalize to current week's Sunday or Monday
    const currentDay = today.getDay(); // 0 is Sunday
    // In Saudi Arabia, work week usually starts Sunday (0) or Saturday (6)
    // Let's create weekly intervals backwards
    const intervals: {
      weekKey: string;
      label: string;
      startDate: Date;
      endDate: Date;
      startStr: string;
      endStr: string;
    }[] = [];

    for (let i = weeksCount - 1; i >= 0; i--) {
      const end = new Date(today);
      end.setDate(today.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      const shortStart = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const shortEnd = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      intervals.push({
        weekKey: `w-${i}`,
        label: `${shortStart} - ${shortEnd}`,
        startDate: start,
        endDate: end,
        startStr,
        endStr
      });
    }

    // Now calculate metrics for each interval
    return intervals.map((interval) => {
      // 1. Attendance in this interval
      const weekAttendance = attendance.filter((a) => {
        return a.date >= interval.startStr && a.date <= interval.endStr;
      });

      const presentRecords = weekAttendance.filter((a) => a.status === 'Present').length;
      const halfDayRecords = weekAttendance.filter((a) => a.status === 'Half-Day').length;
      const absentRecords = weekAttendance.filter((a) => a.status === 'Absent').length;
      const totalMarked = weekAttendance.length;

      // Effective presence
      const effectivePresent = presentRecords + halfDayRecords * 0.5;
      const presenceRate = totalMarked > 0 ? Math.round((effectivePresent / totalMarked) * 100) : 0;

      // Overtime hours in this week
      const otHours = weekAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

      // 2. Payroll Expenditure estimation for this week:
      // We look at payrolls that cover the month(s) of this interval,
      // or derive estimated weekly wage payout:
      // (dailyRate * effectivePresent) + (otHours * avgOtRate)
      // Also check monthly payrolls prorated
      const estimatedWageCost = weekAttendance.reduce((sum, a) => {
        // approximate standard labor daily rate: 120 SAR if unlinked, or calculate from payroll
        const rate = 120; // Default baseline daily SAR
        let dayWage = 0;
        if (a.status === 'Present') dayWage = rate;
        else if (a.status === 'Half-Day') dayWage = rate * 0.5;
        // OT ~ 1.5 * (rate / 8)
        const otPay = (a.overtimeHours || 0) * (rate / 8) * 1.5;
        return sum + dayWage + otPay;
      }, 0);

      // Total payrolls net salary for the corresponding month if applicable
      // Find month of interval's midpoint
      const midMonth = interval.startDate.toISOString().slice(0, 7);
      const monthPayrollSum = payrolls
        .filter((p) => p.monthYear === midMonth)
        .reduce((sum, p) => sum + p.netSalary, 0);
      // Prorated weekly payroll (approx 4.33 weeks/month)
      const proratedWeeklyPayroll = monthPayrollSum > 0 ? Math.round(monthPayrollSum / 4.33) : Math.round(estimatedWageCost);

      return {
        label: interval.label,
        startStr: interval.startStr,
        endStr: interval.endStr,
        present: presentRecords,
        halfDay: halfDayRecords,
        absent: absentRecords,
        effectivePresent,
        presenceRate,
        overtimeHours: otHours,
        totalMarked,
        expenditure: proratedWeeklyPayroll,
        directWageCost: Math.round(estimatedWageCost)
      };
    });
  }, [attendance, payrolls, weeksCount]);

  // Aggregate stats across the displayed period
  const totalPeriodAttendance = chartData.reduce((sum, d) => sum + d.effectivePresent, 0);
  const avgPresenceRate =
    chartData.length > 0
      ? Math.round(chartData.reduce((sum, d) => sum + d.presenceRate, 0) / chartData.length)
      : 0;
  const totalPeriodExpenditure = chartData.reduce((sum, d) => sum + d.expenditure, 0);
  const totalOvertime = chartData.reduce((sum, d) => sum + d.overtimeHours, 0);

  return (
    <div
      id="weekly-analytics-widget"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-sm shrink-0">
            <TrendingUp className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Workforce Trends & Weekly Payroll Expenditure
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold">
                Live Recharts Engine
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Interactive visualization of workforce roll-call attendance presence vs. payroll cost trends
            </p>
          </div>
        </div>

        {/* View mode toggle and weeks selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Weeks Count Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <span className="px-2 text-slate-400 text-[11px] flex items-center gap-1">
              <Filter className="w-3 h-3" /> Range:
            </span>
            <button
              type="button"
              onClick={() => setWeeksCount(4)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                weeksCount === 4
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              4 Weeks
            </button>
            <button
              type="button"
              onClick={() => setWeeksCount(8)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                weeksCount === 8
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              8 Weeks
            </button>
            <button
              type="button"
              onClick={() => setWeeksCount(12)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                weeksCount === 12
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              12 Weeks
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('combined')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'combined'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Combined
            </button>
            <button
              type="button"
              onClick={() => setViewMode('attendance')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'attendance'
                  ? 'bg-white text-emerald-700 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" /> Attendance
            </button>
            <button
              type="button"
              onClick={() => setViewMode('payroll')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'payroll'
                  ? 'bg-white text-blue-700 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Payroll
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Micro-Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Avg. Presence Rate
            </span>
            <span className="text-lg font-bold text-slate-900">{avgPresenceRate}%</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            <CalendarDays className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Period Presence (Man-Days)
            </span>
            <span className="text-lg font-bold text-slate-900">{totalPeriodAttendance}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Total Overtime Logged
            </span>
            <span className="text-lg font-bold text-amber-700">{totalOvertime} hrs</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Period Est. Payroll
            </span>
            <span className="text-lg font-bold text-blue-700">
              SAR {totalPeriodExpenditure.toLocaleString('en-US')}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'combined' ? (
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              {/* Left YAxis: Presence Count */}
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 11, fill: '#059669' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                label={{
                  value: 'Present Workers (Count)',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 10,
                  fill: '#059669',
                  offset: 10
                }}
              />
              {/* Right YAxis: Payroll SAR */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#2563EB' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                label={{
                  value: 'Payroll (SAR)',
                  angle: 90,
                  position: 'insideRight',
                  fontSize: 10,
                  fill: '#2563EB',
                  offset: 10
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-48">
                        <div className="font-bold text-amber-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                          <span>Week: {label}</span>
                          <span className="text-[10px] text-slate-400">
                            {data.startStr} → {data.endStr}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Present Man-Days:</span>
                          <span className="font-bold font-mono">{data.effectivePresent}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Presence Rate:</span>
                          <span className="font-bold font-mono">{data.presenceRate}%</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-400">
                          <span>Overtime Logged:</span>
                          <span className="font-bold font-mono">{data.overtimeHours} hrs</span>
                        </div>
                        <div className="flex items-center justify-between text-blue-400 border-t border-slate-800 pt-1">
                          <span>Weekly Payroll Cost:</span>
                          <span className="font-bold font-mono">
                            SAR {data.expenditure.toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
              <Bar
                yAxisId="left"
                dataKey="effectivePresent"
                name="Present Workforce"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="expenditure"
                name="Payroll Expenditure (SAR)"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ r: 4, stroke: '#1E40AF', strokeWidth: 2, fill: '#93C5FD' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          ) : viewMode === 'attendance' ? (
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700 min-w-44">
                        <div className="font-bold text-amber-300 border-b border-slate-800 pb-1">
                          {label}
                        </div>
                        <div className="text-emerald-400 flex justify-between">
                          <span>Full Day Present:</span>
                          <b>{data.present}</b>
                        </div>
                        <div className="text-amber-400 flex justify-between">
                          <span>Half-Day:</span>
                          <b>{data.halfDay}</b>
                        </div>
                        <div className="text-rose-400 flex justify-between">
                          <span>Absent:</span>
                          <b>{data.absent}</b>
                        </div>
                        <div className="text-indigo-300 flex justify-between border-t border-slate-800 pt-1">
                          <span>Presence Rate:</span>
                          <b>{data.presenceRate}%</b>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
              <Bar
                dataKey="present"
                name="Full Day Present"
                stackId="att"
                fill="#10B981"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="halfDay"
                name="Half-Day"
                stackId="att"
                fill="#F59E0B"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="absent"
                name="Absent"
                stackId="att"
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="presenceRate"
                name="Presence Rate (%)"
                stroke="#6366F1"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          ) : (
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="payrollGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                tickFormatter={(val) => `SAR ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip
                formatter={(val: any) => [`SAR ${Number(val).toLocaleString('en-US')}`, 'Expenditure']}
                contentStyle={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '0.75rem',
                  border: '1px solid #334155'
                }}
              />
              <Area
                type="monotone"
                dataKey="expenditure"
                name="Weekly Payroll Expenditure (SAR)"
                stroke="#2563EB"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#payrollGradient)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Navigation Hints */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Attendance Roll-Call Logs
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            Calculated Net Wage Disbursements
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToAttendance && (
            <button
              type="button"
              onClick={onNavigateToAttendance}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer"
            >
              Detailed Attendance View <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
          {onNavigateToPayroll && (
            <button
              type="button"
              onClick={onNavigateToPayroll}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer ml-3"
            >
              Full Payroll Ledger <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
