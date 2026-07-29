import React, { useState } from 'react';
import { User } from '../types';
import { completeProfileApi } from '../lib/api';
import { UserCheck, ShieldCheck, CreditCard, Phone, FileText, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CompleteProfileModalProps {
  currentUser: User;
  onProfileSaved: (updatedUser: User) => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  currentUser,
  onProfileSaved
}) => {
  const [iqamaId, setIqamaId] = useState(currentUser.iqamaId || '');
  const [passportNumber, setPassportNumber] = useState(currentUser.passportNumber || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [bankName, setBankName] = useState(currentUser.bankName || '');
  const [accountNumber, setAccountNumber] = useState(currentUser.accountNumber || '');
  const [iban, setIban] = useState(currentUser.iban || '');
  const [designation, setDesignation] = useState(currentUser.designation || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (iqamaId.trim().length !== 10) {
      setErrorMsg('Saudi Iqama / National ID must be exactly 10 digits.');
      return;
    }

    if (!passportNumber.trim()) {
      setErrorMsg('Passport Number is required for labor registration.');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('Primary Contact Phone Number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await completeProfileApi({
        iqamaId: iqamaId.trim(),
        passportNumber: passportNumber.trim(),
        phone: phone.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        iban: iban.trim(),
        designation: designation.trim()
      }, currentUser);

      setSuccessMsg('🎉 Profile details saved successfully! Entering dashboard...');
      setTimeout(() => {
        onProfileSaved(res.user);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save profile details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="complete-profile-modal-overlay" className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/40 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-2xl">
            <UserCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
              Account Approved
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">
              Complete Your Profile
            </h2>
            <p className="text-xs text-slate-400">
              Welcome, <strong className="text-white">{currentUser.name}</strong>! Please enter your required Saudi ID and contact details to unlock your functional dashboard.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" /> Iqama / National ID (10 Digits) *
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="2481029401"
                value={iqamaId}
                onChange={(e) => setIqamaId(e.target.value.replace(/\D/g, ''))}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Passport Number *
              </label>
              <input
                type="text"
                required
                placeholder="N9810231"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-400" /> Primary Phone Number *
              </label>
              <input
                type="text"
                required
                placeholder="+966 50 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Job Designation / Title</label>
              <input
                type="text"
                placeholder="e.g. Mason / Site Supervisor"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 space-y-3">
            <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Direct Bank Deposit Setup (Salary Payroll)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="Al Rajhi / SNB"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="201029102"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">IBAN Number</label>
                <input
                  type="text"
                  placeholder="SA0380000000..."
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Saving Profile...' : 'Save Profile & Enter Dashboard'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
