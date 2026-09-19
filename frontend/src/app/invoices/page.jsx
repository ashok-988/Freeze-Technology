'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Document1Invoice from '../../components/Document1Invoice';
import { invoiceApi, paymentApi } from '../../lib/api/client';
import { FileText, Printer, Eye, Download, CheckCircle2, Wallet, Clock, Plus, X, AlertCircle } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await invoiceApi.getInvoices();
      if (res?.success && Array.isArray(res.data)) {
        const formatted = res.data.map((inv) => {
          const totalPaid = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
          const outstanding = Math.max(0, (inv.grandTotal || 0) - totalPaid);

          return {
            id: inv.id,
            invoiceNo: inv.invoiceNumber || inv.invoiceNo || 'FT/2026/0001',
            date: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-GB') : (inv.date || new Date().toLocaleDateString('en-GB')),
            customerName: inv.customer?.companyName || inv.customer?.customerName || inv.customerName || 'Customer',
            customerAddress: inv.customer ? `${inv.customer.address || ''}\n${inv.customer.city || 'Chennai'} ${inv.customer.pincode || ''}` : (inv.customerAddress || ''),
            customerGstin: inv.customer?.gstNumber || inv.customerGstin || '',
            items: (inv.items || []).map((it, idx) => ({
              sn: idx + 1,
              description: it.description || 'Product Item',
              qty: it.quantity || 1,
              gst: '18%',
              rate: it.sellingPrice || it.rate || 0,
              amount: (it.sellingPrice || it.rate || 0) * (it.quantity || 1)
            })),
            grandTotal: inv.grandTotal || 0,
            paidAmount: totalPaid,
            outstanding: Number(outstanding.toFixed(2)),
            paymentStatus: inv.paymentStatus || 'Pending',
            paymentMethod: inv.paymentMethod || 'Bank Transfer',
            quotationId: inv.quotationId,
            payments: inv.payments || [],
          };
        });
        setInvoices(formatted);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handlePreview = (inv) => {
    setSelectedInvoice(inv);
    setShowPreview(true);
  };

  const handleDownloadPdf = (inv) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    window.open(`${apiBase}/invoices/${inv.id || inv.invoiceNo}/pdf`, '_blank');
  };

  const openPayModal = (inv) => {
    setPayInvoice(inv);
    setPayAmount(inv.outstanding > 0 ? inv.outstanding.toString() : '');
    setPayMethod('UPI');
    setPayRef('');
    setPayRemarks('');
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payInvoice) return;
    const amt = Number(payAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid payment amount.', true);
      return;
    }
    if (amt > payInvoice.outstanding + 0.01) {
      showToast(`Amount exceeds outstanding balance of ₹${payInvoice.outstanding.toLocaleString('en-IN')}.`, true);
      return;
    }

    try {
      setSubmittingPay(true);
      const res = await paymentApi.createPayment({
        invoiceId: payInvoice.id,
        amount: amt,
        paymentMethod: payMethod,
        paymentReference: payRef,
        remarks: payRemarks,
      });

      if (res?.success) {
        showToast(res.message || 'Payment recorded successfully!');
        setShowPayModal(false);
        await fetchInvoices();
      }
    } catch (err) {
      console.error('Payment error:', err);
      showToast(err.response?.data?.message || 'Failed to record payment.', true);
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-xs font-semibold flex items-center gap-2 ${
            toastMessage.isError ? 'bg-rose-600 text-white' : 'bg-brand text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          {toastMessage.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">GST Invoice Management</h2>
          <p className="text-xs text-gray-500 mt-1">Official Freeze Technology Panasonic Authorised Invoices & Receivables</p>
        </div>
        <Link
          href="/payments"
          className="bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark flex items-center gap-1.5 shadow-sm"
        >
          <Wallet className="w-4 h-4" /> View Payments & Receivables
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading invoices from PostgreSQL...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-gray-700">No Invoices Found</div>
            <p className="text-xs text-gray-500 mt-1">Create an invoice or convert an approved quotation to generate GST invoices.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                <th className="p-3 border-b">Invoice Number</th>
                <th className="p-3 border-b">Date</th>
                <th className="p-3 border-b">Customer Name</th>
                <th className="p-3 border-b text-right">Grand Total</th>
                <th className="p-3 border-b text-right">Paid</th>
                <th className="p-3 border-b text-right">Outstanding</th>
                <th className="p-3 border-b text-center">Payment Status</th>
                <th className="p-3 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv, idx) => (
                <tr key={inv.id || idx} className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-3 font-bold text-brand">{inv.invoiceNo}</td>
                  <td className="p-3">{inv.date}</td>
                  <td className="p-3 font-medium text-gray-900">{inv.customerName}</td>
                  <td className="p-3 text-right font-bold">₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right font-semibold text-emerald-700">
                    ₹{Number(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-semibold text-amber-700">
                    ₹{Number(inv.outstanding !== undefined ? inv.outstanding : inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      inv.paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-brand'
                        : inv.paymentStatus === 'Partial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    {inv.paymentStatus !== 'Paid' && inv.id && (
                      <button
                        onClick={() => openPayModal(inv)}
                        className="bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Wallet className="w-3 h-3" /> Record Payment
                      </button>
                    )}
                    <button
                      onClick={() => handlePreview(inv)}
                      className="bg-gray-100 border border-gray-300 text-gray-800 px-2.5 py-1 rounded text-xs hover:bg-gray-200 font-medium inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Preview Document 1
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(inv)}
                      className="bg-brand text-white px-2.5 py-1 rounded text-xs hover:bg-brand-dark font-medium inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Document 1 Preview Modal */}
      {showPreview && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-bold text-base text-gray-900">Invoice Preview (Document 1 Format)</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-brand text-white px-3 py-1 rounded text-xs font-semibold hover:bg-brand-dark flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            <Document1Invoice invoice={selectedInvoice} />
          </div>
        </div>
      )}

      {/* Quick Record Payment Modal */}
      {showPayModal && payInvoice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-brand" />
                Record Payment — {payInvoice.invoiceNo}
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-md space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Customer:</span>
                  <span className="font-semibold text-gray-900">{payInvoice.customerName}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Invoice Total:</span>
                  <span className="font-semibold">₹{payInvoice.grandTotal?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Outstanding Balance:</span>
                  <span>₹{payInvoice.outstanding?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={payInvoice.outstanding}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Reference / UTR #</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. UPI-12345"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  placeholder="Optional payment notes"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="px-5 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingPay ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
