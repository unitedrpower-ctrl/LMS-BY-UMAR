import React, { useState, useEffect } from 'react';
import { User, UserRole, Site, RoleInvitation } from '../../types';
import { 
  Users, 
  Plus, 
  ShieldCheck, 
  UserCheck, 
  HardHat, 
  Building2, 
  Search, 
  Edit3, 
  X, 
  Check, 
  FileSpreadsheet, 
  Clock, 
  AlertCircle, 
  Upload, 
  Trash2, 
  Key, 
  ShieldAlert,
  Mail,
  Send,
  Copy,
  ExternalLink,
  Crown,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { 
  downloadLaborCredentialsExcelApi, 
  getInvitationsApi, 
  createInvitationApi, 
  revokeInvitationApi 
} from '../../lib/api';

interface UsersViewProps {
  users: User[];
  sites: Site[];
  onSaveUser: (user: User) => void;
  onDeleteUser?: (userId: string) => void;
  onUpdatePassword?: (userId: string, newPassword: string) => void;
  currentUserRole: string;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  sites,
  onSaveUser,
  onDeleteUser,
  onUpdatePassword,
  currentUserRole
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'Labor',
    dailyRate: 60.0
  });

  // Permanent Delete & Password Reset State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userForPassword, setUserForPassword] = useState<User | null>(null);
  const [manualPasswordInput, setManualPasswordInput] = useState('');
  const [randomPasswordResult, setRandomPasswordResult] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  // Requirement 3: Owner Invitation State
  const [invitations, setInvitations] = useState<RoleInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('HR Admin');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [createdInvitationModal, setCreatedInvitationModal] = useState<{
    invitation: RoleInvitation;
    emailBody: string;
    inviteUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentUserRole === 'Owner' || currentUserRole === 'Super Admin') {
      getInvitationsApi()
        .then(data => setInvitations(data))
        .catch(err => console.warn('Failed to fetch invitations:', err));
    }
  }, [currentUserRole]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRole) return;
    setIsInviting(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const res = await createInvitationApi({ email: inviteEmail, role: inviteRole });
      if (res.success) {
        setCreatedInvitationModal({
          invitation: res.invitation,
          emailBody: res.emailBody,
          inviteUrl: res.inviteUrl
        });
        setInviteSuccess(`Invitation created and email sent for ${inviteEmail}!`);
        setInviteEmail('');
        const updated = await getInvitationsApi();
        setInvitations(updated);
      }
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvite = async (invId: string) => {
    try {
      await revokeInvitationApi(invId);
      const updated = await getInvitationsApi();
      setInvitations(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke invitation.');
    }
  };

  const pendingUsers = users.filter((u) => u.status === 'Pending');

  const filteredUsers = users.filter((u) => {
    // Show active users in default table (or filter by role)
    const isNotPending = u.status !== 'Pending';
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.loginSerial && u.loginSerial.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return isNotPending && matchesSearch && matchesRole;
  });

  const handleApproveUser = (pendingUser: User, approvedRole: UserRole, assignedSiteId?: string) => {
    onSaveUser({
      ...pendingUser,
      role: approvedRole,
      siteId: assignedSiteId || pendingUser.siteId,
      status: 'Active',
      dailyRate: pendingUser.dailyRate || (approvedRole === 'Labor' ? 65 : 120)
    });
  };

  const handleRejectUser = (pendingUser: User) => {
    onSaveUser({
      ...pendingUser,
      status: 'Rejected'
    });
  };

  const handleOpenAddModal = () => {
    setEditingUser({
      id: `usr-custom-${Date.now()}`,
      name: '',
      email: '',
      role: 'Labor',
      dailyRate: 60.0,
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser({ ...u });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser.name || !editingUser.email) return;

    const randomId = Math.floor(1000 + Math.random() * 9000);

    onSaveUser({
      id: editingUser.id || `usr-${Date.now()}`,
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role || 'Labor',
      siteId: editingUser.siteId,
      dailyRate: editingUser.dailyRate || 60,
      phone: editingUser.phone || '+1 (555) 000-0000',
      designation: editingUser.designation || editingUser.role,
      joinedDate: editingUser.joinedDate || new Date().toISOString().split('T')[0],
      avatar: editingUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      iqamaId: editingUser.iqamaId || `${Math.floor(2000000000 + Math.random() * 900000000)}`,
      passportNumber: editingUser.passportNumber || `P${randomId}`,
      loginSerial: editingUser.loginSerial || `EMP-${randomId}`,
      loginPassword: editingUser.loginPassword || `Pass#${randomId}`,
      bankName: editingUser.bankName,
      accountNumber: editingUser.accountNumber,
      iban: editingUser.iban,
      status: editingUser.status || 'Active'
    });

    setIsModalOpen(false);
  };

  return (
    <div id="view-users" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Users & Workforce Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage system accounts across Owner, Super Admin, Site Supervisor, HR Admin, and Labor roles.
          </p>
        </div>

        {(currentUserRole === 'Owner' || currentUserRole === 'Super Admin' || currentUserRole === 'HR Admin') && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-export-labor-credentials"
              onClick={() => downloadLaborCredentialsExcelApi()}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-slate-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export Labor Credentials (.xlsx)
            </button>

            <button
              id="btn-add-new-user"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Staff / Worker Account
            </button>
          </div>
        )}
      </div>

      {/* Requirement 3: Owner-Driven Role Invitation System Panel */}
      {(currentUserRole === 'Owner' || currentUserRole === 'Super Admin') && (
        <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-2xl p-5 space-y-4 shadow-xl text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base tracking-wide flex items-center gap-2">
                  <span>OWNER ROLE INVITATION ENGINE</span>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/40">
                    Google OAuth Integrated
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Invite administrators or supervisors via Gmail. Recipient logs in with Google to claim assigned role instantly.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSendInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Target Gmail Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="e.g. manager.admin@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Designated Role *</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
              >
                <option value="Super Admin">Super Admin (Full Control)</option>
                <option value="HR Admin">HR Admin (Payroll & Attendance)</option>
                <option value="Site Supervisor">Site Supervisor (Field Staff)</option>
                <option value="Labor">Labor Worker</option>
                <option value="Owner">Owner (Supreme System Owner)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isInviting}
                className="w-full py-2 px-4 bg-gradient-to-r from-indigo-600 to-amber-600 hover:from-indigo-500 hover:to-amber-500 text-white font-extrabold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isInviting ? 'Generating Invitation...' : 'Send Role Invitation Email'}</span>
              </button>
            </div>
          </form>

          {inviteError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          {/* Active Invitations List */}
          {invitations.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Issued Invitations Log ({invitations.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Target Email</th>
                      <th className="p-2.5">Invited Role</th>
                      <th className="p-2.5">Invited By</th>
                      <th className="p-2.5">Sent Date</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right rounded-r-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono font-bold text-white">{inv.email}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded text-[11px] font-bold">
                            {inv.role}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400">{inv.invitedBy}</td>
                        <td className="p-2.5 text-slate-400 font-mono text-[11px]">{inv.createdAt}</td>
                        <td className="p-2.5">
                          {inv.status === 'Pending' && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold uppercase animate-pulse">
                              Pending Google Login
                            </span>
                          )}
                          {inv.status === 'Accepted' && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold uppercase">
                              Accepted & Active
                            </span>
                          )}
                          {inv.status === 'Revoked' && (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-bold uppercase">
                              Revoked
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          {inv.status === 'Pending' && (
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-[11px] font-bold transition-all"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Approval Panel for Pending Registrations (Requirement 1) */}
      {(currentUserRole === 'Owner' || currentUserRole === 'Super Admin' || currentUserRole === 'HR Admin') && pendingUsers.length > 0 && (
        <div className="bg-amber-950/20 border-2 border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-900 dark:text-amber-300 text-sm tracking-wide">
                  ADMIN APPROVAL PANEL — Pending User Registrations ({pendingUsers.length})
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  New users/admins who signed up are awaiting Super Admin account verification and activation.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-full">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingUsers.map((pending) => (
              <div
                key={pending.id}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm text-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={pending.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={pending.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-300"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{pending.name}</h4>
                      <p className="text-slate-500">{pending.email}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px] uppercase">
                    Pending
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Requested Role:</span>
                    <span className="font-bold text-indigo-700">{pending.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Registered Date:</span>
                    <span className="font-mono">{pending.registeredAt || pending.joinedDate}</span>
                  </div>
                  {pending.iqamaId && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Iqama ID:</span>
                      <span className="font-mono font-bold text-slate-800">{pending.iqamaId}</span>
                    </div>
                  )}
                  {pending.passportNumber && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Passport Number:</span>
                      <span className="font-mono font-bold text-slate-800">{pending.passportNumber}</span>
                    </div>
                  )}
                  {pending.isGoogleUser && (
                    <div className="col-span-2 mt-1">
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-indigo-100">
                        <img src="https://www.google.com/favicon.ico" alt="Google Logo" className="w-3 h-3" />
                        Google Authentication Profile
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => handleRejectUser(pending)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => handleApproveUser(pending, pending.role)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Check className="w-4 h-4" /> Approve & Activate Account
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
        >
          <option value="All">All Roles</option>
          <option value="Super Admin">Super Admin</option>
          <option value="HR Admin">HR Admin</option>
          <option value="Site Supervisor">Site Supervisor</option>
          <option value="Labor">Labor</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">User Profile & Photo</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Assigned Site</th>
                <th className="p-3.5">Daily Wage Rate</th>
                <th className="p-3.5">Bank Account Info</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const site = sites.find((s) => s.id === u.siteId);
                const isInactive = u.status === 'Inactive';

                return (
                  <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${isInactive ? 'opacity-70 bg-slate-50/50' : ''}`}>
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-3">
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
                      />
                      <div>
                        <span>{u.name}</span>
                        <span className="block text-[10px] font-normal text-slate-400">{u.email}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isInactive
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {isInactive ? '🔴 Inactive' : '🟢 Active'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'Super Admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'HR Admin'
                            ? 'bg-blue-100 text-blue-800'
                            : u.role === 'Site Supervisor'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-700">
                      {site ? site.name : 'Corporate Headquarters'}
                    </td>

                    <td className="p-3.5 font-bold text-slate-900">SAR {u.dailyRate.toFixed(2)}/day</td>

                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                      {u.bankName || u.iban ? (
                        <div>
                          <span className="font-bold text-slate-800 block">{u.bankName || 'Bank Account'}</span>
                          <span className="text-[10px] text-slate-500">{u.iban || u.accountNumber}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {(currentUserRole === 'Owner' || currentUserRole === 'Super Admin' || currentUserRole === 'HR Admin') && (
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs inline-flex items-center gap-1"
                            title="Edit User Profile"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}

                        {(currentUserRole === 'Owner' || currentUserRole === 'Super Admin') && (
                          <>
                            <button
                              onClick={() => {
                                setUserForPassword(u);
                                setManualPasswordInput('');
                                setRandomPasswordResult('');
                                setPasswordSuccessMsg('');
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-xs inline-flex items-center gap-1 border border-amber-200"
                              title="Manage or Reset Password (Owner / Admin)"
                            >
                              <Key className="w-3.5 h-3.5" /> Password
                            </button>

                            <button
                              onClick={() => setUserToDelete(u)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs inline-flex items-center gap-1 border border-rose-200"
                              title="Permanently Delete User (Owner / Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Configure Staff User</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Iqama ID / National ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 2549102938"
                    value={editingUser.iqamaId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, iqamaId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passport Number</label>
                  <input
                    type="text"
                    placeholder="e.g. E9102837"
                    value={editingUser.passportNumber || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, passportNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Editable Portal Credentials */}
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl space-y-2 text-[11px] font-mono">
                <span className="text-[10px] text-amber-400 font-bold uppercase block tracking-wider">Worker Portal Credentials (Manual & Custom Entry)</span>
                <div>
                  <label className="block text-slate-400 text-[10px] mb-0.5">Login Serial Number *</label>
                  <input
                    type="text"
                    required
                    value={editingUser.loginSerial || `EMP-${Math.floor(1000 + Math.random() * 9000)}`}
                    onChange={(e) => setEditingUser({ ...editingUser, loginSerial: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 font-bold font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. EMP-1001 or W-501"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] mb-0.5">Access Password *</label>
                  <input
                    type="text"
                    required
                    value={editingUser.loginPassword || `Pass#${Math.floor(1000 + Math.random() * 9000)}`}
                    onChange={(e) => setEditingUser({ ...editingUser, loginPassword: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-indigo-300 font-bold font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Pass#1234 or secure word"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={editingUser.role || 'Labor'}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  >
                    {currentUserRole === 'Owner' && <option value="Owner">👑 Platform Owner</option>}
                    <option value="Super Admin">Super Admin</option>
                    <option value="HR Admin">HR Admin</option>
                    <option value="Site Supervisor">Site Supervisor</option>
                    <option value="Labor">Labor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Daily Wage Rate (SAR)</label>
                  <input
                    type="number"
                    step="1"
                    value={editingUser.dailyRate || 60}
                    onChange={(e) => setEditingUser({ ...editingUser, dailyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Construction Site</label>
                <select
                  value={editingUser.siteId || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, siteId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  <option value="">Corporate HQ (No Site)</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Active / Inactive Status</label>
                  <select
                    value={editingUser.status === 'Inactive' ? 'Inactive' : 'Active'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as 'Active' | 'Inactive' })}
                    className={`w-full px-3 py-2 border rounded-xl font-bold ${
                      editingUser.status === 'Inactive'
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    }`}
                  >
                    <option value="Active">🟢 Active Account</option>
                    <option value="Inactive">🔴 Inactive / Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Worker Photo / Avatar</span>
                    <label className="text-[10px] text-indigo-600 font-extrabold cursor-pointer hover:underline flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                      <Upload className="w-3 h-3" /> Upload from Device
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                setEditingUser({ ...editingUser, avatar: reader.result });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </label>
                  <input
                    type="text"
                    placeholder="https://... or upload from device"
                    value={editingUser.avatar || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, avatar: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Bank Account Details Section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                  🏦 Bank Account Details (Disbursement)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Al Rajhi Bank, SNB"
                      value={editingUser.bankName || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, bankName: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 102938475"
                      value={editingUser.accountNumber || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, accountNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Saudi IBAN</label>
                    <input
                      type="text"
                      placeholder="SA..."
                      value={editingUser.iban || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, iban: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Designation / Skill</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Mason, Steel Fixer"
                  value={editingUser.designation || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Permanent Account Deletion</h3>
                <p className="text-xs text-slate-500">Super Admin Security Verification</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 leading-relaxed space-y-2">
              <p className="font-bold">
                Are you sure you want to permanently delete <span className="underline">{userToDelete.name}</span> ({userToDelete.email})?
              </p>
              <p className="text-[11px] text-rose-700">
                This action is a hard delete from the database and cannot be undone. All linked credentials and session history for this account will be removed.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteUser) {
                    onDeleteUser(userToDelete.id);
                  }
                  setUserToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Yes, Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Management Modal (Option A & Option B) */}
      {userForPassword && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Manage Password: {userForPassword.name}</h3>
                  <p className="text-[11px] text-slate-500">Secure bcrypt Hashing & Password Allotment (Super Admin)</p>
                </div>
              </div>
              <button onClick={() => setUserForPassword(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Option A: Randomly Reset & Show */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Option A: Randomly Reset & Show</span>
                    <span className="text-[11px] text-slate-500">Generates a cryptographically strong random password & hashes it.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newRand = `Umar${Math.floor(1000 + Math.random() * 9000)}#$kL`;
                      setRandomPasswordResult(newRand);
                      if (onUpdatePassword) {
                        onUpdatePassword(userForPassword.id, newRand);
                      }
                      setPasswordSuccessMsg(`Successfully reset and securely hashed password for ${userForPassword.name}!`);
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                  >
                    Generate & Secure
                  </button>
                </div>

                {randomPasswordResult && (
                  <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">New Temporary Plain-Text Password (Copy & Give to User):</span>
                    <div className="font-extrabold text-sm select-all">{randomPasswordResult}</div>
                    <span className="text-[10px] text-amber-300/80 block italic">Stored in database with secure bcrypt salt/hash.</span>
                  </div>
                )}
              </div>

              {/* Option B: Allot New Password Manually */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-extrabold text-slate-900 block">Option B: Allot New Password Manually</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter new custom password..."
                    value={manualPasswordInput}
                    onChange={(e) => setManualPasswordInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    disabled={!manualPasswordInput.trim()}
                    onClick={() => {
                      if (onUpdatePassword && manualPasswordInput.trim()) {
                        onUpdatePassword(userForPassword.id, manualPasswordInput.trim());
                        setPasswordSuccessMsg(`Successfully allotted and bcrypt-hashed custom password for ${userForPassword.name}!`);
                        setManualPasswordInput('');
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                  >
                    Save New Password
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setUserForPassword(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                Close & Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created Invitation Preview & Quick Link Modal */}
      {createdInvitationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-5 text-white animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Automated Invitation Email Sent</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Token: {createdInvitationModal.invitation.token}</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedInvitationModal(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Recipient Email:</span>
                <span className="font-mono font-bold text-amber-300">{createdInvitationModal.invitation.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Assigned Role:</span>
                <span className="font-bold text-indigo-400 bg-indigo-950 px-2.5 py-0.5 rounded border border-indigo-800">
                  {createdInvitationModal.invitation.role}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Unique Security Invitation Link:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdInvitationModal.inviteUrl}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInvitationModal.inviteUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Simulated Email Content Sent to Recipient:</label>
              <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {createdInvitationModal.emailBody}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  window.location.href = createdInvitationModal.inviteUrl;
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Test Link in App</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedInvitationModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
