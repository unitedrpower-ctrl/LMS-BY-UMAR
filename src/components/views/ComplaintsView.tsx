import React, { useState } from 'react';
import { Complaint, User, Site } from '../../types';
import { useI18n } from '../../lib/i18n';
import { 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  ShieldAlert, 
  X, 
  Send,
  Trash2,
  Filter,
  CheckCircle
} from 'lucide-react';

interface ComplaintsViewProps {
  complaints: Complaint[];
  users: User[];
  sites: Site[];
  currentUser: User;
  onAddComplaint: (complaint: Complaint) => void;
  onUpdateComplaintStatus: (id: string, status: Complaint['status'], responseNote?: string, resolvedBy?: string) => void;
  onDeleteComplaint?: (id: string) => void;
}

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({
  complaints,
  users,
  sites,
  currentUser,
  onAddComplaint,
  onUpdateComplaintStatus,
  onDeleteComplaint
}) => {
  const { t, isRTL, translateStatus } = useI18n();
  const todayStr = new Date().toISOString().split('T')[0];

  const isWorker = currentUser.role === 'Labor';

  // Count user complaints submitted today (Labor rule)
  const myComplaintsToday = complaints.filter(
    (c) => c.userId === currentUser.id && c.date.startsWith(todayStr)
  );
  const isLimitReached = myComplaintsToday.length >= 3;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<Complaint['category']>('Safety');
  const [statusFilter, setStatusFilter] = useState<'All' | Complaint['status']>('All');

  // Resolution modal state
  const [resolvingComplaint, setResolvingComplaint] = useState<Complaint | null>(null);
  const [statusDraft, setStatusDraft] = useState<Complaint['status']>('Resolved');
  const [responseNoteDraft, setResponseNoteDraft] = useState('');

  const handleSubmitNewComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWorker) return;
    if (isLimitReached) return;
    if (!message.trim()) return;

    const newComp: Complaint = {
      id: `comp-${Date.now()}`,
      userId: currentUser.id,
      siteId: currentUser.siteId,
      message: message.trim(),
      category,
      status: 'Pending',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    onAddComplaint(newComp);
    setMessage('');
    setIsModalOpen(false);
  };

  const handleSaveResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingComplaint) return;

    onUpdateComplaintStatus(
      resolvingComplaint.id,
      statusDraft,
      responseNoteDraft.trim() || undefined,
      currentUser.id
    );

    setResolvingComplaint(null);
  };

  // Filter visible complaints based on user role
  let visibleComplaints = isWorker
    ? complaints.filter((c) => c.userId === currentUser.id)
    : complaints;

  if (statusFilter !== 'All') {
    visibleComplaints = visibleComplaints.filter(c => c.status === statusFilter);
  }

  return (
    <div id="view-complaints" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            {isWorker ? t('myComplaints', 'My Grievances & Complaints') : t('complaints', 'Complaints & Grievance Desk')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isWorker 
              ? t('workerComplaintDesc', 'Submit site safety hazards, wage discrepancies, or camp amenity requests (Max 3/day).') 
              : t('adminComplaintDesc', 'Review, manage, and resolve complaints submitted by site laborers and staff.')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter for Admins */}
          {!isWorker && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs"
              >
                <option value="All">{t('allStatus', 'All Statuses')}</option>
                <option value="Pending">{t('pending', 'Pending')}</option>
                <option value="In Progress">{t('inProgress', 'In Progress')}</option>
                <option value="Resolved">{t('resolved', 'Resolved')}</option>
              </select>
            </div>
          )}

          {/* Daily Limit Badge and Submit Button ONLY for Labor / Worker */}
          {isWorker && (
            <>
              <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs flex items-center gap-2">
                <span className="text-slate-500 font-medium">{t('dailyLimit', 'Daily Limit')}:</span>
                <span className={`font-bold ${isLimitReached ? 'text-red-600' : 'text-indigo-600'}`}>
                  {myComplaintsToday.length} / 3 {t('used', 'Used')}
                </span>
              </div>

              <button
                id="btn-file-complaint"
                onClick={() => setIsModalOpen(true)}
                disabled={isLimitReached}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                  isLimitReached
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                }`}
              >
                <Plus className="w-4 h-4" />
                {t('fileComplaint', 'File Complaint')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Complaints List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleComplaints.length === 0 ? (
          <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium">
              {isWorker 
                ? t('noWorkerComplaints', 'You have not submitted any complaints yet.') 
                : t('noComplaintsFound', 'No complaints found matching criteria.')}
            </p>
          </div>
        ) : (
          visibleComplaints.map((c) => {
            const author = users.find((u) => u.id === c.userId);
            const site = sites.find((s) => s.id === c.siteId);
            const resolver = users.find((u) => u.id === c.resolvedBy);

            return (
              <div
                key={c.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded-full uppercase">
                      {c.category}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {translateStatus(c.status)}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-snug">
                    "{c.message}"
                  </p>

                  {c.responseNote && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {t('managementResponse', 'Management Response')} ({resolver?.name || 'HR/Admin'})
                      </span>
                      <p className="text-xs text-slate-700 italic">"{c.responseNote}"</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div>
                    <span className="font-bold text-slate-700">{author?.name || c.userId}</span>
                    <span className="block">{site?.name || 'General Site'} • {c.date}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isWorker && (
                      <button
                        onClick={() => {
                          setResolvingComplaint(c);
                          setStatusDraft(c.status);
                          setResponseNoteDraft(c.responseNote || '');
                        }}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {t('updateStatus', 'Update Status')}
                      </button>
                    )}

                    {!isWorker && onDeleteComplaint && (
                      <button
                        onClick={() => onDeleteComplaint(c.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title={t('delete', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Complaint Modal - Worker Only */}
      {isWorker && isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                {t('submitLaborComplaint', 'Submit Labor Complaint')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('category', 'Category')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white"
                >
                  <option value="Safety">{t('catSafety', 'Safety & Scaffolding')}</option>
                  <option value="Wage/Payroll">{t('catWage', 'Wage & Overtime Discrepancy')}</option>
                  <option value="Site Condition">{t('catSite', 'Site Drinking Water & Amenities')}</option>
                  <option value="Supervisor Issue">{t('catSupervisor', 'Supervisor / Conduct Issue')}</option>
                  <option value="Other">{t('catOther', 'Other Issues')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('detailedMessage', 'Detailed Message *')}</label>
                <textarea
                  required
                  rows={4}
                  placeholder={t('complaintPlaceholder', 'Describe the issue clearly...')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px]">
                ⚠️ <strong>{t('dailyLimitEnforced', 'Daily Limit Enforced')}:</strong> {t('limitDesc', 'Each worker can file a maximum of 3 complaints per day.')} ({t('submittedToday', 'Submitted today')}: {myComplaintsToday.length}/3)
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isLimitReached}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {t('submit', 'Submit Complaint')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve / Update Complaint Modal - Admin Only */}
      {!isWorker && resolvingComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{t('updateResolution', 'Update Complaint Resolution')}</h3>
              <button onClick={() => setResolvingComplaint(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResolution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('status', 'Status')}</label>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                >
                  <option value="Pending">{t('pending', 'Pending')}</option>
                  <option value="In Progress">{t('inProgress', 'In Progress')}</option>
                  <option value="Resolved">{t('resolved', 'Resolved')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('managementResponseNote', 'Management Response Note')}</label>
                <textarea
                  rows={3}
                  placeholder={t('resolutionStepsPlaceholder', 'Explain resolution steps taken...')}
                  value={responseNoteDraft}
                  onChange={(e) => setResponseNoteDraft(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingComplaint(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  {t('saveResolution', 'Save Resolution')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
