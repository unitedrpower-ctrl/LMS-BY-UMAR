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
  Briefcase,
  ShieldAlert,
  ArrowRight,
  Upload,
  RefreshCw,
  X,
  Crown,
  Sparkles,
  Building2,
  Globe
} from 'lucide-react';
import { validateInvitationApi, googleAuthApi, requestMasterOtpApi, verifyMasterOtpApi, registerUserApi, requestPasswordResetApi, resetPasswordApi, workerLoginApi } from '../../lib/api';

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

  const isMasterRoute = window.location.pathname.includes('/master-login') || 
                        window.location.pathname.includes('/master') ||
                        window.location.search.includes('master=true') || 
                        window.location.search.includes('owner=true');

  const isAdminRoute = window.location.pathname.includes('/login/admin') ||
                       window.location.pathname.includes('/admin-login') ||
                       window.location.search.includes('admin=true');

  const isClientRoute = window.location.pathname.includes('/client-login') || 
                        window.location.pathname.includes('/client') ||
                        window.location.search.includes('client=true');

  const isWorkerRoute = (window.location.pathname.includes('/login/worker') || 
                        window.location.pathname.includes('/worker-login') ||
                        isClientRoute) && !isAdminRoute;

  const [activeTab, setActiveTab] = useState<'adminLogin' | 'workerLogin' | 'signUp' | 'masterOtp' | 'forgotPassword' | 'resetPassword'>(
    isWorkerRoute ? 'workerLogin' : 'adminLogin'
  );

  // Form States
  const [emailOrSerial, setEmailOrSerial] = useState('');
  const [password, setPassword] = useState('');
  const [workerCompanyCode, setWorkerCompanyCode] = useState('');
  
  // Password Reset States
  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(null);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  
  // Master Owner OTP States
  const [otpEmail, setOtpEmail] = useState('umarchoudhary259@gmail.com');
  const [otpCode, setOtpCode] = useState('');
  const [activeOtpSent, setActiveOtpSent] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  // Sign up fields
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('HR Admin');
  const [signupPassword, setSignupPassword] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [signupAvatar, setSignupAvatar] = useState('');

  // Status Feedback & Pending Approval View
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string>('');

  // Role Invitation Token State
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<RoleInvitation | null>(null);
  const [isClientInviteFlow, setIsClientInviteFlow] = useState<boolean>(false);

  // Google Authentication & Profile Completion Workflow
  const [googleProfileToComplete, setGoogleProfileToComplete] = useState<{ name: string; email: string } | null>(null);
  const [googleIqamaId, setGoogleIqamaId] = useState('');
  const [googlePassportNumber, setGooglePassportNumber] = useState('');
  const [googlePhone, setGooglePhone] = useState('');
  const [googleBankName, setGoogleBankName] = useState('');
  const [googleAccountNumber, setGoogleAccountNumber] = useState('');
  const [googleIban, setGoogleIban] = useState('');
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tok = params.get('inviteToken') || params.get('token');
    const resetTok = params.get('resetToken');
    const compParam = params.get('companyCode') || params.get('code') || params.get('company') || params.get('companyId') || params.get('companyToken') || params.get('company_id') || params.get('tenantId');
    const isRegisterPath = window.location.pathname.startsWith('/register') || window.location.pathname.startsWith('/accept-invite');
    
    if (compParam) {
      setWorkerCompanyCode(compParam.toUpperCase());
    }

    if (resetTok) {
      setResetPasswordToken(resetTok);
      setActiveTab('resetPassword');
      setSuccessMessage('🔑 Secure Password Reset Code detected. Please specify your new strong password below.');
    } else if (tok || isRegisterPath) {
      setIsClientInviteFlow(true);
    }

    if (tok) {
      setInviteToken(tok);
      validateInvitationApi(tok, compParam || undefined)
        .then(res => {
          if (res.valid && res.invitation) {
            setInvitationData(res.invitation);
            if (res.initialPassword) {
              setSignupPassword(res.initialPassword);
            }
            setSuccessMessage(`🌟 Official Role Invitation Verified! Invited for email "${res.invitation.email}" as ${res.invitation.role}. Please complete the form below to claim!`);
          } else {
            setErrorMessage(`Invitation Error: ${res.error || 'Invalid or expired invitation link'}`);
          }
        })
        .catch(err => {
          setErrorMessage(`Invitation Error: ${err.message || 'Invalid or expired invitation link'}`);
        });
    }
  }, []);

  // Central Google Auth Execution Handler (Calls Real Backend API)
  const executeGoogleAuth = async (googleName: string, googleEmail: string, extraData?: {
    iqamaId?: string;
    passportNumber?: string;
    phone?: string;
    bankName?: string;
    accountNumber?: string;
    iban?: string;
  }) => {
    setIsGoogleProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        name: googleName,
        email: googleEmail,
        inviteToken: inviteToken || undefined,
        iqamaId: extraData?.iqamaId || googleIqamaId,
        passportNumber: extraData?.passportNumber || googlePassportNumber,
        phone: extraData?.phone || googlePhone,
        bankName: extraData?.bankName || googleBankName,
        accountNumber: extraData?.accountNumber || googleAccountNumber,
        iban: extraData?.iban || googleIban
      };

      const res = await googleAuthApi(payload);

      if (res.userNeededDetails) {
        // Needs Iqama ID & Passport
        setGoogleProfileToComplete({ name: googleName, email: googleEmail });
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

  // Master Owner Email OTP Handlers
  const handleRequestMasterOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSendingOtp(true);

    try {
      const res = await requestMasterOtpApi(otpEmail.trim());
      if (res.success) {
        setActiveOtpSent(true);
        setOtpCode(''); // Strict: No pre-fill, empty for manual check/type-in
        setSuccessMessage(`Verification OTP code has been sent to your email address ${otpEmail.trim()}. Please check your Inbox/Spam.`);
      } else {
        setErrorMessage(res.message || 'Failed to send OTP code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch Master Owner OTP code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyMasterOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsVerifyingOtp(true);

    try {
      console.log(`[Master OTP Verification] Verifying code for ${otpEmail.trim()}`);
      const res = await verifyMasterOtpApi(otpEmail.trim(), otpCode.trim());
      
      if (res.success && res.user) {
        console.log('OTP Success! Redirecting to Master Dashboard...', res.user);
        
        // 1. Immediately store Auth Token & Session State in localStorage
        const authToken = `master-jwt-token-${res.user.id}-${Date.now()}`;
        localStorage.setItem('lms_auth_token', authToken);
        localStorage.setItem('lms_current_user_id', res.user.id);
        localStorage.setItem('lms_user_role', 'Owner');
        localStorage.setItem('lms_user_email', res.user.email);
        localStorage.setItem('labor_admin_current_user_id_v1', JSON.stringify(res.user.id));
        
        setSuccessMessage('👑 OTP Verification Successful! Redirecting to Master Owner Dashboard...');
        
        // 2. Prepare user object with role = 'Owner'
        const masterUser: User = {
          ...res.user,
          role: 'Owner',
          companyId: 'comp-owner',
          status: 'Active',
          profileCompleted: true
        };

        // 3. Trigger global auth login handler
        onLogin(masterUser);

        // 4. Update window hash for router direct navigation
        if (window.location.hash !== '#saas_owner') {
          window.location.hash = '#saas_owner';
        }
      } else {
        setErrorMessage(res.message || 'Invalid 6-digit OTP code.');
      }
    } catch (err: any) {
      console.error("[Master OTP Error]", err);
      setErrorMessage(err.message || 'OTP verification failed. Please check the code and try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Admin / Staff Login
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const params = new URLSearchParams(window.location.search);
    const companyTokenParam = params.get('companyToken') || params.get('company_id') || params.get('companyId') || params.get('tenantId') || params.get('company');

    const cleanInput = emailOrSerial.toLowerCase().trim();
    const isMasterOwnerEmail = (email?: string) => email && ['umarchoudhary259@gmail.com', 'umarchaudhary259@gmail.com', 'unitedrpower@gmail.com'].includes(email.trim().toLowerCase());

    const target = users.find(
      (u) => 
        (u.email.toLowerCase() === cleanInput || 
         u.loginSerial?.toLowerCase() === cleanInput)
    );

    if (!target) {
      setErrorMessage(
        companyTokenParam
          ? `Admin account "${emailOrSerial}" was not found under company portal "${companyTokenParam}". Please verify credentials.`
          : 'Account not found. Please verify your Email Address or Serial Number.'
      );
      return;
    }

    // Strict Company Scope Check (bypass for master platform owner)
    if (companyTokenParam && companyTokenParam !== 'all' && !isMasterOwnerEmail(target.email) && target.role !== 'Owner') {
      const isMatchingCompany = 
        target.companyId === companyTokenParam ||
        (target.companyId && target.companyId.toLowerCase() === companyTokenParam.toLowerCase()) ||
        (target.companyId && target.companyId.replace('comp-', '') === companyTokenParam.replace('comp-', ''));

      if (!isMatchingCompany) {
        setErrorMessage(
          `🔴 Access Denied: Admin account "${emailOrSerial}" belongs to workspace "${target.companyId || 'Default'}" and cannot log in to company portal "${companyTokenParam}". Please use your company's dedicated login URL.`
        );
        return;
      }
    }

    if (target.loginPassword && target.loginPassword !== password && !target.loginPassword.startsWith('$2b$10$')) {
      setErrorMessage('Invalid Password. Please check your credentials.');
      return;
    }

    // Check Approval Status
    if (target.status === 'Pending') {
      setErrorMessage(
        '⚠️ Account Pending Approval: Your registration request is currently under review by a Super Admin. You will gain access once approved.'
      );
      return;
    }

    if (target.status === 'Rejected') {
      setErrorMessage('❌ Your account registration request has been declined by an administrator.');
      return;
    }

    if (target.status === 'Inactive' || target.status === 'Suspended') {
      setErrorMessage('🔴 Account Deactivated/Suspended: Please contact HR or Super Admin to reactivate your profile.');
      return;
    }

    const loggedInAdmin: User = {
      ...target,
      companyId: target.companyId || companyTokenParam || 'comp-001'
    };

    onLogin(loggedInAdmin);
  };

  // Handle Worker Login (Unique Company Code Authentication Engine)
  const handleWorkerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanCompanyCode = workerCompanyCode.trim().toUpperCase();
    const cleanInput = emailOrSerial.trim();
    const cleanPass = password.trim();

    if (!cleanCompanyCode) {
      setErrorMessage('Please enter your Organization / Company Code (e.g. BAW-001 or ZCON-005).');
      return;
    }

    if (!cleanInput) {
      setErrorMessage('Please enter your Worker Login Serial ID, Iqama ID, or Email.');
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Please enter your Worker Password.');
      return;
    }

    try {
      const apiRes = await workerLoginApi({
        companyCode: cleanCompanyCode,
        serialNumber: cleanInput,
        password: cleanPass
      });

      if (apiRes.success && apiRes.user) {
        onLogin(apiRes.user);
        return;
      } else if (apiRes.error) {
        setErrorMessage(apiRes.error);
        return;
      }
    } catch (apiErr: any) {
      console.warn('[Worker Login API]:', apiErr.message);
      setErrorMessage(apiErr.message || 'Worker login failed. Please verify your 3 credentials.');
      return;
    }

    // Client-side fallback if backend API is unreachable
    let matchingWorkers = users.filter((u) => u.role === 'Labor' || u.role === 'Site Supervisor');
    const target = matchingWorkers.find(
      (u) => 
        (u.loginSerial?.toLowerCase() === cleanInput.toLowerCase() || 
         u.email.toLowerCase() === cleanInput.toLowerCase() ||
         (u.iqamaId && u.iqamaId.toLowerCase() === cleanInput.toLowerCase()) ||
         u.id.toLowerCase() === cleanInput.toLowerCase())
    );

    if (!target) {
      setErrorMessage(`Worker "${cleanInput}" was not found under company "${cleanCompanyCode}". Please check your credentials.`);
      return;
    }

    if (target.loginPassword && target.loginPassword !== cleanPass && !target.loginPassword.startsWith('$2b$10$')) {
      setErrorMessage('Incorrect Worker Password. Please verify password with HR.');
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
        setSuccessMessage('🎉 Password reset successful! Redirecting you to your company login portal...');
        setNewPassword('');
        setConfirmNewPassword('');
        setResetPasswordToken(null);
        setTimeout(() => {
          const companyParam = res.companyId ? `?company=${res.companyId}` : '';
          if (res.role === 'Labor') {
            window.location.href = `/login/worker${companyParam}`;
          } else if (res.role === 'Owner') {
            window.location.href = `/master-login`;
          } else {
            window.location.href = `/login/admin${companyParam}`;
          }
        }, 3000);
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
      setErrorMessage('An account with this email address already exists.');
      return;
    }

    const newUser: User = {
      id: `usr-reg-${Date.now()}`,
      name: name.trim(),
      email: signupEmail.trim(),
      role: requestedRole,
      dailyRate: requestedRole === 'Labor' ? 60.0 : 150.0,
      phone,
      designation: designation || `${requestedRole} (Pending Registration)`,
      joinedDate: new Date().toISOString().split('T')[0],
      avatar: signupAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bankName: bankName || undefined,
      accountNumber: accountNumber || undefined,
      iban: iban || undefined,
      loginSerial: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
      loginPassword: signupPassword,
      status: 'Pending'
    };

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

  // Handle Client Workspace Active Registration from Invitation
  const handleInviteRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim() || !signupPassword.trim()) {
      setErrorMessage('Please complete all required fields (*).');
      return;
    }

    const regEmail = invitationData ? invitationData.email : signupEmail.trim();
    const regRole = invitationData ? invitationData.role : 'Super Admin';
    const regCompanyId = invitationData ? invitationData.companyId : 'comp-001';

    if (!regEmail) {
      setErrorMessage('No email address is associated with this workspace activation flow.');
      return;
    }

    const newUser: User = {
      id: `usr-reg-${Date.now()}`,
      name: name.trim(),
      email: regEmail,
      role: regRole,
      dailyRate: regRole === 'Labor' ? 60.0 : 150.0,
      phone,
      iqamaId: googleIqamaId || undefined,
      passportNumber: googlePassportNumber || undefined,
      designation: designation || `${regRole} (Active Tenant Workspace)`,
      joinedDate: new Date().toISOString().split('T')[0],
      avatar: signupAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bankName: bankName || undefined,
      accountNumber: accountNumber || undefined,
      iban: iban || undefined,
      loginSerial: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
      loginPassword: signupPassword,
      status: 'Active', // Pre-approved via invitation!
      companyId: regCompanyId,
      profileCompleted: true
    };

    try {
      const res = await registerUserApi(newUser, inviteToken || undefined);
      if (res && (res.success || res.id)) {
        const returnedUser = res.user || newUser;
        setSuccessMessage(`🎉 Activation Successful! Logged in as ${regRole} for company workspace ${regCompanyId}.`);
        setTimeout(() => {
          onLogin(returnedUser);
        }, 1200);
      } else {
        onSignUp(newUser);
        setSuccessMessage(`🎉 Workspace registration request submitted successfully!`);
        setTimeout(() => {
          onLogin(newUser);
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Workspace registration failed. Please try again.');
    }
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

  // Quick Demo Shortcut
  const handleQuickDemo = (userId: string) => {
    const demoUser = users.find((u) => u.id === userId);
    if (demoUser) {
      onLogin(demoUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Subtle Gradient Lights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 space-y-6 relative z-10">
        
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

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-950/80 border border-indigo-800/60 rounded-full text-[11px] text-indigo-300 font-semibold shadow-inner">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('roleSuperAdmin', 'Global Authentication Guard Active')}</span>
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
                Please provide your official residency and travel document details to complete your registration in LMS by Umar.
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
                  Cancel Connect
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Submit Profile & Request Approval
                </button>
              </div>
            </form>
          </div>
        ) : (
          isClientInviteFlow ? (
            <div className="space-y-5 py-2 text-left animate-in fade-in zoom-in duration-300">
              <div className="text-center space-y-1">
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Client Workspace Registration
                </span>
                <h2 className="text-xl font-black text-white">Activate Your LMS Tenant Workspace</h2>
                <p className="text-xs text-slate-400">
                  Register below to claim and activate your isolated company workspace.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-950/90 border border-rose-800 text-rose-200 rounded-2xl text-xs flex items-start gap-2.5">
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

              {invitationData ? (
                <div className="p-4 bg-slate-950 border border-indigo-500/20 rounded-2xl space-y-3 text-xs shadow-inner">
                  <h3 className="text-indigo-400 font-extrabold text-xs border-b border-slate-900 pb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                    Verified Invitation Workspace Details
                  </h3>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    <div className="text-slate-400">Company Tenant ID:</div>
                    <div className="text-white font-extrabold text-right">{invitationData.companyId}</div>

                    <div className="text-slate-400">Assigned Role:</div>
                    <div className="text-indigo-300 font-extrabold text-right bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 inline-block justify-self-end">{invitationData.role}</div>

                    <div className="text-slate-400">Authorized Email:</div>
                    <div className="text-white font-mono font-bold text-right text-[11px] truncate">{invitationData.email}</div>

                    <div className="text-slate-400">Invited By:</div>
                    <div className="text-slate-300 text-right">{invitationData.invitedBy}</div>

                    <div className="text-slate-400">Valid Until:</div>
                    <div className="text-rose-400 font-bold text-right">{invitationData.expiresAt}</div>
                  </div>
                </div>
              ) : !errorMessage ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2.5 text-xs">
                  <Clock className="w-6 h-6 text-indigo-400 animate-spin mx-auto animate-duration-1000" />
                  <div className="text-slate-400">Verifying security token and client credentials...</div>
                </div>
              ) : null}

              <form onSubmit={handleInviteRegisterSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1 font-sans">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    disabled={!invitationData}
                    placeholder="Mohammed Al-Otaibi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Invited Email Address (Read-only)</label>
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={invitationData ? invitationData.email : ''}
                    placeholder={errorMessage ? "Verification failed" : "Verifying email..."}
                    className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2.5 text-slate-400 font-mono focus:outline-none font-bold disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Confirm Initial Password *</label>
                  <input
                    type="password"
                    required
                    disabled={!invitationData}
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Iqama / Residency ID (Optional)</label>
                    <input
                      type="text"
                      maxLength={10}
                      disabled={!invitationData}
                      placeholder="e.g. 2100984712"
                      value={googleIqamaId}
                      onChange={(e) => setGoogleIqamaId(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Passport Number (Optional)</label>
                    <input
                      type="text"
                      disabled={!invitationData}
                      placeholder="e.g. N1029384"
                      value={googlePassportNumber}
                      onChange={(e) => setGooglePassportNumber(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    disabled={!invitationData}
                    placeholder="e.g. +966 50 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <button
                  type="submit"
                  id="btn-submit-invite-register"
                  disabled={!invitationData}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" /> Activate & Sign In
                </button>

                <div className="pt-2 border-t border-slate-800 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsClientInviteFlow(false)}
                    className="text-slate-500 hover:text-slate-300 font-bold transition-colors"
                  >
                    Return to Main Portal Login
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Tab Selector Switcher */}
              {activeTab !== 'forgotPassword' && activeTab !== 'resetPassword' && (
                <div className={`grid ${isMasterRoute ? 'grid-cols-4' : 'grid-cols-3'} gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold`}>

                  {isMasterRoute && (
                    <button
                      id="tab-btn-master-otp"
                      onClick={() => {
                        setActiveTab('masterOtp');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        activeTab === 'masterOtp'
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-md font-black'
                          : 'text-amber-400 hover:text-amber-200 hover:bg-slate-900'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-200" /> Owner OTP
                    </button>
                  )}

                  <button
                    id="tab-btn-admin-login"
                    onClick={() => {
                      setActiveTab('adminLogin');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'adminLogin'
                        ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-200" /> Admin
                  </button>

                  <button
                    id="tab-btn-worker-login"
                    onClick={() => {
                      setActiveTab('workerLogin');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'workerLogin'
                        ? 'bg-amber-600 text-white shadow-md font-extrabold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <HardHat className="w-3.5 h-3.5 text-amber-200" /> Worker
                  </button>

                  <button
                    id="tab-btn-signup"
                    onClick={() => {
                      setActiveTab('signUp');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'signUp'
                        ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-200" /> Sign Up
                  </button>
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
          </>
        ) )}

        {/* Tab Forms Wrapper for non-invite flow */}
        {!isClientInviteFlow && (
          <>
            {/* Tab 0: Master Owner Email OTP Login */}
            {activeTab === 'masterOtp' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gradient-to-r from-amber-950/80 to-slate-950 border border-amber-500/50 rounded-2xl text-amber-200 flex items-start gap-2.5">
              <Crown className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white text-xs font-extrabold">Master Owner Emergency OTP Access</strong>
                <p className="text-[11px] text-amber-300/90 leading-relaxed mt-0.5">
                  Bypasses approval queues or password conflicts. Dispatches a 6-digit OTP to <code className="bg-black/50 px-1 py-0.5 rounded font-mono text-amber-200">umarchoudhary259@gmail.com</code>.
                </p>
              </div>
            </div>

            <form onSubmit={handleRequestMasterOtp} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Master Owner Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-amber-500" />
                  <input
                    type="email"
                    required
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="umarchoudhary259@gmail.com"
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-400 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-request-master-otp"
                disabled={isSendingOtp}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Sending 6-Digit OTP...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" /> Send OTP Code
                  </>
                )}
              </button>
            </form>

            {/* OTP Code Entry Form */}
            {activeOtpSent && (
              <form onSubmit={handleVerifyMasterOtp} className="space-y-3 pt-3 border-t border-slate-800 animate-in fade-in duration-300">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-amber-300">Enter Received 6-Digit OTP Code</label>
                    <span className="text-[10px] text-amber-400/80 font-mono">Valid for 10 min</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-amber-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 859102"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full bg-slate-950 border-2 border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-white font-mono text-base tracking-widest placeholder-slate-700 focus:outline-none focus:border-amber-400 font-black text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-verify-master-otp"
                  disabled={isVerifyingOtp}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> Verifying Code...
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 text-slate-950" /> Verify OTP & Access Master Dashboard
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        )}

        {/* Tab 1: Admin & Staff Login */}
        {activeTab === 'adminLogin' && (
          <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs">
            {(() => {
              const params = new URLSearchParams(window.location.search);
              const compToken = params.get('companyToken') || params.get('company_id') || params.get('companyId') || params.get('tenantId') || params.get('company');
              if (!compToken) return null;
              return (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-300 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Dedicated Company Admin Portal: <strong className="text-white font-mono">{compToken}</strong></span>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded uppercase font-mono">
                    Scoped
                  </span>
                </div>
              );
            })()}

            <div>
              <label className="block font-bold text-slate-300 mb-1">Email Address or Admin Login Serial</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="admin@laborcorp.com or ADMIN-001"
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
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" /> Log In as Admin / Staff
            </button>

          </form>
        )}

        {/* Tab 2: Worker Login */}
        {activeTab === 'workerLogin' && (
          <form onSubmit={handleWorkerLoginSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-extrabold text-amber-200">
                  <HardHat className="w-4 h-4 text-amber-400" />
                  <span>3-Factor Worker Authentication</span>
                </div>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded uppercase font-mono">
                  Multi-Tenant Scoped
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Provide your unique 3 credentials: Organization Code, Worker Serial ID, and Access Password.
              </p>
            </div>

            {/* Input 1: Company Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-300">1. Company / Organization Code *</label>
                <span className="text-[10px] text-slate-500 font-mono">e.g. BAW-001 or ZCON-005</span>
              </div>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-amber-500" />
                <input
                  id="worker-input-company-code"
                  type="text"
                  required
                  placeholder="e.g. BAW-001, ZCON-005, MBN-001"
                  value={workerCompanyCode}
                  onChange={(e) => setWorkerCompanyCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-white uppercase font-mono tracking-wider placeholder-slate-600 focus:outline-none font-extrabold"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-500">Quick select:</span>
                {[
                  { label: 'BAW-001 (Bawabat)', code: 'BAW-001' },
                  { label: 'ZCON-005 (Z Constr)', code: 'ZCON-005' },
                  { label: 'MBN-001 (MBN)', code: 'MBN-001' },
                  { label: 'SCON-002 (Saudi Con)', code: 'SCON-002' },
                  { label: 'ALR-003 (Al-Rashid)', code: 'ALR-003' },
                ].map(item => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setWorkerCompanyCode(item.code)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      workerCompanyCode === item.code
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {item.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Input 2: Worker Serial / Email / Iqama */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-300">2. Worker Login ID / Serial / Email *</label>
                <span className="text-[10px] text-slate-500 font-mono">e.g. LMS-001-001 or EMP-1001</span>
              </div>
              <div className="relative">
                <HardHat className="w-4 h-4 absolute left-3 top-3 text-amber-500" />
                <input
                  id="worker-input-serial"
                  type="text"
                  required
                  placeholder="e.g. LMS-001-001, EMP-1001, or 2100984712"
                  value={emailOrSerial}
                  onChange={(e) => setEmailOrSerial(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-white uppercase font-mono placeholder-slate-600 focus:outline-none font-bold"
                />
              </div>
            </div>

            {/* Input 3: Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-300">3. Worker Password *</label>
                <span className="text-[10px] text-slate-500 font-mono">Default: 123</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  id="worker-input-password"
                  type="password"
                  required
                  placeholder="Enter worker password (e.g. 123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-worker-login"
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <HardHat className="w-4 h-4" /> Authenticate & Access Worker Portal
            </button>

          </form>
        )}

        {/* Tab 3: Sign Up / Register */}
        {activeTab === 'signUp' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-2">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">
                Simplified Quick Registration
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Enter your basic details or click <strong className="text-white">Sign Up with Google</strong>. Once approved by a Super Admin, you will complete remaining profile details upon first login.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="Mohammed Al-Otaibi"
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
                placeholder="m.otaibi@company.sa"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Create Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <button
              type="submit"
              id="btn-submit-signup"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Submit Registration (Pending Approval)
            </button>

          </form>
        )}

        {/* Tab: Forgot Password Form */}
        {activeTab === 'forgotPassword' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-white">Reset Workspace Password</h3>
              <p className="text-[11px] text-slate-400">
                Enter your registered workspace email. We will send a secure, time-limited reset link via SMTP.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="admin@yourcompany.com"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingReset}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer animate-in fade-in"
            >
              {isSubmittingReset ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Send Password Reset Link
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-800 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('adminLogin');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-[11px] text-slate-400 hover:text-white transition-all font-bold uppercase tracking-wider cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}

        {/* Tab: Reset Password Form */}
        {activeTab === 'resetPassword' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-white">Choose New Password</h3>
              <p className="text-[11px] text-slate-400">
                Specify a new secure password for your workspace account.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">New Strong Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Confirm New Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingReset}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer animate-in fade-in"
            >
              {isSubmittingReset ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving Password...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Password & Continue
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-800 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('adminLogin');
                  setErrorMessage('');
                  setSuccessMessage('');
                  window.history.replaceState({}, document.title, window.location.pathname);
                }}
                className="text-[11px] text-slate-400 hover:text-white transition-all font-bold uppercase tracking-wider cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}
          </>
        )}

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-slate-800">
          LMS by Umar • Verified Official Portal Access
        </div>
      </div>

    </div>
  );
};

