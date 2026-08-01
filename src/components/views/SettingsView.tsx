import React, { useState } from 'react';
import { UserAvatar } from '../UserAvatar';
import { 
  Settings as SettingsIcon, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  UserCheck, 
  Key, 
  Check, 
  Save, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  UserPlus, 
  Eye, 
  EyeOff,
  Briefcase,
  Plus,
  Trash2,
  FileSpreadsheet,
  Coins
} from 'lucide-react';
import { SystemSettings, User, AdminPermissions, GovHoliday } from '../../types';
import { downloadLaborCredentialsExcelApi } from '../../lib/api';

interface SettingsViewProps {
  settings: SystemSettings;
  onSaveSettings: (newSettings: SystemSettings) => void;
  users: User[];
  onSaveUser: (updatedUser: User) => void;
  currentUser: User;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  users,
  onSaveUser,
  currentUser
}) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // New Gov Holiday form state
  const [newGovDate, setNewGovDate] = useState<string>('');
  const [newGovTitle, setNewGovTitle] = useState<string>('');
  const [newGovNotes, setNewGovNotes] = useState<string>('');

  // Filter admin users for RBAC management
  const adminUsers = users.filter(u => u.role === 'Super Admin' || u.role === 'HR Admin' || u.role === 'Site Supervisor');
  const laborUsers = users.filter(u => u.role === 'Labor');

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const handleTogglePassword = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleSavePolicySettings = () => {
    onSaveSettings(localSettings);
    setSavedSuccessMessage('System Policies & Rules updated successfully!');
    setTimeout(() => setSavedSuccessMessage(null), 3000);
  };

  const handleAddGovHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGovDate || !newGovTitle) return;

    const newHoliday: GovHoliday = {
      id: `gov-${Date.now()}`,
      date: newGovDate,
      title: newGovTitle,
      notes: newGovNotes || 'Official Public Holiday'
    };

    const updated = {
      ...localSettings,
      govHolidays: [...(localSettings.govHolidays || []), newHoliday]
    };

    setLocalSettings(updated);
    onSaveSettings(updated);
    setNewGovDate('');
    setNewGovTitle('');
    setNewGovNotes('');
    setSavedSuccessMessage(`Added Government Holiday: ${newGovTitle}`);
    setTimeout(() => setSavedSuccessMessage(null), 3000);
  };

  const handleDeleteGovHoliday = (id: string) => {
    const updated = {
      ...localSettings,
      govHolidays: (localSettings.govHolidays || []).filter(g => g.id !== id)
    };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleExportLaborExcel = async () => {
    try {
      setIsExportingExcel(true);
      await downloadLaborCredentialsExcelApi(currentUser);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleUpdateAdminPermission = (adminId: string, permKey: keyof AdminPermissions, value: boolean) => {
    const admin = users.find(u => u.id === adminId);
    if (!admin) return;

    const currentPerms: AdminPermissions = admin.adminPermissions || {
      canViewPayroll: admin.role === 'Super Admin' || admin.role === 'HR Admin',
      canEditPayroll: admin.role === 'Super Admin' || admin.role === 'HR Admin',
      canMarkAttendance: true,
      canManageSites: admin.role === 'Super Admin',
      canManageUsers: admin.role === 'Super Admin' || admin.role === 'HR Admin',
      canAccessSettings: admin.role === 'Super Admin'
    };

    const updatedUser: User = {
      ...admin,
      adminPermissions: {
        ...currentPerms,
        [permKey]: value
      }
    };

    onSaveUser(updatedUser);
  };

  return (
    <div id="view-settings" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold tracking-tight">System Policies, Currency (SAR) & RBAC</h2>
          </div>
          <p className="text-xs text-slate-300">
            Configure Government Paid Holidays, Friday Rules, SAR Currency Settings, and Worker Credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-emerald-400" />
            Currency: SAR (Saudi Riyal)
          </div>

          {currentUser.role === 'Super Admin' && (
            <button
              onClick={handleSavePolicySettings}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              Save Policy Rules
            </button>
          )}
        </div>
      </div>

      {savedSuccessMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 rounded-2xl font-medium text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          {savedSuccessMessage}
        </div>
      )}

      {/* Grid Section 1: Government Holidays & Payroll Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Government Holidays Management (Requirement 1) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Government Holidays & Wage Rules</h3>
                <p className="text-[11px] text-slate-500">Official Kingdom holidays (Full daily wage automatically paid)</p>
              </div>
            </div>
          </div>

          {/* Add Holiday Form */}
          <form onSubmit={handleAddGovHoliday} className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-2">
            <span className="text-xs font-bold text-amber-900 block">Declare New Government Holiday</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                required
                value={newGovDate}
                onChange={e => setNewGovDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-amber-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <input
                type="text"
                required
                placeholder="e.g. Saudi National Day"
                value={newGovTitle}
                onChange={e => setNewGovTitle(e.target.value)}
                className="px-3 py-1.5 text-xs border border-amber-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Notes (optional e.g. Full Wage Paid)"
                value={newGovNotes}
                onChange={e => setNewGovNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-amber-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 whitespace-nowrap shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Holiday
              </button>
            </div>
          </form>

          {/* Government Holidays List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {(localSettings.govHolidays || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No government holidays declared yet.</p>
            ) : (
              localSettings.govHolidays.map(hol => (
                <div key={hol.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-amber-700">{hol.date}</span>
                      <span className="font-bold text-slate-800">{hol.title}</span>
                    </div>
                    {hol.notes && <p className="text-[10px] text-slate-500">{hol.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteGovHoliday(hol.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    title="Delete Holiday"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Friday Holiday & Overtime Multipliers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Friday & Overtime Multiplier Rules</h3>
              <p className="text-[11px] text-slate-500">Weekly paid rest days & overtime wage calculation rates</p>
            </div>
          </div>

          {/* Toggle: Friday Paid Holiday Rule */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 block">Automatic Paid Friday Holidays</span>
              <p className="text-[11px] text-slate-500">Includes Friday base salary automatically in worker monthly payrolls.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.fridayPaidHolidayEnabled}
                onChange={e => setLocalSettings({ ...localSettings, fridayPaidHolidayEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Setting: Overtime Rate Multiplier */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              Overtime Wage Multiplier Rate
            </label>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: '1.5x Normal Rate', value: 1.5 },
                { label: '2.0x Double Pay', value: 2.0 },
                { label: '3.0x Triple Pay', value: 3.0 }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, overtimeMultiplierRate: opt.value })}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    localSettings.overtimeMultiplierRate === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Setting: Absent Worker Penalty Rate (1 Day, 2 Days, 3 Days) */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Absent Worker Deduction Penalty Rate
              </label>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                Current: {localSettings.absencePenaltyMultiplier || 1.0}x Daily Wage
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Amount deducted from worker monthly payroll per unexcused absence day.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: '1 Day Deduction (1.0x)', desc: 'Standard 1 Day Wage Penalty', value: 1.0 },
                { label: '2 Days Deduction (2.0x)', desc: '2 Days Wage Penalty per Absence', value: 2.0 },
                { label: '3 Days Deduction (3.0x)', desc: 'Heavy 3 Days Wage Penalty', value: 3.0 }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, absencePenaltyMultiplier: opt.value })}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    (localSettings.absencePenaltyMultiplier || 1.0) === opt.value
                      ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-extrabold">{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 font-normal ${
                    (localSettings.absencePenaltyMultiplier || 1.0) === opt.value ? 'text-rose-100' : 'text-slate-500'
                  }`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Section 2: Granular Admin Role & Permission Management (RBAC) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Granular Admin Permissions & Role Management</h3>
              <p className="text-[11px] text-slate-500">Super Admin can grant or restrict exact module access per admin account</p>
            </div>
          </div>

          <span className="px-3 py-1 bg-slate-100 text-slate-700 font-mono text-[11px] rounded-full font-bold">
            {adminUsers.length} Admin Accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-900 text-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Admin Account</th>
                <th className="p-3">Role Title</th>
                <th className="p-3 text-center">View Payroll</th>
                <th className="p-3 text-center">Edit Payroll</th>
                <th className="p-3 text-center">Mark Attendance</th>
                <th className="p-3 text-center">Manage Sites</th>
                <th className="p-3 text-center">Manage Users</th>
                <th className="p-3 text-center">Access Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adminUsers.map(admin => {
                const perms = admin.adminPermissions || {
                  canViewPayroll: admin.role === 'Super Admin' || admin.role === 'HR Admin',
                  canEditPayroll: admin.role === 'Super Admin' || admin.role === 'HR Admin',
                  canMarkAttendance: true,
                  canManageSites: admin.role === 'Super Admin',
                  canManageUsers: admin.role === 'Super Admin' || admin.role === 'HR Admin',
                  canAccessSettings: admin.role === 'Super Admin'
                };

                const isSuperAdmin = admin.role === 'Super Admin';
                const canEditThisRow = currentUser.role === 'Super Admin';

                return (
                  <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          src={admin.avatar}
                          name={admin.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{admin.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{admin.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        admin.role === 'Super Admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : admin.role === 'HR Admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {admin.role}
                      </span>
                    </td>

                    {(
                      [
                        'canViewPayroll',
                        'canEditPayroll',
                        'canMarkAttendance',
                        'canManageSites',
                        'canManageUsers',
                        'canAccessSettings'
                      ] as (keyof AdminPermissions)[]
                    ).map(pKey => (
                      <td key={pKey} className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={perms[pKey]}
                          disabled={isSuperAdmin || !canEditThisRow}
                          onChange={e => handleUpdateAdminPermission(admin.id, pKey, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Labor Credentials & Security Directory with Dedicated Excel Export (Requirement 5) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Labor Login Credentials & Master Details</h3>
              <p className="text-[11px] text-slate-500">Iqama IDs, Passports, Auto-generated Portal Serials & Passwords</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportLaborExcel}
              disabled={isExportingExcel}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              {isExportingExcel ? 'Generating Master Excel...' : 'Export Labor Details Excel (.xlsx)'}
            </button>

            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-mono text-[11px] rounded-full font-bold">
              {laborUsers.length} Registered Workers
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {laborUsers.map(worker => (
            <div key={worker.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                <UserAvatar
                  src={worker.avatar}
                  name={worker.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-300"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{worker.name}</h4>
                  <span className="text-[10px] text-slate-500 block">{worker.designation || 'Laborer'}</span>
                </div>
              </div>

              <div className="space-y-1 font-mono text-[11px] pt-1 text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Login Serial:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                    {worker.loginSerial || `EMP-${worker.id.substring(4, 8)}`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Password:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">
                      {showPasswords[worker.id] ? (worker.loginPassword || 'WorkerPass#1') : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTogglePassword(worker.id)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords[worker.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Iqama ID:</span>
                  <span className="font-semibold">{worker.iqamaId || '2549102938'}</span>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Passport No:</span>
                  <span className="font-semibold">{worker.passportNumber || 'E9102837'}</span>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Daily Wage:</span>
                  <span className="font-semibold text-emerald-700">SAR {worker.dailyRate.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
