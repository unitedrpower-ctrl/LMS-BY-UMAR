import React, { useState, useEffect } from 'react';
import { User, Site, Attendance, Payroll, Complaint, Notice, DocumentItem, SystemSettings } from './types';
import { LanguageCode } from './lib/i18n';
import { 
  getInitialState, 
  saveToStorage, 
  STORAGE_KEYS, 
  resetAllData 
} from './lib/storage';
import { HeaderBar } from './components/HeaderBar';
import { Navigation } from './components/Navigation';

// Views
import { DashboardView } from './components/views/DashboardView';
import { SitesView } from './components/views/SitesView';
import { AttendanceView } from './components/views/AttendanceView';
import { PayrollView } from './components/views/PayrollView';
import { ComplaintsView } from './components/views/ComplaintsView';
import { NoticesView } from './components/views/NoticesView';
import { DocumentView } from './components/views/DocumentView';
import { UsersView } from './components/views/UsersView';
import { LoginRequestsView } from './components/views/LoginRequestsView';
import { SqlSchemaView } from './components/views/SqlSchemaView';
import { ExpressApiView } from './components/views/ExpressApiView';
import { SettingsView } from './components/views/SettingsView';
import { SecuritySettingsView } from './components/views/SecuritySettingsView';
import { OwnerSaaSView } from './components/views/OwnerSaaSView';
import { SubscriptionExpiredGuard } from './components/SubscriptionExpiredGuard';
import { AuthModal } from './components/auth/AuthModal';
import { PublicAuthGuardView } from './components/auth/PublicAuthGuardView';
import { CompleteProfileModal } from './components/CompleteProfileModal';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { 
  deleteUserApi, 
  updateUserPasswordApi, 
  saveUserApi, 
  getUsersApi, 
  getSitesApi, 
  saveSiteApi,
  deleteSiteApi,
  getAttendanceApi, 
  getPayrollApi, 
  getComplaintsApi, 
  getNoticesApi, 
  registerUserApi,
  getMyCompanyApi,
  getDocumentsApi,
  saveDocumentApi,
  deleteDocumentApi
} from './lib/api';

export default function App() {
  const [initial] = useState(() => getInitialState());

  const [users, setUsers] = useState<User[]>(initial.users);
  const [sites, setSites] = useState<Site[]>(initial.sites);
  const [attendance, setAttendance] = useState<Attendance[]>(initial.attendance);
  const [payrolls, setPayrolls] = useState<Payroll[]>(initial.payroll);
  const [complaints, setComplaints] = useState<Complaint[]>(initial.complaints);
  const [notices, setNotices] = useState<Notice[]>(initial.notices);
  const [documents, setDocuments] = useState<DocumentItem[]>(initial.documents || []);
  const [currentLang, setCurrentLang] = useState<LanguageCode>(initial.currentLang || 'en');
  const [settings, setSettings] = useState<SystemSettings>(initial.settings || {
    fridayPaidHolidayEnabled: true,
    overtimeMultiplierRate: 2.0,
    absencePenaltyMultiplier: 1.0,
    maxDailyComplaints: 3
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const search = window.location.search;
    const pathname = window.location.pathname;
    const isRegisterOrWorkerPath = pathname.startsWith('/register') || 
                                   pathname.startsWith('/accept-invite') || 
                                   pathname.startsWith('/login/worker') || 
                                   search.includes('token=') || 
                                   search.includes('inviteToken=') || 
                                   search.includes('companyToken=') || 
                                   search.includes('tenantId=');
    if (isRegisterOrWorkerPath) {
      localStorage.removeItem('lms_current_user_id');
      localStorage.removeItem('lms_user_role');
      localStorage.removeItem('lms_user_email');
      localStorage.removeItem('lms_auth_token');
      localStorage.removeItem('lms_state_' + STORAGE_KEYS.CURRENT_USER_ID);
      return null;
    }
    return initial.currentUserId;
  });
  const [tenantCompany, setTenantCompany] = useState<any>(undefined);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'saas_owner' || hash === 'master-dashboard' || hash === 'owner-dashboard') {
      return 'saas_owner';
    }
    return 'dashboard';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('lms_theme') as 'light' | 'dark') || 'light';
  });

  // Sync theme class to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('lms_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Load initial datasets from full-stack backend
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const uContext = users.find(u => u.id === currentUserId) || undefined;
        const [
          backendUsers,
          backendSites,
          backendAttendance,
          backendPayrolls,
          backendComplaints,
          backendNotices,
          backendDocuments
        ] = await Promise.all([
          getUsersApi(uContext),
          getSitesApi(uContext),
          getAttendanceApi(uContext),
          getPayrollApi(uContext),
          getComplaintsApi(uContext),
          getNoticesApi(uContext),
          getDocumentsApi(uContext)
        ]);

        if (backendUsers) setUsers(backendUsers);
        if (backendSites) setSites(backendSites);
        if (backendAttendance) setAttendance(backendAttendance);
        if (backendPayrolls) setPayrolls(backendPayrolls);
        if (backendComplaints) setComplaints(backendComplaints);
        if (backendNotices) setNotices(backendNotices);
        if (backendDocuments) setDocuments(backendDocuments);

        if (uContext) {
          try {
            const myCompRes = await getMyCompanyApi(uContext);
            setTenantCompany(myCompRes.company);
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        console.warn("Failed to load initial datasets from Express backend (falling back to LocalStorage):", err.message);
      }
    };

    fetchBackendData();
  }, [currentUserId]);

  // Real-Time Attendance & Worker Status Synchronization (SSE Stream + Polling Fallback)
  useEffect(() => {
    if (!currentUserId) return;
    const uContext = users.find(u => u.id === currentUserId);
    const compId = uContext?.companyId || 'comp-001';

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/events/attendance?companyId=${encodeURIComponent(compId)}&userId=${encodeURIComponent(currentUserId)}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ATTENDANCE_UPDATE' && Array.isArray(data.attendance)) {
            setAttendance((prev) => {
              const updatedMap = new Map(prev.map(a => [`${a.userId}:${a.date}`, a]));
              data.attendance.forEach((rec: Attendance) => {
                updatedMap.set(`${rec.userId}:${rec.date}`, rec);
              });
              return Array.from(updatedMap.values());
            });

            if (Array.isArray(data.recalculatedPayrolls) && data.recalculatedPayrolls.length > 0) {
              setPayrolls((prev) => {
                const payMap = new Map(prev.map(p => [`${p.userId}:${p.monthYear}`, p]));
                data.recalculatedPayrolls.forEach((p: Payroll) => {
                  payMap.set(`${p.userId}:${p.monthYear}`, p);
                });
                return Array.from(payMap.values());
              });
            }
          }
        } catch {
          // ignore keepalive or parse errors
        }
      };

      eventSource.onerror = () => {
        // Browser automatically attempts reconnect on drop
      };
    } catch (sseErr) {
      console.warn("SSE connection error, relying on polling fallback:", sseErr);
    }

    // Reactive backup sync every 12 seconds for full consistency
    const pollInterval = setInterval(async () => {
      try {
        const u = users.find(usr => usr.id === currentUserId) || undefined;
        const [freshAtt, freshPay] = await Promise.all([
          getAttendanceApi(u),
          getPayrollApi(u)
        ]);
        if (freshAtt && freshAtt.length > 0) setAttendance(freshAtt);
        if (freshPay && freshPay.length > 0) setPayrolls(freshPay);
      } catch {
        // silent polling ignore
      }
    }, 12000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(pollInterval);
    };
  }, [currentUserId]);

  const handleRefreshUsers = async (): Promise<User[]> => {
    try {
      const uContext = users.find(u => u.id === currentUserId) || undefined;
      const backendUsers = await getUsersApi(uContext);
      if (backendUsers && backendUsers.length > 0) {
        setUsers(backendUsers);
        return backendUsers;
      }
    } catch (err: any) {
      console.warn("Failed to refresh users from Express backend:", err.message);
    }
    return users;
  };

  // Sync to storage
  useEffect(() => saveToStorage(STORAGE_KEYS.USERS, users), [users]);
  useEffect(() => saveToStorage(STORAGE_KEYS.SITES, sites), [sites]);
  useEffect(() => saveToStorage(STORAGE_KEYS.ATTENDANCE, attendance), [attendance]);
  useEffect(() => saveToStorage(STORAGE_KEYS.PAYROLL, payrolls), [payrolls]);
  useEffect(() => saveToStorage(STORAGE_KEYS.COMPLAINTS, complaints), [complaints]);
  useEffect(() => saveToStorage(STORAGE_KEYS.NOTICES, notices), [notices]);
  useEffect(() => saveToStorage(STORAGE_KEYS.DOCUMENTS, documents), [documents]);
  useEffect(() => saveToStorage(STORAGE_KEYS.SETTINGS, settings), [settings]);
  useEffect(() => saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, currentUserId), [currentUserId]);
  useEffect(() => saveToStorage(STORAGE_KEYS.CURRENT_LANG, currentLang), [currentLang]);
  useEffect(() => saveToStorage(STORAGE_KEYS.MOBILE_FRAME, isMobileFrame), [isMobileFrame]);

  // Current active user object or null if unauthenticated
  let currentUser = users.find((u) => u.id === currentUserId) || null;
  if (currentUser && (currentUser.email.toLowerCase() === 'umarchoudhary259@gmail.com' || currentUser.email.toLowerCase() === 'umarchaudhary259@gmail.com' || currentUser.email.toLowerCase() === 'unitedrpower@gmail.com')) {
    if (!currentUser.companyId || currentUser.companyId === 'comp-owner') {
      if (currentUser.role !== 'Owner' || currentUser.companyId !== 'comp-owner') {
        currentUser = {
          ...currentUser,
          role: 'Owner',
          companyId: 'comp-owner',
          status: 'Active',
          profileCompleted: true
        };
      }
    }
  }

  // Enforce role-based route access controls
  useEffect(() => {
    if (!currentUser) return;
    const normEmail = currentUser.email ? currentUser.email.toLowerCase().trim() : '';
    const isMaster = currentUser.role === 'Owner';

    if (currentUser.role === 'Labor') {
      const allowedLaborTabs = ['dashboard', 'attendance', 'payroll', 'complaints', 'notices', 'security'];
      if (!allowedLaborTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    } else if (currentUser.role === 'Site Supervisor') {
      const allowedSupervisorTabs = ['dashboard', 'sites', 'attendance', 'payroll', 'complaints', 'notices', 'documents', 'security', 'express_backend'];
      if (!allowedSupervisorTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    } else if (!isMaster && activeTab === 'saas_owner') {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);

  // Auth Handlers
  const handleLogin = (user: User) => {
    console.log('OTP Success! Redirecting to Master Dashboard...', user);

    // Save tokens and session details
    saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    localStorage.setItem('lms_current_user_id', user.id);
    localStorage.setItem('lms_user_role', user.role);
    localStorage.setItem('lms_user_email', user.email);
    localStorage.setItem('lms_auth_token', `auth-token-${user.id}-${Date.now()}`);

    // Add or update user in users state
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id || (u.email && u.email.toLowerCase() === user.email.toLowerCase()));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...user };
        return copy;
      }
      return [user, ...prev];
    });

    setCurrentUserId(user.id);

    // Force navigation route according to role
    if (user.role === 'Owner') {
      setActiveTab('saas_owner');
      window.history.replaceState({}, '', '/master-dashboard');
    } else if (user.role === 'Labor') {
      setActiveTab('dashboard');
      window.history.replaceState({}, '', '/client-dashboard');
    } else {
      setActiveTab('dashboard');
      window.history.replaceState({}, '', '/client-dashboard');
    }

    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    const params = new URLSearchParams(window.location.search);
    const existingCompToken = currentUser?.companyId || params.get('companyToken') || params.get('company_id') || params.get('companyId') || params.get('tenantId') || params.get('company');
    const isWorkerSession = currentUser?.role === 'Labor' || window.location.pathname.includes('/login/worker');

    setCurrentUserId(null);
    saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, null);
    localStorage.removeItem('lms_current_user_id');
    localStorage.removeItem('lms_user_role');
    localStorage.removeItem('lms_user_email');
    localStorage.removeItem('lms_auth_token');
    localStorage.removeItem('labor_admin_current_user_id_v1');
    sessionStorage.clear();
    setIsAuthModalOpen(false);

    if (existingCompToken && existingCompToken !== 'comp-owner' && existingCompToken !== 'all') {
      const routePrefix = isWorkerSession ? '/login/worker' : '/login/admin';
      window.history.replaceState({}, '', `${routePrefix}?companyToken=${existingCompToken}`);
    } else {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleSignUp = async (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
    try {
      await registerUserApi(newUser);
    } catch (e: any) {
      console.warn("Backend API registration failed or offline:", e.message);
    }
  };

  // Actions
  const handleResetData = () => {
    if (window.confirm('Reset sample database state to default?')) {
      resetAllData();
      window.location.reload();
    }
  };

  const handleSaveSite = async (newSite: Site) => {
    setSites((prev) => {
      const idx = prev.findIndex((s) => s.id === newSite.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newSite;
        return copy;
      }
      return [...prev, newSite];
    });

    try {
      const saved = await saveSiteApi(newSite, currentUser || undefined);
      if (saved && saved.id) {
        setSites((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      }
    } catch (err: any) {
      console.warn('[Save Site API Exception]:', err.message);
    }
  };

  const handleSaveAttendanceRecords = (records: Attendance[]) => {
    setAttendance((prev) => {
      const copy = [...prev];
      records.forEach((rec) => {
        const idx = copy.findIndex((a) => a.userId === rec.userId && a.date === rec.date);
        if (idx >= 0) {
          copy[idx] = rec;
        } else {
          copy.push(rec);
        }
      });
      return copy;
    });

    // AUTOMATED RECALCULATION OF MONTHLY SALARY UPON ATTENDANCE UPDATE
    records.forEach((rec) => {
      const monthYear = rec.date.substring(0, 7);
      const worker = users.find((u) => u.id === rec.userId);
      if (!worker) return;

      // Find all attendance for this worker in month
      const userAtt = [...attendance, ...records].filter(
        (a) => a.userId === rec.userId && a.date.startsWith(monthYear)
      );

      const presentDays = userAtt.filter((a) => a.status === 'Present').length;
      const halfDays = userAtt.filter((a) => a.status === 'Half-Day').length;
      const absentDays = userAtt.filter((a) => a.status === 'Absent').length;
      const totalWorked = presentDays + halfDays * 0.5;

      setPayrolls((prevPayrolls) => {
        const existing = prevPayrolls.find((p) => p.userId === rec.userId && p.monthYear === monthYear);
        const allowances = existing?.allowances ?? 0;
        const advances = existing?.advances ?? 0;
        const penalties = existing?.penalties ?? 0;

        const netSalary = Math.max(0, worker.dailyRate * totalWorked + allowances - advances - penalties);

        const updated: Payroll = {
          id: existing?.id || `pay-${monthYear}-${rec.userId}`,
          userId: rec.userId,
          monthYear,
          dailyRate: worker.dailyRate,
          totalDaysWorked: totalWorked,
          presentDays,
          halfDays,
          absentDays,
          allowances,
          advances,
          penalties,
          netSalary,
          status: existing?.status || 'Draft',
          generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };

        const idx = prevPayrolls.findIndex((p) => p.id === updated.id || (p.userId === rec.userId && p.monthYear === monthYear));
        if (idx >= 0) {
          const copy = [...prevPayrolls];
          copy[idx] = updated;
          return copy;
        }
        return [...prevPayrolls, updated];
      });
    });
  };

  const handleSavePayroll = (payroll: Payroll) => {
    setPayrolls((prev) => {
      const idx = prev.findIndex((p) => p.id === payroll.id || (p.userId === payroll.userId && p.monthYear === payroll.monthYear));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = payroll;
        return copy;
      }
      return [...prev, payroll];
    });
  };

  const handleAddComplaint = (complaint: Complaint) => {
    setComplaints((prev) => [complaint, ...prev]);
  };

  const handleUpdateComplaintStatus = (
    id: string,
    status: Complaint['status'],
    responseNote?: string,
    resolvedBy?: string
  ) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              responseNote: responseNote || c.responseNote,
              resolvedBy: resolvedBy || c.resolvedBy
            }
          : c
      )
    );
  };

  const handleAddNotice = (notice: Notice) => {
    setNotices((prev) => [notice, ...prev]);
  };

  const handleUploadDocument = async (doc: DocumentItem) => {
    setDocuments((prev) => [doc, ...prev]);
    try {
      await saveDocumentApi(doc, currentUser || undefined);
    } catch (err: any) {
      console.warn("Backend API save document warning:", err.message);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (window.confirm('Are you sure you want to delete this document from the vault?')) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      try {
        await deleteDocumentApi(docId, currentUser || undefined);
      } catch (err: any) {
        console.warn("Backend API delete document warning:", err.message);
      }
    }
  };

  const handleSaveUser = async (user: User) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = user;
        return copy;
      }
      return [...prev, user];
    });

    try {
      await saveUserApi(user, currentUser || undefined);
    } catch (e: any) {
      console.warn("Backend API save user failed or offline:", e.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser || currentUser.role !== 'Super Admin') {
      alert('Access Denied: Only Super Admin can permanently delete user records.');
      return;
    }
    // Hard Delete: Purge user and linked data locally for flawless UX
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setAttendance((prev) => prev.filter((a) => a.userId !== userId));
    setPayrolls((prev) => prev.filter((p) => p.userId !== userId));
    setComplaints((prev) => prev.filter((c) => c.userId !== userId));

    try {
      await deleteUserApi(userId, currentUser);
    } catch (e: any) {
      console.warn("Backend API Delete failed or offline:", e.message);
    }
  };

  const handleUpdatePassword = async (userId: string, newPassword: string) => {
    if (!currentUser || currentUser.role !== 'Super Admin') {
      alert('Access Denied: Only Super Admin can manage staff passwords.');
      return;
    }
    
    // Simulate bcrypt hash storage locally
    const localHash = `$2b$10$${Math.random().toString(36).substring(2, 12)}BcryptHashedUmarLMS`;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, loginPassword: localHash } : u))
    );

    try {
      const response = await updateUserPasswordApi(userId, newPassword, currentUser);
      if (response && response.hashedPassword) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, loginPassword: response.hashedPassword! } : u))
        );
      }
    } catch (e: any) {
      console.warn("Backend API Password update failed or offline:", e.message);
    }
  };

  const unresolvedComplaintsCount = complaints.filter((c) => c.status === 'Pending').length;

  // GLOBAL AUTHENTICATION GUARD: If unauthenticated, restrict access to Public Access Auth Screen only
  if (!currentUser) {
    return (
      <PublicAuthGuardView
        users={users}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        onRefreshUsers={handleRefreshUsers}
      />
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            currentUser={currentUser}
            users={users}
            sites={sites}
            attendance={attendance}
            payrolls={payrolls}
            complaints={complaints}
            notices={notices}
            setActiveTab={setActiveTab}
          />
        );
      case 'sites':
        return (
          <SitesView
            sites={sites}
            users={users}
            attendance={attendance}
            onSaveSite={handleSaveSite}
            currentUserRole={currentUser.role}
          />
        );
      case 'attendance':
        return (
          <AttendanceView
            attendanceList={attendance}
            sites={sites}
            users={users}
            currentUser={currentUser}
            onSaveAttendance={handleSaveAttendanceRecords}
            payrolls={payrolls}
          />
        );
      case 'payroll':
        return (
          <PayrollView
            payrolls={payrolls}
            users={users}
            attendance={attendance}
            onSavePayroll={handleSavePayroll}
            currentUserRole={currentUser.role}
            currentUser={currentUser}
            settings={settings}
          />
        );
      case 'complaints':
        return (
          <ComplaintsView
            complaints={complaints}
            users={users}
            sites={sites}
            currentUser={currentUser}
            onAddComplaint={handleAddComplaint}
            onUpdateComplaintStatus={handleUpdateComplaintStatus}
          />
        );
      case 'notices':
        return (
          <NoticesView
            notices={notices}
            sites={sites}
            currentUser={currentUser}
            onAddNotice={handleAddNotice}
          />
        );
      case 'documents':
        return (
          <DocumentView
            documents={documents}
            onUploadDocument={handleUploadDocument}
            onDeleteDocument={handleDeleteDocument}
            currentUser={currentUser}
            lang={currentLang}
          />
        );
      case 'users':
        return (
          <UsersView
            users={users}
            sites={sites}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            onUpdatePassword={handleUpdatePassword}
            currentUserRole={currentUser.role}
          />
        );
      case 'login_requests':
        return (
          <LoginRequestsView
            users={users}
            sites={sites}
            onSaveUser={handleSaveUser}
            currentUserRole={currentUser.role}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onSaveSettings={setSettings}
            users={users}
            onSaveUser={handleSaveUser}
            currentUser={currentUser}
          />
        );
      case 'security':
        return (
          <SecuritySettingsView
            currentUser={currentUser}
            onUpdateUser={handleSaveUser}
          />
        );
      case 'express_backend':
        return (
          <ExpressApiView
            currentUser={currentUser}
            users={users}
            sites={sites}
            payrolls={payrolls}
          />
        );
      case 'sql_workbench':
        return <SqlSchemaView />;
      case 'saas_owner':
        return <OwnerSaaSView currentUser={currentUser} />;
      default:
        return null;
    }
  };

  const handleRefreshTenantCompany = async () => {
    try {
      const res = await getMyCompanyApi(currentUser);
      setTenantCompany(res.company);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {isMobileFrame ? (
        /* Mobile Smartphone Device Simulation Frame */
        <div className="flex-1 flex items-center justify-center p-2 sm:p-6 bg-slate-950">
          <div className="w-full max-w-[420px] h-[860px] max-h-[95vh] bg-slate-900 border-4 border-slate-800 rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative ring-1 ring-slate-700/50">
            {/* Mobile Status Bar Notch */}
            <div className="h-6 bg-slate-900 text-slate-400 text-[10px] px-6 flex items-center justify-between font-mono flex-shrink-0 border-b border-slate-800/80">
              <span>9:41 AM</span>
              <div className="w-16 h-3.5 bg-slate-800 rounded-full mx-auto" />
              <span>100% 🔋</span>
            </div>

            {/* App Header */}
            <HeaderBar
              currentUser={currentUser}
              allUsers={users}
              tenantCompany={tenantCompany}
              onSelectUser={setCurrentUserId}
              isMobileFrame={isMobileFrame}
              onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
              onResetData={handleResetData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onLogout={handleLogout}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              currentLang={currentLang}
              onChangeLang={setCurrentLang}
            />

            {/* Navigation */}
            <Navigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              userRole={currentUser.role}
              unresolvedCount={unresolvedComplaintsCount}
              pendingLoginCount={users.filter(u => u.status === 'Pending').length}
              lang={currentLang}
            />

            {/* Mobile Content Area */}
            <main className="flex-1 overflow-y-auto p-4 bg-slate-100 text-slate-900">
              <SubscriptionExpiredGuard 
                currentUser={currentUser} 
                company={tenantCompany} 
                onRefreshStatus={handleRefreshTenantCompany}
              >
                {renderActiveView()}
              </SubscriptionExpiredGuard>
            </main>

            {/* Phone Home Indicator Bar */}
            <div className="h-4 bg-slate-900 flex items-center justify-center flex-shrink-0">
              <div className="w-32 h-1 bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        /* Responsive Full-Screen App Layout */
        <div className={`flex-1 flex flex-col min-h-screen transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}>
          <HeaderBar
            currentUser={currentUser}
            allUsers={users}
            tenantCompany={tenantCompany}
            onSelectUser={setCurrentUserId}
            isMobileFrame={isMobileFrame}
            onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
            onResetData={handleResetData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            currentLang={currentLang}
            onChangeLang={setCurrentLang}
          />

          <Navigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userRole={currentUser.role}
            unresolvedCount={unresolvedComplaintsCount}
            pendingLoginCount={users.filter(u => u.status === 'Pending').length}
            lang={currentLang}
          />

          <main className="flex-1 w-full min-h-screen px-4 sm:px-6 lg:px-8 py-6">
            <SubscriptionExpiredGuard 
              currentUser={currentUser} 
              company={tenantCompany} 
              onRefreshStatus={handleRefreshTenantCompany}
            >
              {renderActiveView()}
            </SubscriptionExpiredGuard>
          </main>
        </div>
      )}

      {/* Post-Login Mandatory Profile Completion Guard Modal */}
      {currentUser && currentUser.profileCompleted === false && currentUser.role !== 'Owner' && (
        <CompleteProfileModal
          currentUser={currentUser}
          onProfileSaved={(updatedUser) => {
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
          }}
        />
      )}

      {/* Force Password Change Modal for First-Time Admin Logins */}
      {currentUser && currentUser.mustChangePassword === true && currentUser.role !== 'Labor' && currentUser.role !== 'Owner' && (
        <ForcePasswordChangeModal
          currentUser={currentUser}
          onPasswordChanged={(updatedUser) => {
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, updatedUser.id);
            localStorage.setItem('lms_current_user_id', updatedUser.id);
          }}
        />
      )}

      {/* Auth Portal Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        users={users}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
      />
    </div>
  );
}
