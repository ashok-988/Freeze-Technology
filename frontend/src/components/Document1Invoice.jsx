import React from 'react';

export default function Document1Invoice({ invoice }) {
  const defaultInvoice = {
    invoiceNo: 'FT/2026/0713',
    date: '13/07/2026',
    customerName: 'M/s. Mebacare Naturals Salon',
    customerAddress: 'No.25/3 East Mada Street, Thiruvanmiyur, Chennai 600041.',
    customerGstin: '',
    items: [
      { sn: 1, description: 'General checking and air filter cleaning work', qty: 1, gst: '18%', rate: 400, amount: 400.00 },
      { sn: 2, description: 'Water wash work', qty: 4, gst: '18%', rate: 1500, amount: 6000.00 },
      { sn: 3, description: 'Wiring problem', qty: 1, gst: '18%', rate: 600, amount: 600.00 }
    ],
    grandTotal: 7000.00
  };

  const data = invoice || defaultInvoice;

  return (
    <div id="printable-invoice" className="bg-white p-8 max-w-[800px] mx-auto text-black font-sans">
      <div className="border-2 border-black p-0 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-black">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="Freeze Technology Logo"
              className="w-14 h-14 object-contain flex-shrink-0"
            />
            <div>
              <h1 className="text-2xl font-black text-brand tracking-wider underline uppercase">FREEZE TECHNOLOGY</h1>
              <p className="text-xs font-bold text-gray-800">Air Conditioning & Refrigeration Sales & Service</p>
              <div className="text-[11px] font-bold">GSTIN: 33BKCPD7319A2ZU</div>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-2xl font-black text-blue-800">Panasonic</h2>
            <span className="text-xs font-bold block">Authorised Sales & Service</span>
          </div>
        </div>

        {/* INVOICE Title Bar */}
        <div className="text-center text-lg font-black tracking-widest py-1 border-b border-black bg-white">
          INVOICE
        </div>

        {/* To & Meta Details */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="p-3 border-r border-black min-h-[110px]">
            <span className="font-bold text-sm">To:</span>
            <div className="font-bold text-sm mt-1">{data.customerName}</div>
            <div className="text-xs text-gray-800 mt-1 whitespace-pre-line">{data.customerAddress}</div>
          </div>

          <div className="p-3 text-xs font-bold space-y-2">
            <div className="flex justify-between"><span>Invoice No :</span> <span>{data.invoiceNo}</span></div>
            <div className="flex justify-between"><span>Date :</span> <span>{data.date}</span></div>
            <div className="flex justify-between"><span>Customer's GSTIN :</span> <span>{data.customerGstin}</span></div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black text-xs font-bold text-center">
              <th className="border-r border-black p-2 w-12">S.N.</th>
              <th className="border-r border-black p-2 text-left">Description</th>
              <th className="border-r border-black p-2 w-12">Qty</th>
              <th className="border-r border-black p-2 w-16">GST</th>
              <th className="border-r border-black p-2 w-20 text-right">Rate</th>
              <th className="p-2 w-24 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.sn} className="border-b border-black text-xs">
                <td className="border-r border-black p-2 text-center font-bold">{item.sn}</td>
                <td className="border-r border-black p-2">{item.description}</td>
                <td className="border-r border-black p-2 text-center">{item.qty}</td>
                <td className="border-r border-black p-2 text-center">{item.gst}</td>
                <td className="border-r border-black p-2 text-right">{item.rate.toLocaleString('en-IN')}</td>
                <td className="p-2 text-right">{item.amount.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="font-bold text-xs border-t border-black">
              <td colSpan="4" className="border-r border-black p-2 text-right pr-4">GST 18% EXTRA</td>
              <td className="border-r border-black p-2 text-center">Grand Total</td>
              <td className="p-2 text-right">{data.grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Bank & Signatory Footer */}
        <div className="grid grid-cols-2 border-t-2 border-black p-4 text-xs">
          <div className="space-y-1">
            <div><span className="font-bold">Bank Name :</span> Axis Bank</div>
            <div><span className="font-bold">Branch :</span> Thoraipakkam</div>
            <div><span className="font-bold">Account No :</span> 915020010100166</div>
            <div><span className="font-bold">IFSC Code :</span> UTIB0001566</div>
          </div>

          <div className="text-right flex flex-col justify-between">
            <h3 className="font-bold text-brand text-sm">For FREEZE TECHNOLOGY</h3>
            <div className="text-[11px] mt-10">Authorised Signatory</div>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-gray-600 mt-2 border-t border-gray-300 pt-2">
        <div>Regd Office: C15, 1st Cross Street, PTC Quarters, Thoraipakkam, OMR, Chennai - 600 097.</div>
        <div>Phone No: 044-35723836, Cell: 9884955011, Email: freezetechnology.ft@gmail.com</div>
      </div>
    </div>
  );
}
