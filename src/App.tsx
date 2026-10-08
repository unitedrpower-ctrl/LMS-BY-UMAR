import React, { useState, useEffect } from 'react';
import { User, Site, Attendance, Payroll, Complaint, Notice, DocumentItem, SystemSettings, Company } from './types';
import { LanguageCode, I18nProvider } from './lib/i18n';
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
  getAttendanceApi, 
  bulkUpdateAttendanceApi,
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
    currency: 'SAR',
    fridayPaidHolidayEnabled: true,
    overtimeMultiplierRate: 2.0,
    absencePenaltyMultiplier: 1.0,
    maxDailyComplaints: 3,
    govHolidays: []
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem('lms_current_user_id') || initial.currentUserId;
  });
  
  // Single Dedicated Company State
  const [tenantCompany, setTenantCompany] = useState<Company | null>(() => {
    return {
      id: 'comp-001',
      name: 'Al-Bawani Contracting Co.',
      companyCode: 'BAW-001',
      company_code: 'BAW-001',
      crNumber: '1010892741',
      address: 'King Fahd Road, Olaya District, Riyadh, Saudi Arabia',
      logoUrl: '/lms_by_umar_icon.jpg',
      adminName: 'Umar Chaudhary',
      adminEmail: 'unitedrpower@gmail.com',
      planType: 'CUSTOM_ENTERPRISE',
      subscriptionStartDate: '2024-01-01',
      subscriptionEndDate: '2099-12-31',
      maxLaborersAllowed: 99999,
      status: 'Active',
      pricePaidSar: 0,
      contactPhone: '+966 50 111 2222',
      createdAt: '2024-01-01 00:00'
    };
  });

  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
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

  // Load single-tenant datasets from backend
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
          getUsersApi(uContext).catch(() => null),
          getSitesApi(uContext).catch(() => null),
          getAttendanceApi(uContext).catch(() => null),
          getPayrollApi(uContext).catch(() => null),
          getComplaintsApi(uContext).catch(() => null),
          getNoticesApi(uContext).catch(() => null),
          getDocumentsApi(uContext).catch(() => null)
        ]);

        if (backendUsers && backendUsers.length > 0) setUsers(backendUsers);
        if (backendSites && backendSites.length > 0) setSites(backendSites);
        if (backendAttendance && backendAttendance.length > 0) setAttendance(backendAttendance);
        if (backendPayrolls && backendPayrolls.length > 0) setPayrolls(backendPayrolls);
        if (backendComplaints && backendComplaints.length > 0) setComplaints(backendComplaints);
        if (backendNotices && backendNotices.length > 0) setNotices(backendNotices);
        if (backendDocuments && backendDocuments.length > 0) setDocuments(backendDocuments);

        // Fetch dedicated single company settings
        try {
          const myCompRes = await getMyCompanyApi(uContext);
          if (myCompRes && myCompRes.company) {
            setTenantCompany(myCompRes.company);
          }
        } catch {
          // Keep current company state
        }
      } catch (err: any) {
        console.warn("Express backend data load notice:", err.message);
      }
    };

    fetchBackendData();
  }, [currentUserId]);

  // Real-Time Attendance & Worker Status Synchronization (SSE Stream + Polling Fallback)
  useEffect(() => {
    if (!currentUserId) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/events/attendance?companyId=comp-001&userId=${encodeURIComponent(currentUserId)}`);

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
    } catch (sseErr) {
      console.warn("SSE connection error, relying on polling fallback:", sseErr);
    }

    // Backup sync every 15 seconds for consistent live updates
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
    }, 15000);

    return () => {
      if (eventSource) eventSource.close();
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
      console.warn("Failed to refresh users:", err.message);
    }
    return users;
  };

  // Sync to local storage
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
  const currentUser = users.find((u) => u.id === currentUserId) || null;

  // Enforce role-based route access controls
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'Labor') {
      const allowedLaborTabs = ['dashboard', 'attendance', 'payroll', 'complaints', 'notices', 'security'];
      if (!allowedLaborTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    } else if (currentUser.role === 'Site Supervisor') {
      const allowedSupervisorTabs = ['dashboard', 'sites', 'attendance', 'payroll', 'complaints', 'notices', 'documents', 'security'];
      if (!allowedSupervisorTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  // Auth Handlers
  const handleLogin = (user: User) => {
    saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    localStorage.setItem('lms_current_user_id', user.id);
    localStorage.setItem('lms_user_role', user.role);
    localStorage.setItem('lms_user_email', user.email);

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
    setActiveTab('dashboard');
    setIsAuthModalOpen(false);
    window.history.replaceState({}, '', '/');
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, null);
    localStorage.removeItem('lms_current_user_id');
    localStorage.removeItem('lms_user_role');
    localStorage.removeItem('lms_user_email');
    localStorage.removeItem('lms_auth_token');
    localStorage.removeItem('labor_admin_current_user_id_v1');
    sessionStorage.clear();
    setIsAuthModalOpen(false);
    window.history.replaceState({}, '', '/');
  };

  const handleSignUp = async (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
    try {
      await registerUserApi(newUser);
    } catch (e: any) {
      console.warn("Registration API call:", e.message);
    }
  };

  // Actions
  const handleResetData = () => {
    if (window.confirm('Reset local sample data to clean state?')) {
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
      console.warn('[Save Site API]:', err.message);
    }
  };

  const handleSaveAttendanceRecords = async (records: Attendance[]) => {
    // 1. Update local state: if status is empty/None or _delete, remove record cleanly; otherwise update/insert
    let updatedAttendanceState: Attendance[] = [];
    setAttendance((prev) => {
      let copy = [...prev];
      records.forEach((rec) => {
        const isReset = !rec.status || (rec.status as string) === 'None' || (rec.status as string) === 'Empty' || (rec.status as string) === 'Clear' || (rec as any)._delete === true;
        const idx = copy.findIndex((a) => a.userId === rec.userId && a.date === rec.date);
        if (isReset) {
          if (idx >= 0) {
            copy.splice(idx, 1);
          }
        } else {
          if (idx >= 0) {
            copy[idx] = rec;
          } else {
            copy.push(rec);
          }
        }
      });
      updatedAttendanceState = copy;
      return copy;
    });

    try {
      await bulkUpdateAttendanceApi(records, currentUser || undefined);
    } catch (e: any) {
      console.warn("Bulk attendance API update:", e.message);
    }

    // Automated Recalculation of Monthly Salary
    records.forEach((rec) => {
      const monthYear = rec.date.substring(0, 7);
      const worker = users.find((u) => u.id === rec.userId);
      if (!worker) return;

      const userAtt = updatedAttendanceState.filter(
        (a) => a.userId === rec.userId && a.date.startsWith(monthYear)
      );

      const presentDays = userAtt.filter((a) => a.status === 'Present').length;
      const halfDays = userAtt.filter((a) => a.status === 'Half-Day').length;
      const absentDays = userAtt.filter((a) => a.status === 'Absent').length;
      const leaveDays = userAtt.filter((a) => a.status === 'Leave').length;
      const holidayDays = userAtt.filter((a) => a.status === 'Holiday').length;
      // Effective worked days: full day + 0.5 half day + paid leave + holiday
      const totalWorked = presentDays + halfDays * 0.5 + leaveDays + holidayDays;

      setPayrolls((prevPayrolls) => {
        const existing = prevPayrolls.find((p) => p.userId === rec.userId && p.monthYear === monthYear);
        const allowances = existing?.allowances ?? 0;
        const advances = existing?.advances ?? 0;
        const penalties = existing?.penalties ?? 0;

        const netSalary = Math.max(0, worker.dailyRate * totalWorked + allowances - advances - penalties);

        const updated: Payroll = {
          id: existing?.id || `pay-${monthYear}-${rec.userId}`,
          companyId: 'comp-001',
          userId: rec.userId,
          monthYear,
          dailyRate: worker.dailyRate,
          totalDaysWorked: totalWorked,
          presentDays,
          halfDays,
          absentDays,
          leaveDays,
          holidayDays,
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

  const handleRefreshAttendance = async () => {
    if (!currentUser) return;
    try {
      const fresh = await getAttendanceApi(currentUser);
      if (fresh && Array.isArray(fresh)) {
        setAttendance(fresh);
      }
    } catch (e: any) {
      console.warn("Failed to fetch fresh attendance records:", e.message);
    }
  };

  const handleRefreshPayroll = async () => {
    if (!currentUser) return;
    try {
      const fresh = await getPayrollApi(currentUser);
      if (fresh && Array.isArray(fresh)) {
        setPayrolls(fresh);
      }
    } catch (e: any) {
      console.warn("Failed to fetch fresh payroll records:", e.message);
    }
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
      console.warn("Save document warning:", err.message);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (window.confirm('Are you sure you want to delete this document from the vault?')) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      try {
        await deleteDocumentApi(docId, currentUser || undefined);
      } catch (err: any) {
        console.warn("Delete document warning:", err.message);
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
      console.warn("Save user warning:", e.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser || (currentUser.role !== 'Super Admin' && currentUser.role !== 'Owner')) {
      alert('Access Denied: Only Super Admin can permanently delete user records.');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setAttendance((prev) => prev.filter((a) => a.userId !== userId));
    setPayrolls((prev) => prev.filter((p) => p.userId !== userId));
    setComplaints((prev) => prev.filter((c) => c.userId !== userId));

    try {
      await deleteUserApi(userId, currentUser);
    } catch (e: any) {
      console.warn("Delete user warning:", e.message);
    }
  };

  const handleUpdatePassword = async (userId: string, newPassword: string) => {
    if (!currentUser || (currentUser.role !== 'Super Admin' && currentUser.role !== 'Owner')) {
      alert('Access Denied: Only Super Admin can manage staff passwords.');
      return;
    }
    
    const localHash = `$2b$10$${Math.random().toString(36).substring(2, 12)}BcryptHashed`;
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
      console.warn("Password update warning:", e.message);
    }
  };

  const unresolvedComplaintsCount = complaints.filter((c) => c.status === 'Pending').length;

  // GLOBAL AUTHENTICATION GUARD: If unauthenticated, show Clean Dedicated Login
  if (!currentUser) {
    return (
      <I18nProvider currentLang={currentLang} onLanguageChange={setCurrentLang}>
        <PublicAuthGuardView
          users={users}
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          onRefreshUsers={handleRefreshUsers}
          lang={currentLang}
          onLanguageChange={setCurrentLang}
        />
      </I18nProvider>
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
            onRefreshAttendance={handleRefreshAttendance}
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
            onRefreshAttendance={handleRefreshAttendance}
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
            tenantCompany={tenantCompany}
            onRefreshPayroll={handleRefreshPayroll}
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
            tenantCompany={tenantCompany}
            onUpdateTenantCompany={setTenantCompany}
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
      default:
        return null;
    }
  };

  return (
    <I18nProvider currentLang={currentLang} onLanguageChange={setCurrentLang}>
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
                  company={tenantCompany || undefined}
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
                company={tenantCompany || undefined}
              >
                {renderActiveView()}
              </SubscriptionExpiredGuard>
            </main>
          </div>
        )}

        {/* Post-Login Mandatory Profile Completion Guard Modal */}
        {currentUser && currentUser.profileCompleted === false && (
          <CompleteProfileModal
            currentUser={currentUser}
            onProfileSaved={(updatedUser) => {
              setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            }}
          />
        )}

        {/* Force Password Change Modal for First-Time Admin Logins */}
        {currentUser && currentUser.mustChangePassword === true && currentUser.role !== 'Labor' && (
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
    </I18nProvider>
  );
}
