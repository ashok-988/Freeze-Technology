'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notificationApi } from '../lib/api/client';

export default function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [previewItems, setPreviewItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnread = async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      if (res?.success && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch (e) {
      // safe fallback
    }
  };

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({
        status: 'UNREAD',
        limit: 5,
      });
      if (res?.success && Array.isArray(res.items)) {
        setPreviewItems(res.items);
      }
    } catch (e) {
      // safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchPreview();
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notif) => {
    try {
      await notificationApi.markAsRead(notif.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {}
    setIsOpen(false);
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    } else {
      router.push('/notifications');
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-emerald-700 hover:bg-gray-100 rounded-full transition focus:outline-none"
        title="Notifications & Alerts"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Notifications & Alerts</span>
              {unreadCount > 0 && (
                <span className="bg-emerald-500/30 text-emerald-100 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-emerald-200 hover:text-white underline font-medium"
            >
              View All
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-500">
                Loading alerts...
              </div>
            ) : previewItems.length === 0 ? (
              <div className="py-8 text-center px-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  ✓
                </div>
                <p className="text-xs font-semibold text-gray-800">All caught up!</p>
                <p className="text-[11px] text-gray-500 mt-0.5">No unread alerts requiring attention.</p>
              </div>
            ) : (
              previewItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className="p-3.5 hover:bg-emerald-50/50 cursor-pointer transition flex items-start gap-3"
                >
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {item.title}
                      </p>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold uppercase ${getPriorityBadge(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400">
                      <span className="font-medium text-emerald-800">{item.category}</span>
                      <span>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={async () => {
                await notificationApi.markAllAsRead();
                setUnreadCount(0);
                setPreviewItems([]);
              }}
              className="text-[11px] font-medium text-gray-600 hover:text-emerald-700 transition px-2 py-1"
            >
              Mark all as read
            </button>
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition px-2 py-1 flex items-center gap-1"
            >
              Open Center →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
