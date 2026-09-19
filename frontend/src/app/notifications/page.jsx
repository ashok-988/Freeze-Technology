'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notificationApi } from '../../lib/api/client';

export default function NotificationsPage() {
  const router = useRouter();

  // State
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0,
    critical: 0,
    high: 0,
    dueToday: 0,
    overdueAlerts: 0,
    archivedCount: 0,
    categoryBreakdown: {},
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, UNREAD, CRITICAL, ARCHIVED
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Notification for Drawer
  const [selectedNotif, setSelectedNotif] = useState(null);

  // Preferences Modal
  const [isPrefOpen, setIsPrefOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    salesAlerts: true,
    paymentAlerts: true,
    inventoryAlerts: true,
    procurementAlerts: true,
    payablesAlerts: true,
    payrollAlerts: true,
    employeeAlerts: true,
    attendanceAlerts: true,
    serviceAlerts: true,
    amcAlerts: true,
    assetAlerts: true,
    pmAlerts: true,
    systemAlerts: true,
    minPriority: 'LOW',
  });
  const [prefSaving, setPrefSaving] = useState(false);

  // Categories list for filter dropdown
  const categories = [
    { value: 'ALL', label: 'All Categories' },
    { value: 'SYSTEM', label: 'System' },
    { value: 'SALES', label: 'Sales & Invoicing' },
    { value: 'PAYMENTS', label: 'Payments & Collections' },
    { value: 'INVENTORY', label: 'Inventory & Stock' },
    { value: 'PROCUREMENT', label: 'Procurement & PO' },
    { value: 'PAYABLES', label: 'Vendor Bills & Payables' },
    { value: 'PAYROLL', label: 'Payroll & Salaries' },
    { value: 'EMPLOYEE', label: 'Employees & HR' },
    { value: 'ATTENDANCE', label: 'Attendance & Shifts' },
    { value: 'SERVICE', label: 'Services & Job Cards' },
    { value: 'AMC', label: 'AMC Contracts' },
    { value: 'ASSET', label: 'Equipment & Assets' },
    { value: 'PREVENTIVE_MAINTENANCE', label: 'Preventive Maintenance' },
    { value: 'REPORTS', label: 'Reports & Analytics' },
  ];

  const priorities = [
    { value: 'ALL', label: 'All Priorities' },
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'LOW', label: 'Low' },
  ];

  // Fetch Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
      };

      if (activeTab === 'UNREAD') {
        params.status = 'UNREAD';
      } else if (activeTab === 'CRITICAL') {
        params.status = 'CRITICAL';
      } else if (activeTab === 'ARCHIVED') {
        params.status = 'ARCHIVED';
      } else {
        params.status = 'ALL';
      }

      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [listRes, statsRes] = await Promise.all([
        notificationApi.getNotifications(params),
        notificationApi.getStats(),
      ]);

      if (listRes?.success) {
        setNotifications(listRes.items || []);
        setTotalPages(listRes.totalPages || 1);
        setTotalCount(listRes.total || 0);
      }

      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setFeedbackMsg({
        type: 'error',
        text: 'Unable to load notifications. Please refresh and try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, categoryFilter, priorityFilter, searchQuery, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Preferences
  const loadPreferences = async () => {
    try {
      const res = await notificationApi.getPreferences();
      if (res?.success && res.data) {
        setPreferences(res.data);
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
  };

  const handleOpenPreferences = () => {
    loadPreferences();
    setIsPrefOpen(true);
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    try {
      setPrefSaving(true);
      await notificationApi.updatePreferences(preferences);
      setIsPrefOpen(false);
      setFeedbackMsg({
        type: 'success',
        text: 'Notification preferences updated successfully.',
      });
      loadData();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: 'Failed to update preferences. Please try again.',
      });
    } finally {
      setPrefSaving(false);
    }
  };

  // Actions
  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
      if (selectedNotif?.id === id) {
        setSelectedNotif((prev) => ({ ...prev, isRead: true }));
      }
      setStats((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1,
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkUnread = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAsUnread(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: false } : item))
      );
      if (selectedNotif?.id === id) {
        setSelectedNotif((prev) => ({ ...prev, isRead: false }));
      }
      setStats((prev) => ({
        ...prev,
        unread: prev.unread + 1,
        read: Math.max(0, prev.read - 1),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.archiveNotification(id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      if (selectedNotif?.id === id) {
        setSelectedNotif(null);
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this notification?')) return;
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      if (selectedNotif?.id === id) {
        setSelectedNotif(null);
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      await notificationApi.markAllAsRead();
      setFeedbackMsg({
        type: 'success',
        text: 'All active notifications marked as read.',
      });
      loadData();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: 'Failed to mark all as read.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveAll = async () => {
    try {
      setActionLoading(true);
      await notificationApi.archiveAll();
      setFeedbackMsg({
        type: 'success',
        text: 'All read notifications have been archived.',
      });
      loadData();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: 'Failed to archive notifications.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunRuleChecks = async () => {
    try {
      setActionLoading(true);
      const res = await notificationApi.runAutomatedChecks();
      setFeedbackMsg({
        type: 'success',
        text: res?.message || 'Automated rule evaluations completed successfully.',
      });
      loadData();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: 'Failed to execute rule evaluations.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Helper Badge Colors
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-300';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-300';
      case 'NORMAL':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'INVENTORY':
        return '📦';
      case 'SALES':
        return '📄';
      case 'PAYMENTS':
        return '💳';
      case 'PAYABLES':
        return '💼';
      case 'PAYROLL':
        return '💰';
      case 'AMC':
        return '🛡️';
      case 'PREVENTIVE_MAINTENANCE':
        return '🔧';
      case 'ASSET':
        return '⚙️';
      case 'EMPLOYEE':
      case 'ATTENDANCE':
        return '👥';
      case 'PROCUREMENT':
        return '🛒';
      default:
        return '🔔';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg border flex items-center justify-between text-xs font-medium ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-gray-500 hover:text-gray-900 ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Notifications & Alerts</h1>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Active Control Center
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Centralized operational alerts, reminders, workflow events, and system notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRunRuleChecks}
            disabled={actionLoading}
            className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 hover:border-emerald-600 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Scan database and evaluate overdue & low-stock rules"
          >
            <span>⚡</span>
            <span>Evaluate Rules</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            disabled={actionLoading || stats.unread === 0}
            className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 hover:border-emerald-600 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span>✓✓</span>
            <span>Mark All Read</span>
          </button>

          <button
            onClick={handleOpenPreferences}
            className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 hover:border-emerald-600 transition flex items-center gap-1.5 shadow-sm"
          >
            <span>⚙</span>
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* 6 KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Alerts</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Active records</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Unread</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.unread}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Requires review</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">Critical</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{stats.critical}</div>
          <div className="text-[10px] text-red-600 mt-0.5">Immediate action</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">High Priority</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{stats.high}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Attention needed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Due Today</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{stats.dueToday}</div>
          <div className="text-[10px] text-blue-600 mt-0.5">Today&apos;s events</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Overdue Alerts</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{stats.overdueAlerts}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">Bills &amp; PM visits</div>
        </div>
      </div>

      {/* Main Container: Filters & List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 px-6 pt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-6 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('ALL');
                setPage(1);
              }}
              className={`pb-3 border-b-2 transition ${
                activeTab === 'ALL'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All Active ({stats.total})
            </button>
            <button
              onClick={() => {
                setActiveTab('UNREAD');
                setPage(1);
              }}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'UNREAD'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>Unread</span>
              {stats.unread > 0 && (
                <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {stats.unread}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('CRITICAL');
                setPage(1);
              }}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'CRITICAL'
                  ? 'border-red-600 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>Critical</span>
              {stats.critical > 0 && (
                <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {stats.critical}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('ARCHIVED');
                setPage(1);
              }}
              className={`pb-3 border-b-2 transition ${
                activeTab === 'ARCHIVED'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Archived ({stats.archivedCount || 0})
            </button>
          </div>

          {activeTab === 'ALL' && (
            <button
              onClick={handleArchiveAll}
              className="text-[11px] font-medium text-gray-500 hover:text-emerald-700 pb-2 transition"
            >
              Archive Read Items
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-200 flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full relative">
            <input
              type="text"
              placeholder="Search by title, message, reference (e.g. VB-2026, PM-2026)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-emerald-600 transition"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-emerald-600 text-gray-700 font-medium cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-emerald-600 text-gray-700 font-medium cursor-pointer"
            >
              {priorities.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            {(categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setCategoryFilter('ALL');
                  setPriorityFilter('ALL');
                  setSearchQuery('');
                  setPage(1);
                }}
                className="px-2.5 py-2 text-xs text-gray-500 hover:text-red-600 transition font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="py-20 text-center text-xs text-gray-500">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading notifications &amp; alerts...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 text-xl rounded-full flex items-center justify-center mx-auto mb-3">
                ✓
              </div>
              <h3 className="text-sm font-bold text-gray-800">
                {activeTab === 'UNREAD'
                  ? 'No unread alerts'
                  : activeTab === 'CRITICAL'
                  ? 'No critical alerts'
                  : activeTab === 'ARCHIVED'
                  ? 'No archived notifications'
                  : 'No new notifications'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {searchQuery || categoryFilter !== 'ALL' || priorityFilter !== 'ALL'
                  ? 'No notifications match the selected filter criteria.'
                  : "You're all caught up with operations, inventory, and billing events."}
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedNotif(item)}
                className={`p-4 transition cursor-pointer flex items-start gap-4 ${
                  !item.isRead ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-gray-50/80'
                }`}
              >
                {/* Severity Icon */}
                <div className="text-2xl mt-0.5 shrink-0 select-none">
                  {getCategoryIcon(item.category)}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-xs text-gray-900">
                      {item.title}
                    </span>

                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" title="Unread" />
                    )}

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${getPriorityStyle(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>

                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
                      {item.category}
                    </span>

                    {item.notificationNumber && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        {item.notificationNumber}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed max-w-4xl">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-gray-400">
                    <span>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>

                    {item.sourceReference && (
                      <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                        Ref: {item.sourceReference}
                      </span>
                    )}

                    {item.actionUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(item.id);
                          router.push(item.actionUrl);
                        }}
                        className="text-emerald-700 hover:text-emerald-900 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Open Record</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Row Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.isRead ? (
                    <button
                      onClick={(e) => handleMarkUnread(item.id, e)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition text-xs"
                      title="Mark as unread"
                    >
                      Mark Unread
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleMarkRead(item.id, e)}
                      className="p-1.5 text-emerald-700 hover:text-emerald-900 rounded-md hover:bg-emerald-50 transition text-xs font-semibold"
                      title="Mark as read"
                    >
                      ✓ Read
                    </button>
                  )}

                  {!item.isArchived ? (
                    <button
                      onClick={(e) => handleArchive(item.id, e)}
                      className="p-1.5 text-gray-400 hover:text-amber-700 rounded-md hover:bg-gray-100 transition text-xs"
                      title="Archive"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-700 rounded-md hover:bg-gray-100 transition text-xs"
                      title="Delete"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, totalCount)} of {totalCount} alerts
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 transition font-medium"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 transition font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Detail Drawer */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <div>
                <div className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">
                  {selectedNotif.category} ALERT
                </div>
                <h2 className="text-base font-bold mt-0.5">{selectedNotif.title}</h2>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="text-emerald-200 hover:text-white text-lg p-1 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${getPriorityStyle(
                    selectedNotif.priority
                  )}`}
                >
                  {selectedNotif.priority} Priority
                </span>

                <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded font-semibold">
                  {selectedNotif.category}
                </span>

                <span
                  className={`text-xs px-2.5 py-1 rounded font-semibold ${
                    selectedNotif.isRead
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedNotif.isRead ? 'Read' : 'Unread'}
                </span>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Message Details</div>
                <p className="text-xs text-gray-800 bg-gray-50 p-3.5 rounded-lg border border-gray-200 leading-relaxed">
                  {selectedNotif.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 font-medium">Notification Number:</span>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {selectedNotif.notificationNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Created Date:</span>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {selectedNotif.createdAt
                      ? new Date(selectedNotif.createdAt).toLocaleString('en-IN')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Source Module:</span>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {selectedNotif.sourceModule || 'SYSTEM'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Source Reference:</span>
                  <p className="font-semibold text-emerald-800 mt-0.5">
                    {selectedNotif.sourceReference || 'N/A'}
                  </p>
                </div>
              </div>

              {selectedNotif.actionUrl && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-900">Linked ERP Action</div>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    This notification is linked to module route{' '}
                    <code className="bg-white/60 px-1 py-0.5 rounded font-mono">
                      {selectedNotif.actionUrl}
                    </code>
                    .
                  </p>
                  <button
                    onClick={() => {
                      handleMarkRead(selectedNotif.id);
                      router.push(selectedNotif.actionUrl);
                    }}
                    className="mt-3 w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                  >
                    Go to Linked Module Record →
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Fixed Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              {selectedNotif.isRead ? (
                <button
                  onClick={() => handleMarkUnread(selectedNotif.id)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition"
                >
                  Mark as Unread
                </button>
              ) : (
                <button
                  onClick={() => handleMarkRead(selectedNotif.id)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition"
                >
                  Mark as Read
                </button>
              )}

              <button
                onClick={() => handleArchive(selectedNotif.id)}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition"
              >
                Archive
              </button>

              <button
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {isPrefOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Notification &amp; Alert Preferences</h3>
                <p className="text-[11px] text-emerald-200 mt-0.5">
                  Configure categories and threshold rules for server notifications.
                </p>
              </div>
              <button
                onClick={() => setIsPrefOpen(false)}
                className="text-emerald-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Minimum Alert Priority Threshold
                </label>
                <select
                  value={preferences.minPriority}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, minPriority: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-emerald-600"
                >
                  <option value="LOW">LOW — Receive all alerts and informational events</option>
                  <option value="NORMAL">NORMAL — Receive standard operational events and above</option>
                  <option value="HIGH">HIGH — Only receive urgent and high-priority alerts</option>
                  <option value="CRITICAL">CRITICAL — Only receive critical outages and errors</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="text-xs font-bold text-gray-800 mb-3">
                  Module Alert Subscriptions
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { key: 'inventoryAlerts', label: 'Inventory & Stock Alerts' },
                    { key: 'payablesAlerts', label: 'Vendor Bills & Payables' },
                    { key: 'salesAlerts', label: 'Customer Invoices & Sales' },
                    { key: 'paymentAlerts', label: 'Payment Transactions' },
                    { key: 'amcAlerts', label: 'AMC Contracts & Expiry' },
                    { key: 'pmAlerts', label: 'Preventive Maintenance' },
                    { key: 'assetAlerts', label: 'Asset Warranty & History' },
                    { key: 'payrollAlerts', label: 'Payroll & Salaries' },
                    { key: 'employeeAlerts', label: 'Employee Lifecycle' },
                    { key: 'attendanceAlerts', label: 'Attendance Anomalies' },
                    { key: 'serviceAlerts', label: 'Service Job Cards' },
                    { key: 'procurementAlerts', label: 'Purchase Orders' },
                    { key: 'systemAlerts', label: 'System & Integrity Events' },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={preferences[key] !== false}
                        onChange={(e) =>
                          setPreferences((prev) => ({
                            ...prev,
                            [key]: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-gray-700 font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                <strong>Note:</strong> Critical system events (such as zero stock or critical payment failures) will bypass category suppression to ensure business continuity.
              </div>
            </form>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsPrefOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={prefSaving}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                {prefSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
