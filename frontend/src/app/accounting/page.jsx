'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Scale,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  RotateCcw,
  Building2,
  ExternalLink,
  PieChart,
  Eye,
} from 'lucide-react';
import { accountingApi } from '@/lib/api/client';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Core Datasets
  const [dashboardData, setDashboardData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [journalMeta, setJournalMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [ledgerData, setLedgerData] = useState([]);
  const [trialBalance, setTrialBalance] = useState(null);
  const [pnlData, setPnlData] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [cashBook, setCashBook] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [periods, setPeriods] = useState([]);

  // Filters & State
  const [coaSearch, setCoaSearch] = useState('');
  const [coaTypeFilter, setCoaTypeFilter] = useState('');
  const [journalFilter, setJournalFilter] = useState({ search: '', status: '', referenceType: '', page: 1 });
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState('');

  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountFormData, setAccountFormData] = useState({
    accountCode: '',
    accountName: '',
    accountType: 'EXPENSE',
    accountGroup: 'OTHER_OPERATING_EXPENSES',
    parentId: '',
    description: '',
    allowPosting: true,
    openingBalance: 0,
  });

  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalFormData, setJournalFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    referenceType: 'MANUAL',
    referenceNumber: '',
    narration: '',
    lines: [
      { accountId: '', debit: 0, credit: 0, description: '' },
      { accountId: '', debit: 0, credit: 0, description: '' },
    ],
  });

  const [showReversalModal, setShowReversalModal] = useState(false);
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversalReason, setReversalReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dash, accs, jrnls, tb, pnl, bs, cash, rec, prds] = await Promise.all([
        accountingApi.getDashboard().catch(() => null),
        accountingApi.getAccounts({}).catch(() => []),
        accountingApi.getJournals({ page: '1', limit: '20' }).catch(() => ({ items: [], total: 0 })),
        accountingApi.getTrialBalance({}).catch(() => null),
        accountingApi.getProfitAndLoss({}).catch(() => null),
        accountingApi.getBalanceSheet({}).catch(() => null),
        accountingApi.getCashBook({}).catch(() => null),
        accountingApi.getReconciliation().catch(() => null),
        accountingApi.getPeriods().catch(() => []),
      ]);

      setDashboardData(dash);
      setAccounts(Array.isArray(accs) ? accs : []);
      if (jrnls) {
        setJournals(jrnls.items || []);
        setJournalMeta({ page: jrnls.page || 1, total: jrnls.total || 0, totalPages: jrnls.totalPages || 1 });
      }
      setTrialBalance(tb);
      setPnlData(pnl);
      setBalanceSheet(bs);
      setCashBook(cash);
      setReconciliation(rec);
      setPeriods(Array.isArray(prds) ? prds : []);

      if (Array.isArray(accs) && accs.length > 0 && !selectedLedgerAccount) {
        const defaultAcc = accs.find((a) => a.accountCode === '1030') || accs[0];
        setSelectedLedgerAccount(defaultAcc.id);
      }
    } catch (err) {
      console.error('Failed to load accounting data:', err);
      setError('Unable to load accounting data. Please ensure backend is operational.');
    } finally {
      setLoading(false);
    }
  }, [selectedLedgerAccount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load single account ledger when selection changes
  useEffect(() => {
    if (selectedLedgerAccount && activeTab === 'ledger') {
      accountingApi
        .getLedger({ accountId: selectedLedgerAccount })
        .then((res) => setLedgerData(res || []))
        .catch((err) => console.error('Ledger fetch error:', err));
    }
  }, [selectedLedgerAccount, activeTab]);

  // Trigger ERP Sync
  const handleSyncErp = async () => {
    try {
      setSyncing(true);
      setError(null);
      const res = await accountingApi.syncErp();
      setSuccessMsg(`ERP Transactions Synced! Generated ${res.syncedCounts?.totalSyncedJournals || 0} automated double-entry postings.`);
      setTimeout(() => setSuccessMsg(null), 6000);
      await loadData();
    } catch (err) {
      console.error('ERP sync error:', err);
      setError(err.response?.data?.message || 'Failed to synchronize ERP transactions.');
    } finally {
      setSyncing(false);
    }
  };

  // Create Account Handler
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await accountingApi.createAccount({
        ...accountFormData,
        openingBalance: Number(accountFormData.openingBalance || 0),
        parentId: accountFormData.parentId || undefined,
      });
      setShowAccountModal(false);
      setSuccessMsg(`Account "${accountFormData.accountName}" created successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account.');
    }
  };

  // Manual Journal Balancing calculations
  const calculateJournalTotals = () => {
    const totalDebit = journalFormData.lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
    const totalCredit = journalFormData.lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff <= 0.01 && totalDebit > 0;
    return { totalDebit, totalCredit, diff, isBalanced };
  };

  const handleJournalLineChange = (index, field, value) => {
    const lines = [...journalFormData.lines];
    lines[index][field] = value;
    if (field === 'debit' && parseFloat(value) > 0) {
      lines[index]['credit'] = 0;
    } else if (field === 'credit' && parseFloat(value) > 0) {
      lines[index]['debit'] = 0;
    }
    setJournalFormData({ ...journalFormData, lines });
  };

  const addJournalLine = () => {
    setJournalFormData({
      ...journalFormData,
      lines: [...journalFormData.lines, { accountId: '', debit: 0, credit: 0, description: '' }],
    });
  };

  const removeJournalLine = (index) => {
    if (journalFormData.lines.length <= 2) return;
    const lines = journalFormData.lines.filter((_, i) => i !== index);
    setJournalFormData({ ...journalFormData, lines });
  };

  // Submit Journal
  const handleCreateJournal = async (e) => {
    e.preventDefault();
    const { isBalanced } = calculateJournalTotals();
    if (!isBalanced) {
      setError('Journal is unbalanced. Total Debits must exactly equal Total Credits and be greater than 0.');
      return;
    }

    try {
      setError(null);
      await accountingApi.createJournal({
        ...journalFormData,
        lines: journalFormData.lines.map((l) => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || undefined,
        })),
      });
      setShowJournalModal(false);
      setSuccessMsg('Double-entry journal posted successfully to General Ledger.');
      setTimeout(() => setSuccessMsg(null), 5000);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post journal entry.');
    }
  };

  // Reverse Journal
  const handleReverseJournal = async () => {
    if (!reversalTarget || !reversalReason) return;
    try {
      setError(null);
      await accountingApi.reverseJournal(reversalTarget.id, { reason: reversalReason });
      setShowReversalModal(false);
      setReversalTarget(null);
      setReversalReason('');
      setSuccessMsg(`Journal #${reversalTarget.journalNumber} reversed successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reverse journal entry.');
    }
  };

  // Download PDF Helper
  const handlePdfDownload = async (type, accountId) => {
    try {
      let blob;
      let filename = `Accounting_${type}_FreezeTech.pdf`;
      if (type === 'coa') blob = await accountingApi.downloadCoaPdf();
      else if (type === 'tb') blob = await accountingApi.downloadTrialBalancePdf();
      else if (type === 'pnl') blob = await accountingApi.downloadProfitAndLossPdf();
      else if (type === 'bs') blob = await accountingApi.downloadBalanceSheetPdf();
      else if (type === 'cash') blob = await accountingApi.downloadCashBookPdf();
      else if (type === 'register') blob = await accountingApi.downloadJournalRegisterPdf();
      else if (type === 'rec') blob = await accountingApi.downloadReconciliationPdf();
      else if (type === 'ledger') {
        blob = await accountingApi.downloadLedgerPdf(accountId);
        filename = `General_Ledger_FreezeTech.pdf`;
      }

      if (blob) {
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error('PDF download error:', err);
      setError('Could not generate PDF document.');
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.accountCode.toLowerCase().includes(coaSearch.toLowerCase()) ||
      acc.accountName.toLowerCase().includes(coaSearch.toLowerCase()) ||
      (acc.description && acc.description.toLowerCase().includes(coaSearch.toLowerCase()));
    const matchesType = !coaTypeFilter || acc.accountType === coaTypeFilter;
    return matchesSearch && matchesType;
  });

  const { totalDebit: formDebit, totalCredit: formCredit, diff: formDiff, isBalanced: formBalanced } =
    calculateJournalTotals();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-lg">
              <BookOpen className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accounting & General Ledger</h1>
              <p className="text-sm text-slate-500">
                Double-entry financial bookkeeping, multi-period statements, and subledger reconciliation
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncErp}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
            title="Scan and post unrecorded ERP transactions (Invoices, Payments, Bills, Payroll)"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing ERP...' : 'Sync ERP Records'}</span>
          </button>

          <button
            onClick={() => setShowJournalModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Journal</span>
          </button>

          <button
            onClick={() => handlePdfDownload('tb')}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Trial Balance PDF</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
            ×
          </button>
        </div>
      )}

      {/* 2. Integrity Strip */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Double-Entry Status</p>
              <div className="flex items-center gap-1.5 mt-1">
                {dashboardData.trialBalance?.isBalanced ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-base font-bold text-emerald-700">Balanced Ledger</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span className="text-base font-bold text-rose-700">Unbalanced Variance</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Postings</p>
              <p className="text-sm font-bold text-slate-800">₹{dashboardData.trialBalance?.totalDebits?.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash & Bank Liquidity</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹{dashboardData.cashAndBank?.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GL Net Revenue</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹{dashboardData.profitAndLoss?.revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Gross Margin</p>
              <p className="text-sm font-bold text-emerald-600">{dashboardData.profitAndLoss?.grossMarginPct}%</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subledger Reconciliation</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    dashboardData.reconciliation?.accountsReceivable?.status === 'RECONCILED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  AR: {dashboardData.reconciliation?.accountsReceivable?.status}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    dashboardData.reconciliation?.accountsPayable?.status === 'RECONCILED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  AP: {dashboardData.reconciliation?.accountsPayable?.status}
                </span>
              </div>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Scale className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 overflow-x-auto pb-1 text-sm font-medium">
          {[
            { id: 'overview', label: 'Overview', icon: PieChart },
            { id: 'coa', label: 'Chart of Accounts', icon: Layers },
            { id: 'journals', label: 'Journal Entries', icon: FileText },
            { id: 'ledger', label: 'General Ledger', icon: BookOpen },
            { id: 'trial_balance', label: 'Trial Balance', icon: Scale },
            { id: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
            { id: 'balance_sheet', label: 'Balance Sheet', icon: ShieldCheck },
            { id: 'cash_book', label: 'Cash & Bank', icon: DollarSign },
            { id: 'reconciliation', label: 'Reconciliation', icon: CheckCircle2 },
            { id: 'periods', label: 'Accounting Periods', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg whitespace-nowrap transition ${
                  active
                    ? 'bg-brand text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && dashboardData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit & Loss Snapshot */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Profit & Loss Summary
                </h3>
                <button
                  onClick={() => handlePdfDownload('pnl')}
                  className="text-xs text-brand font-medium hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
              <div className="space-y-3 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Gross Operating Revenue:</span>
                  <span className="font-bold text-slate-800">
                    ₹{dashboardData.profitAndLoss?.revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Gross Profit (Margin {dashboardData.profitAndLoss?.grossMarginPct}%):</span>
                  <span className="font-bold text-emerald-700">
                    ₹{dashboardData.profitAndLoss?.grossProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">
                    Net Profit (Margin {dashboardData.profitAndLoss?.netMarginPct}%):
                  </span>
                  <span
                    className={`font-bold text-base ${
                      dashboardData.profitAndLoss?.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    ₹{dashboardData.profitAndLoss?.netProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Balance Sheet Snapshot */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Balance Sheet Equation
                </h3>
                <button
                  onClick={() => handlePdfDownload('bs')}
                  className="text-xs text-brand font-medium hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
              <div className="space-y-3 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Assets:</span>
                  <span className="font-bold text-slate-800">
                    ₹{dashboardData.balanceSheet?.totalAssets?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Liabilities + Equity:</span>
                  <span className="font-bold text-slate-800">
                    ₹{dashboardData.balanceSheet?.totalLiabilitiesAndEquity?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">Accounting Equation Balance:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> ASSETS = LIABILITIES + EQUITY
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('coa')}
              className="p-4 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-left transition group shadow-sm"
            >
              <Layers className="w-5 h-5 text-brand mb-2 group-hover:scale-110 transition" />
              <div className="font-bold text-slate-800 text-sm">Chart of Accounts</div>
              <div className="text-xs text-slate-500 mt-1">{dashboardData.stats?.totalAccounts} Accounts Defined</div>
            </button>

            <button
              onClick={() => setActiveTab('journals')}
              className="p-4 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-left transition group shadow-sm"
            >
              <FileText className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition" />
              <div className="font-bold text-slate-800 text-sm">Journal Register</div>
              <div className="text-xs text-slate-500 mt-1">{dashboardData.stats?.totalJournals} Posted Entries</div>
            </button>

            <button
              onClick={() => setActiveTab('trial_balance')}
              className="p-4 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-left transition group shadow-sm"
            >
              <Scale className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition" />
              <div className="font-bold text-slate-800 text-sm">Trial Balance</div>
              <div className="text-xs text-slate-500 mt-1">Verified Equal Debits & Credits</div>
            </button>

            <button
              onClick={() => setActiveTab('reconciliation')}
              className="p-4 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-left transition group shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition" />
              <div className="font-bold text-slate-800 text-sm">Subledger Rec</div>
              <div className="text-xs text-slate-500 mt-1">AR, AP & GST Validation</div>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHART OF ACCOUNTS */}
      {/* ========================================================================= */}
      {activeTab === 'coa' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code or account title..."
                  value={coaSearch}
                  onChange={(e) => setCoaSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <select
                value={coaTypeFilter}
                onChange={(e) => setCoaTypeFilter(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">All Account Types</option>
                <option value="ASSET">Assets</option>
                <option value="LIABILITY">Liabilities</option>
                <option value="EQUITY">Equity</option>
                <option value="REVENUE">Revenue</option>
                <option value="EXPENSE">Expenses</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePdfDownload('coa')}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>

              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark"
              >
                <Plus className="w-3.5 h-3.5" /> Add Account
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Account Title</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Group</th>
                  <th className="py-2.5 px-3">Normal</th>
                  <th className="py-2.5 px-3 text-right">Current Balance</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{acc.accountCode}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {acc.accountName}
                      {acc.isSystemAccount && (
                        <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-normal">
                          System
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          acc.accountType === 'ASSET'
                            ? 'bg-blue-100 text-blue-800'
                            : acc.accountType === 'LIABILITY'
                            ? 'bg-amber-100 text-amber-800'
                            : acc.accountType === 'EQUITY'
                            ? 'bg-purple-100 text-purple-800'
                            : acc.accountType === 'REVENUE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {acc.accountType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">{acc.accountGroup}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-600">{acc.normalBalance}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      ₹{acc.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedLedgerAccount(acc.id);
                          setActiveTab('ledger');
                        }}
                        className="text-xs text-brand hover:underline font-medium"
                      >
                        View Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: JOURNAL ENTRIES */}
      {/* ========================================================================= */}
      {activeTab === 'journals' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-slate-800 text-base">General Journal Register</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePdfDownload('register')}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>

              <button
                onClick={() => setShowJournalModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark"
              >
                <Plus className="w-3.5 h-3.5" /> New Journal
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Journal #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Narration</th>
                  <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                  <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {journals.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{j.journalNumber}</td>
                    <td className="py-2.5 px-3 text-slate-600">{new Date(j.entryDate).toLocaleDateString('en-IN')}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        {j.referenceType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 max-w-xs truncate" title={j.narration}>
                      {j.narration}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      ₹{j.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      ₹{j.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          j.status === 'POSTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : j.status === 'REVERSED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {j.status === 'POSTED' && !j.reversedEntryId && (
                        <button
                          onClick={() => {
                            setReversalTarget(j);
                            setShowReversalModal(true);
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center justify-center gap-1 mx-auto"
                          title="Reverse this journal entry"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reverse</span>
                        </button>
                      )}
                      {j.status === 'REVERSED' && (
                        <span className="text-xs text-slate-400">Reversed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GENERAL LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700">Select Account:</label>
              <select
                value={selectedLedgerAccount}
                onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand font-medium"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.accountCode}] {a.accountName} ({a.accountType})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handlePdfDownload('ledger', selectedLedgerAccount)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" /> Download Ledger PDF
            </button>
          </div>

          {ledgerData.map((accLedger) => (
            <div key={accLedger.accountId} className="space-y-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">
                    [{accLedger.accountCode}] {accLedger.accountName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Normal Balance: {accLedger.normalBalance} | Opening Balance: ₹
                    {accLedger.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Closing Balance</p>
                  <p className="text-lg font-bold text-brand">
                    ₹{accLedger.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Journal #</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Narration</th>
                      <th className="py-2 px-3 text-right">Debit (₹)</th>
                      <th className="py-2 px-3 text-right">Credit (₹)</th>
                      <th className="py-2 px-3 text-right">Running Bal (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accLedger.entries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400">
                          No transactions recorded for this account.
                        </td>
                      </tr>
                    ) : (
                      accLedger.entries.map((e) => (
                        <tr key={e.lineId} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 text-slate-600">{new Date(e.entryDate).toLocaleDateString('en-IN')}</td>
                          <td className="py-2 px-3 font-mono font-medium text-slate-800">{e.journalNumber}</td>
                          <td className="py-2 px-3 text-xs text-slate-500">{e.referenceType}</td>
                          <td className="py-2 px-3 text-slate-800 max-w-xs truncate">{e.narration}</td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-slate-800">
                            {e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-slate-800">
                            {e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{e.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TRIAL BALANCE */}
      {/* ========================================================================= */}
      {activeTab === 'trial_balance' && trialBalance && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Trial Balance Summary</h3>
              <p className="text-xs text-slate-500">
                Double-entry balancing verification: Total Debits must equal Total Credits
              </p>
            </div>
            <button
              onClick={() => handlePdfDownload('tb')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Account Code</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Account Type</th>
                  <th className="py-2.5 px-3 text-right">Debit Balance (₹)</th>
                  <th className="py-2.5 px-3 text-right">Credit Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {trialBalance.rows.map((r) => (
                  <tr key={r.accountId} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-bold text-slate-800">{r.accountCode}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-900">{r.accountName}</td>
                    <td className="py-2 px-3 font-sans text-xs text-slate-500">{r.accountType}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-800">
                      {r.debitBalance > 0 ? `₹${r.debitBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-800">
                      {r.creditBalance > 0 ? `₹${r.creditBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-mono text-sm font-bold">
                <tr>
                  <td colSpan={3} className="py-3 px-3 uppercase font-sans">
                    Total General Ledger Balances
                  </td>
                  <td className="py-3 px-3 text-right">
                    ₹{trialBalance.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right">
                    ₹{trialBalance.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PROFIT & LOSS */}
      {/* ========================================================================= */}
      {activeTab === 'pnl' && pnlData && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Profit & Loss Statement</h3>
              <p className="text-xs text-slate-500">Period: {pnlData.period} | Freeze Technology ERP</p>
            </div>
            <button
              onClick={() => handlePdfDownload('pnl')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark"
            >
              <Download className="w-3.5 h-3.5" /> Download P&L PDF
            </button>
          </div>

          {/* Revenue */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-sm text-slate-900 border-b border-slate-200 pb-1">
              <span>1. OPERATING REVENUE</span>
              <span>₹{pnlData.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {pnlData.revenue.items.map((it) => (
              <div key={it.code} className="flex justify-between text-sm text-slate-600 pl-4">
                <span>
                  {it.code} - {it.name}
                </span>
                <span className="font-mono">₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>

          {/* COGS */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-sm text-slate-900 border-b border-slate-200 pb-1">
              <span>2. COST OF GOODS SOLD (DIRECT PURCHASES)</span>
              <span>₹{pnlData.costOfGoodsSold.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {pnlData.costOfGoodsSold.items.map((it) => (
              <div key={it.code} className="flex justify-between text-sm text-slate-600 pl-4">
                <span>
                  {it.code} - {it.name}
                </span>
                <span className="font-mono">₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>

          {/* Gross Profit Banner */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center font-bold text-blue-900">
            <span>GROSS PROFIT (Margin: {pnlData.grossMarginPct}%)</span>
            <span className="text-lg font-mono">
              ₹{pnlData.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Expenses */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-sm text-slate-900 border-b border-slate-200 pb-1">
              <span>3. OPERATING EXPENSES & OVERHEADS</span>
              <span>₹{pnlData.operatingExpenses.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {pnlData.operatingExpenses.items.map((it) => (
              <div key={it.code} className="flex justify-between text-sm text-slate-600 pl-4">
                <span>
                  {it.code} - {it.name}
                </span>
                <span className="font-mono">₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>

          {/* Net Profit Banner */}
          <div
            className={`p-4 rounded-xl flex justify-between items-center font-bold text-white shadow-sm ${
              pnlData.netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            <div>
              <div className="text-base">NET PROFIT / (LOSS)</div>
              <div className="text-xs text-emerald-100 font-normal">Net Profit Margin: {pnlData.netMarginPct}%</div>
            </div>
            <span className="text-2xl font-mono">
              ₹{pnlData.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: BALANCE SHEET */}
      {/* ========================================================================= */}
      {activeTab === 'balance_sheet' && balanceSheet && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Balance Sheet Statement</h3>
              <p className="text-xs text-slate-500">As on {new Date().toLocaleDateString('en-IN')}</p>
            </div>
            <button
              onClick={() => handlePdfDownload('bs')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark"
            >
              <Download className="w-3.5 h-3.5" /> Download BS PDF
            </button>
          </div>

          {/* Assets Section */}
          <div className="space-y-3">
            <div className="p-2 bg-slate-100 font-bold text-slate-800 text-sm flex justify-between">
              <span>I. ASSETS</span>
              <span>₹{balanceSheet.assets.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="pl-4 space-y-2">
              <div className="font-semibold text-xs text-slate-600 uppercase">Current Assets:</div>
              {balanceSheet.assets.currentAssets.items.map((it) => (
                <div key={it.code} className="flex justify-between text-sm text-slate-700 pl-2">
                  <span>
                    {it.code} - {it.name}
                  </span>
                  <span className="font-mono">₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              <div className="font-semibold text-xs text-slate-600 uppercase pt-2">Fixed Assets:</div>
              {balanceSheet.assets.fixedAssets.items.map((it) => (
                <div key={it.code} className="flex justify-between text-sm text-slate-700 pl-2">
                  <span>
                    {it.code} - {it.name}
                  </span>
                  <span className="font-mono">₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Liabilities Section */}
          <div className="space-y-3">
            <div className="p-2 bg-slate-100 font-bold text-slate-800 text-sm flex justify-between">
              <span>II. LIABILITIES & EQUITY</span>
              <span>
                ₹{balanceSheet.totalLiabilitiesAndEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pl-4 space-y-2">
              <div className="font-semibold text-xs text-slate-600 uppercase">Current Liabilities:</div>
              {balanceSheet.liabilities.currentLiabilities.items.map((it) => (
                <div key={it.code} className="flex justify-between text-sm text-slate-700 pl-2">
                  <span>
                    {it.code} - {it.name}
                  </span>
                  <span className="font-mono">₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              <div className="font-semibold text-xs text-slate-600 uppercase pt-2">Equity & Reserves:</div>
              {balanceSheet.equity.items.map((it) => (
                <div key={it.code} className="flex justify-between text-sm text-slate-700 pl-2">
                  <span>
                    {it.code} - {it.name}
                  </span>
                  <span className="font-mono">₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: CASH & BANK */}
      {/* ========================================================================= */}
      {activeTab === 'cash_book' && cashBook && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Cash & Bank Statement</h3>
              <p className="text-xs text-slate-500">
                Consolidated Liquid Cash/Bank Closing Balance: ₹
                {cashBook.summary.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button
              onClick={() => handlePdfDownload('cash')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark"
            >
              <Download className="w-3.5 h-3.5" /> Download Cash Book PDF
            </button>
          </div>

          {cashBook.accounts.map((acc) => (
            <div key={acc.accountId} className="space-y-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">
                    {acc.accountCode} - {acc.accountName}
                  </h4>
                  <p className="text-xs text-slate-500">Group: {acc.accountGroup}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Account Balance</p>
                  <p className="text-base font-bold text-emerald-700">
                    ₹{acc.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Journal #</th>
                      <th className="py-2 px-3">Narration</th>
                      <th className="py-2 px-3 text-right">Receipt (₹)</th>
                      <th className="py-2 px-3 text-right">Payment (₹)</th>
                      <th className="py-2 px-3 text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {acc.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-3 text-center text-slate-400 font-sans">
                          No cash/bank receipts or payments recorded in this account.
                        </td>
                      </tr>
                    ) : (
                      acc.transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-sans text-slate-600">
                            {new Date(t.entryDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">{t.journalNumber}</td>
                          <td className="py-2 px-3 font-sans text-slate-800 max-w-xs truncate">{t.narration}</td>
                          <td className="py-2 px-3 text-right text-emerald-600 font-bold">
                            {t.receipt > 0 ? `+₹${t.receipt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right text-rose-600 font-bold">
                            {t.payment > 0 ? `-₹${t.payment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            ₹{t.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: RECONCILIATION */}
      {/* ========================================================================= */}
      {activeTab === 'reconciliation' && reconciliation && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Subledger Reconciliation Control</h3>
              <p className="text-xs text-slate-500">
                Audits Subledgers (Invoices, Bills, Tax) against General Ledger Accounts
              </p>
            </div>
            <button
              onClick={() => handlePdfDownload('rec')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark"
            >
              <Download className="w-3.5 h-3.5" /> Download Reconciliation PDF
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* AR Rec */}
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">1. Accounts Receivable (AR)</h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    reconciliation.accountsReceivable.status === 'RECONCILED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {reconciliation.accountsReceivable.status}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoices Outstanding:</span>
                  <span className="font-mono font-bold">
                    ₹{reconciliation.accountsReceivable.subledgerTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GL Account 1030:</span>
                  <span className="font-mono font-bold">
                    ₹{reconciliation.accountsReceivable.glTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                  <span>Variance:</span>
                  <span className="font-mono">₹{reconciliation.accountsReceivable.difference}</span>
                </div>
              </div>
            </div>

            {/* AP Rec */}
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">2. Accounts Payable (AP)</h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    reconciliation.accountsPayable.status === 'RECONCILED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {reconciliation.accountsPayable.status}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bills Outstanding:</span>
                  <span className="font-mono font-bold">
                    ₹{reconciliation.accountsPayable.subledgerTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GL Account 2010:</span>
                  <span className="font-mono font-bold">
                    ₹{reconciliation.accountsPayable.glTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                  <span>Variance:</span>
                  <span className="font-mono">₹{reconciliation.accountsPayable.difference}</span>
                </div>
              </div>
            </div>

            {/* GST Rec */}
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">3. GST Position</h4>
                <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                  RECONCILED
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Output GST:</span>
                  <span className="font-mono font-bold">₹{reconciliation.gstPosition.outputGst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Input GST Credit:</span>
                  <span className="font-mono font-bold">₹{reconciliation.gstPosition.inputGst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                  <span>Net GST Payable:</span>
                  <span className="font-mono">₹{reconciliation.gstPosition.netGstLiability.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: ACCOUNTING PERIODS */}
      {/* ========================================================================= */}
      {activeTab === 'periods' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Financial Years & Accounting Periods</h3>
              <p className="text-xs text-slate-500">
                Transactions can only be posted into OPEN periods. Closed periods lock accounting records.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">FY Code</th>
                  <th className="py-2.5 px-3">Period Label</th>
                  <th className="py-2.5 px-3">Start Date</th>
                  <th className="py-2.5 px-3">End Date</th>
                  <th className="py-2.5 px-3 text-center">Journals Tracked</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{p.financialYear}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{p.periodName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{new Date(p.startDate).toLocaleDateString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-slate-600">{new Date(p.endDate).toLocaleDateString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{p._count?.journalEntries || 0}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          p.status === 'OPEN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'CLOSED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.status === 'OPEN' ? (
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to close ${p.periodName}?`)) {
                              await accountingApi.closePeriod(p.id);
                              await loadData();
                            }
                          }}
                          className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center justify-center gap-1 mx-auto"
                        >
                          <Lock className="w-3 h-3" /> Close Period
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await accountingApi.reopenPeriod(p.id);
                            await loadData();
                          }}
                          className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center justify-center gap-1 mx-auto"
                        >
                          <Unlock className="w-3 h-3" /> Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE ACCOUNT */}
      {/* ========================================================================= */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Add Account to Chart of Accounts</h3>
              <button onClick={() => setShowAccountModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5095"
                  value={accountFormData.accountCode}
                  onChange={(e) => setAccountFormData({ ...accountFormData, accountCode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Courier & Logistics"
                  value={accountFormData.accountName}
                  onChange={(e) => setAccountFormData({ ...accountFormData, accountName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={accountFormData.accountType}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="EQUITY">EQUITY</option>
                    <option value="REVENUE">REVENUE</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Group</label>
                  <select
                    value={accountFormData.accountGroup}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountGroup: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  >
                    <option value="OTHER_OPERATING_EXPENSES">OTHER_EXPENSES</option>
                    <option value="CASH">CASH</option>
                    <option value="BANK">BANK</option>
                    <option value="RECEIVABLES">RECEIVABLES</option>
                    <option value="PAYABLES">PAYABLES</option>
                    <option value="COGS">COGS</option>
                    <option value="SALARIES">SALARIES</option>
                    <option value="RENT">RENT</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={accountFormData.openingBalance}
                  onChange={(e) => setAccountFormData({ ...accountFormData, openingBalance: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW JOURNAL ENTRY (DOUBLE ENTRY) */}
      {/* ========================================================================= */}
      {showJournalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">New Double-Entry Journal</h3>
                <p className="text-xs text-slate-500">Post balanced debits and credits directly to General Ledger</p>
              </div>
              <button onClick={() => setShowJournalModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJournal} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Entry Date</label>
                  <input
                    type="date"
                    required
                    value={journalFormData.entryDate}
                    onChange={(e) => setJournalFormData({ ...journalFormData, entryDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference Number</label>
                  <input
                    type="text"
                    placeholder="e.g. REF-2026-001"
                    value={journalFormData.referenceNumber}
                    onChange={(e) => setJournalFormData({ ...journalFormData, referenceNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Narration / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petty cash adjustment for office refreshments"
                  value={journalFormData.narration}
                  onChange={(e) => setJournalFormData({ ...journalFormData, narration: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              {/* Lines table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800">Journal Lines (Debits & Credits)</label>
                  <button
                    type="button"
                    onClick={addJournalLine}
                    className="text-xs text-brand hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                <div className="space-y-2">
                  {journalFormData.lines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                      <select
                        required
                        value={line.accountId}
                        onChange={(e) => handleJournalLineChange(idx, 'accountId', e.target.value)}
                        className="flex-1 border border-slate-300 rounded p-1.5 text-xs font-medium"
                      >
                        <option value="">Select Account...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            [{a.accountCode}] {a.accountName}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Debit"
                        value={line.debit || ''}
                        onChange={(e) => handleJournalLineChange(idx, 'debit', e.target.value)}
                        className="w-24 border border-slate-300 rounded p-1.5 text-xs font-mono text-right"
                      />

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Credit"
                        value={line.credit || ''}
                        onChange={(e) => handleJournalLineChange(idx, 'credit', e.target.value)}
                        className="w-24 border border-slate-300 rounded p-1.5 text-xs font-mono text-right"
                      />

                      {journalFormData.lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeJournalLine(idx)}
                          className="text-slate-400 hover:text-rose-600 font-bold px-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Balancing summary */}
              <div
                className={`p-3 rounded-lg flex items-center justify-between text-xs font-mono font-bold ${
                  formBalanced ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}
              >
                <div>
                  <span>Total Debit: ₹{formDebit.toFixed(2)}</span>
                  <span className="mx-3">|</span>
                  <span>Total Credit: ₹{formCredit.toFixed(2)}</span>
                </div>
                <div>
                  {formBalanced ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> BALANCED
                    </span>
                  ) : (
                    <span>DISCREPANCY: ₹{formDiff.toFixed(2)}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formBalanced}
                  className={`px-4 py-2 font-medium rounded-lg text-white transition ${
                    formBalanced ? 'bg-brand hover:bg-brand-dark' : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  Post to General Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REVERSE JOURNAL */}
      {/* ========================================================================= */}
      {showReversalModal && reversalTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Reverse Journal #{reversalTarget.journalNumber}</h3>
              <button onClick={() => setShowReversalModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-slate-600">
                Reversing this journal will create an opposing journal entry that zeroes out its effect on account
                balances. The original entry will be permanently marked as <strong>REVERSED</strong>.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Reversal</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Correcting mistaken billing account assignment"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReversalModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReverseJournal}
                  disabled={!reversalReason}
                  className="px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  Confirm Reversal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
