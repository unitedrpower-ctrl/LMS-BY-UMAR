import React, { useState } from 'react';
import { User, UserRole, Site } from '../../types';
import { UserCheck, Clock, CheckCircle2, XCircle, ShieldCheck, Building2, Search, Mail, Phone, Hash, AlertCircle } from 'lucide-react';

interface LoginRequestsViewProps {
  users: User[];
  sites: Site[];
  onSaveUser: (user: User) => void;
  currentUserRole: string;
}

export const LoginRequestsView: React.FC<LoginRequestsViewProps> = ({
  users,
  sites,
  onSaveUser,
  currentUserRole
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Active' | 'Rejected'>('Pending');
  const [selectedUserForAction, setSelectedUserForAction] = useState<User | null>(null);
  const [assignRole, setAssignRole] = useState<UserRole>('Labor');
  const [assignSiteId, setAssignSiteId] = useState<string>('');
  const [assignDailyRate, setAssignDailyRate] = useState<number>(65);

  const pendingUsers = users.filter((u) => u.status === 'Pending');

  const filteredUsers = users.filter((u) => {
    // Show pending by default or filter
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Pending' ? u.status === 'Pending' : u.status === statusFilter);
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.loginSerial && u.loginSerial.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.iqamaId && u.iqamaId.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleApprove = (user: User) => {
    onSaveUser({
      ...user,
      role: assignRole || user.role,
      siteId: assignSiteId || user.siteId,
      dailyRate: assignDailyRate || user.dailyRate || 65,
      status: 'Active'
    });
    setSelectedUserForAction(null);
  };

  const handleReject = (user: User) => {
    if (window.confirm(`Are you sure you want to reject login request for ${user.name}?`)) {
      onSaveUser({
        ...user,
        status: 'Rejected'
      });
    }
  };

  return (
    <div id="view-login-requests" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-700/80 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              {pendingUsers.length} Pending Login Requests
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-indigo-400" />
            New Login & Account Verification Portal
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Review, verify identity credentials (Iqama/Passport), assign construction sites and wage rates, and approve or reject incoming staff & worker sign-up requests.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div className="text-center px-3 border-r border-slate-800">
            <div className="text-2xl font-extrabold text-amber-400">{pendingUsers.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Pending Review</div>
          </div>
          <div className="text-center px-3">
            <div className="text-2xl font-extrabold text-emerald-400">
              {users.filter(u => u.status === 'Active').length}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Active Staff</div>
          </div>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('Pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'Pending' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending ({pendingUsers.length})
          </button>
          <button
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'All' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Accounts ({users.length})
          </button>
          <button
            onClick={() => setStatusFilter('Active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'Active' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('Rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'Rejected' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Rejected
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, Iqama..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* Requests Grid / Table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No login requests found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no registration or login requests matching your selected filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const isPending = user.status === 'Pending';
            const isActive = user.status === 'Active';
            const isRejected = user.status === 'Rejected';
            const assignedSite = sites.find((s) => s.id === user.siteId);

            return (
              <div
                key={user.id}
                className={`bg-white rounded-2xl border transition-all shadow-sm hover:shadow-md flex flex-col overflow-hidden ${
                  isPending ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                }`}
              >
                {/* Card Top Header */}
                <div className={`p-4 border-b flex items-center justify-between ${
                  isPending ? 'bg-amber-50/60 border-amber-100' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={user.name}
                      className="w-11 h-11 rounded-xl object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">{user.name}</h3>
                      <span className="text-[11px] text-slate-500 font-mono">{user.designation || user.role}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                    isPending ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {user.status || 'Active'}
                  </span>
                </div>

                {/* Card Body Details */}
                <div className="p-4 space-y-2.5 text-xs flex-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate font-medium">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-mono">{user.phone}</span>
                    </div>
                  )}
                  {user.iqamaId && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Hash className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-mono text-slate-700 font-bold">Iqama/ID: {user.iqamaId}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Role</span>
                      <span className="font-bold text-slate-800">{user.role}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Assigned Site</span>
                      <span className="font-bold text-slate-800 truncate block">
                        {assignedSite ? assignedSite.name : 'HQ (No Site)'}
                      </span>
                    </div>
                  </div>

                  {user.loginSerial && (
                    <div className="p-2.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] flex items-center justify-between">
                      <span className="text-slate-400">Login Serial:</span>
                      <span className="text-emerald-400 font-bold">{user.loginSerial}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedUserForAction(user);
                          setAssignRole(user.role || 'Labor');
                          setAssignSiteId(user.siteId || sites[0]?.id || '');
                          setAssignDailyRate(user.dailyRate || 65);
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Request
                      </button>
                      <button
                        onClick={() => handleReject(user)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-all"
                        title="Reject Request"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full text-center py-1 text-[11px] text-slate-500 font-medium">
                      Account Status: <span className="font-bold text-slate-800">{user.status}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approval & Configuration Modal */}
      {selectedUserForAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUserForAction.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={selectedUserForAction.name}
                  className="w-12 h-12 rounded-2xl object-cover border"
                />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Approve Login Request</h3>
                  <p className="text-xs text-slate-500">{selectedUserForAction.name} • {selectedUserForAction.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForAction(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign System Role</label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-slate-50"
                >
                  <option value="Labor">👷 Laborer / Worker</option>
                  <option value="Site Supervisor">🏗️ Site Supervisor</option>
                  <option value="HR Admin">👔 HR Administrator</option>
                  <option value="Super Admin">🛡️ Super Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Construction Site</label>
                <select
                  value={assignSiteId}
                  onChange={(e) => setAssignSiteId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-slate-50"
                >
                  <option value="">Corporate HQ (No Site)</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Daily Wage Rate (SAR)</label>
                <input
                  type="number"
                  step="1"
                  value={assignDailyRate}
                  onChange={(e) => setAssignDailyRate(parseFloat(e.target.value) || 65)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-slate-50"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Approving this account will activate system access, generate secure credentials, and grant portal privileges based on the assigned role.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedUserForAction(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedUserForAction)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Activate Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
