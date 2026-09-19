import React from 'react';
import Link from 'next/link';

export default function ModulePlaceholder({
  title,
  category,
  description,
  plannedPhase,
}) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand bg-brand-soft px-2.5 py-0.5 rounded">
              {category || 'ERP Module'}
            </span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
              Migration Status: Pending
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-2">{title}</h2>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-xs font-semibold hover:bg-gray-50 transition"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>

      {/* Migration Notice Card */}
      <div className="bg-white border border-gray-200 rounded-card p-6 shadow-sm">
        <div className="max-w-2xl">
          <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 p-1 flex items-center justify-center mb-4 shadow-sm">
            <img
              src="/logo.png"
              alt="Freeze Technology"
              className="w-full h-full object-contain"
            />
          </div>

          <h3 className="text-base font-bold text-gray-900 mb-2">
            {title} Module
          </h3>

          <p className="text-xs text-gray-600 leading-relaxed mb-4">
            This module is part of the Freeze Technology ERP suite defined in the Product Requirements Document (PRD). It is scheduled for vertical slice migration in upcoming phases ({plannedPhase || 'Phase 2+'}).
          </p>

          <div className="bg-canvas border border-gray-200 rounded-lg p-4 text-xs text-gray-700 space-y-2 mb-6">
            <div className="font-semibold text-gray-900">Functional Reference Information:</div>
            <p className="text-gray-600">
              The existing legacy single-page ERP implementation (<code className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-mono text-[11px]">index.html</code>) remains fully operational and serves as the functional reference until this vertical slice is implemented and verified.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-gray-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Canonical Next.js Route Active
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500 font-medium">
              NestJS API Bridge Ready
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500 font-medium">
              Prisma Relational Model Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
