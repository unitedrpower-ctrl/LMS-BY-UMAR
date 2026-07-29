import React from 'react';
import { UserRole } from '../types';
import { LanguageCode, getTranslation } from '../lib/i18n';
import { 
  LayoutDashboard, 
  Building2, 
  CalendarCheck, 
  DollarSign, 
  MessageSquareWarning, 
  Megaphone, 
  Users, 
  Database,
  Server,
  Settings,
  FolderLock,
  UserCheck,
  Crown
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  pendingComplaintsCount?: number;
  unresolvedCount?: number;
  pendingLoginCount?: number;
  lang?: LanguageCode;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  unresolvedCount = 0,
  pendingLoginCount = 0,
  lang = 'en'
}) => {
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);

  const allTabs = [
    { id: 'dashboard', label: userRole === 'Labor' ? t('workerPortal', 'My Worker Portal') : t('dashboard', 'Dashboard'), icon: LayoutDashboard, roles: ['Owner', 'Super Admin', 'HR Admin', 'Site Supervisor', 'Labor'] },
    { id: 'saas_owner', label: 'SaaS Tenants & Billing', icon: Crown, roles: ['Owner'] },
    { id: 'attendance', label: userRole === 'Labor' ? 'My Attendance' : t('attendance', 'Attendance'), icon: CalendarCheck, roles: ['Owner', 'Super Admin', 'HR Admin', 'Site Supervisor', 'Labor'] },
    { id: 'payroll', label: userRole === 'Labor' ? 'My Payslips' : t('payroll', 'Payroll'), icon: DollarSign, roles: ['Owner', 'Super Admin', 'HR Admin', 'Site Supervisor', 'Labor'] },
    { 
      id: 'complaints', 
      label: userRole === 'Labor' ? 'Submit Feedback' : t('complaints', 'Complaints'), 
      icon: MessageSquareWarning,
      badge: unresolvedCount > 0 && userRole !== 'Labor' ? unresolvedCount : undefined,
      roles: ['Owner', 'Super Admin', 'HR Admin', 'Site Supervisor', 'Labor']
    },
    { id: 'notices', label: t('notices', 'Notices'), icon: Megaphone, roles: ['Owner', 'Super Admin', 'HR Admin', 'Site Supervisor', 'Labor'] },
    { id: 'documents', label: t('documents', 'Document Vault'), icon: FolderLock, roles: ['Owner', 'Super Admin', 'HR Admin', 'Site Supervisor', 'Labor'] },
    { id: 'sites', label: t('sites', 'Sites'), icon: Building2, roles: ['Owner', 'Super Admin', 'HR Admin', 'Site Supervisor'] },
    { id: 'users', label: 'Staff & Role Invites', icon: Users, roles: ['Owner', 'Super Admin', 'HR Admin'] },
    { 
      id: 'login_requests', 
      label: 'Pending Approvals', 
      icon: UserCheck, 
      badge: pendingLoginCount > 0 ? pendingLoginCount : undefined,
      roles: ['Owner', 'Super Admin', 'HR Admin'] 
    },
    { id: 'settings', label: t('settings', 'RBAC & Policies'), icon: Settings, roles: ['Owner', 'Super Admin', 'HR Admin'] },
    { id: 'security', label: 'Security Options', icon: FolderLock, roles: ['Owner', 'Super Admin', 'HR Admin', 'Site Supervisor', 'Labor'] },
    { id: 'express_backend', label: t('express_backend', 'Express Node API'), icon: Server, roles: ['Owner'] },
    { id: 'sql_workbench', label: 'SQL DB Schema', icon: Database, roles: ['Owner'] }
  ];

  const visibleTabs = allTabs.filter(tab => tab.roles.includes(userRole));

  return (
    <nav id="app-main-navigation" className="bg-slate-900 border-b border-slate-800 text-slate-300">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>

                {tab.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
