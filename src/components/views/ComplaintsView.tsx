import React, { useState } from 'react';
import { Complaint, User, Site } from '../../types';
import { 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  ShieldAlert, 
  X, 
  UserCheck, 
  Send 
} from 'lucide-react';

interface ComplaintsViewProps {
  complaints: Complaint[];
  users: User[];
  sites: Site[];
  currentUser: User;
  onAddComplaint: (complaint: Complaint) => void;
  onUpdateComplaintStatus: (id: string, status: Complaint['status'], responseNote?: string, resolvedBy?: string) => void;
}

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({
  complaints,
  users,
  sites,
  currentUser,
  onAddComplaint,
  onUpdateComplaintStatus
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Count user complaints submitted today
  const myComplaintsToday = complaints.filter(
    (c) => c.userId === currentUser.id && c.date.startsWith(todayStr)
  );
  const isLimitReached = myComplaintsToday.length >= 3;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<Complaint['category']>('Safety');

  // Resolution modal state
  const [resolvingComplaint, setResolvingComplaint] = useState<Complaint | null>(null);
  const [statusDraft, setStatusDraft] = useState<Complaint['status']>('Resolved');
  const [responseNoteDraft, setResponseNoteDraft] = useState('');

  const handleSubmitNewComplaint = (e: React.FormEvent) => {
    e.preventDefault();
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

  // Filter visible complaints based on user role (Labor strictly sees only their own complaints)
  const visibleComplaints = currentUser.role === 'Labor'
    ? complaints.filter((c) => c.userId === currentUser.id)
    : complaints;

  return (
    <div id="view-complaints" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Labor Complaints & Grievance Desk
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Submit site issues, safety hazards, and wage grievances with strict 3 per day limit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Daily Limit Badge */}
          <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs flex items-center gap-2">
            <span className="text-slate-500 font-medium">Daily Limit (Max 3):</span>
            <span className={`font-bold ${isLimitReached ? 'text-red-600' : 'text-indigo-600'}`}>
              {myComplaintsToday.length} / 3 Used
            </span>
          </div>

          <button
            id="btn-file-complaint"
            onClick={() => setIsModalOpen(true)}
            disabled={isLimitReached}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
              isLimitReached
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            File Complaint
          </button>
        </div>
      </div>

      {/* Complaints List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleComplaints.length === 0 ? (
          <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium">
              {currentUser.role === 'Labor' ? 'You have not submitted any complaints yet.' : 'No complaints logged in system.'}
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
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:shadow-md transition-shadow flex flex-col justify-between"
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
                      {c.status}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-snug">
                    "{c.message}"
                  </p>

                  {c.responseNote && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Management Response ({resolver?.name || 'HR/Admin'})
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

                  {currentUser.role !== 'Labor' && (
                    <button
                      onClick={() => {
                        setResolvingComplaint(c);
                        setStatusDraft(c.status);
                        setResponseNoteDraft(c.responseNote || '');
                      }}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg"
                    >
                      Update Status
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Complaint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Submit Labor Complaint
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Complaint Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="Safety">Safety & Scaffolding</option>
                  <option value="Wage/Payroll">Wage & Overtime Discrepancy</option>
                  <option value="Site Condition">Site Drinking Water & Amenities</option>
                  <option value="Supervisor Issue">Supervisor / Conduct Issue</option>
                  <option value="Other">Other Issues</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Message *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue clearly..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px]">
                ⚠️ <strong>Daily Limit Enforced:</strong> Each user can file a maximum of 3 complaints per 24-hour cycle. (Submitted today: {myComplaintsToday.length}/3)
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLimitReached}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve / Update Complaint Modal */}
      {resolvingComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Update Complaint Resolution</h3>
              <button onClick={() => setResolvingComplaint(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResolution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Management Response Note</label>
                <textarea
                  rows={3}
                  placeholder="Explain resolution steps taken..."
                  value={responseNoteDraft}
                  onChange={(e) => setResponseNoteDraft(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingComplaint(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs"
                >
                  Save Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
