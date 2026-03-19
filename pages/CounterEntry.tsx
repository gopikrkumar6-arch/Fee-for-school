
import React, { useState, useMemo, useEffect } from 'react';
import { BranchCollection, PaymentMode, ReceiptBook, CancelledReceipt, FeeRecord, FeeCategory } from '../types';
import { BRANCH_OPTIONS, formatDate, SCHOOL_INFO } from '../constants';
import printService from '../services/printService';

interface CounterEntryProps {
  branchCollections: BranchCollection[];
  setBranchCollections: React.Dispatch<React.SetStateAction<BranchCollection[]>>;
  students: FeeRecord[];
  currentSession: string;
  feeStructure: FeeCategory[];
  addLog?: (action: string, details: string, type: any) => void;
  receiptBooks: ReceiptBook[];
  cancelledReceipts: CancelledReceipt[];
  upiAccounts: string[];
  bankAccounts: string[];
  isReadOnly?: boolean;
}

const CounterEntry: React.FC<CounterEntryProps> = ({
  branchCollections,
  setBranchCollections,
  students,
  currentSession,
  feeStructure,
  addLog,
  receiptBooks,
  cancelledReceipts,
  upiAccounts,
  bankAccounts,
  isReadOnly = false
}) => {
  const [success, setSuccess] = useState(false);
  const [lastEntry, setLastEntry] = useState<BranchCollection | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    branch: 'Branch 1',
    studentName: '',
    grade: 'Class 1',
    section: 'A',
    rollNo: '',
    amount: '',
    paymentMode: 'Cash' as PaymentMode,
    sourceAccount: ''
  });

  const availableClassNames = useMemo(() => feeStructure.flatMap(cat => cat.classes.map(cls => cls.name)), [feeStructure]);

  const getNextAvailableReceipt = (): string | null => {
    if (!receiptBooks || receiptBooks.length === 0) return null;
    const activeBooks = receiptBooks.filter(b => b.status === 'Active').sort((a, b) => a.startNo - b.startNo);
    if (activeBooks.length === 0) return null;

    const issuedReceiptIds = new Set<number>();
    students.forEach(s => s.history.forEach(txn => {
      if (txn.type === 'Credit' && txn.receiptId !== '-') {
        const match = txn.receiptId.match(/\d+$/);
        if (match) issuedReceiptIds.add(parseInt(match[0]));
      }
    }));
    branchCollections.forEach(c => {
      const match = c.receiptNo.match(/\d+$/);
      if (match) issuedReceiptIds.add(parseInt(match[0]));
    });

    const cancelledReceiptIds = new Set<number>();
    cancelledReceipts.forEach(c => {
      const match = c.receiptNo.match(/\d+$/);
      if (match) cancelledReceiptIds.add(parseInt(match[0]));
    });

    for (const book of activeBooks) {
      for (let i = book.startNo; i <= book.endNo; i++) {
        if (!issuedReceiptIds.has(i) && !cancelledReceiptIds.has(i)) return `SA-2026-${i}`;
      }
    }
    return null;
  };

  const anticipatedReceipt = useMemo(() => getNextAvailableReceipt(), [students, branchCollections, receiptBooks, cancelledReceipts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anticipatedReceipt) {
      alert("🚨 ALERT: No available receipt numbers found in Active books. Please register a new Receipt Book.");
      return;
    }

    // Format the date correctly (e.g., 16 jan 2026) using the global helper
    const formattedDate = formatDate(form.date);

    const newCollection: BranchCollection = {
      ...form,
      date: formattedDate,
      id: `CE-${Date.now()}`,
      receiptNo: anticipatedReceipt,
      amount: parseFloat(form.amount)
    };

    setBranchCollections(prev => [newCollection, ...prev]);
    setLastEntry(newCollection);
    setSuccess(true);

    if (addLog) {
      addLog('Campus Entry Logged', `₹${newCollection.amount.toLocaleString()} received from ${newCollection.studentName} (${newCollection.branch}) • Receipt: ${newCollection.receiptNo}`, 'PAYMENT');
    }

    setForm({
      date: new Date().toISOString().split('T')[0],
      branch: 'Branch 1',
      studentName: '',
      grade: 'Class 1',
      section: 'A',
      rollNo: '',
      amount: '',
      paymentMode: 'Cash',
      sourceAccount: ''
    });
  };

  const isAccountRequired = form.paymentMode === 'UPI' || form.paymentMode === 'Bank Transfer';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-red-950 text-white py-12 px-6 shadow-xl mb-12">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold serif-font italic">Campus Entry</h1>
            <p className="text-xs font-black uppercase text-amber-500 tracking-widest mt-1">Cross-Branch Collection Registry</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-red-300">Next Real Slip</p>
            <p className="text-xl font-black text-amber-400">{anticipatedReceipt || '⚠️ OUT OF RECEIPTS'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {success && lastEntry ? (
          <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl border-2 border-green-100 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-black text-red-950 serif-font italic mb-2">Campus Payment Verified!</h2>
            <p className="text-slate-500 mb-8">Receipt <b>{lastEntry.receiptNo}</b> has been issued for student <b>{lastEntry.studentName}</b> ({lastEntry.branch}).</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => printService.safePrint()} className="bg-red-950 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-red-900 transition-all">Print Receipt</button>
              <button onClick={() => setSuccess(false)} className="bg-slate-100 text-slate-600 px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">New Entry</button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-8">
              <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Payment Date</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-red-950 focus:ring-2 focus:ring-red-900 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Target Campus</label>
                    <select value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-red-950 focus:ring-2 focus:ring-red-900 outline-none cursor-pointer">
                      {BRANCH_OPTIONS.map(opt => <option key={opt} value={`Branch ${opt}`}>Branch {opt}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Student Full Name</label>
                  <input type="text" value={form.studentName} onChange={e => setForm({ ...form, studentName: e.target.value })} placeholder="Enter Student Name" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-red-950 focus:ring-2 focus:ring-red-900 outline-none" required />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Class</label>
                    <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-red-950 focus:ring-2 focus:ring-red-900 outline-none cursor-pointer">
                      {availableClassNames.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 text-center">Section</label>
                    <input type="text" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="A" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-center text-red-950 focus:ring-2 focus:ring-red-900 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 text-center">Roll No</label>
                    <input type="text" value={form.rollNo} onChange={e => setForm({ ...form, rollNo: e.target.value })} placeholder="00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-center text-red-950 focus:ring-2 focus:ring-red-900 outline-none" required />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Payment Channel</label>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {(['Cash', 'UPI', 'Bank Transfer'] as PaymentMode[]).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForm({ ...form, paymentMode: m, sourceAccount: '' })}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group ${form.paymentMode === m
                          ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-md'
                          : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200'
                          }`}
                      >
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                          {m === 'Cash' ? '💵' : m === 'UPI' ? '📱' : '🏛️'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-tight">{m}</span>
                      </button>
                    ))}
                  </div>

                  {(form.paymentMode === 'UPI' || form.paymentMode === 'Bank Transfer') && (
                    <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 animate-in slide-in-from-top-2">
                      <label className="block text-[10px] font-black uppercase text-red-700 tracking-widest mb-3">
                        {form.paymentMode === 'UPI' ? 'Select UPI Receiver' : 'Select Destination Bank'}
                      </label>
                      <select
                        value={form.sourceAccount}
                        onChange={e => setForm({ ...form, sourceAccount: e.target.value })}
                        required
                        className="w-full bg-white border border-red-200 rounded-xl p-4 font-black text-red-950 focus:ring-2 focus:ring-red-900 outline-none cursor-pointer shadow-sm"
                      >
                        <option value="">-- Choose Account --</option>
                        {form.paymentMode === 'UPI'
                          ? upiAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)
                          : bankAccounts.map(bank => <option key={bank} value={bank}>{bank}</option>)
                        }
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Collection Amount</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">₹</span>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-6 font-black text-red-950 text-3xl focus:border-red-950 outline-none transition-all shadow-inner"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isReadOnly || !anticipatedReceipt || (isAccountRequired && !form.sourceAccount) || !form.amount || parseFloat(form.amount) <= 0}
                  className="w-full bg-red-950 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-red-900 transition-all border-b-4 border-black active:border-b-0 active:translate-y-1 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isReadOnly
                    ? '🔒 SESSION LOCKED (READ-ONLY)'
                    : !anticipatedReceipt
                      ? '⚠️ NO RECEIPTS AVAILABLE'
                      : (isAccountRequired && !form.sourceAccount)
                        ? '⚠️ PLEASE SELECT ACCOUNT'
                        : `Generate Campus Receipt • ₹${parseFloat(form.amount || '0').toLocaleString()}`
                  }
                </button>
              </form>
            </div>

            <div className="md:col-span-4 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 h-full flex flex-col">
                <h3 className="text-xl font-bold text-red-950 serif-font italic mb-6 flex items-center gap-2">
                  <span>🕒</span> Session History
                </h3>
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar pr-2">
                  {branchCollections.length > 0 ? (
                    branchCollections.map(item => (
                      <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm group hover:border-red-200 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-slate-800 leading-none group-hover:text-red-900 transition-colors">{item.studentName}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">{item.grade} • {item.branch}</p>
                          </div>
                          <span className="bg-red-950 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">{item.receiptNo}</span>
                        </div>
                        <div className="flex justify-between items-end border-t border-white pt-2 mt-2">
                          <div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase mb-0.5">{item.date}</p>
                            <p className="text-[9px] font-black text-amber-700 uppercase tracking-tighter">
                              {item.paymentMode}{item.sourceAccount ? ` • ${item.sourceAccount}` : ''}
                            </p>
                          </div>
                          <p className="font-black text-red-900">₹{item.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-24 text-slate-300">
                      <span className="text-5xl mb-4 block opacity-20">📂</span>
                      <p className="text-xs font-bold uppercase tracking-widest">No Recent Entries</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Print Receipt Template */}
      <div className="hidden print:block bg-white p-10 border-2 border-slate-200 rounded-lg">
        <div className="text-center mb-10 pb-10 border-b-2 border-slate-100">
          <h1 className="text-3xl font-black text-red-950 uppercase tracking-tight serif-font">{SCHOOL_INFO.name}</h1>
          <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-2">Campus Entry Fee Receipt | Session {currentSession}</p>
        </div>
        {lastEntry && (
          <div className="space-y-6 text-sm">
            <div className="flex justify-between">
              <span>Receipt No: <strong>{lastEntry.receiptNo}</strong></span>
              <span>Date: <strong>{lastEntry.date}</strong></span>
            </div>
            <div className="flex justify-between">
              <span>Student: <strong>{lastEntry.studentName}</strong></span>
              <span>Origin: <strong>{lastEntry.branch}</strong></span>
            </div>
            <div className="py-10 border-y border-slate-100 flex justify-between items-center">
              <span className="uppercase font-black text-slate-400 tracking-widest">Amount Received</span>
              <span className="text-4xl font-black text-red-950">₹{lastEntry.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Channel: <strong>{lastEntry.paymentMode} {lastEntry.sourceAccount ? `(${lastEntry.sourceAccount})` : ''}</strong></span>
              <span>Class: <strong>{lastEntry.grade}-{lastEntry.section}</strong></span>
            </div>
            <p className="text-[10px] text-slate-400 italic text-center pt-10">Cross-Campus Direct Entry. System Generated. Valid for Current Session.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CounterEntry;
