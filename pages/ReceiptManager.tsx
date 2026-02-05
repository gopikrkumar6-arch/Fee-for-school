
import React, { useState, useEffect, useMemo } from 'react';
import { ReceiptBook, CancelledReceipt, FeeRecord, BranchCollection } from '../types';
import { formatDate } from '../constants';
import DemandSlip from './DemandSlip';

interface ReceiptManagerProps {
  students?: FeeRecord[];
  onSelectStudent?: (student: FeeRecord) => void;
  // Lifted UI State Props
  persistentSearch?: string;
  setPersistentSearch?: (val: string) => void;
  persistentAuditBookId?: string | null;
  setPersistentAuditBookId?: (id: string | null) => void;
  persistentAuditOpen?: boolean;
  setPersistentAuditOpen?: (open: boolean) => void;
  // Props for Demand Slips
  onUpdateStudents?: (list: FeeRecord[]) => void;
  currentSession?: string;
  isReadOnly?: boolean;
  branchCollections?: BranchCollection[];
  // Sync Props
  books: ReceiptBook[];
  setBooks: (books: ReceiptBook[]) => void;
  cancelledReceipts: CancelledReceipt[];
  setCancelledReceipts: (receipts: CancelledReceipt[]) => void;
}

const ReceiptManager: React.FC<ReceiptManagerProps> = ({
  students = [],
  onSelectStudent,
  persistentSearch = '',
  setPersistentSearch = (_val: string) => { },
  persistentAuditBookId = null,
  setPersistentAuditBookId = (_id: string | null) => { },
  persistentAuditOpen = false,
  setPersistentAuditOpen = (_open: boolean) => { },
  onUpdateStudents = (_list: FeeRecord[]) => { },
  currentSession = '2026-27',
  isReadOnly = false,
  branchCollections = [],
  books,
  setBooks,
  cancelledReceipts,
  setCancelledReceipts
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'receipts' | 'demands'>('receipts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');

  const [newBook, setNewBook] = useState({
    startNo: '',
    endNo: '',
    date: new Date().toISOString().split('T')[0],
    label: ''
  });

  const [cancelForm, setCancelForm] = useState({
    receiptNo: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    bookId: ''
  });

  const extractNum = (str: string) => {
    const match = str.match(/\d+$/);
    return match ? parseInt(match[0]) : null;
  };

  const selectedBookForAudit = useMemo(() =>
    books.find(b => b.id === persistentAuditBookId) || null,
    [books, persistentAuditBookId]);

  const filteredBooks = useMemo(() => {
    if (!persistentSearch.trim()) return books;
    const term = persistentSearch.toLowerCase();

    return books.filter(b => {
      const matchesMeta = b.bookLabel.toLowerCase().includes(term) ||
        b.id.toLowerCase().includes(term) ||
        b.startNo.toString().includes(term) ||
        b.endNo.toString().includes(term);

      if (matchesMeta) return true;

      // Check students for matches
      const hasStudentMatch = students.some(student => {
        const studentMatches = student.studentName.toLowerCase().includes(term) ||
          student.id.toLowerCase().includes(term);
        if (!studentMatches) return false;
        return student.history.some(txn => {
          if (txn.type === 'Credit' && txn.receiptId !== '-') {
            const num = extractNum(txn.receiptId);
            return num !== null && num >= b.startNo && num <= b.endNo;
          }
          return false;
        });
      });

      if (hasStudentMatch) return true;

      // Check branch collections for matches
      return branchCollections.some(bc => {
        const matchesInfo = bc.studentName.toLowerCase().includes(term) || bc.receiptNo.toLowerCase().includes(term);
        if (!matchesInfo) return false;
        const num = extractNum(bc.receiptNo);
        return num !== null && num >= b.startNo && num <= b.endNo;
      });
    });
  }, [books, persistentSearch, students, branchCollections]);

  const bookUsageList = useMemo(() => {
    if (!selectedBookForAudit) return [];

    const usage: any[] = [];

    // 1. Process Normal Students Ledger
    students.forEach(student => {
      student.history.forEach(txn => {
        if (txn.type === 'Credit' && txn.receiptId !== '-') {
          const num = extractNum(txn.receiptId);
          if (num !== null && num >= selectedBookForAudit.startNo && num <= selectedBookForAudit.endNo) {
            usage.push({
              studentName: student.studentName,
              uid: student.id,
              grade: student.grade,
              receiptId: txn.receiptId,
              amount: txn.amount,
              date: txn.date,
              mode: txn.mode,
              fullRecord: student,
              source: 'Ledger'
            });
          }
        }
      });
    });

    // 2. Process Campus Entry (Branch Collections)
    branchCollections.forEach(bc => {
      const num = extractNum(bc.receiptNo);
      if (num !== null && num >= selectedBookForAudit.startNo && num <= selectedBookForAudit.endNo) {
        usage.push({
          studentName: bc.studentName,
          uid: 'EXTERNAL',
          grade: `${bc.grade} (${bc.branch})`,
          receiptId: bc.receiptNo,
          amount: bc.amount,
          date: bc.date,
          mode: bc.paymentMode,
          fullRecord: null, // No ledger record for external
          source: 'Campus Entry'
        });
      }
    });

    return usage.sort((a, b) => (extractNum(a.receiptId) || 0) - (extractNum(b.receiptId) || 0));
  }, [selectedBookForAudit, students, branchCollections]);

  const filteredUsageList = useMemo(() => {
    if (!auditSearchTerm.trim()) return bookUsageList;
    const term = auditSearchTerm.toLowerCase();
    return bookUsageList.filter(item =>
      item.studentName.toLowerCase().includes(term) ||
      item.uid.toLowerCase().includes(term) ||
      item.receiptId.toLowerCase().includes(term)
    );
  }, [bookUsageList, auditSearchTerm]);

  const availableReceiptNumbers = useMemo(() => {
    if (!cancelForm.bookId) return [];
    const selectedBook = books.find(b => b.id === cancelForm.bookId);
    if (!selectedBook) return [];
    const cancelledNums = cancelledReceipts.map(r => extractNum(r.receiptNo)).filter(n => n !== null);
    const nums = [];
    for (let i = selectedBook.startNo; i <= selectedBook.endNo; i++) {
      if (!cancelledNums.includes(i)) nums.push(i);
    }
    return nums;
  }, [cancelForm.bookId, books, cancelledReceipts]);

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseInt(newBook.startNo);
    const end = parseInt(newBook.endNo);
    if (isNaN(start) || isNaN(end) || end < start) {
      alert("Please enter a valid receipt range.");
      return;
    }
    const book: ReceiptBook = {
      id: `RB-${Date.now()}`,
      startNo: start,
      endNo: end,
      creationDate: newBook.date,
      status: 'Active',
      bookLabel: newBook.label || `Book ${start}-${end}`
    };
    setBooks([book, ...books]);
    setIsModalOpen(false);
    setNewBook({ startNo: '', endNo: '', date: new Date().toISOString().split('T')[0], label: '' });
  };

  const handleCancelReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelForm.receiptNo || !cancelForm.reason || !cancelForm.bookId) {
      setErrorMessage("Please fill all details.");
      return;
    }
    const formattedReceiptNo = `SA-2026-${cancelForm.receiptNo}`;
    const cancelled: CancelledReceipt = {
      id: `CNL-${Date.now()}`,
      receiptNo: formattedReceiptNo,
      cancelDate: cancelForm.date,
      reason: cancelForm.reason,
      cancelledBy: 'Administrator'
    };
    setCancelledReceipts([cancelled, ...cancelledReceipts]);
    setIsCancelModalOpen(false);
    setCancelForm({ receiptNo: '', date: new Date().toISOString().split('T')[0], reason: '', bookId: '' });
  };

  const deleteBook = (id: string) => {
    if (window.confirm("Permanently delete this receipt book record?")) {
      setBooks(books.filter(b => b.id !== id));
      if (persistentAuditBookId === id) setPersistentAuditBookId(null);
    }
  };

  const deleteCancelledLog = (id: string) => {
    if (window.confirm("Permanently remove this cancellation record?")) {
      setCancelledReceipts(prev => prev.filter(c => c.id !== id));
    }
  };

  const updateStatus = (id: string, status: ReceiptBook['status']) => {
    setBooks(books.map(b => b.id === id ? { ...b, status } : b));
  };

  const handleStudentClick = (student: FeeRecord | null) => {
    if (student && onSelectStudent) {
      onSelectStudent(student);
    }
  };

  return (
    <div className="pb-20 min-h-screen bg-slate-50">
      {/* Premium Tab Switcher */}
      <div className="bg-red-950 text-white pt-16 px-4 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:row justify-between items-center gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold serif-font mb-2">Receipt Manager</h1>
              <p className="font-bold text-xs uppercase tracking-widest text-amber-500">Financial Inventory & Demand Generation</p>
            </div>

            <div className="flex bg-red-900/50 p-1 rounded-2xl border border-red-800 backdrop-blur-md">
              <button
                onClick={() => setActiveSubTab('receipts')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'receipts' ? 'bg-white text-red-950 shadow-xl' : 'text-red-200 hover:text-white'}`}
              >
                <span>🧾</span> Fee Receipts
              </button>
              <button
                onClick={() => setActiveSubTab('demands')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'demands' ? 'bg-white text-red-950 shadow-xl' : 'text-red-200 hover:text-white'}`}
              >
                <span>📋</span> Demand Slips
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeSubTab === 'receipts' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="max-w-7xl mx-auto px-4 mt-12 space-y-12">
            <div className="flex justify-end gap-4 mb-8">
              <button onClick={() => { setErrorMessage(''); setIsCancelModalOpen(true); }} className="bg-white/10 hover:bg-slate-100 border border-slate-200 text-slate-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3 shadow-sm"><span>🚫</span> Cancel Receipt</button>
              <button onClick={() => setIsModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center gap-3 border-b-4 border-amber-900"><span>📚</span> Create Book</button>
            </div>

            {persistentAuditOpen && selectedBookForAudit && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/60 backdrop-blur-md p-4 animate-in fade-in">
                <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full h-[80vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95">
                  <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><span className="text-2xl">📋</span></div>
                      <div>
                        <h3 className="text-2xl font-bold serif-font italic">{selectedBookForAudit.bookLabel} Audit</h3>
                        <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Range: {selectedBookForAudit.startNo} - {selectedBookForAudit.endNo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                        <input type="text" placeholder="Search entry in audit..." value={auditSearchTerm} onChange={(e) => setAuditSearchTerm(e.target.value)} className="bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:bg-white focus:text-red-950 focus:border-white transition-all outline-none min-w-[240px]" />
                      </div>
                      <button onClick={() => { setPersistentAuditOpen(false); setPersistentAuditBookId(null); setAuditSearchTerm(''); }} className="text-white/40 hover:text-white transition-colors text-3xl">&times;</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                    {filteredUsageList.length > 0 ? (
                      <div className="space-y-4">
                        {filteredUsageList.map((entry, idx) => (
                          <button
                            key={idx}
                            onClick={() => entry.source === 'Ledger' && handleStudentClick(entry.fullRecord)}
                            disabled={entry.source === 'Campus Entry'}
                            className={`w-full text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all group ${entry.source === 'Ledger' ? 'hover:border-red-950 hover:shadow-md active:scale-[0.99] cursor-pointer' : 'cursor-default'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase ${entry.source === 'Campus Entry' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{entry.studentName.charAt(0)}</div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-red-950 text-sm">{entry.studentName}</p>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${entry.source === 'Campus Entry' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                                    {entry.source}
                                  </span>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">UID: {entry.uid} • {entry.grade}</p>
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="bg-red-50 text-red-900 px-3 py-1 rounded-lg font-black text-[10px] border border-red-100">{entry.receiptId}</span>
                              <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase">{entry.date}</p>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="font-black text-green-700 text-sm">₹{entry.amount.toLocaleString()}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{entry.mode}</p>
                              </div>
                              {entry.source === 'Ledger' && (
                                <div className="text-red-950 font-black text-[10px] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest flex items-center gap-1">
                                  View Ledger <span>→</span>
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                        <span className="text-7xl mb-4">{auditSearchTerm ? '🕵️‍♂️' : '📭'}</span>
                        <p className="font-black uppercase tracking-widest">{auditSearchTerm ? `No match for "${auditSearchTerm}"` : 'No Issued Receipts Found'}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                    <div className="flex gap-8">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Total Found</p>
                        <p className="text-xl font-black text-red-950">{filteredUsageList.length} Leaves</p>
                      </div>
                      <div className="h-10 w-px bg-slate-100"></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Filtered Collection</p>
                        <p className="text-xl font-black text-green-700">₹{filteredUsageList.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <button onClick={() => { setPersistentAuditOpen(false); setPersistentAuditBookId(null); setAuditSearchTerm(''); }} className="px-10 py-3 bg-red-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-900 transition-all">Close Audit</button>
                  </div>
                </div>
              </div>
            )}

            {isModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/40 backdrop-blur-md p-4 animate-in fade-in">
                <div className="bg-white rounded-[2.5rem] shadow-2xl max-md w-full p-8 border border-slate-100 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-14 h-14 bg-red-900 rounded-2xl flex items-center justify-center text-white shadow-lg"><span className="text-2xl">📓</span></div>
                    <div>
                      <h3 className="text-2xl font-bold text-red-950 serif-font italic leading-none">New Receipt Book</h3>
                      <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">Define Manual Range</p>
                    </div>
                  </div>
                  <form onSubmit={handleCreateBook} className="space-y-6">
                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Book Label (Optional)</label><input value={newBook.label} onChange={(e) => setNewBook({ ...newBook, label: e.target.value })} placeholder="Ex: Primary Wing - Vol 1" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-bold text-red-950 focus:ring-2 focus:ring-red-900 outline-none transition-all" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Starting From *</label><input type="number" required value={newBook.startNo} onChange={(e) => setNewBook({ ...newBook, startNo: e.target.value })} placeholder="0001" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-black text-red-950 focus:ring-2 focus:ring-red-900 outline-none" /></div>
                      <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Ending At *</label><input type="number" required value={newBook.endNo} onChange={(e) => setNewBook({ ...newBook, endNo: e.target.value })} placeholder="0100" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-black text-red-950 focus:ring-2 focus:ring-red-900 outline-none" /></div>
                    </div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Creation Date *</label><input type="date" required value={newBook.date} onChange={(e) => setNewBook({ ...newBook, date: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-bold text-red-950 focus:ring-2 focus:ring-red-900 outline-none" /></div>
                    <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-100 rounded-2xl transition-all">Cancel</button><button type="submit" className="flex-1 py-4 bg-red-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-900 transition-all border-b-4 border-black">Register Book</button></div>
                  </form>
                </div>
              </div>
            )}

            {isCancelModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/40 backdrop-blur-md p-4 animate-in fade-in">
                <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 border border-slate-100 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><span className="text-2xl">⚠️</span></div>
                    <div><h3 className="text-2xl font-bold text-red-950 serif-font italic leading-none">Cancel Receipt</h3><p className="text-[10px] font-black uppercase text-red-400 mt-1 tracking-widest">Mark Transaction as Void</p></div>
                  </div>
                  {errorMessage && (<div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-pulse"><span className="text-red-600 font-bold">⚠️</span><p className="text-[10px] font-black uppercase text-red-600 leading-relaxed">{errorMessage}</p></div>)}
                  <form onSubmit={handleCancelReceipt} className="space-y-6">
                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Select Receipt Book *</label><select required value={cancelForm.bookId} onChange={(e) => { setCancelForm({ ...cancelForm, bookId: e.target.value, receiptNo: '' }); setErrorMessage(''); }} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-bold text-red-950 focus:ring-2 focus:ring-red-900 outline-none transition-all cursor-pointer"><option value="">Choose Active Book...</option>{books.filter(b => b.status === 'Active').map(book => (<option key={book.id} value={book.id}>{book.bookLabel} ({book.startNo}-{book.endNo})</option>))}</select></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Select Receipt Number *</label><select required disabled={!cancelForm.bookId} value={cancelForm.receiptNo} onChange={(e) => { setCancelForm({ ...cancelForm, receiptNo: e.target.value }); setErrorMessage(''); }} className="w-full bg-red-50 border-2 border-red-100 rounded-xl p-4 font-black text-red-900 focus:ring-2 focus:ring-red-600 outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"><option value="">Choose Number from Book...</option>{availableReceiptNumbers.map(num => (<option key={num} value={num}>SA-2026-{num}</option>))}</select></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cancellation Date *</label><input type="date" required value={cancelForm.date} onChange={(e) => setCancelForm({ ...cancelForm, date: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-red-900 outline-none" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Reason for Cancellation *</label><textarea required value={cancelForm.reason} onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })} placeholder="Describe why this receipt is being voided..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-700 focus:ring-2 focus:ring-red-900 outline-none h-24 resize-none" /></div>
                    <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-100 rounded-2xl transition-all">Discard</button><button type="submit" className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all border-b-4 border-red-900">Confirm Void</button></div>
                  </form>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-12">
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-red-950 text-lg">Manual Book Inventory</h3>
                    <p className="text-xs text-slate-400">Total {filteredBooks.length} record books • Click rows to view audit</p>
                  </div>
                  <div className="relative w-full md:w-96">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    <input type="text" placeholder="Search by Label, ID or Match..." value={persistentSearch} onChange={(e) => setPersistentSearch(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-12 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-950 transition-all shadow-sm" />
                    {persistentSearch.length > 0 && (
                      <button
                        onClick={() => setPersistentSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-950 hover:text-white transition-all shadow-sm group active:scale-90"
                        title="Clear Search"
                      >
                        <span className="text-lg font-black leading-none group-hover:scale-110 transition-transform">×</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      <tr>
                        <th className="px-8 py-5">Creation Date</th>
                        <th className="px-8 py-5">Book Identity & Matches</th>
                        <th className="px-8 py-5 text-center">Range</th>
                        <th className="px-8 py-5 text-center">Remaining / Total</th>
                        <th className="px-8 py-5 text-center">Status</th>
                        <th className="px-8 py-5 text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBooks.map(book => {
                        const searchMatchesInAudit = persistentSearch.trim() ? [
                          ...students.filter(student => {
                            const term = persistentSearch.toLowerCase();
                            const studentMatches = student.studentName.toLowerCase().includes(term) || student.id.toLowerCase().includes(term);
                            if (!studentMatches) return false;
                            return student.history.some(txn => {
                              if (txn.type !== 'Credit' || txn.receiptId === '-') return false;
                              const num = extractNum(txn.receiptId);
                              return num !== null && num >= book.startNo && num <= book.endNo;
                            });
                          }),
                          ...branchCollections.filter(bc => {
                            const term = persistentSearch.toLowerCase();
                            const bcMatches = bc.studentName.toLowerCase().includes(term) || bc.receiptNo.toLowerCase().includes(term);
                            if (!bcMatches) return false;
                            const num = extractNum(bc.receiptNo);
                            return num !== null && num >= book.startNo && num <= book.endNo;
                          })
                        ] : [];

                        const bookCancellations = cancelledReceipts.filter(r => {
                          const n = extractNum(r.receiptNo);
                          return n !== null && n >= book.startNo && n <= book.endNo;
                        }).length;

                        const ledgerUsage = students.reduce((acc, s) => {
                          return acc + s.history.filter(txn => {
                            if (txn.type !== 'Credit') return false;
                            const n = extractNum(txn.receiptId);
                            return n !== null && n >= book.startNo && n <= book.endNo;
                          }).length;
                        }, 0);

                        const branchUsage = branchCollections.filter(bc => {
                          const n = extractNum(bc.receiptNo);
                          return n !== null && n >= book.startNo && n <= book.endNo;
                        }).length;

                        const totalUsed = ledgerUsage + branchUsage + bookCancellations;
                        const totalRange = book.endNo - book.startNo + 1;
                        const remainingPages = Math.max(0, totalRange - totalUsed);

                        return (
                          <tr key={book.id} className="hover:bg-amber-50/30 transition-colors group cursor-pointer" onClick={() => { setPersistentAuditBookId(book.id); setPersistentAuditOpen(true); }}>
                            <td className="px-8 py-6 text-sm font-medium text-slate-500">{formatDate(book.creationDate)}</td>
                            <td className="px-8 py-6">
                              <p className="font-bold text-red-950 group-hover:text-red-700 transition-colors">{book.bookLabel}</p>
                              <p className="text-[9px] text-slate-400 uppercase font-black mb-2">ID: {book.id}</p>
                              {searchMatchesInAudit.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {searchMatchesInAudit.slice(0, 3).map((s: any, idx) => (
                                    <span key={idx} className={`inline-flex items-center px-2 py-0.5 text-[8px] font-black uppercase rounded border shadow-sm ${s.id ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                      Matched: {s.studentName}
                                    </span>
                                  ))}
                                  {searchMatchesInAudit.length > 3 && <span className="text-[8px] font-bold text-slate-400">+{searchMatchesInAudit.length - 3} more</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-6 text-center"><span className="bg-red-50 text-red-900 px-3 py-1 rounded-lg font-black text-xs border border-red-100 shadow-sm">{book.startNo.toString().padStart(4, '0')} - {book.endNo.toString().padStart(4, '0')}</span></td>
                            <td className="px-8 py-6 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-sm font-black ${remainingPages <= 0 ? 'text-red-400' : 'text-slate-700'}`}>{remainingPages} / {totalRange}</span>
                                <div className="flex gap-2 mt-1">
                                  {bookCancellations > 0 && (<span className="text-[7px] font-black text-red-500 uppercase px-1.5 py-0.5 bg-red-50 rounded">{bookCancellations} Void</span>)}
                                  {(ledgerUsage + branchUsage) > 0 && (<span className="text-[7px] font-black text-green-600 uppercase px-1.5 py-0.5 bg-green-50 rounded">{(ledgerUsage + branchUsage)} Issued</span>)}
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center" onClick={e => e.stopPropagation()}>
                              <select value={book.status} onChange={(e) => updateStatus(book.id, e.target.value as any)} className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border outline-none transition-all cursor-pointer ${book.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : book.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}><option value="Active">Active</option><option value="Completed">Completed</option><option value="Archived">Archived</option></select>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex justify-end gap-2">
                                <button className="px-4 py-2 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-xl hover:bg-red-950 hover:text-white transition-all shadow-sm">View Audit</button>
                                <button onClick={(e) => { e.stopPropagation(); deleteBook(book.id); }} className="p-2.5 text-slate-300 hover:text-red-600 transition-all" title="Delete Entry"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredBooks.length === 0 && (<tr><td colSpan={6} className="py-20 text-center text-slate-400"><div className="text-6xl mb-4 grayscale opacity-20">{persistentSearch ? '🔎' : '📚'}</div><p className="font-bold text-sm">{persistentSearch ? `No results for "${persistentSearch}"` : 'No receipt books registered.'}</p></td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-red-100 overflow-hidden">
                <div className="p-8 border-b border-red-50 bg-red-50/30 flex justify-between items-center">
                  <div><h3 className="font-bold text-red-950 text-lg">Cancelled/Void Ledger</h3><p className="text-xs text-red-600/60 uppercase font-black tracking-widest">Audit trail for invalidated receipts</p></div>
                  <div className="text-right"><span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{cancelledReceipts.length} VOIDS</span></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-red-50/50 text-[10px] font-black uppercase text-red-900/40 tracking-widest">
                      <tr><th className="px-8 py-5">Void Date</th><th className="px-8 py-5">Receipt No</th><th className="px-8 py-5">Reason for Cancellation</th><th className="px-8 py-5 text-right">Audit</th></tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                      {cancelledReceipts.map(cnl => (
                        <tr key={cnl.id} className="hover:bg-red-50/20 transition-colors group">
                          <td className="px-8 py-6 text-sm font-bold text-red-700">{formatDate(cnl.cancelDate)}</td>
                          <td className="px-8 py-6"><span className="bg-red-600 text-white px-3 py-1 rounded-lg font-black text-xs shadow-sm">{cnl.receiptNo}</span></td>
                          <td className="px-8 py-6"><p className="text-sm font-medium text-slate-600 italic">"{cnl.reason}"</p><p className="text-[9px] font-black text-slate-400 mt-1 uppercase">VOIDED BY {cnl.cancelledBy}</p></td>
                          <td className="px-8 py-6 text-right"><button onClick={() => deleteCancelledLog(cnl.id)} className="p-2.5 text-red-200 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                        </tr>
                      ))}
                      {cancelledReceipts.length === 0 && (<tr><td colSpan={4} className="py-16 text-center text-slate-300"><div className="text-5xl mb-4 opacity-20">🚫</div><p className="font-bold text-xs uppercase tracking-widest">No Cancelled Records</p></td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4">
          <DemandSlip
            students={students}
            onUpdateStudents={onUpdateStudents}
            currentSession={currentSession}
            isReadOnly={isReadOnly}
          />
        </div>
      )}
    </div>
  );
};

export default ReceiptManager;
