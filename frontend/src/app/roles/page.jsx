'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  Layers,
  Save,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { rolesApi, permissionsApi } from '../../lib/api/client';

export default function RolesAndPermissionsPage() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissionsGrouped, setPermissionsGrouped] = useState({});
  const [allPermissionsList, setAllPermissionsList] = useState([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(new Set());
  const [initialPermissionIds, setInitialPermissionIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [error, setError] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [roleForm, setRoleForm] = useState({ roleName: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetchRolesAndPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permRes] = await Promise.all([
        rolesApi.getRoles().catch(() => []),
        permissionsApi.getPermissions().catch(() => ({ grouped: {}, permissions: [] })),
      ]);

      setRoles(rolesRes || []);
      setPermissionsGrouped(permRes.grouped || {});
      setAllPermissionsList(permRes.permissions || []);

      if (rolesRes && rolesRes.length > 0) {
        const defaultRole = selectedRole
          ? rolesRes.find((r) => r.id === selectedRole.id) || rolesRes[0]
          : rolesRes[0];
        handleSelectRole(defaultRole);
      }
    } catch (err) {
      console.error('Error fetching roles/permissions:', err);
      setError('Unable to load roles and permission matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    const assignedIds = new Set((role.permissions || []).map((p) => p.id));
    setSelectedPermissionIds(assignedIds);
    setInitialPermissionIds(new Set(assignedIds));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const hasUnsavedChanges = () => {
    if (selectedPermissionIds.size !== initialPermissionIds.size) return true;
    for (let id of selectedPermissionIds) {
      if (!initialPermissionIds.has(id)) return true;
    }
    return false;
  };

  const handleTogglePermission = (permId) => {
    if (selectedRole?.code === 'SUPER_ADMIN') return; // SUPER_ADMIN has immutable full access
    const next = new Set(selectedPermissionIds);
    if (next.has(permId)) {
      next.delete(permId);
    } else {
      next.add(permId);
    }
    setSelectedPermissionIds(next);
  };

  const handleToggleModuleAll = (moduleName) => {
    if (selectedRole?.code === 'SUPER_ADMIN') return;
    const modulePerms = permissionsGrouped[moduleName] || [];
    const modulePermIds = modulePerms.map((p) => p.id);
    const allSelected = modulePermIds.every((id) => selectedPermissionIds.has(id));

    const next = new Set(selectedPermissionIds);
    if (allSelected) {
      modulePermIds.forEach((id) => next.delete(id));
    } else {
      modulePermIds.forEach((id) => next.add(id));
    }
    setSelectedPermissionIds(next);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await rolesApi.updateRolePermissions(selectedRole.id, Array.from(selectedPermissionIds));
      setInitialPermissionIds(new Set(selectedPermissionIds));
      showToast(`Permissions updated for role "${selectedRole.roleName}".`);
      fetchRolesAndPermissions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRoleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const created = await rolesApi.createRole(roleForm);
      setShowCreateModal(false);
      showToast(`Role "${created.roleName}" created.`);
      setRoleForm({ roleName: '', description: '' });
      fetchRolesAndPermissions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create role.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditRoleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    setFormLoading(true);
    try {
      await rolesApi.updateRole(selectedRole.id, roleForm);
      setShowEditModal(false);
      showToast(`Role profile updated.`);
      fetchRolesAndPermissions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.isSystemRole) {
      alert(`System role "${role.roleName}" is protected and cannot be deleted.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete role "${role.roleName}"?`)) return;
    try {
      await rolesApi.deleteRole(role.id);
      showToast(`Role "${role.roleName}" deleted.`);
      setSelectedRole(null);
      fetchRolesAndPermissions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete role.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Role-Based Access Control
            </span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              RBAC Matrix
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Roles & Permissions Matrix</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure fine-grained module authorizations, action permissions, and operational constraints
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRolesAndPermissions}
            disabled={loading}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              setRoleForm({ roleName: '', description: '' });
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Custom Role
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Roles List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Defined Roles ({roles.length})
            </h2>

            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRole(r)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          {r.roleName}
                          {r.isSystemRole && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                              SYSTEM
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description || 'Custom ERP operator role'}</p>
                      </div>

                      {!r.isSystemRole && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedRole(r);
                              setRoleForm({ roleName: r.roleName, description: r.description || '' });
                              setShowEditModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(r)}
                            className="p-1 text-rose-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-200/60">
                      <span>{r.userCount || 0} user(s) assigned</span>
                      <span className="font-semibold text-indigo-600">
                        {r.permissionCount || r.permissions?.length || 0} permission(s)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Permission Matrix (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedRole ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              {/* Role Header & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedRole.roleName}</h2>
                    {selectedRole.isSystemRole && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        System Role
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{selectedRole.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  {hasUnsavedChanges() && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
                      Unsaved Changes
                    </span>
                  )}

                  <button
                    onClick={handleSavePermissions}
                    disabled={saving || !hasUnsavedChanges() || selectedRole.code === 'SUPER_ADMIN'}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Permissions Matrix
                  </button>
                </div>
              </div>

              {selectedRole.code === 'SUPER_ADMIN' && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Super Administrator</strong> is granted immutable, unrestricted access to all module operations, user management, and system functions.
                  </span>
                </div>
              )}

              {/* Module-by-Module Permission Matrix */}
              <div className="space-y-6">
                {Object.keys(permissionsGrouped).map((moduleName) => {
                  const modulePerms = permissionsGrouped[moduleName] || [];
                  const modulePermIds = modulePerms.map((p) => p.id);
                  const allSelected = modulePermIds.every((id) => selectedPermissionIds.has(id));
                  const someSelected = modulePermIds.some((id) => selectedPermissionIds.has(id));

                  return (
                    <div key={moduleName} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      {/* Module Header */}
                      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-slate-500" />
                          <h3 className="font-bold text-sm text-slate-900">{moduleName}</h3>
                          <span className="text-xs text-slate-400">
                            ({modulePerms.filter((p) => selectedPermissionIds.has(p.id)).length} of {modulePerms.length} active)
                          </span>
                        </div>

                        {selectedRole.code !== 'SUPER_ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleToggleModuleAll(moduleName)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>

                      {/* Permissions Grid */}
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {modulePerms.map((p) => {
                          const isChecked = selectedPermissionIds.has(p.id);
                          const isDisabled = selectedRole.code === 'SUPER_ADMIN';

                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-3 p-2.5 rounded-lg border transition ${
                                isDisabled
                                  ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-80'
                                  : isChecked
                                  ? 'border-indigo-300 bg-indigo-50/40 cursor-pointer'
                                  : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => handleTogglePermission(p.id)}
                                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <div>
                                <div className="font-semibold text-xs text-slate-900">{p.code}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">{p.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
              Select a role from the left pane to inspect and edit its permission matrix.
            </div>
          )}
        </div>
      </div>

      {/* CREATE CUSTOM ROLE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Create Custom Role
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Inspector"
                  value={roleForm.roleName}
                  onChange={(e) => setRoleForm({ ...roleForm, roleName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe the operational responsibility of this role"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
                >
                  {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit Role Profile
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditRoleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={roleForm.roleName}
                  onChange={(e) => setRoleForm({ ...roleForm, roleName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
                >
                  {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
