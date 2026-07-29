import React, { useState } from 'react';
import { Site, User } from '../../types';
import { Building2, Plus, Users, MapPin, HardHat, UserCheck, CheckCircle2, Search, X } from 'lucide-react';

interface SitesViewProps {
  sites: Site[];
  users: User[];
  onSaveSite: (site: Site) => void;
  currentUserRole: string;
}

export const SitesView: React.FC<SitesViewProps> = ({
  sites,
  users,
  onSaveSite,
  currentUserRole
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Partial<Site>>({
    name: '',
    location: '',
    status: 'Active',
    laborerIds: []
  });

  const supervisors = users.filter((u) => u.role === 'Site Supervisor');
  const allLaborers = users.filter((u) => u.role === 'Labor');

  const filteredSites = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingSite({
      id: `site-${Date.now()}`,
      name: '',
      location: '',
      status: 'Active',
      laborerIds: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (site: Site) => {
    setEditingSite({ ...site });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite.name || !editingSite.location) return;

    onSaveSite({
      id: editingSite.id || `site-${Date.now()}`,
      name: editingSite.name,
      location: editingSite.location,
      supervisorId: editingSite.supervisorId,
      laborerIds: editingSite.laborerIds || [],
      status: editingSite.status || 'Active',
      budget: editingSite.budget || 500000
    });

    setIsModalOpen(false);
  };

  const toggleLaborerSelection = (laborerId: string) => {
    const current = editingSite.laborerIds || [];
    if (current.includes(laborerId)) {
      setEditingSite({
        ...editingSite,
        laborerIds: current.filter((id) => id !== laborerId)
      });
    } else {
      setEditingSite({
        ...editingSite,
        laborerIds: [...current, laborerId]
      });
    }
  };

  return (
    <div id="view-sites" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Groups & Construction Sites
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage construction sites, assigned supervisors, and allocated labor teams.
          </p>
        </div>

        {(currentUserRole === 'Super Admin' || currentUserRole === 'HR Admin') && (
          <button
            id="btn-add-new-site"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Create New Site
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          id="input-search-sites"
          type="text"
          placeholder="Search sites by name or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSites.map((site) => {
          const supervisor = users.find((u) => u.id === site.supervisorId);
          const siteLaborers = users.filter((u) => site.laborerIds.includes(u.id));

          return (
            <div
              key={site.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      {site.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {site.name}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      site.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : site.status === 'On Hold'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {site.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  <span className="truncate">{site.location}</span>
                </div>

                {/* Supervisor Block */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Site Supervisor</span>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-slate-800">
                      {supervisor ? supervisor.name : 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Assigned Laborers count */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium flex items-center gap-1">
                      <HardHat className="w-3.5 h-3.5 text-indigo-600" /> Allocated Laborers
                    </span>
                    <span className="font-bold text-slate-900">{siteLaborers.length} active</span>
                  </div>

                  <div className="flex -space-x-2 overflow-hidden py-1">
                    {siteLaborers.slice(0, 5).map((lab) => (
                      <img
                        key={lab.id}
                        src={lab.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                        alt={lab.name}
                        title={lab.name}
                        className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                      />
                    ))}
                    {siteLaborers.length > 5 && (
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold ring-2 ring-white">
                        +{siteLaborers.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(currentUserRole === 'Super Admin' || currentUserRole === 'HR Admin') && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleOpenEditModal(site)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Edit Site & Labor Allocation →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for Add / Edit Site */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingSite.id ? 'Edit Site Configuration' : 'Create Construction Site'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Site Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Tower Phase 2"
                  value={editingSite.name || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Site Location Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 450 Downtown Avenue"
                  value={editingSite.location || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Site Status
                  </label>
                  <select
                    value={editingSite.status || 'Active'}
                    onChange={(e) =>
                      setEditingSite({ ...editingSite, status: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Supervisor
                  </label>
                  <select
                    value={editingSite.supervisorId || ''}
                    onChange={(e) =>
                      setEditingSite({ ...editingSite, supervisorId: e.target.value || undefined })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Supervisor --</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi Select Laborers */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign Laborers to Site ({editingSite.laborerIds?.length || 0} selected)
                </label>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                  {allLaborers.map((lab) => {
                    const isSelected = editingSite.laborerIds?.includes(lab.id);
                    return (
                      <div
                        key={lab.id}
                        onClick={() => toggleLaborerSelection(lab.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-100 text-indigo-900 font-bold border border-indigo-200'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={lab.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                            alt={lab.name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span>{lab.name}</span>
                          <span className="text-[10px] text-slate-500 font-normal">(${lab.dailyRate}/day)</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Save Site Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
