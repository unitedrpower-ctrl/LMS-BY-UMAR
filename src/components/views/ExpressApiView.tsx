import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Code, 
  Play, 
  FileSpreadsheet, 
  ShieldCheck, 
  AlertOctagon, 
  Calculator, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Download,
  Terminal,
  Zap,
  Lock
} from 'lucide-react';
import { User, Site, Payroll, Attendance, Complaint } from '../../types';
import { 
  getBackendHealth, 
  downloadPayrollExcelApi, 
  markAttendanceApi, 
  submitComplaintApi, 
  getPayrollApi 
} from '../../lib/api';

interface ExpressApiViewProps {
  currentUser: User;
  users: User[];
  sites: Site[];
  payrolls: Payroll[];
  onRefreshData?: () => void;
}

export const ExpressApiView: React.FC<ExpressApiViewProps> = ({
  currentUser,
  users,
  sites,
  payrolls,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'tester' | 'code' | 'rbac'>('tester');
  const [health, setHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [apiResponseLog, setApiResponseLog] = useState<string>('Select an API action above to execute live Express endpoints...');

  // Test state for attendance update
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(users.find(u => u.role === 'Labor')?.id || 'usr-labor-1');
  const [testAttendanceStatus, setTestAttendanceStatus] = useState<'Present' | 'Half-Day' | 'Absent'>('Present');
  const [testMonth, setTestMonth] = useState('2026-07');

  // Test state for complaint limit test
  const [limitTestLog, setLimitTestLog] = useState<string[]>([]);
  const [testingLimit, setTestingLimit] = useState(false);

  // Check health on load
  const handleCheckHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await getBackendHealth();
      setHealth(res);
      setApiResponseLog(`GET /api/health Response 200 OK:\n${JSON.stringify(res, null, 2)}`);
    } catch (err: any) {
      setApiResponseLog(`GET /api/health Error:\n${err.message}`);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    handleCheckHealth();
  }, []);

  // 1. Live Test: Download Excel (.xlsx)
  const handleDownloadExcel = async () => {
    try {
      setApiResponseLog(`GET /api/payroll/export-excel?monthYear=${testMonth}\nHeaders: X-User-Role=${currentUser.role}\nGenerating Excel spreadsheet...`);
      await downloadPayrollExcelApi(testMonth, undefined, currentUser);
      setApiResponseLog(`SUCCESS 200 OK: Excel Salary Sheet downloaded for ${testMonth}.\nFile format: .xlsx\nIncluded columns: Worker Name, Role, Assigned Site, Daily Wage, Days Worked, Gross Earned, Allowances, Advances, Penalties, Net Salary.`);
    } catch (err: any) {
      setApiResponseLog(`EXCEL EXPORT ERROR (${err.message}):\nNote: If role is 'Labor', backend RBAC blocks salary export with 403 Forbidden.`);
    }
  };

  // 2. Live Test: Submit Attendance and verify automated salary recalculation
  const handleTestAttendanceUpdate = async () => {
    try {
      const todayStr = `${testMonth}-15`;
      const targetWorker = users.find(u => u.id === selectedWorkerId);
      const targetSite = sites.find(s => s.id === targetWorker?.siteId) || sites[0];

      const record: Attendance = {
        id: `att-test-${Date.now()}`,
        userId: selectedWorkerId,
        siteId: targetSite.id,
        date: todayStr,
        status: testAttendanceStatus,
        markedBy: currentUser.id,
        notes: `Marked via Express API Tester by ${currentUser.name}`
      };

      setApiResponseLog(`POST /api/attendance\nPayload: ${JSON.stringify(record, null, 2)}\nHeaders: X-User-Role=${currentUser.role}...`);

      const result = await markAttendanceApi([record], currentUser);
      setApiResponseLog(`POST /api/attendance 200 OK:\n${JSON.stringify(result, null, 2)}`);

      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setApiResponseLog(`POST /api/attendance ERROR:\n${err.message}`);
    }
  };

  // 3. Live Test: Rapidly submit 4 complaints to demonstrate Daily Complaint Limit Rule (Max 3)
  const handleRunComplaintLimitTest = async () => {
    setTestingLimit(true);
    setLimitTestLog([]);
    const logs: string[] = [];

    logs.push(`🔍 Initiating Daily Complaint Limit Test for Worker (${currentUser.name}, Role: ${currentUser.role})...`);
    logs.push(`Rule Constraint: Maximum 3 complaints permitted per 24-hour cycle.`);

    for (let i = 1; i <= 4; i++) {
      try {
        logs.push(`\n[Attempt ${i}/4] Submitting complaint #${i}...`);
        const res = await submitComplaintApi({
          message: `Automated API Test Complaint #${i} - Checking limit enforcement`,
          category: 'Safety',
          siteId: currentUser.siteId || 'site-metro-tower'
        }, currentUser);

        logs.push(`✅ Attempt ${i} Succeeded (201 Created): Remaining today = ${res.remainingToday}`);
      } catch (err: any) {
        logs.push(`❌ Attempt ${i} REJECTED BY BACKEND (HTTP 429 Too Many Requests):`);
        logs.push(`   Error Message: "${err.message}"`);
      }
      setLimitTestLog([...logs]);
      await new Promise(r => setTimeout(r, 600)); // slight pause for UI animation
    }

    setTestingLimit(false);
    if (onRefreshData) onRefreshData();
  };

  return (
    <div id="view-express-api" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight">Node.js / Express Backend Engine</h2>
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] rounded-full font-bold">
              LIVE PORT 3000
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Automated Payroll Formulas, Attendance-Triggered Recalculations, Role-Based Access Control (RBAC), Daily Complaint Limits, and Excel (.xlsx) Generation.
          </p>
        </div>

        {/* Health status pill */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div className="font-mono text-[11px]">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">API Status</span>
              <span className="text-slate-200 font-bold">{health ? '200 OK (Express)' : 'Connecting...'}</span>
            </div>
          </div>

          <button
            onClick={handleCheckHealth}
            disabled={loadingHealth}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Health Check"
          >
            <RefreshCw className={`w-4 h-4 ${loadingHealth ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('tester')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'tester'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Play className="w-4 h-4" />
          Interactive API Tester
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'code'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Code className="w-4 h-4" />
          Express Code Architecture
        </button>

        <button
          onClick={() => setActiveTab('rbac')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'rbac'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          RBAC Matrix & Rules
        </button>
      </div>

      {/* TAB 1: INTERACTIVE API TESTER */}
      {activeTab === 'tester' && (
        <div className="space-y-6">
          {/* 4 Feature Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Excel Export (.xlsx) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Excel (.xlsx) Salary Sheet Generation</h3>
                    <p className="text-[11px] text-slate-500">ExcelJS workbook streamer with formulas & styling</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  Generates an official monthly salary sheet spreadsheet with columns: <strong className="text-slate-800">Worker Name, Role, Site, Daily Rate, Days Worked, Gross Earned, Allowances, Advances, Penalties, Net Salary</strong>.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Month:</span>
                  <input
                    type="month"
                    value={testMonth}
                    onChange={e => setTestMonth(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>

                <button
                  onClick={handleDownloadExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .xlsx
                </button>
              </div>
            </div>

            {/* Card 2: Attendance Update & Auto Salary Recalculation */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Attendance Trigger -&gt; Auto Recalculate</h3>
                    <p className="text-[11px] text-slate-500">Updates attendance and recomputes Net Salary instantly</p>
                  </div>
                </div>

                <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-xs space-y-1">
                  <p className="font-mono text-[11px] font-bold text-indigo-900">
                    Net Salary = (Daily Wage × Days Worked) + Allowances - Advances - Penalties
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Select Worker</label>
                    <select
                      value={selectedWorkerId}
                      onChange={e => setSelectedWorkerId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs"
                    >
                      {users.filter(u => u.role === 'Labor').map(u => (
                        <option key={u.id} value={u.id}>{u.name} (${u.dailyRate}/day)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Mark Status</label>
                    <select
                      value={testAttendanceStatus}
                      onChange={e => setTestAttendanceStatus(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                    >
                      <option value="Present">Present (1.0 day)</option>
                      <option value="Half-Day">Half-Day (0.5 day)</option>
                      <option value="Absent">Absent (0.0 day)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleTestAttendanceUpdate}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Submit Attendance & Recalculate
                </button>
              </div>
            </div>

            {/* Card 3: Daily Complaint Limit Rule Enforcement (Max 3) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Complaint Limit Rule (Max 3/Day)</h3>
                    <p className="text-[11px] text-slate-500">Enforces rate limit & returns HTTP 429 when exceeded</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  Test runner will submit 4 complaints sequentially under current user account (<strong className="text-slate-800">{currentUser.name}</strong>). The 4th submission will be automatically blocked with HTTP 429.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={handleRunComplaintLimitTest}
                  disabled={testingLimit}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Play className={`w-3.5 h-3.5 ${testingLimit ? 'animate-spin' : ''}`} />
                  Run 4-Complaint Stress Test
                </button>
              </div>
            </div>

            {/* Card 4: RBAC Security Headers Context */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Active RBAC Session Headers</h3>
                    <p className="text-[11px] text-slate-500">Passed in every request to Express server</p>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] space-y-1">
                  <div><span className="text-slate-500">X-User-Id:</span> {currentUser.id}</div>
                  <div><span className="text-slate-500">X-User-Role:</span> <span className="text-emerald-400 font-bold">{currentUser.role}</span></div>
                  <div><span className="text-slate-500">Assigned Site:</span> {currentUser.siteId || 'None (All Sites)'}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                Switch user persona in top bar to test role permissions!
              </div>
            </div>

          </div>

          {/* Test Execution Output Terminal */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-slate-200">Express Backend Response Terminal</span>
              </div>
              <button
                onClick={() => setApiResponseLog('Console cleared.')}
                className="text-[10px] font-mono text-slate-400 hover:text-slate-200"
              >
                Clear Log
              </button>
            </div>

            <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-72 whitespace-pre-wrap leading-relaxed">
              {limitTestLog.length > 0 ? limitTestLog.join('\n') : apiResponseLog}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: EXPRESS CODE ARCHITECTURE */}
      {activeTab === 'code' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-200 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-white">
              <Code className="w-4 h-4 text-indigo-400" />
              Express Backend Implementation Highlights (`server.ts`)
            </h3>
            <p className="text-xs text-slate-400">
              The Node.js Express server runs natively on port 3000 behind container ingress routing. Here are the core code snippets powering Prompt 2 requirements:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-emerald-400 block">1. Dynamic Salary Calculation Formula</span>
                <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
{`const grossEarned = totalDaysWorked * dailyRate;
const netSalary = Math.max(
  0, 
  grossEarned + allowances - advances - penalties
);`}
                </pre>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-400 block">2. Daily Complaint Limit Enforcement (Max 3)</span>
                <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
{`if (todayComplaintsCount >= 3) {
  return res.status(429).json({
    error: "Maximum 3 complaints/day limit exceeded.",
    limitExceeded: true
  });
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RBAC MATRIX */}
      {activeTab === 'rbac' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Role-Based Access Control (RBAC) Permissions Matrix
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-900 text-slate-300 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Module / Feature Action</th>
                  <th className="p-3 text-center">Super Admin</th>
                  <th className="p-3 text-center">HR Admin</th>
                  <th className="p-3 text-center">Site Supervisor</th>
                  <th className="p-3 text-center">Labor Worker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Mark Attendance</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">All Sites</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">All Sites</td>
                  <td className="p-3 text-center text-blue-600 font-bold">Assigned Site Only</td>
                  <td className="p-3 text-center text-red-500 font-bold">Blocked (403)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">View Complaints</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">All Complaints</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">All Complaints</td>
                  <td className="p-3 text-center text-blue-600 font-bold">Assigned Site Only</td>
                  <td className="p-3 text-center text-indigo-600 font-bold">Own Submitted Only</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Export Salary Sheet (.xlsx)</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">Allowed</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">Allowed</td>
                  <td className="p-3 text-center text-red-500 font-bold">Blocked (403)</td>
                  <td className="p-3 text-center text-red-500 font-bold">Blocked (403)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Submit Complaints</td>
                  <td className="p-3 text-center text-slate-500">Allowed (Max 3/day)</td>
                  <td className="p-3 text-center text-slate-500">Allowed (Max 3/day)</td>
                  <td className="p-3 text-center text-slate-500">Allowed (Max 3/day)</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">Primary Portal (Max 3/day)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Worker Portal Access</td>
                  <td className="p-3 text-center text-slate-400">Full Workspace</td>
                  <td className="p-3 text-center text-slate-400">Full Workspace</td>
                  <td className="p-3 text-center text-slate-400">Full Workspace</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">Read-Only Worker Portal</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
