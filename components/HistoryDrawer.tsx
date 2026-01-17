
import React, { useState, useMemo } from 'react';
import { FeeRecord, BranchCollection, Expense, Transaction } from '../types';
import { formatDate } from '../constants';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  students: FeeRecord[];
  branchCollections: BranchCollection[];
  expenses: Expense[];
  onSelectStudent: (student: FeeRecord) => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ 
  isOpen, 
  onClose, 
  students, 
  branchCollections, 
  expenses,
  onSelectStudent
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const allTransactions = useMemo(() => {
    const history: any[] = [];

    // 1. Student Ledger Credits
    students.forEach(s => {
      s.history.forEach(txn => {
        if (txn.type === 'Credit') {
          history.push({
            id: txn.id,
            date: txn.date,
            studentName: s.studentName,
            grade: s.grade,
            amount: txn.amount,
            receiptId: txn.receiptId,
            mode: txn.mode,
            source: 'Ledger',
            description: txn.description,
            fullRecord: s
          });
        }
      });
    });

    // 2. Branch Collections (Campus Entry)
    branchCollections.forEach(bc => {
      history.push({
        id: bc.id,
        date: bc.date,
        studentName: bc.studentName,
        grade: `${bc.grade} (${bc.branch})`,
        amount: bc.amount,
        receiptId: bc.receiptNo,
        mode: bc.paymentMode,
        source: 'Branch',
        description: `Campus Entry Entry at ${bc.branch}`,
        fullRecord: null
      });
    });

    // 3. Manual Income from Hisab
    expenses.forEach(e => {
      if (e.recordType === 'Income') {
        history.push({
          id: e.id,
          date: formatDate(e.date),
          studentName: 'Manual Entry',
          grade: e.category,
          amount: e.amount,
          receiptId: '-',
          mode: e.paymentMode,
          source: 'System',
          description: e.description,
          fullRecord: null
        });
      }
    });

    // Sort by date (Assuming format '16 jan 2026' or similar, we try to parse or use ID as fallback)
    return history.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 100);
  }, [students, branchCollections, expenses]);

  const filteredHistory = allTransactions.filter(item => 
    item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.receiptId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayCollection = useMemo(() => {
    const today = formatDate(new Date());
    return allTransactions
      .filter(item => item.date === today)
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [allTransactions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] overflow-hidden">
      <div className="absolute inset-0 bg-red-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out border-l border-slate-200">
        
        {/* Header */}
        <div className="bg-red-950 p-8 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="flex justify-between items-center relative z-10 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl">🕒</span>
              </div>
              <div>
                <h2 className="text-xl font-bold serif-font italic">Real-Time Feed</h2>
                <p className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em]">Transaction Synchronization</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-2xl">&times;</button>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black uppercase text-red-300 tracking-widest">Today's Counter</p>
              <p className="text-2xl font-black">₹{todayCollection.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-bold bg-green-500 px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search by Receipt, Name or Note..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/50">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <div 
                key={item.id} 
                onClick={() => {
                  if (item.fullRecord) {
                    onSelectStudent(item.fullRecord);
                    onClose();
                  }
                }}
                className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-all group ${item.fullRecord ? 'hover:border-red-950 hover:shadow-md cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner ${
                      item.source === 'Branch' ? 'bg-amber-100 text-amber-700' : 
                      item.source === 'System' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-50 text-red-900'
                    }`}>
                      {item.studentName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 leading-tight group-hover:text-red-900 transition-colors">
                        {item.studentName}
                      </h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        {item.grade} • {item.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-green-700">₹{item.amount.toLocaleString()}</p>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                      item.mode === 'UPI' ? 'bg-indigo-50 text-indigo-600' : 
                      item.mode === 'Cash' ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.mode}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                   <div className="flex items-center gap-2">
                     <span className="text-[9px] font-black text-slate-400 uppercase">Receipt:</span>
                     <span className="text-[10px] font-mono font-bold text-red-900">{item.receiptId}</span>
                   </div>
                   <p className="text-[10px] text-slate-500 italic truncate max-w-[150px]">"{item.description}"</p>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
              <span className="text-6xl mb-4 opacity-20">📜</span>
              <p className="text-xs font-black uppercase tracking-widest">No activity matches</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex justify-center shrink-0">
          <button 
            onClick={onClose}
            className="text-[10px] font-black uppercase text-slate-400 hover:text-red-950 transition-colors tracking-widest"
          >
            Close Synchronization View
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryDrawer;
