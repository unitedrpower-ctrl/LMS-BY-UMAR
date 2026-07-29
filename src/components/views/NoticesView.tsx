import React, { useState } from 'react';
import { Notice, Site, User } from '../../types';
import { Megaphone, Plus, Bell, Calendar, X, Send, ShieldAlert } from 'lucide-react';

interface NoticesViewProps {
  notices: Notice[];
  sites: Site[];
  currentUser: User;
  onAddNotice: (notice: Notice) => void;
}

export const NoticesView: React.FC<NoticesViewProps> = ({
  notices,
  sites,
  currentUser,
  onAddNotice
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetGroup, setTargetGroup] = useState('All');
  const [priority, setPriority] = useState<Notice['priority']>('Normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newNotice: Notice = {
      id: `notif-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      targetGroup,
      priority,
      postedBy: currentUser.name,
      datePosted: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    onAddNotice(newNotice);
    setTitle('');
    setContent('');
    setIsModalOpen(false);
  };

  return (
    <div id="view-notices" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            Site Notices & Announcements
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Broadcast official notices targeted to specific site groups or all company personnel.
          </p>
        </div>

        {currentUser.role !== 'Labor' && (
          <button
            id="btn-post-new-notice"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Publish Notice
          </button>
        )}
      </div>

      {/* Notices Grid */}
      <div className="space-y-4">
        {notices.map((n) => {
          const targetSite = sites.find((s) => s.id === n.targetGroup);

          return (
            <div
              key={n.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      n.priority === 'Urgent'
                        ? 'bg-red-100 text-red-800'
                        : n.priority === 'Important'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {n.priority}
                  </span>

                  <span className="text-[11px] font-semibold text-slate-500">
                    Target: {n.targetGroup === 'All' ? '🌐 All Sites & Workforce' : `🏗️ ${targetSite?.name || n.targetGroup}`}
                  </span>
                </div>

                <span className="text-[11px] text-slate-400">{n.datePosted}</span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{n.title}</h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{n.content}</p>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Posted by: <strong className="text-slate-700">{n.postedBy}</strong></span>
                <span className="font-mono text-[10px] text-slate-300">ID: {n.id}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Broadcast Site Notice</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Safety Audit Shift Schedule"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Group / Site</label>
                  <select
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="All">All Sites & Workers</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Content / Announcement Body *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write notice details..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
