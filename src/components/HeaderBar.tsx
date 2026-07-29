import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { LanguageCode, LanguageMetaList } from '../lib/i18n';
import { 
  Building2, 
  Smartphone, 
  Monitor, 
  RotateCcw, 
  ShieldCheck, 
  HardHat, 
  UserCheck, 
  User as UserIcon,
  Database,
  Sun,
  Moon,
  LogOut,
  Globe,
  Download,
  CheckCircle2,
  Share2,
  Menu,
  X,
  Settings
} from 'lucide-react';

interface HeaderBarProps {
  currentUser: User;
  allUsers: User[];
  onSelectUser: (userId: string) => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  onResetData: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  currentLang?: LanguageCode;
  onChangeLang?: (lang: LanguageCode) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  isMobileFrame,
  onToggleMobileFrame,
  onResetData,
  activeTab,
  setActiveTab,
  onOpenAuthModal,
  onLogout,
  theme = 'light',
  onToggleTheme,
  currentLang = 'en',
  onChangeLang
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowPwaModal(true);
    }
  };
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'HR Admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Site Supervisor':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Labor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'Super Admin':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'HR Admin':
        return <UserCheck className="w-3.5 h-3.5" />;
      case 'Site Supervisor':
        return <Building2 className="w-3.5 h-3.5" />;
      case 'Labor':
        return <HardHat className="w-3.5 h-3.5" />;
      default:
        return <UserIcon className="w-3.5 h-3.5" />;
    }
  };

  return (
    <header id="app-header-bar" className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Hamburger Menu Button & App Logo / Name */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger Menu Toggle Button */}
          <button
            id="btn-hamburger-menu"
            onClick={() => setIsHeaderMenuOpen(true)}
            className="p-2.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl border border-slate-700 hover:border-indigo-500 shadow-md transition-all flex items-center justify-center cursor-pointer"
            title="Open Side Sliding Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* App Logo & Prominent Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center shadow-md flex-shrink-0 border border-amber-500/30">
              <img 
                src="/src/assets/images/lms_umar_logo_1785237060471.jpg" 
                alt="LMS by Umar Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight leading-tight truncate text-slate-100 flex items-center gap-1.5">
                <span>LMS</span>
                <span className="text-amber-400 text-xs font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full">by Umar</span>
              </h1>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Labor, Attendance & Payroll Management System
              </p>
            </div>
          </div>
        </div>

        {/* Right Controls (Minimalist quick actions) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Login / Sign Up Portal Trigger Button */}
          {onOpenAuthModal && (
            <button
              id="btn-open-auth-portal"
              onClick={onOpenAuthModal}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
              title="Open Login / Sign Up Portal"
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Login / Sign Up</span>
            </button>
          )}

          {/* Slide Menu Trigger Pill */}
          <button
            id="btn-slide-header-menu"
            onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md border border-indigo-400/50 transition-all cursor-pointer"
            title="Toggle All Header Options Drawer"
          >
            <Settings className="w-4 h-4 text-indigo-200" />
            <span className="hidden md:inline">Options Drawer</span>
          </button>
        </div>
      </div>

      {/* Slide-out Drawer for All Header Options */}
      {isHeaderMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={() => setIsHeaderMenuOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-white">Header Options & Controls</h2>
                    <p className="text-[11px] text-slate-400">Manage all system settings and user options</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHeaderMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* User Info Card */}
                <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current User Session</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getRoleBadgeColor(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-white">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-400">{currentUser.email} • {currentUser.siteName || 'HQ'}</div>
                </div>

                {/* Role Switcher */}
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl space-y-2">
                  <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                    Switch User Role & Identity
                  </label>
                  <select
                    id="slide-menu-role-select"
                    value={currentUser.id}
                    onChange={(e) => {
                      onSelectUser(e.target.value);
                      setIsHeaderMenuOpen(false);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <optgroup label="Super Admin">
                      {allUsers.filter(u => u.role === 'Super Admin').map(u => (
                        <option key={u.id} value={u.id}>🛡️ {u.name} (Super Admin)</option>
                      ))}
                    </optgroup>
                    <optgroup label="HR Admin">
                      {allUsers.filter(u => u.role === 'HR Admin').map(u => (
                        <option key={u.id} value={u.id}>👔 {u.name} (HR Admin)</option>
                      ))}
                    </optgroup>
                    <optgroup label="Site Supervisor">
                      {allUsers.filter(u => u.role === 'Site Supervisor').map(u => (
                        <option key={u.id} value={u.id}>🏗️ {u.name} (Supervisor)</option>
                      ))}
                    </optgroup>
                    <optgroup label="Laborers">
                      {allUsers.filter(u => u.role === 'Labor').map(u => (
                        <option key={u.id} value={u.id}>👷 {u.name} (Laborer)</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Language Selector */}
                {onChangeLang && (
                  <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Interface Language (i18n)</span>
                    </label>
                    <select
                      id="slide-menu-lang-select"
                      value={currentLang}
                      onChange={(e) => {
                        onChangeLang(e.target.value as LanguageCode);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {LanguageMetaList.LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.nativeName} ({lang.name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {/* Theme Toggle */}
                  {onToggleTheme && (
                    <button
                      onClick={() => {
                        onToggleTheme();
                      }}
                      className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-1.5 font-bold text-slate-200 transition-all"
                    >
                      {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-300" />}
                      <span>{theme === 'dark' ? 'Day Mode' : 'Night Mode'}</span>
                    </button>
                  )}

                  {/* PWA Install */}
                  <button
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleInstallPwa();
                    }}
                    className="p-3 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded-xl flex flex-col items-center justify-center gap-1.5 font-bold text-indigo-300 transition-all"
                  >
                    <Download className="w-4 h-4 text-indigo-400" />
                    <span>Install App</span>
                  </button>

                  {/* Device Frame Toggle */}
                  <button
                    onClick={() => {
                      onToggleMobileFrame();
                      setIsHeaderMenuOpen(false);
                    }}
                    className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-1.5 font-bold text-slate-200 transition-all"
                  >
                    {isMobileFrame ? <Monitor className="w-4 h-4 text-emerald-400" /> : <Smartphone className="w-4 h-4 text-indigo-400" />}
                    <span>{isMobileFrame ? 'Full Screen' : 'Mobile Frame'}</span>
                  </button>

                  {/* Reset Mock Data */}
                  <button
                    onClick={() => {
                      onResetData();
                      setIsHeaderMenuOpen(false);
                    }}
                    className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-1.5 font-bold text-red-300 transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-red-400" />
                    <span>Reset Data</span>
                  </button>
                </div>

                {/* SQL Schema button if applicable */}
                {currentUser.role !== 'Labor' && (
                  <button
                    onClick={() => {
                      setActiveTab('sql_workbench');
                      setIsHeaderMenuOpen(false);
                    }}
                    className="w-full p-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Database className="w-4 h-4 text-amber-300" />
                    <span>View PostgreSQL Schema Workbench</span>
                  </button>
                )}

                {/* Logout Button */}
                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      setIsHeaderMenuOpen(false);
                    }}
                    className="w-full p-3 bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all border border-rose-500/50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Session</span>
                  </button>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80 text-center text-[10px] text-slate-500">
                LMS by Umar • Enterprise PWA Edition
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Mobile Installation Modal */}
      {showPwaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Install LMS by Umar</h3>
                  <p className="text-[11px] text-slate-400">Progressive Web Application (PWA)</p>
                </div>
              </div>
              <button
                onClick={() => setShowPwaModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-indigo-950/60 border border-indigo-800/60 rounded-2xl space-y-1">
                <span className="font-extrabold text-indigo-300 block text-xs">📱 Android / Chrome Installation</span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Tap the Chrome menu button <strong className="text-white">(⋮)</strong> at the top right, then select <strong className="text-amber-400">"Add to Home screen"</strong> or <strong className="text-amber-400">"Install app"</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl space-y-1">
                <span className="font-extrabold text-slate-200 block text-xs flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>iOS / Safari (iPhone & iPad) Installation</span>
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Tap the <strong className="text-white">Share</strong> icon in Safari toolbar, scroll down and select <strong className="text-indigo-400">"Add to Home Screen"</strong>.
                </p>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl flex items-center gap-2 text-[11px] text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Full offline caching enabled with Service Worker!</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPwaModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
