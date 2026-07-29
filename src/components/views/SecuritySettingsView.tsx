import React, { useState } from 'react';
import { User } from '../../types';
import { Key, ShieldCheck, AlertTriangle } from 'lucide-react';
import { updateUserPasswordApi } from '../../lib/api';

interface SecuritySettingsViewProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
}

export const SecuritySettingsView: React.FC<SecuritySettingsViewProps> = ({ currentUser, onUpdateUser }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (!newPassword || newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match or are empty.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }

    setIsUpdating(true);
    try {
      const response = await updateUserPasswordApi(currentUser.id, newPassword, currentUser);
      if (response && response.hashedPassword) {
        onUpdateUser({ ...currentUser, loginPassword: response.hashedPassword });
        setMessage({ text: 'Password updated successfully.', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
         onUpdateUser({ ...currentUser, loginPassword: newPassword });
         setMessage({ text: 'Password updated locally.', type: 'success' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update password. Try again.', type: 'error' });
    }
    setIsUpdating(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <Key className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Security Settings</h2>
            <p className="text-sm text-slate-400">Update your login credentials</p>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${
            message.type === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            {message.type === 'error' ? <AlertTriangle className="w-5 h-5 flex-shrink-0" /> : <ShieldCheck className="w-5 h-5 flex-shrink-0" />}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Password (Optional)</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
