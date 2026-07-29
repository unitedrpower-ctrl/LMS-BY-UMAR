import React, { useState } from 'react';
import { User, Company } from '../types';
import { AlertTriangle, Lock, Phone, Mail, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { getMyCompanyApi } from '../lib/api';

interface SubscriptionExpiredGuardProps {
  currentUser: User;
  company?: Company;
  onRefreshStatus?: () => void;
  children: React.ReactNode;
}

export const SubscriptionExpiredGuard: React.FC<SubscriptionExpiredGuardProps> = ({
  currentUser,
  company,
  onRefreshStatus,
  children
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Platform Owner always bypasses subscription expired locks!
  if (currentUser.role === 'Owner') {
    return <>{children}</>;
  }

  // Check if company is expired or status is Expired/Suspended
  const todayStr = new Date().toISOString().split('T')[0];
  const isExpired = company && (
    company.status === 'Expired' ||
    company.status === 'Suspended' ||
    company.subscriptionEndDate < todayStr
  );

  if (!isExpired) {
    return <>{children}</>;
  }

  const handleCheckAgain = async () => {
    setIsChecking(true);
    setStatusMsg(null);
    try {
      const res = await getMyCompanyApi(currentUser);
      if (!res.isSubscriptionExpired && res.company.status === 'Active') {
        setStatusMsg('🎉 Your subscription has been successfully renewed! Reloading...');
        setTimeout(() => {
          if (onRefreshStatus) onRefreshStatus();
          window.location.reload();
        }, 1200);
      } else {
        setStatusMsg('Subscription is still marked as Expired/Locked. Please confirm payment with Platform Owner Umar.');
      }
    } catch (err: any) {
      setStatusMsg('Failed to verify subscription status.');
    } finally {
      setIsChecking(false);
    }
  };

  const isSuspended = company?.status === 'Suspended';
  const isDemoExpired = company?.planType === '3_DAY_DEMO' && isExpired;

  return (
    <div id="subscription-expired-guard-overlay" className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-rose-500/40 w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Lock Icon */}
        <div className="inline-flex p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-3xl shadow-lg">
          <Lock className="w-10 h-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className={`px-3 py-1 font-extrabold text-[11px] rounded-full uppercase tracking-wider ${
            isSuspended 
              ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300' 
              : isDemoExpired 
              ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}>
            {isSuspended ? 'Account Suspended & Revoked' : isDemoExpired ? '3-Day Free Demo Expired' : 'Commercial License Expired'}
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isSuspended ? 'Access Revoked by Owner' : isDemoExpired ? 'Upgrade to Full Commercial Plan' : 'Subscription Plan Expired'}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            {isSuspended ? (
              <>The tenant account for <strong className="text-white">{company?.name || 'Your Client Company'}</strong> has been <span className="text-rose-400 font-bold">Suspended</span> by Platform Owner Umar. All active sessions and API endpoints are blocked.</>
            ) : isDemoExpired ? (
              <>Your <strong className="text-amber-300">3-Day (72-Hour) Free Demo</strong> for <strong className="text-white">{company?.name}</strong> has completed. Please purchase a 6-Month or 1-Year subscription package to continue using LMS SaaS.</>
            ) : (
              <>The commercial package for <strong className="text-white">{company?.name || 'Your Client Company'}</strong> reached its expiry date (<span className="font-mono text-rose-400">{company?.subscriptionEndDate || 'Expired'}</span>). Features are currently locked.</>
            )}
          </p>
        </div>

        {/* Company & Subscription Details Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-slate-400 font-bold">Client Tenant:</span>
            <span className="text-white font-extrabold">{company?.name || 'Company'}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-slate-400 font-bold">CR Number:</span>
            <span className="text-slate-300 font-mono">{company?.crNumber || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-slate-400 font-bold">Plan Package:</span>
            <span className="text-amber-400 font-bold uppercase">{company?.planType || '6_MONTH'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">Worker Capacity Limit:</span>
            <span className="text-indigo-400 font-mono font-bold">{company?.maxLaborersAllowed || 50} Laborers</span>
          </div>
        </div>

        {/* Contact Owner Action */}
        <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/30 rounded-2xl p-4 text-left space-y-3">
          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> How to Renew Your Subscription (6 Months / 1 Year)
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Please reach out directly to Platform Owner Umar to renew your commercial license and unlock full administrative features:
          </p>
          <div className="flex flex-col sm:flex-row gap-2 font-mono text-xs">
            <a 
              href="mailto:unitedrpower@gmail.com" 
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 rounded-xl flex items-center gap-2 font-bold transition-all"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>unitedrpower@gmail.com</span>
            </a>
            <div className="px-3 py-2 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl flex items-center gap-2 font-bold">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>+966 50 111 2222</span>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300">
            {statusMsg}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleCheckAgain}
            disabled={isChecking}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Check Subscription Renewal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
