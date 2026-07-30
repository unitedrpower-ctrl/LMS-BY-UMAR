import React, { useState, useEffect } from 'react';
import { User, Company, SubscriptionPlanType } from '../../types';
import { 
  Building2, 
  Crown, 
  ShieldCheck, 
  Plus, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Search, 
  Copy, 
  ExternalLink, 
  Slash, 
  TrendingUp, 
  Zap, 
  Sparkles,
  Phone,
  Mail,
  FileText,
  X,
  ChevronRight,
  Filter,
  HardHat
} from 'lucide-react';
import { 
  getOwnerCompaniesApi, 
  getSaasAnalyticsApi, 
  onboardCompanyApi, 
  updateCompanySubscriptionApi, 
  suspendCompanyApi,
  generateDemoLinkApi,
  purgeCompanyApi
} from '../../lib/api';

interface OwnerSaaSViewProps {
  currentUser: User;
}

export const OwnerSaaSView: React.FC<OwnerSaaSViewProps> = ({ currentUser }) => {
  const [companies, setCompanies] = useState<(Company & {
    activeLaborers: number;
    totalStaff: number;
    daysRemaining: number;
    computedStatus: string;
  })[]>([]);
  
  const [analytics, setAnalytics] = useState<{
    totalCompanies: number;
    activeCompanies: number;
    expiredCompanies: number;
    expiringSoon: number;
    totalRevenueSar: number;
    totalWorkersAcrossTenants: number;
    planBreakdown: { sixMonth: number; oneYear: number; enterprise: number };
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expired' | 'Suspended'>('All');

  // Onboarding Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompCr, setNewCompCr] = useState('');
  const [newCompAdminName, setNewCompAdminName] = useState('');
  const [newCompAdminEmail, setNewCompAdminEmail] = useState('');
  const [newCompInitialPassword, setNewCompInitialPassword] = useState('');
  const [newCompPhone, setNewCompPhone] = useState('');
  const [newCompPlan, setNewCompPlan] = useState<SubscriptionPlanType>('1_YEAR');
  const [newCompCapacity, setNewCompCapacity] = useState('100');
  const [newCompPrice, setNewCompPrice] = useState('12000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardResult, setOnboardResult] = useState<{
    company: Company;
    emailBody: string;
    inviteUrl: string;
  } | null>(null);

  // 3-Day Demo Link Feature State
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoClientName, setDemoClientName] = useState('');
  const [demoClientEmail, setDemoClientEmail] = useState('');
  const [demoClientPhone, setDemoClientPhone] = useState('');
  const [demoMaxLaborers, setDemoMaxLaborers] = useState('25');
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [demoResult, setDemoResult] = useState<{
    demoCompany: Company;
    demoUrl: string;
    emailBody: string;
  } | null>(null);

  // Subscription Extend Modal State
  const [extendComp, setExtendComp] = useState<Company | null>(null);
  const [extendMonths, setExtendMonths] = useState<number>(12);
  const [extendCapacity, setExtendCapacity] = useState<number>(100);
  const [extendPrice, setExtendPrice] = useState<number>(12000);
  const [isExtending, setIsExtending] = useState(false);

  // Status Feedback
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [comps, stats] = await Promise.all([
        getOwnerCompaniesApi(currentUser),
        getSaasAnalyticsApi(currentUser)
      ]);
      setCompanies(comps);
      setAnalytics(stats);
    } catch (err: any) {
      console.error('Failed to load SaaS companies:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load platform tenant companies.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handle Plan Type Choice Auto-Fill
  const handlePlanTypeChange = (plan: SubscriptionPlanType) => {
    setNewCompPlan(plan);
    if (plan === '6_MONTH') {
      setNewCompCapacity('50');
      setNewCompPrice('7500');
    } else if (plan === '1_YEAR') {
      setNewCompCapacity('100');
      setNewCompPrice('12000');
    } else {
      setNewCompCapacity('250');
      setNewCompPrice('25000');
    }
  };

  // Helper to completely reset onboarding form fields to blank values
  const resetOnboardForm = () => {
    setNewCompName('');
    setNewCompCr('');
    setNewCompAdminName('');
    setNewCompAdminEmail('');
    setNewCompInitialPassword('');
    setNewCompPhone('');
    setNewCompPlan('1_YEAR');
    setNewCompCapacity('100');
    setNewCompPrice('12000');
  };

  const resetDemoForm = () => {
    setDemoClientName('');
    setDemoClientEmail('');
    setDemoClientPhone('');
    setDemoMaxLaborers('25');
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim() || !newCompAdminEmail.trim()) {
      setStatusMsg({ type: 'error', text: 'Please fill in Company Name and Admin Email.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await onboardCompanyApi({
        name: newCompName.trim(),
        crNumber: newCompCr.trim(),
        adminName: newCompAdminName.trim() || 'Company Administrator',
        adminEmail: newCompAdminEmail.trim().toLowerCase(),
        planType: newCompPlan,
        maxLaborersAllowed: Number(newCompCapacity),
        pricePaidSar: Number(newCompPrice),
        contactPhone: newCompPhone.trim(),
        initialPassword: newCompInitialPassword.trim()
      }, currentUser);

      setOnboardResult({
        company: res.company,
        emailBody: res.emailBody,
        inviteUrl: res.inviteUrl
      });

      // STRICT RESET: Reset all form fields to completely blank values immediately after creation
      resetOnboardForm();

      setStatusMsg({ type: 'success', text: `🎉 Company "${res.company.name}" successfully onboarded! Super Admin invitation link created.` });
      await loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to onboard client company.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoClientName.trim() || !demoClientEmail.trim()) {
      setStatusMsg({ type: 'error', text: 'Please fill in Client Name and Email address for demo link.' });
      return;
    }

    setIsGeneratingDemo(true);
    setStatusMsg(null);

    try {
      const res = await generateDemoLinkApi({
        clientName: demoClientName.trim(),
        clientEmail: demoClientEmail.trim().toLowerCase(),
        contactPhone: demoClientPhone.trim(),
        maxLaborersAllowed: Number(demoMaxLaborers) || 25
      }, currentUser);

      setDemoResult({
        demoCompany: res.demoCompany,
        demoUrl: res.demoUrl,
        emailBody: res.emailBody
      });

      setStatusMsg({ type: 'success', text: `🚀 3-Day Demo link generated for ${res.demoCompany.name}! Expiry: ${res.demoCompany.subscriptionEndDate}` });
      await loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to generate 3-Day Demo link.' });
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const handleExtendSubscription = async () => {
    if (!extendComp) return;
    setIsExtending(true);
    try {
      await updateCompanySubscriptionApi(extendComp.id, {
        addMonths: extendMonths,
        maxLaborersAllowed: extendCapacity,
        additionalPriceSar: extendPrice,
        status: 'Active'
      }, currentUser);

      setStatusMsg({ type: 'success', text: `✅ Subscription for ${extendComp.name} extended by ${extendMonths} months!` });
      setExtendComp(null);
      await loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update subscription.' });
    } finally {
      setIsExtending(false);
    }
  };

  const handleSuspend = async (comp: Company) => {
    if (!confirm(`Are you sure you want to suspend access for ${comp.name}? All staff will be locked out.`)) return;
    try {
      await suspendCompanyApi(comp.id, currentUser);
      setStatusMsg({ type: 'success', text: `🔒 Company ${comp.name} suspended.` });
      await loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to suspend company.' });
    }
  };

  const handlePurge = async (comp: Company) => {
    if (!confirm(`⚠️ WARNING: Are you absolutely sure you want to PERMANENTLY DELETE & PURGE "${comp.name}"? This will irreversibly erase the company, all sites, all users, attendance logs, and payroll records. This action cannot be undone.`)) return;
    try {
      await purgeCompanyApi(comp.id, currentUser);
      setStatusMsg({ type: 'success', text: `🗑️ Company ${comp.name} and all associated data purged permanently.` });
      await loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to purge company.' });
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.crNumber && c.crNumber.includes(searchTerm));
    const matchesStatus = statusFilter === 'All' || c.computedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 w-full pb-12">
      {/* SaaS Master Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" /> Platform Owner Control Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              LMS Commercial SaaS Multi-Tenant Engine
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Manage client company onboarding, 6-Month & 1-Year subscription plans, worker capacity limits, and real-time revenue analytics across the Kingdom.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                setDemoResult(null);
                setShowDemoModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-indigo-400/30"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate 3-Day Demo Link</span>
            </button>

            <button
              onClick={() => {
                setOnboardResult(null);
                resetOnboardForm();
                setShowOnboardModal(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Client Company</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Platform Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Platform Revenue</span>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            SAR {(analytics?.totalRevenueSar || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Direct Commercial Subscriptions
          </div>
        </div>

        {/* Active Client Companies */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Client Tenants</span>
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {analytics?.activeCompanies || 0} <span className="text-xs font-normal text-slate-400">/ {analytics?.totalCompanies || 0} Total</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {analytics?.expiredCompanies || 0} Expired • {analytics?.expiringSoon || 0} Expiring in 30 Days
          </div>
        </div>

        {/* Total Workers Across Platform */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Workers Managed</span>
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {(analytics?.totalWorkersAcrossTenants || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-blue-400 font-semibold">
            Across all client companies in KSA
          </div>
        </div>

        {/* Plan Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Package Breakdown</span>
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono font-bold text-white mt-1">
            <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              6M: {analytics?.planBreakdown.sixMonth || 0}
            </span>
            <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              1Y: {analytics?.planBreakdown.oneYear || 0}
            </span>
            <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400">
              Ent: {analytics?.planBreakdown.enterprise || 0}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Automated subscription guards active
          </div>
        </div>
      </div>

      {/* Subscription Pricing Packages Card Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">Commercial Packages & Standard Pricing Model</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 6 Month Plan */}
          <div className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 p-4 rounded-2xl space-y-2 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-400 uppercase">6-Month Package</span>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-extrabold rounded-full">Half-Yearly</span>
            </div>
            <div className="text-xl font-black text-white font-mono">SAR 7,500 <span className="text-xs font-normal text-slate-400">/ 6 Months</span></div>
            <ul className="text-[11px] text-slate-300 space-y-1 pt-1">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Capacity limit: Up to 50 workers</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Full Payroll & Attendance engine</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Automated Expiry Guard</li>
            </ul>
          </div>

          {/* 1 Year Plan */}
          <div className="bg-slate-950 border border-emerald-500/50 p-4 rounded-2xl space-y-2 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 font-black text-[9px] uppercase px-3 py-0.5 rounded-bl-xl">
              Best Value
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-400 uppercase">1-Year Annual Package</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold rounded-full">Annual Pass</span>
            </div>
            <div className="text-xl font-black text-white font-mono">SAR 12,000 <span className="text-xs font-normal text-slate-400">/ 12 Months</span></div>
            <ul className="text-[11px] text-slate-300 space-y-1 pt-1">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Capacity limit: Up to 100 workers</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 20% Discounted annual rate</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Priority WhatsApp & phone support</li>
            </ul>
          </div>

          {/* Custom Enterprise Plan */}
          <div className="bg-slate-950 border border-purple-500/40 p-4 rounded-2xl space-y-2 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-400 uppercase">Custom Enterprise</span>
              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-extrabold rounded-full">Bespoke</span>
            </div>
            <div className="text-xl font-black text-white font-mono">Custom Pricing <span className="text-xs font-normal text-slate-400">/ Multi-Year</span></div>
            <ul className="text-[11px] text-slate-300 space-y-1 pt-1">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Expanded worker capacity (250+)</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Custom multi-site supervisor roles</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Dedicated SLA & account manager</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tenant Companies Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        {/* Table Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search company, admin, CR number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Status:</span>
            {(['All', 'Active', 'Expired', 'Suspended'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  statusFilter === st 
                    ? 'bg-amber-500 text-slate-950 shadow-md' 
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Companies Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Company & CR</th>
                <th className="p-3.5">Primary Admin</th>
                <th className="p-3.5">Subscription Plan</th>
                <th className="p-3.5">Worker Capacity</th>
                <th className="p-3.5">Expiry / Status</th>
                <th className="p-3.5">Price Paid</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No client companies found matching your query.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map(comp => {
                  const capacityPct = Math.min(100, Math.round((comp.activeLaborers / comp.maxLaborersAllowed) * 100));
                  const isExpired = comp.computedStatus === 'Expired';
                  const isSuspended = comp.computedStatus === 'Suspended';
                  const isExpiringSoon = comp.daysRemaining > 0 && comp.daysRemaining <= 30;

                  return (
                    <tr key={comp.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Company & CR */}
                      <td className="p-3.5 font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border ${
                            comp.id === 'comp-owner' 
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                              : isExpired 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          }`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-white block">{comp.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">CR: {comp.crNumber || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Primary Admin */}
                      <td className="p-3.5">
                        <span className="font-bold text-slate-200 block">{comp.adminName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{comp.adminEmail}</span>
                      </td>

                      {/* Subscription Plan */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase border ${
                          comp.planType === '1_YEAR' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : comp.planType === '6_MONTH' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        }`}>
                          {comp.planType === '6_MONTH' ? '6 Months' : comp.planType === '1_YEAR' ? '1 Year' : 'Enterprise'}
                        </span>
                      </td>

                      {/* Worker Capacity Usage */}
                      <td className="p-3.5">
                        <div className="space-y-1 w-32">
                          <div className="flex justify-between text-[10px] font-mono font-bold">
                            <span className="text-white">{comp.activeLaborers} workers</span>
                            <span className="text-slate-400">/ {comp.maxLaborersAllowed}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className={`h-full transition-all ${
                                capacityPct > 90 ? 'bg-rose-500' : capacityPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} 
                              style={{ width: `${capacityPct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Expiry & Status */}
                      <td className="p-3.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {isSuspended ? (
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 font-extrabold text-[10px] rounded-full uppercase">Suspended</span>
                            ) : isExpired ? (
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 font-extrabold text-[10px] rounded-full uppercase flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Expired
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 font-extrabold text-[10px] rounded-full uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Expiring Soon
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-extrabold text-[10px] rounded-full uppercase flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            Expires: {comp.subscriptionEndDate}
                          </span>
                        </div>
                      </td>

                      {/* Price Paid */}
                      <td className="p-3.5 font-mono font-bold text-emerald-400">
                        SAR {(comp.pricePaidSar || 0).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const adminLink = `${window.location.origin}/login/admin?companyToken=${comp.id}`;
                              navigator.clipboard.writeText(adminLink);
                              setStatusMsg({ type: 'success', text: `📋 Admin login link for ${comp.name} copied!` });
                            }}
                            className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Copy Admin Login Link for this company"
                          >
                            <ShieldCheck className="w-3 h-3" /> Admin Link
                          </button>

                          <button
                            onClick={() => {
                              const workerLink = `${window.location.origin}/login/worker?companyToken=${comp.id}`;
                              navigator.clipboard.writeText(workerLink);
                              setStatusMsg({ type: 'success', text: `📋 Worker login link for ${comp.name} copied!` });
                            }}
                            className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Copy Worker Login Link for this company"
                          >
                            <HardHat className="w-3 h-3" /> Worker Link
                          </button>

                          <button
                            onClick={() => {
                              setExtendComp(comp);
                              setExtendMonths(comp.planType === '6_MONTH' ? 6 : 12);
                              setExtendCapacity(comp.maxLaborersAllowed);
                              setExtendPrice(comp.planType === '6_MONTH' ? 7500 : 12000);
                            }}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Renew or extend subscription"
                          >
                            <RefreshCw className="w-3 h-3" /> Renew
                          </button>

                          {comp.id !== 'comp-owner' && (
                            <>
                              <button
                                onClick={() => handleSuspend(comp)}
                                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Suspend company access"
                              >
                                <Slash className="w-3 h-3" /> Suspend
                              </button>

                              <button
                                onClick={() => handlePurge(comp)}
                                className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Permanently Purge & Delete Company Data"
                              >
                                <AlertTriangle className="w-3 h-3" /> Purge
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Client Company Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Onboard New Client Tenant</h3>
                  <p className="text-xs text-slate-400">Issue a new commercial subscription & primary admin account</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowOnboardModal(false);
                  setOnboardResult(null);
                  resetOnboardForm();
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {onboardResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Company Successfully Onboarded!
                  </div>
                  <p className="text-xs text-slate-300">
                    Client company <strong className="text-white">{onboardResult.company.name}</strong> is now active with a <strong className="text-amber-400">{onboardResult.company.planType}</strong> package.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">Official Activation Invitation Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={onboardResult.inviteUrl}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-400"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(onboardResult.inviteUrl);
                        setStatusMsg({ type: 'success', text: 'Invitation URL copied to clipboard!' });
                      }}
                      className="px-3 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Invite
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-slate-900 border border-purple-500/30 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Scoped Admin Login Link
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/login/admin?companyToken=${onboardResult.company.id}`}
                        className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-300 truncate"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/login/admin?companyToken=${onboardResult.company.id}`);
                          setStatusMsg({ type: 'success', text: 'Admin Login Link copied!' });
                        }}
                        className="px-2 py-1.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold rounded text-[11px] shrink-0 cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-indigo-500/30 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-indigo-400 flex items-center gap-1">
                      <HardHat className="w-3.5 h-3.5" /> Scoped Worker Login Link
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/login/worker?companyToken=${onboardResult.company.id}`}
                        className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-300 truncate"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/login/worker?companyToken=${onboardResult.company.id}`);
                          setStatusMsg({ type: 'success', text: 'Worker Login Link copied!' });
                        }}
                        className="px-2 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold rounded text-[11px] shrink-0 cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">Generated Onboarding Email Text</label>
                  <textarea
                    rows={6}
                    readOnly
                    value={onboardResult.emailBody}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowOnboardModal(false);
                      setOnboardResult(null);
                      resetOnboardForm();
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold rounded-xl text-xs cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOnboardSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Al-Rawabi Construction Co."
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">CR / License Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 1010892019"
                      value={newCompCr}
                      onChange={(e) => setNewCompCr(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Primary Admin Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Eng. Tariq Al-Ghamdi"
                      value={newCompAdminName}
                      onChange={(e) => setNewCompAdminName(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Primary Admin Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@alrawabi.sa"
                      value={newCompAdminEmail}
                      onChange={(e) => setNewCompAdminEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Initial Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Set initial sign-in password"
                      value={newCompInitialPassword}
                      onChange={(e) => setNewCompInitialPassword(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Plan Selection Radio Cards */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Select Subscription Package *</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handlePlanTypeChange('6_MONTH')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        newCompPlan === '6_MONTH' 
                          ? 'bg-amber-500/10 border-amber-500 text-amber-300' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-extrabold text-xs block">6-Month Plan</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">50 Workers Limit</span>
                      <span className="text-xs font-black text-amber-400 block mt-1 font-mono">SAR 7,500</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePlanTypeChange('1_YEAR')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        newCompPlan === '1_YEAR' 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-extrabold text-xs block text-emerald-400">1-Year Annual</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">100 Workers Limit</span>
                      <span className="text-xs font-black text-emerald-400 block mt-1 font-mono">SAR 12,000</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePlanTypeChange('CUSTOM_ENTERPRISE')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        newCompPlan === 'CUSTOM_ENTERPRISE' 
                          ? 'bg-purple-500/10 border-purple-500 text-purple-300' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-extrabold text-xs block">Enterprise</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">250+ Workers</span>
                      <span className="text-xs font-black text-purple-400 block mt-1 font-mono">Custom</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Max Worker Capacity Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={newCompCapacity}
                      onChange={(e) => setNewCompCapacity(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Subscription Price Paid (SAR)</label>
                    <input
                      type="number"
                      min="0"
                      value={newCompPrice}
                      onChange={(e) => setNewCompPrice(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowOnboardModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Onboarding Company...' : 'Onboard & Generate Activation Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3-Day Free Demo Link Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-2xl">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Generate 3-Day Free Demo Link</h3>
                  <p className="text-xs text-slate-400">Issue temporary 72-hour full access to prospective clients</p>
                </div>
              </div>
              <button onClick={() => setShowDemoModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {demoResult ? (
              <div className="space-y-4 bg-slate-950 border border-emerald-500/40 p-5 rounded-2xl text-left">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> 3-Day Demo Access Generated!
                  </span>
                  <span className="text-xs font-mono text-slate-400">Expires: {demoResult.demoCompany.subscriptionEndDate}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Direct Demo Invitation URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={demoResult.demoUrl}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(demoResult.demoUrl);
                        alert('Demo link copied to clipboard!');
                      }}
                      className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Automated Email Notification Body</label>
                  <textarea
                    readOnly
                    rows={6}
                    value={demoResult.emailBody}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setDemoResult(null);
                      setShowDemoModal(false);
                    }}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateDemoSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Prospective Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Saudi Contracting Prospect"
                      value={demoClientName}
                      onChange={(e) => setDemoClientName(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Client Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="prospect@company.sa"
                      value={demoClientEmail}
                      onChange={(e) => setDemoClientEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Contact Phone Number</label>
                    <input
                      type="text"
                      placeholder="+966 50 123 4567"
                      value={demoClientPhone}
                      onChange={(e) => setDemoClientPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Demo Worker Capacity</label>
                    <input
                      type="number"
                      min="5"
                      value={demoMaxLaborers}
                      onChange={(e) => setDemoMaxLaborers(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-xs text-indigo-300 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Demo accounts run for <strong>exactly 72 hours (3 days)</strong> with <strong className="text-white">is_demo: true</strong>. After 3 days, the system automatically revokes access and prompts them to purchase a full subscription package.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDemoModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isGeneratingDemo}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingDemo ? 'Generating Demo Link...' : 'Issue 3-Day Free Demo Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Subscription Extension Modal */}
      {extendComp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Renew / Extend Subscription</h3>
              </div>
              <button onClick={() => setExtendComp(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Extending subscription package for <strong className="text-white">{extendComp.name}</strong>. Current expiry: <span className="font-mono text-amber-400">{extendComp.subscriptionEndDate}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Add Duration</label>
                <select
                  value={extendMonths}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setExtendMonths(m);
                    setExtendPrice(m === 6 ? 7500 : 12000);
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={6}>+6 Months (Half-Year Extension)</option>
                  <option value={12}>+1 Year (Annual Extension - Best Value)</option>
                  <option value={24}>+2 Years (Multi-Year Contract)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Max Laborers Allowed</label>
                  <input
                    type="number"
                    value={extendCapacity}
                    onChange={(e) => setExtendCapacity(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Additional Fee (SAR)</label>
                  <input
                    type="number"
                    value={extendPrice}
                    onChange={(e) => setExtendPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setExtendComp(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendSubscription}
                disabled={isExtending}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isExtending ? 'Updating...' : 'Confirm Subscription Extension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
