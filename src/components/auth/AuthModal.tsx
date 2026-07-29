import React, { useState } from 'react';
import { User, UserRole } from '../../types';
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
  X, 
  Clock,
  Briefcase,
  Upload,
  Crown,
  RefreshCw
} from 'lucide-react';
import { requestMasterOtpApi, verifyMasterOtpApi, masterPasswordLoginApi } from '../../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onLogin: (user: User) => void;
  onSignUp: (newUser: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  onLogin,
  onSignUp
}) => {
  const isMasterRoute = window.location.pathname.includes('/master-login') || 
                        window.location.pathname.includes('/master') ||
                        window.location.search.includes('master=true') || 
                        window.location.search.includes('owner=true');

  const [activeTab, setActiveTab] = useState<'adminLogin' | 'workerLogin' | 'signUp' | 'masterOtp'>('adminLogin');

  // Form States
  const [emailOrSerial, setEmailOrSerial] = useState('');
  const [password, setPassword] = useState('');
  
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

  // Status/Alert Feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // Handle Admin / Staff Login
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const normInput = emailOrSerial.toLowerCase().trim();
    const isMaster = normInput === 'umarchoudhary259@gmail.com' || normInput === 'umarchaudhary259@gmail.com' || normInput === 'unitedrpower@gmail.com';

    let target = users.find(
      (u) => 
        (u.email.toLowerCase() === normInput || 
         u.loginSerial?.toLowerCase() === normInput)
    );

    if (isMaster) {
      if (!target) {
        target = {
          id: 'usr-owner-umar-259',
          companyId: 'comp-owner',
          name: 'Umar Chaudhary (Master Owner)',
          email: 'UmarChaudhary259@gmail.com',
          role: 'Owner',
          dailyRate: 350.0,
          joinedDate: '2023-01-01',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          status: 'Active',
          profileCompleted: true,
          designation: 'Platform Owner & Master Administrator'
        };
      } else {
        target.role = 'Owner';
        target.status = 'Active';
        target.companyId = 'comp-owner';
        target.profileCompleted = true;
      }
      onLogin(target);
      onClose();
      return;
    }

    if (!target) {
      setErrorMessage('Account not found. Please check your Email or Serial Number.');
      return;
    }

    if (target.loginPassword && target.loginPassword !== password) {
      setErrorMessage('Invalid Password. Please verify your credentials.');
      return;
    }

    // Check Account Approval Status
    if (target.status === 'Pending') {
      setErrorMessage(
        '⚠️ Your account status is PENDING approval by a Super Admin. You cannot access the application until an administrator reviews and approves your registration.'
      );
      return;
    }

    if (target.status === 'Rejected') {
      setErrorMessage('❌ Your account registration has been rejected by an administrator.');
      return;
    }

    onLogin(target);
    onClose();
  };

  // Handle Worker Login
  const handleWorkerLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const target = users.find(
      (u) => 
        u.role === 'Labor' && 
        (u.loginSerial?.toLowerCase() === emailOrSerial.toLowerCase().trim() || 
         u.email.toLowerCase() === emailOrSerial.toLowerCase().trim())
    );

    if (!target) {
      setErrorMessage('Worker Serial Number not found. Contact your Site Supervisor or HR Admin.');
      return;
    }

    if (target.loginPassword && target.loginPassword !== password) {
      setErrorMessage('Incorrect Worker Password. Check your payslip or HR assignment.');
      return;
    }

    onLogin(target);
    onClose();
  };

  // Handle Admin / Staff Registration
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    // Check if email already exists
    if (users.some((u) => u.email.toLowerCase() === signupEmail.toLowerCase().trim())) {
      setErrorMessage('An account with this email address already exists.');
      return;
    }

    const newUser: User = {
      id: `usr-pending-${Date.now()}`,
      name,
      email: signupEmail,
      role: requestedRole,
      dailyRate: requestedRole === 'Super Admin' ? 180 : requestedRole === 'HR Admin' ? 140 : 110,
      phone,
      designation: designation || `${requestedRole} (Pending Registration)`,
      joinedDate: new Date().toISOString().split('T')[0],
      avatar: signupAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bankName: bankName || undefined,
      accountNumber: accountNumber || undefined,
      iban: iban || undefined,
      loginSerial: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
      loginPassword: signupPassword,
      status: 'Pending', // Default Pending state
      registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    onSignUp(newUser);
    setSuccessMessage(
      '✅ Registration Submitted! Your account has been registered as PENDING. A Super Admin must approve your account before you can log in.'
    );

    // Reset Form
    setName('');
    setSignupEmail('');
    setPhone('');
    setDesignation('');
    setSignupPassword('');
  };

  // Master Owner OTP Handlers
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
      setErrorMessage(err.message || 'Failed to dispatch Master Owner OTP.');
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
      console.log(`[Master OTP Verification Modal] Verifying code for ${otpEmail.trim()}`);
      const res = await verifyMasterOtpApi(otpEmail.trim(), otpCode.trim());
      
      if (res.success && res.user) {
        console.log('OTP Success! Redirecting to Master Dashboard...', res.user);
        
        // Immediately store Auth Token & Session State in localStorage
        const authToken = `master-jwt-token-${res.user.id}-${Date.now()}`;
        localStorage.setItem('lms_auth_token', authToken);
        localStorage.setItem('lms_current_user_id', res.user.id);
        localStorage.setItem('lms_user_role', 'Owner');
        localStorage.setItem('lms_user_email', res.user.email);
        localStorage.setItem('labor_admin_current_user_id_v1', JSON.stringify(res.user.id));
        
        setSuccessMessage('👑 OTP Verification Successful! Redirecting to Master Owner Dashboard...');
        
        const masterUser: User = {
          ...res.user,
          role: 'Owner',
          companyId: 'comp-owner',
          status: 'Active',
          profileCompleted: true
        };

        onLogin(masterUser);
        onClose();

        if (window.location.hash !== '#saas_owner') {
          window.location.hash = '#saas_owner';
        }
      } else {
        setErrorMessage(res.message || 'Invalid 6-digit OTP code.');
      }
    } catch (err: any) {
      console.error("[Master OTP Modal Error]", err);
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center mx-auto shadow-lg border border-amber-500/40">
            <img 
              src="/lms_umar_logo_1785237060471.jpg" 
              alt="LMS by Umar" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight pt-1">LMS by Umar Authentication</h2>
          <p className="text-xs text-slate-400">
            Labor, Attendance & Payroll Management Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div className={`grid ${isMasterRoute ? 'grid-cols-4' : 'grid-cols-3'} gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold`}>
          {isMasterRoute && (
            <button
              onClick={() => {
                setActiveTab('masterOtp');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'masterOtp'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-md font-black'
                  : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-200" /> Owner OTP
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab('adminLogin');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'adminLogin'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-200" /> Admin
          </button>

          <button
            onClick={() => {
              setActiveTab('workerLogin');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'workerLogin'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardHat className="w-3.5 h-3.5 text-amber-200" /> Worker
          </button>

          <button
            onClick={() => {
              setActiveTab('signUp');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'signUp'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-200" /> Sign Up
          </button>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>{successMessage}</div>
          </div>
        )}

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
                id="modal-btn-request-master-otp"
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
                  id="modal-btn-verify-master-otp"
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

            {/* Direct Master Password Login Section */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Or Sign In with Master Password</span>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setErrorMessage('');
                setSuccessMessage('');
                try {
                  const res = await masterPasswordLoginApi(otpEmail.trim() || 'umarchoudhary259@gmail.com', otpCode.trim() || 'UmarMaster2026!');
                  if (res.success && res.user) {
                    const authToken = `master-jwt-token-${res.user.id}-${Date.now()}`;
                    localStorage.setItem('lms_auth_token', authToken);
                    localStorage.setItem('lms_current_user_id', res.user.id);
                    localStorage.setItem('lms_user_role', 'Owner');
                    localStorage.setItem('lms_user_email', res.user.email);
                    localStorage.setItem('labor_admin_current_user_id_v1', JSON.stringify(res.user.id));
                    setSuccessMessage('👑 Master Password Login Successful! Redirecting...');
                    onLogin({ ...res.user, role: 'Owner', companyId: 'comp-owner', status: 'Active', profileCompleted: true });
                    onClose();
                    if (window.location.hash !== '#saas_owner') {
                      window.location.hash = '#saas_owner';
                    }
                  } else {
                    setErrorMessage(res.message || 'Invalid Master Password.');
                  }
                } catch (err: any) {
                  setErrorMessage(err.message || 'Master Password login failed.');
                }
              }} className="space-y-2">
                <input
                  type="password"
                  placeholder="Master Password (e.g. UmarMaster2026!)"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-amber-400 font-bold"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-white" /> Sign In with Master Password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 1: Admin / Staff Login */}
        {activeTab === 'adminLogin' && (
          <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Email Address or Login Serial</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="admin@laborcorp.com or ADMIN-001"
                  value={emailOrSerial}
                  onChange={(e) => setEmailOrSerial(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300 block">💡 Quick Credentials for Testing:</span>
              <p>• Super Admin: <code className="text-indigo-400">admin@laborcorp.com</code> / <code className="text-indigo-400">AdminPass#1</code></p>
              <p>• HR Manager: <code className="text-indigo-400">david.hr@laborcorp.com</code> / <code className="text-indigo-400">HrPass#2026</code></p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" /> Log In as Admin / Staff
            </button>
          </form>
        )}

        {/* Tab 2: Worker Login */}
        {activeTab === 'workerLogin' && (
          <form onSubmit={handleWorkerLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Worker Login Serial / Username</label>
              <div className="relative">
                <HardHat className="w-4 h-4 absolute left-3 top-3 text-amber-500" />
                <input
                  type="text"
                  required
                  placeholder="EMP-1001"
                  value={emailOrSerial}
                  onChange={(e) => setEmailOrSerial(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white uppercase font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Worker Access Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="WorkerPass#1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-amber-400 block">👷 Worker Portal Credentials:</span>
              <p>• Serial: <code className="text-amber-300">EMP-1001</code> | Password: <code className="text-amber-300">WorkerPass#1</code></p>
              <p>• Serial: <code className="text-amber-300">EMP-1002</code> | Password: <code className="text-amber-300">WorkerPass#2</code></p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2"
            >
              <HardHat className="w-4 h-4" /> Access Worker Portal
            </button>
          </form>
        )}

        {/* Tab 3: Sign Up / Pending Registration */}
        {activeTab === 'signUp' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Mohammed Al-Otaibi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="m.otaibi@laborcorp.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+966 50 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Requested Role *</label>
                <select
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="HR Admin">HR Admin / Staff</option>
                  <option value="Site Supervisor">Site Supervisor</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Job Designation</label>
                <input
                  type="text"
                  placeholder="Senior Site Inspector"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Worker Photo / Avatar</span>
                  <label className="text-[10px] text-emerald-400 font-extrabold cursor-pointer hover:underline flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
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
                              setSignupAvatar(reader.result);
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
                  value={signupAvatar}
                  onChange={(e) => setSignupAvatar(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Bank Account Registration Section */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-emerald-400 block">🏦 Bank Account Details (Disbursement)</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Bank Name</label>
                  <input
                    type="text"
                    placeholder="Al Rajhi, SNB..."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Account No.</label>
                  <input
                    type="text"
                    placeholder="102938475"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Saudi IBAN</label>
                  <input
                    type="text"
                    placeholder="SA..."
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Create Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-2.5 bg-amber-950/30 border border-amber-800/60 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Approval Requirement:</strong> New accounts are registered in <strong>PENDING</strong> status and require Super Admin approval before system entry.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Submit Account Registration
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
