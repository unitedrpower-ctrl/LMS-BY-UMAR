import React, { useState, useEffect } from 'react';
import { User, UserRole, RoleInvitation } from '../../types';
import { LanguageCode, getTranslation } from '../../lib/i18n';
import { 
  Lock, 
  UserCheck, 
  ShieldCheck, 
  HardHat, 
  KeyRound, 
  Mail, 
  UserPlus, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  RefreshCw,
  Building2,
  Globe,
  Sparkles,
  Key,
  BadgeCheck
} from 'lucide-react';
import { 
  googleAuthApi, 
  workerLoginApi, 
  adminLoginApi, 
  requestPasswordResetApi, 
  resetPasswordApi,
  validateInvitationApi,
  activateInvitationApi
} from '../../lib/api';

interface PublicAuthGuardViewProps {
  users: User[];
  onLogin: (user: User) => void;
  onSignUp: (newUser: User) => void;
  onRefreshUsers?: () => Promise<User[]>;
  lang?: LanguageCode;
  onLanguageChange?: (lang: LanguageCode) => void;
}

export const PublicAuthGuardView: React.FC<PublicAuthGuardViewProps> = ({
  users,
  onLogin,
  onSignUp,
  onRefreshUsers,
  lang = 'en',
  onLanguageChange
}) => {
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);

  const [activeTab, setActiveTab] = useState<'adminLogin' | 'workerLogin' | 'signUp' | 'forgotPassword' | 'resetPassword' | 'activateInvite'>('adminLogin');

  // Form States
  const [emailOrSerial, setEmailOrSerial] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Invited User Setup & Activation States
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [verifiedInvitation, setVerifiedInvitation] = useState<RoleInvitation | null>(null);
  const [invitationCompanyName, setInvitationCompanyName] = useState<string>('');
  const [isValidatingInvite, setIsValidatingInvite] = useState<boolean>(false);
  const [activateName, setActivateName] = useState('');
  const [activatePassword, setActivatePassword] = useState('');
  const [activateConfirmPassword, setActivateConfirmPassword] = useState('');
  const [isActivatingInvite, setIsActivatingInvite] = useState(false);
  
  // Password Reset States
  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(null);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  
  // Sign up fields
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('Labor');
  const [signupPassword, setSignupPassword] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [signupAvatar, setSignupAvatar] = useState('');

  // Status Feedback & Pending Approval View
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  // Google Auth Profile Completion Modal State
  const [googleProfileToComplete, setGoogleProfileToComplete] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [googleIqamaId, setGoogleIqamaId] = useState('');
  const [googlePassportNumber, setGooglePassportNumber] = useState('');
  const [googlePhone, setGooglePhone] = useState('');
  const [googleBankName, setGoogleBankName] = useState('');
  const [googleAccountNumber, setGoogleAccountNumber] = useState('');
  const [googleIban, setGoogleIban] = useState('');
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);

  // Detect and validate invitation tokens or parameters from URL on mount
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token') || searchParams.get('inviteToken') || searchParams.get('invitationToken');
      const comp = searchParams.get('company') || searchParams.get('companyId') || undefined;
      const email = searchParams.get('email');

      if (token) {
        setInvitationToken(token);
        setIsValidatingInvite(true);
        validateInvitationApi(token, comp)
          .then((res) => {
            if (res.valid && res.invitation) {
              setVerifiedInvitation(res.invitation);
              const invitedEmail = res.invitation.email || res.email || '';
              setSignupEmail(invitedEmail);
              setEmailOrSerial(invitedEmail);
              if (res.companyName) setInvitationCompanyName(res.companyName);
              setActiveTab('activateInvite');
              setSuccessMessage(`🎉 Official Invitation Verified for ${invitedEmail}! Set your secure account password below to activate your role as ${res.invitation.role}.`);
            } else if (res.error) {
              setErrorMessage(res.error);
            }
          })
          .catch((err) => {
            console.warn('Invite token validation warning:', err.message);
            if (email) {
              setEmailOrSerial(email);
              setSignupEmail(email);
            }
          })
          .finally(() => {
            setIsValidatingInvite(false);
          });
      } else if (email) {
        setEmailOrSerial(email);
        setSignupEmail(email);
      }
    } catch {
      // ignore URL parsing error
    }
  }, []);

  // Google Sign-In Simulation
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsGoogleProcessing(true);

    try {
      const simulatedGoogleEmail = `user.${Math.random().toString(36).substring(2, 7)}@gmail.com`;
      const simulatedGoogleName = 'Google Authenticated Staff';
      await executeGoogleAuth(simulatedGoogleName, simulatedGoogleEmail);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Authentication failed.');
      setIsGoogleProcessing(false);
    }
  };

  const executeGoogleAuth = async (name: string, email: string, extraProfile?: any) => {
    try {
      const res = await googleAuthApi({
        name,
        email,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        ...extraProfile
      });

      if (res.requireProfileCompletion) {
        setGoogleProfileToComplete({ email, name });
        setSuccessMessage('Google Account authenticated! Please complete your residency profile.');
      } else if (res.user) {
        if (res.user.status === 'Pending') {
          setPendingUserEmail(res.user.email);
          setSuccessMessage(res.message || 'Google account submitted for Admin approval.');
        } else if (res.user.status === 'Active') {
          onLogin(res.user);
        } else {
          setErrorMessage(res.message || `Account status is ${res.user.status}`);
        }
      } else {
        setErrorMessage(res.message || 'Google Authentication failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Authentication failed. Please try again.');
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  const handleCompleteGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!googleProfileToComplete) return;

    if (googleIqamaId.trim().length !== 10) {
      setErrorMessage('Iqama ID must be exactly 10 digits.');
      return;
    }
    if (googlePassportNumber.trim().length < 6) {
      setErrorMessage('Please enter a valid Passport Number.');
      return;
    }

    await executeGoogleAuth(googleProfileToComplete.name, googleProfileToComplete.email, {
      iqamaId: googleIqamaId,
      passportNumber: googlePassportNumber,
      phone: googlePhone,
      bankName: googleBankName,
      accountNumber: googleAccountNumber,
      iban: googleIban
    });

    setGoogleProfileToComplete(null);
  };

  // Handle Invited Account Activation & Setup
  const handleActivateInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!activatePassword || activatePassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    if (activatePassword !== activateConfirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    const targetEmail = verifiedInvitation?.email || signupEmail || emailOrSerial;
    if (!targetEmail) {
      setErrorMessage('No valid invitation email address specified.');
      return;
    }

    setIsActivatingInvite(true);
    try {
      const res = await activateInvitationApi({
        token: invitationToken || undefined,
        email: targetEmail,
        name: activateName.trim() || targetEmail.split('@')[0],
        password: activatePassword.trim()
      });

      if (res && res.success && res.user) {
        setSuccessMessage('🎉 Account activated successfully! Logging you in...');
        setTimeout(() => {
          onLogin(res.user);
        }, 500);
      } else {
        setErrorMessage(res.message || 'Failed to activate invited account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to activate invited account. Please try again.');
    } finally {
      setIsActivatingInvite(false);
    }
  };

  // Handle Admin / Staff Login (Single-Tenant Dedicated Direct Login)
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoggingIn(true);

    const cleanInput = emailOrSerial.toLowerCase().trim();
    const cleanPass = password.trim();

    try {
      // 1. Try server endpoint
      const apiRes = await adminLoginApi({
        emailOrSerial: cleanInput,
        password: cleanPass
      });

      if (apiRes && apiRes.success && apiRes.user) {
        onLogin(apiRes.user);
        return;
      } else if (apiRes && apiRes.error) {
        setErrorMessage(apiRes.error);
        setIsLoggingIn(false);
        return;
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please verify your credentials.';
      // If error is an authoritative database/server response, display it directly
      if (!msg.includes('Failed to fetch') && !msg.includes('NetworkError')) {
        setErrorMessage(msg);
        setIsLoggingIn(false);
        return;
      }
      console.warn('[Admin API Login network fallback]:', msg);
    } finally {
      setIsLoggingIn(false);
    }

    // 2. Client-side local lookup fallback (offline only)
    const target = users.find(
      (u) => 
        (u.email.toLowerCase() === cleanInput || 
         u.loginSerial?.toLowerCase() === cleanInput ||
         u.id.toLowerCase() === cleanInput) &&
        u.role !== 'Labor'
    );

    if (!target) {
      const isWorker = users.some(u => 
        (u.email.toLowerCase() === cleanInput || u.loginSerial?.toLowerCase() === cleanInput) &&
        u.role === 'Labor'
      );
      if (isWorker) {
        setErrorMessage('Worker account detected. Please switch to the "Worker Portal Login" tab.');
      } else {
        setErrorMessage('Account not found. Please verify your Email Address or Login Serial.');
      }
      return;
    }

    if (target.loginPassword && target.loginPassword !== cleanPass && !target.loginPassword.startsWith('$2b$10$') && !target.loginPassword.startsWith('$pbkdf2$')) {
      setErrorMessage('Invalid Password. Please check your credentials.');
      return;
    }

    if (target.status === 'Pending') {
      setErrorMessage('⚠️ Account Pending Approval: Your registration request is currently under review by a Super Admin.');
      return;
    }

    if (target.status === 'Inactive' || target.status === 'Suspended') {
      setErrorMessage('🔴 Account Deactivated/Suspended: Please contact HR to reactivate your profile.');
      return;
    }

    onLogin(target);
  };

  // Handle Worker Login (Single-Tenant Dedicated: Serial / Iqama / Email + Password Only, NO COMPANY CODE)
  const handleWorkerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoggingIn(true);

    const cleanInput = emailOrSerial.trim();
    const cleanPass = password.trim();

    if (!cleanInput) {
      setErrorMessage('Please enter your Worker Login Serial ID, Iqama ID, or Email.');
      setIsLoggingIn(false);
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Please enter your Worker Password.');
      setIsLoggingIn(false);
      return;
    }

    try {
      const apiRes = await workerLoginApi({
        serialNumber: cleanInput,
        password: cleanPass
      });

      if (apiRes && apiRes.success && apiRes.user) {
        onLogin(apiRes.user);
        return;
      } else if (apiRes && apiRes.error) {
        setErrorMessage(apiRes.error);
        setIsLoggingIn(false);
        return;
      }
    } catch (apiErr: any) {
      const msg = apiErr.message || 'Worker login failed. Please verify credentials.';
      if (!msg.includes('Failed to fetch') && !msg.includes('NetworkError')) {
        setErrorMessage(msg);
        setIsLoggingIn(false);
        return;
      }
      console.warn('[Worker Login API network fallback]:', msg);
    } finally {
      setIsLoggingIn(false);
    }

    // Client-side local lookup fallback
    const matchingWorkers = users.filter((u) => u.role === 'Labor' || u.role === 'Site Supervisor');
    const target = matchingWorkers.find(
      (u) => 
        (u.loginSerial?.toLowerCase() === cleanInput.toLowerCase() || 
         u.email.toLowerCase() === cleanInput.toLowerCase() ||
         (u.iqamaId && u.iqamaId.toLowerCase() === cleanInput.toLowerCase()) ||
         u.id.toLowerCase() === cleanInput.toLowerCase())
    );

    if (!target) {
      setErrorMessage(`Worker "${cleanInput}" was not found. Please verify your Serial Number or Iqama ID.`);
      return;
    }

    if (target.loginPassword && target.loginPassword !== cleanPass && !target.loginPassword.startsWith('$2b$10$')) {
      setErrorMessage('Incorrect Worker Password. Please verify your password with HR.');
      return;
    }

    if (target.status === 'Inactive' || target.status === 'Suspended') {
      setErrorMessage('🔴 Worker Account Inactive: You are not currently marked active on site roll.');
      return;
    }

    onLogin(target);
  };

  // Handle Forgot Password Request
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!forgotPasswordEmail.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSubmittingReset(true);
    try {
      const res = await requestPasswordResetApi(forgotPasswordEmail.trim());
      if (res.success) {
        setSuccessMessage(res.message || '✉️ Password reset link sent successfully! Please check your inbox.');
        setForgotPasswordEmail('');
      } else {
        setErrorMessage(res.message || 'Failed to request password reset.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request password reset. Please try again.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Handle Reset Password Request
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!newPassword.trim()) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }
    if (!resetPasswordToken) {
      setErrorMessage('Invalid or missing password reset token.');
      return;
    }

    setIsSubmittingReset(true);
    try {
      const res = await resetPasswordApi(resetPasswordToken, newPassword);
      if (res.success) {
        setSuccessMessage('🎉 Password reset successful! Redirecting you to login...');
        setNewPassword('');
        setConfirmNewPassword('');
        setResetPasswordToken(null);
        setTimeout(() => {
          setActiveTab('adminLogin');
        }, 2000);
      } else {
        setErrorMessage(res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Handle Sign Up Registration
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      setErrorMessage('Please complete all required fields (*).');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === signupEmail.toLowerCase().trim())) {
      setErrorMessage('An account with this email address already exists. Please log in.');
      return;
    }

    const hasInvite = Boolean(invitationToken || verifiedInvitation);
    const assignedRole = verifiedInvitation?.role || requestedRole;

    const newUser: User = {
      id: `usr-reg-${Date.now()}`,
      name: name.trim(),
      email: signupEmail.trim(),
      role: assignedRole,
      dailyRate: assignedRole === 'Labor' ? 70.0 : 150.0,
      phone,
      designation: designation || `${assignedRole} (Registered)`,
      joinedDate: new Date().toISOString().split('T')[0],
      avatar: signupAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bankName: bankName || undefined,
      accountNumber: accountNumber || undefined,
      iban: iban || undefined,
      loginSerial: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      loginPassword: signupPassword,
      status: hasInvite ? 'Active' : 'Pending',
      profileCompleted: true
    };

    if (hasInvite) {
      activateInvitationApi({
        token: invitationToken || undefined,
        email: newUser.email,
        name: newUser.name,
        password: signupPassword
      }).then((res) => {
        if (res && res.success && res.user) {
          onLogin(res.user);
        }
      }).catch((err) => {
        console.warn('Invite activation during signup:', err.message);
        onSignUp(newUser);
      });
      return;
    }

    onSignUp(newUser);
    setPendingUserEmail(newUser.email);
    setSuccessMessage(
      `✅ Account registration submitted successfully for ${name}! Your request is now PENDING Super Admin approval.`
    );

    // Reset Form
    setName('');
    setSignupEmail('');
    setPhone('');
    setDesignation('');
    setSignupPassword('');
    setBankName('');
    setAccountNumber('');
    setIban('');
    setSignupAvatar('');
  };

  // Refresh Status Handler for Waiting Screen
  const handleRefreshStatus = async () => {
    if (!pendingUserEmail) return;
    setIsCheckingStatus(true);
    setRefreshMessage('');

    let currentUsersList = users;
    if (onRefreshUsers) {
      try {
        currentUsersList = await onRefreshUsers();
      } catch (e: any) {
        console.warn("Failed to refresh users via API:", e.message);
      }
    }

    setIsCheckingStatus(false);
    const u = currentUsersList.find((x) => x.email.toLowerCase() === pendingUserEmail.toLowerCase());
    if (u) {
      if (u.status === 'Active') {
        setRefreshMessage('🎉 Your account has been approved! Logging you in...');
        setTimeout(() => {
          onLogin(u);
        }, 800);
      } else if (u.status === 'Rejected') {
        setRefreshMessage('❌ Your account request was declined by the administrator.');
      } else {
        setRefreshMessage('Status refreshed. Still pending approval.');
      }
    } else {
      setRefreshMessage('Status refreshed. Still pending approval.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Subtle Gradient Lights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 space-y-6 relative z-10">
        
        {/* Top Language Toggle in Auth Card */}
        {onLanguageChange && (
          <div className="flex justify-end -mt-2 -mr-2 mb-1">
            <button
              type="button"
              onClick={() => onLanguageChange(lang === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ar' ? '🇺🇸 English' : '🇸🇦 العربية'}</span>
            </button>
          </div>
        )}

        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center mx-auto shadow-xl border-2 border-amber-500/40">
            <img 
              src="/lms_by_umar_icon.jpg" 
              alt="LMS by Umar Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.jpg';
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>{t('appName', 'LMS')}</span>
              <span className="text-amber-400 text-xs font-semibold px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                by Umar
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {t('appSubTitle', 'Labor, Attendance & Payroll Management System')}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-full text-[11px] text-slate-300 font-semibold shadow-inner">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Al-Bawani Contracting Co. • Workforce Portal</span>
          </div>
        </div>

        {/* Pending Approval Waiting Screen or Normal Tabs & Forms */}
        {pendingUserEmail ? (
          <div className="space-y-6 py-4 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-500/50 rounded-3xl flex items-center justify-center mx-auto text-amber-400 shadow-xl">
              <Clock className="w-10 h-10 animate-spin-slow" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-extrabold uppercase tracking-wider">
                Waiting For Admin Approval
              </span>
              <h2 className="text-xl font-black text-white">Registration Submitted Successfully!</h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Your account (<span className="text-amber-300 font-bold">{pendingUserEmail}</span>) has been registered and is currently pending review by a Super Administrator.
              </p>
            </div>

            {refreshMessage && (
              <div className="p-3 bg-indigo-950/80 border border-indigo-700/60 rounded-xl text-xs font-bold text-indigo-200">
                {refreshMessage}
              </div>
            )}

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 text-left text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Registered Email:</span>
                <span className="text-white font-mono font-bold">{pendingUserEmail}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Approval Status:</span>
                <span className="text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 animate-pulse">PENDING REVIEW</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleRefreshStatus}
                disabled={isCheckingStatus}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                <span>{isCheckingStatus ? 'Checking Database Status...' : 'Refresh Status & Check Approval'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingUserEmail(null);
                  setActiveTab('adminLogin');
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Return to Login Portal
              </button>
            </div>
          </div>
        ) : googleProfileToComplete ? (
          <div className="space-y-5 py-2 text-left animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center space-y-1">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1">
                <img src="https://www.google.com/favicon.ico" alt="Google Logo" className="w-3 h-3" />
                Google Connected
              </span>
              <h2 className="text-lg font-black text-white">Complete Your Labor Profile</h2>
              <p className="text-xs text-slate-400">
                Please provide your official residency and travel document details to complete your registration in LMS.
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Google Name:</span>
                <span className="text-white font-bold">{googleProfileToComplete.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Google Email:</span>
                <span className="text-white font-mono font-bold">{googleProfileToComplete.email}</span>
              </div>
            </div>

            <form onSubmit={handleCompleteGoogleProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Iqama ID *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. 2100984712"
                    value={googleIqamaId}
                    onChange={(e) => setGoogleIqamaId(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">10-digit Saudi Civil / Residency ID</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Passport Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. N1029384"
                    value={googlePassportNumber}
                    onChange={(e) => setGooglePassportNumber(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium font-mono"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Official passport serial number</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +966 50 123 4567"
                  value={googlePhone}
                  onChange={(e) => setGooglePhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Bank Account Details */}
              <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-2.5">
                <span className="text-xs font-bold text-indigo-400 block flex items-center gap-1.5">
                  🏦 Bank Account Details (Optional)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      placeholder="Al Rajhi"
                      value={googleBankName}
                      onChange={(e) => setGoogleBankName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Account No.</label>
                    <input
                      type="text"
                      placeholder="102938475"
                      value={googleAccountNumber}
                      onChange={(e) => setGoogleAccountNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Saudi IBAN</label>
                    <input
                      type="text"
                      placeholder="SA..."
                      value={googleIban}
                      onChange={(e) => setGoogleIban(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-950/90 border border-rose-800 text-rose-200 rounded-2xl text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setGoogleProfileToComplete(null)}
                  className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Submit Profile
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Clean Tab Selector: Admin Login | Worker Login | Sign Up (or Activate Invite) */}
            {activeTab !== 'forgotPassword' && activeTab !== 'resetPassword' && (
              <div className={`grid ${verifiedInvitation ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold`}>
                <button
                  id="tab-btn-admin-login"
                  type="button"
                  onClick={() => {
                    setActiveTab('adminLogin');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'adminLogin'
                      ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-200" /> Admin / Staff
                </button>

                <button
                  id="tab-btn-worker-login"
                  type="button"
                  onClick={() => {
                    setActiveTab('workerLogin');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'workerLogin'
                      ? 'bg-amber-600 text-white shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <HardHat className="w-4 h-4 text-amber-200" /> Worker Portal
                </button>

                <button
                  id="tab-btn-signup"
                  type="button"
                  onClick={() => {
                    setActiveTab('signUp');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'signUp'
                      ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4 text-emerald-200" /> Sign Up
                </button>

                {verifiedInvitation && (
                  <button
                    id="tab-btn-activate-invite"
                    type="button"
                    onClick={() => {
                      setActiveTab('activateInvite');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'activateInvite'
                        ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                        : 'text-amber-400 hover:text-amber-300 hover:bg-slate-900'
                    }`}
                  >
                    <BadgeCheck className="w-4 h-4 text-amber-300" /> Invitation
                  </button>
                )}
              </div>
            )}

            {/* Status Alerts */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/90 border border-rose-800 text-rose-200 rounded-2xl text-xs flex items-start gap-2.5 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-950/90 border border-emerald-800 text-emerald-200 rounded-2xl text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">{successMessage}</div>
              </div>
            )}

            {/* Tab 1: Admin & Staff Login */}
            {activeTab === 'adminLogin' && (
              <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Email Address or Admin Login Serial</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      id="input-admin-email"
                      type="text"
                      required
                      placeholder="e.g. unitedrpower@gmail.com or hr@lms.com"
                      value={emailOrSerial}
                      onChange={(e) => setEmailOrSerial(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      id="input-admin-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                  <div className="text-right mt-1.5">
                    <button
                      type="button"
                      id="btn-forgot-password-link"
                      onClick={() => {
                        setActiveTab('forgotPassword');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition-all cursor-pointer hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-submit-admin-login"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" /> {isLoggingIn ? 'Authenticating...' : 'Log In as Admin / Staff'}
                </button>

                {/* Google Sign In option */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleProcessing}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google Logo" className="w-3.5 h-3.5" />
                    <span>{isGoogleProcessing ? 'Connecting Google...' : 'Sign in with Google Account'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Worker Login (Dedicated Single-Tenant: NO Company Code Input!) */}
            {activeTab === 'workerLogin' && (
              <form onSubmit={handleWorkerLoginSubmit} className="space-y-4 text-xs">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-amber-200">
                    <HardHat className="w-4 h-4 text-amber-400" />
                    <span>Worker Attendance & Pay Slip Portal</span>
                  </div>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Log in directly using your Worker Serial ID (or Iqama ID) and Password to view your attendance history, salary slips, and submit site requests.
                  </p>
                </div>

                {/* Input 1: Worker Serial / Email / Iqama */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-300">Worker Serial ID / Iqama ID / Email *</label>
                    <span className="text-[10px] text-slate-500 font-mono">e.g. EMP-101 or 2481029381</span>
                  </div>
                  <div className="relative">
                    <HardHat className="w-4 h-4 absolute left-3 top-3 text-amber-500" />
                    <input
                      id="worker-input-serial"
                      type="text"
                      required
                      placeholder="e.g. EMP-101 or 2481029381"
                      value={emailOrSerial}
                      onChange={(e) => setEmailOrSerial(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-white uppercase font-mono placeholder-slate-600 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                {/* Input 2: Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-300">Worker Password *</label>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      id="worker-input-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-submit-worker-login"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <HardHat className="w-4 h-4" /> {isLoggingIn ? 'Verifying...' : 'Access My Worker Portal'}
                </button>
              </form>
            )}

            {/* Tab: Activate Invited Account & Setup Password */}
            {activeTab === 'activateInvite' && (
              <form onSubmit={handleActivateInviteSubmit} className="space-y-4 text-xs">
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-extrabold text-indigo-200">
                    <BadgeCheck className="w-4 h-4 text-indigo-400" />
                    <span>Official Role Invitation Verified</span>
                  </div>
                  <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                    You have been invited to join <strong className="text-white">{invitationCompanyName || 'Al-Bawani Contracting Co.'}</strong> as <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-200 rounded font-bold">{verifiedInvitation?.role || requestedRole}</span>. Complete your profile and configure your password to activate your access.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Invited Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="email"
                      disabled
                      value={verifiedInvitation?.email || signupEmail || emailOrSerial}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-300 font-mono opacity-80 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Your Full Name *</label>
                  <div className="relative">
                    <UserPlus className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Khalid Al-Mansoor"
                      value={activateName}
                      onChange={(e) => setActivateName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Configure Secure Password *</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={activatePassword}
                      onChange={(e) => setActivatePassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Minimum 4 characters</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Confirm Secure Password *</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={activateConfirmPassword}
                      onChange={(e) => setActivateConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isActivatingInvite}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> {isActivatingInvite ? 'Activating Account...' : `Activate ${verifiedInvitation?.role || 'Staff'} Account & Sign In`}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('adminLogin');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-[11px] text-slate-400 hover:text-white font-medium cursor-pointer"
                  >
                    Already configured your password? Log In
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Sign Up / Register */}
            {activeTab === 'signUp' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-4 text-xs">
                <div className="p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-1.5">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">
                    Staff & Worker Account Registration
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Submit your details to join Al-Bawani Contracting workforce. Your profile will be activated immediately upon Super Admin review.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mohammed Al-Otaibi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. m.otaibi@albawani.sa"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Requested Role *</label>
                    <select
                      value={requestedRole}
                      onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="Labor">Labor Worker</option>
                      <option value="Site Supervisor">Site Supervisor</option>
                      <option value="HR Admin">HR Admin</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. +966 50 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> Submit Registration Request
                </button>
              </form>
            )}

            {/* Forgot Password Screen */}
            {activeTab === 'forgotPassword' && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-xs">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-extrabold text-white">Reset Account Password</h3>
                  <p className="text-xs text-slate-400">
                    Enter your registered email address and we will dispatch a secure reset link.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. admin@lms.com"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" /> {isSubmittingReset ? 'Dispatching Reset Link...' : 'Send Password Reset Email'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('adminLogin');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
                  >
                    ← Return to Login
                  </button>
                </div>
              </form>
            )}

            {/* Reset Password Screen */}
            {activeTab === 'resetPassword' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-extrabold text-white">Set New Password</h3>
                  <p className="text-xs text-slate-400">
                    Choose a strong password to secure your account.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" /> {isSubmittingReset ? 'Updating Password...' : 'Update Password & Sign In'}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* Footer Branding */}
      <footer className="mt-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} LMS by Umar • Dedicated Single-Tenant Workforce Platform</p>
      </footer>
    </div>
  );
};
