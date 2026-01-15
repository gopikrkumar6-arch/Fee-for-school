
import React, { useState, useMemo } from 'react';
import { FeeRecord, Expense, Transaction, BranchCollection } from '../types';
import { SCHOOL_INFO, formatDate, getStudentPhoto, BRANCH_OPTIONS } from '../constants';

interface HisabProps {
  students: FeeRecord[];
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  currentSession: string;
  branchCollections: BranchCollection[];
}

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

const Hisab: React.FC<HisabProps> = ({ students, expenses, onAddExpense, currentSession, branchCollections }) => {
  const [mainTab, setMainTab] = useState<'hisab' | 'reports'>('hisab');
  const [isSettlementWindowOpen, setIsSettlementWindowOpen] = useState(false);
  const [isBranchReportOpen, setIsBranchReportOpen] = useState(false);
  
  // --- HISAB TAB STATE ---
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Ledger Entry Form State
  const [recordType, setRecordType] = useState<'Income' | 'Expense'>('Expense');
  const [newEntry, setNewEntry] = useState<{
    category: string;
    description: string;
    amount: string;
    paymentMode: string;
  }>({
    category: 'Maintenance',
    description: '',
    amount: '',
    paymentMode: 'Cash'
  });

  // --- Date Helpers ---
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date: Date) => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  };

  const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
  
  const isWithinWeek = (target: Date, current: Date) => {
    const start = getStartOfWeek(current);
    const end = getEndOfWeek(current);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return target >= start && target <= end;
  };

  const isSameMonth = (d1: Date, d2: Date) => 
    d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  const isSameYear = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear();

  const parseTransactionDate = (dateStr: string): Date => {
      let d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
      return new Date(); 
  };

  // --- ANALYTICS LOGIC ---
  const analytics = useMemo(() => {
    const today = new Date();
    
    const stats = {
        students: { current: 0, dropped: 0, passed: 0 },
        incomeTime: { today: 0, weekly: 0, monthly: 0 },
        incomeSource: { monthlyFee: 0, exam: 0, misc: 0, admission: 0, dsir: 0, other: 0, branchEntry: 0 },
        modes: { incOffline: 0, incOnline: 0, expOffline: 0, expOnline: 0 },
        accounts: {} as Record<string, number>,
        accountDetails: {} as Record<string, any[]>,
        branchCollections: {} as Record<string, number>, 
        branchDetails: {} as Record<string, any[]>,
        classDues: {} as Record<string, { count: number, totalDue: number }>,
        alumni: { collected: 0, restDue: 0 }
    };

    // Process Students
    students.forEach(s => {
        const isCurrent = s.academicSession === currentSession;
        const isPassed = s.grade === 'PASSED' || s.status === 'PASSED';
        
        if (isPassed) stats.students.passed++;
        else if (isCurrent) {
            stats.students.current++;
            if (s.academicStatus === 'Dropped') stats.students.dropped++;
        }

        if (isCurrent && !isPassed) {
            if (!stats.classDues[s.grade]) stats.classDues[s.grade] = { count: 0, totalDue: 0 };
            stats.classDues[s.grade].count++;
            const totalDebits = s.history.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0);
            stats.classDues[s.grade].totalDue += Math.max(0, (s.arrearsMarch2025 + totalDebits) - s.paidAmount);
        }

        s.history.forEach(txn => {
            if (txn.type === 'Credit' && txn.mode !== 'Waiver') {
                const tDate = parseTransactionDate(txn.date);
                const amt = txn.amount;

                // Track branch collections within student ledgers
                if (txn.isOtherBranch && txn.branchName) {
                    stats.branchCollections[txn.branchName] = (stats.branchCollections[txn.branchName] || 0) + amt;
                    stats.incomeSource.branchEntry += amt;
                    if (!stats.branchDetails[txn.branchName]) stats.branchDetails[txn.branchName] = [];
                    stats.branchDetails[txn.branchName].push({
                        student: s.studentName,
                        grade: s.grade,
                        amount: amt,
                        date: txn.date,
                        receipt: txn.receiptId
                    });
                }

                // Add all non-waiver credits to totals (including other branch entries)
                if (isSameDay(tDate, today)) stats.incomeTime.today += amt;
                if (isWithinWeek(tDate, today)) stats.incomeTime.weekly += amt;
                if (isSameMonth(tDate, today)) stats.incomeTime.monthly += amt;

                if (txn.mode === 'Cash') {
                  stats.modes.incOffline += amt;
                } else {
                  stats.modes.incOnline += amt;
                  if (txn.sourceAccount) {
                      stats.accounts[txn.sourceAccount] = (stats.accounts[txn.sourceAccount] || 0) + amt;
                      if (!stats.accountDetails[txn.sourceAccount]) stats.accountDetails[txn.sourceAccount] = [];
                      stats.accountDetails[txn.sourceAccount].push({
                          student: s.studentName,
                          grade: s.grade,
                          amount: txn.amount,
                          date: txn.date,
                          id: txn.id,
                          receipt: txn.receiptId
                      });
                  }
                }

                if (!txn.isOtherBranch) {
                  const d = txn.description.toLowerCase();
                  if (d.includes('exam')) stats.incomeSource.exam += amt;
                  else if (d.includes('misc') || d.includes('kit') || d.includes('tie') || d.includes('belt')) stats.incomeSource.misc += amt;
                  else if (d.includes('admission')) stats.incomeSource.admission += amt;
                  else stats.incomeSource.monthlyFee += amt;
                }
            }
        });
    });

    // Process External Branch Collections (from Branch Entry Tool)
    branchCollections.forEach(bc => {
      const bcDate = new Date(bc.date);
      const amt = bc.amount;
      
      // Update Main Income Stats
      if (isSameDay(bcDate, today)) stats.incomeTime.today += amt;
      if (isWithinWeek(bcDate, today)) stats.incomeTime.weekly += amt;
      if (isSameMonth(bcDate, today)) stats.incomeTime.monthly += amt;

      // Update Channel Stats
      if (bc.paymentMode === 'Cash') stats.modes.incOffline += amt;
      else {
        stats.modes.incOnline += amt;
        // Track specific accounts for branch digital payments
        if (bc.sourceAccount) {
          stats.accounts[bc.sourceAccount] = (stats.accounts[bc.sourceAccount] || 0) + amt;
          if (!stats.accountDetails[bc.sourceAccount]) stats.accountDetails[bc.sourceAccount] = [];
          stats.accountDetails[bc.sourceAccount].push({
              student: bc.studentName,
              grade: bc.grade,
              amount: amt,
              date: bc.date,
              id: bc.id,
              receipt: bc.receiptNo
          });
        }
      }

      // Track source stats
      stats.incomeSource.branchEntry += amt;
      stats.branchCollections[bc.branch] = (stats.branchCollections[bc.branch] || 0) + amt;
      if (!stats.branchDetails[bc.branch]) stats.branchDetails[bc.branch] = [];
      stats.branchDetails[bc.branch].push({
          student: bc.studentName,
          grade: bc.grade,
          amount: amt,
          date: bc.date,
          receipt: bc.receiptNo
      });
    });

    // Process Expenses/Manual Credits
    expenses.forEach(e => {
        const amt = e.amount;
        if (e.recordType === 'Expense') {
            if (e.paymentMode === 'Cash') stats.modes.expOffline += amt;
            else stats.modes.expOnline += amt;
        } else {
            const eDate = new Date(e.date);
            if (isSameDay(eDate, today)) stats.incomeTime.today += amt;
            if (isWithinWeek(eDate, today)) stats.incomeTime.weekly += amt;
            if (isSameMonth(eDate, today)) stats.incomeTime.monthly += amt;

            if (e.paymentMode === 'Cash') stats.modes.incOffline += amt;
            else stats.modes.incOnline += amt;

            if (e.category === 'D.Sir') stats.incomeSource.dsir += amt;
            else if (e.category === 'Admission') stats.incomeSource.admission += amt;
            else stats.incomeSource.other += amt;
        }
    });

    return stats;
  }, [students, expenses, currentSession, branchCollections]);

  const reportData = useMemo(() => {
    let combinedIncome: any[] = [];
    let expenseEntries: Expense[] = [];

    // Main student histories
    students.forEach(student => {
        student.history.forEach(txn => {
            if (txn.type === 'Credit' && txn.mode !== 'Waiver') {
                 const txnDate = parseTransactionDate(txn.date);
                 let include = false;
                 if (viewMode === 'daily') include = isSameDay(txnDate, selectedDate);
                 else if (viewMode === 'weekly') include = isWithinWeek(txnDate, selectedDate);
                 else if (viewMode === 'monthly') include = isSameMonth(txnDate, selectedDate);
                 else if (viewMode === 'yearly') include = isSameYear(txnDate, selectedDate);

                 if (include) {
                     let source = txn.isOtherBranch ? 'External Branch' : 'Monthly';
                     const descLower = txn.description.toLowerCase();
                     if (!txn.isOtherBranch) {
                        if (descLower.includes('exam')) source = 'Exam';
                        else if (descLower.includes('admission')) source = 'Admission';
                        else if (descLower.includes('kit') || descLower.includes('misc')) source = 'Misc';
                     }
                     
                     combinedIncome.push({
                         date: txnDate,
                         displayDate: txn.date,
                         desc: txn.isOtherBranch ? `Branch Pay: ${student.studentName} (${txn.branchName})` : `Fee: ${student.studentName} (${student.grade})`,
                         category: txn.isOtherBranch ? 'Branch Entry' : 'Tuition/Fee',
                         amount: txn.amount,
                         mode: txn.mode,
                         source: source,
                         destination: txn.sourceAccount
                     });
                 }
            }
        });
    });

    // Branch Collections (Recorded through Branch Entry Tool)
    branchCollections.forEach(bc => {
        const bcDate = new Date(bc.date);
        let include = false;
        if (viewMode === 'daily') include = isSameDay(bcDate, selectedDate);
        else if (viewMode === 'weekly') include = isWithinWeek(bcDate, selectedDate);
        else if (viewMode === 'monthly') include = isSameMonth(bcDate, selectedDate);
        else if (viewMode === 'yearly') include = isSameYear(bcDate, selectedDate);

        if (include) {
            combinedIncome.push({
                date: bcDate,
                displayDate: bc.date,
                desc: `Branch Entry: ${bc.studentName} (${bc.branch})`,
                category: 'Branch Collection',
                amount: bc.amount,
                mode: bc.paymentMode,
                source: 'External Branch',
                destination: bc.sourceAccount || bc.branch
            });
        }
    });

    expenses.forEach(entry => {
        const entryDate = new Date(entry.date);
        let include = false;
        if (viewMode === 'daily') include = isSameDay(entryDate, selectedDate);
        else if (viewMode === 'weekly') include = isWithinWeek(entryDate, selectedDate);
        else if (viewMode === 'monthly') include = isSameMonth(entryDate, selectedDate);
        else if (viewMode === 'yearly') include = isSameYear(entryDate, selectedDate);

        if (include) {
            if (entry.recordType === 'Income') {
                combinedIncome.push({
                    date: entryDate,
                    displayDate: formatDate(entryDate),
                    desc: entry.description,
                    category: entry.category,
                    amount: entry.amount,
                    mode: entry.paymentMode,
                    source: entry.category,
                    destination: entry.recordedBy 
                });
            } else {
                expenseEntries.push(entry);
            }
        }
    });

    const totalIncome = combinedIncome.reduce((acc, curr) => acc + curr.amount, 0);
    const incomeCash = combinedIncome.filter(i => i.mode === 'Cash').reduce((acc, curr) => acc + curr.amount, 0);
    const incomeOnline = totalIncome - incomeCash;

    const totalExpense = expenseEntries.reduce((acc, curr) => acc + curr.amount, 0);
    const expenseCash = expenseEntries.filter(e => e.paymentMode === 'Cash').reduce((acc, curr) => acc + curr.amount, 0);
    const expenseOnline = totalExpense - expenseCash;

    const net = totalIncome - totalExpense;
    const netCash = incomeCash - expenseCash;
    const netOnline = incomeOnline - expenseOnline;

    const sourceBreakdown: Record<string, number> = { 'Monthly': 0, 'Exam': 0, 'Admission': 0, 'Misc': 0, 'D.Sir': 0, 'External Branch': 0 };
    combinedIncome.forEach(i => {
        if (sourceBreakdown[i.source] !== undefined) sourceBreakdown[i.source] += i.amount;
        else {
            if (!sourceBreakdown['Other']) sourceBreakdown['Other'] = 0;
            sourceBreakdown['Other'] += i.amount;
        }
    });

    const tableData = [
        ...combinedIncome.map(i => ({ ...i, type: 'Income' as const })),
        ...expenseEntries.map(e => ({
            date: new Date(e.date),
            displayDate: formatDate(new Date(e.date)),
            desc: e.description,
            category: e.category,
            amount: e.amount,
            type: 'Expense' as const,
            mode: e.paymentMode,
            source: '-',
            destination: '-'
        }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return { totalIncome, incomeCash, incomeOnline, totalExpense, expenseCash, expenseOnline, net, netCash, netOnline, tableData, sourceBreakdown };
  }, [students, expenses, branchCollections, viewMode, selectedDate]);

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'daily') newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    if (viewMode === 'weekly') newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    if (viewMode === 'monthly') newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    if (viewMode === 'yearly') newDate.setFullYear(selectedDate.getFullYear() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.amount || !newEntry.description) return;
    const entry: Expense = {
        id: `ENT-${Date.now()}`,
        date: new Date().toISOString(),
        category: newEntry.category as any,
        description: newEntry.description,
        amount: parseFloat(newEntry.amount),
        paymentMode: newEntry.paymentMode as any,
        recordedBy: 'Admin',
        recordType: recordType
    };
    onAddExpense(entry);
    setNewEntry({ ...newEntry, description: '', amount: '' });
  };

  const formatDateLabel = () => {
      if (viewMode === 'daily') return formatDate(selectedDate);
      if (viewMode === 'weekly') return `${formatDate(getStartOfWeek(selectedDate))} - ${formatDate(getEndOfWeek(selectedDate))}`;
      if (viewMode === 'monthly') return selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      if (viewMode === 'yearly') return selectedDate.getFullYear().toString();
      return '';
  };

  const handlePrint = () => window.print();
  
  const printAccountStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = Object.entries(analytics.accountDetails).map(([acc, txns]) => {
        const total = (txns as any[]).reduce((sum, t) => sum + t.amount, 0);
        const txnRows = (txns as any[]).map(t => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${t.date}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${t.student} (${t.grade})</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${t.receipt}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${t.amount.toLocaleString()}</td>
            </tr>
        `).join('');
        
        return `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <div style="background: #f8fafc; padding: 10px; border-left: 4px solid #7f1d1d; font-weight: bold; display: flex; justify-content: space-between;">
                    <span>Account: ${acc}</span>
                    <span>Sub-Total: ₹${total.toLocaleString()}</span>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
                    <thead><tr style="text-align: left; background: #eee;">
                        <th style="padding: 8px;">Date</th><th style="padding: 8px;">Student</th><th style="padding: 8px;">Receipt</th><th style="padding: 8px; text-align: right;">Amount</th>
                    </tr></thead>
                    <tbody>${txnRows}</tbody>
                </table>
            </div>
        `;
    }).join('');

    printWindow.document.write(`
        <html><head><title>Online Settlement Report</title>
        <style>body { font-family: sans-serif; padding: 40px; } .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }</style></head>
        <body>
            <div class="header">
                <h2>${SCHOOL_INFO.name}</h2>
                <h3>Online Income Settlement Dossier</h3>
                <p>Session: ${currentSession} | Generated: ${formatDate(new Date())}</p>
            </div>
            ${rows}
            <div style="margin-top: 40px; border-top: 1px solid #000; padding-top: 20px; text-align: right; font-weight: bold;">
                Total Online Settlement: ₹${analytics.modes.incOnline.toLocaleString()}
            </div>
        </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div className="pb-20 min-h-screen bg-slate-50">
      <style>{`
        @media print {
            .no-print { display: none !important; }
            body { padding: 0; margin: 0; background: white; }
            .print-container { padding: 0; margin: 0; box-shadow: none; border: none; }
            table { width: 100%; font-size: 10px; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 4px; }
            .print-header { display: block !important; text-align: center; margin-bottom: 20px; }
        }
        .print-header { display: none; }
      `}</style>

      {/* Other Branch Settlement Window */}
      {isBranchReportOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-red-950/60 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95">
                <div className="bg-amber-600 p-8 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-amber-700 rounded-2xl flex items-center justify-center shadow-lg border-b-4 border-amber-900">
                            <span className="text-2xl">🌍</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold serif-font italic">Cross-Branch Collections</h2>
                            <p className="text-[10px] font-black uppercase text-amber-100 tracking-[0.2em]">Summary of payments received by other branches</p>
                        </div>
                    </div>
                    <button onClick={() => setIsBranchReportOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                    {Object.keys(analytics.branchDetails).length > 0 ? (
                        <div className="space-y-12">
                            {Object.entries(analytics.branchDetails).map(([branch, txns]) => (
                                <div key={branch} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">{branch}</h3>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Received Amount</p>
                                            <p className="text-lg font-black text-amber-700">₹{(txns as any[]).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="p-0">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-3">Date</th>
                                                    <th className="px-6 py-3">Student Name</th>
                                                    <th className="px-6 py-3">Receipt ID</th>
                                                    <th className="px-6 py-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {(txns as any[]).map((t, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-slate-500">{t.date}</td>
                                                        <td className="px-6 py-4">
                                                            <p className="font-bold text-slate-800">{t.student}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{t.grade}</p>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-[10px] text-slate-500">{t.receipt}</td>
                                                        <td className="px-6 py-4 text-right font-black text-red-900">₹{t.amount.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-40">
                            <span className="text-8xl mb-4">📍</span>
                            <p className="text-xl font-bold uppercase tracking-widest">No Branch Data Found</p>
                            <p className="text-sm italic mt-2">Payments marked as "Paid in other branch" will appear here.</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white border-t border-slate-100 flex justify-end items-center shrink-0">
                    <button onClick={() => setIsBranchReportOpen(false)} className="px-10 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Close Report</button>
                </div>
            </div>
        </div>
      )}

      {/* Settlement Detailed Window (Modal) */}
      {isSettlementWindowOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-red-950/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95">
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <span className="text-2xl">🏛️</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold serif-font italic">Online Settlement Dossier</h2>
                        <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">Transaction-Level Account Mapping</p>
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={printAccountStatement} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/20">
                        <span>🖨️</span> Print Statements
                    </button>
                    <button onClick={() => setIsSettlementWindowOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">&times;</button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                 {Object.keys(analytics.accountDetails).length > 0 ? (
                    <div className="space-y-12">
                        {Object.entries(analytics.accountDetails).map(([acc, txns]) => (
                            <div key={acc} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">{acc}</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Settled Total</p>
                                        <p className="text-lg font-black text-red-950">₹{(txns as any[]).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                                            <tr>
                                                <th className="px-6 py-3">Date</th>
                                                <th className="px-6 py-3">Student Name</th>
                                                <th className="px-6 py-3">Receipt ID</th>
                                                <th className="px-6 py-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(txns as any[]).map(t => (
                                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-500">{t.date}</td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-800">{t.student}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">{t.grade}</p>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500">{t.receipt}</td>
                                                    <td className="px-6 py-4 text-right font-black text-red-900">₹{t.amount.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-40">
                        <span className="text-8xl mb-4">📜</span>
                        <p className="text-xl font-bold uppercase tracking-widest">No Settlement Data Found</p>
                        <p className="text-sm italic mt-2">Processed online payments with mapped accounts will appear here.</p>
                    </div>
                 )}
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                  <div className="flex gap-6">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Total Online Income</p>
                        <p className="text-xl font-black text-indigo-700">₹{analytics.modes.incOnline.toLocaleString()}</p>
                    </div>
                    <div className="h-10 w-px bg-slate-100"></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Mapped Distributions</p>
                        <p className="text-xl font-black text-slate-800">{Object.keys(analytics.accountDetails).length} Accounts</p>
                    </div>
                  </div>
                  <button onClick={() => setIsSettlementWindowOpen(false)} className="px-10 py-3 bg-red-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-900 transition-all">Close Dossier</button>
              </div>
           </div>
        </div>
      )}

      <div className={`text-white py-12 px-4 shadow-xl transition-colors bg-red-950 no-print`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
             <h1 className="text-3xl font-bold serif-font mb-2">Finance & Analytics</h1>
             <p className="font-bold text-xs uppercase tracking-widest text-amber-500">
                {mainTab === 'hisab' ? 'Daily Ledger & Transactions' : 'Strategic Business Intelligence'}
             </p>
          </div>
          
          <div className="flex bg-red-900 p-1.5 rounded-full border border-red-800">
             <button 
               onClick={() => setMainTab('hisab')}
               className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mainTab === 'hisab' ? 'bg-white text-red-900 shadow-md' : 'text-red-200 hover:text-white'}`}
             >
               <span>📖</span> Hisab
             </button>
             <button 
               onClick={() => setMainTab('reports')}
               className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mainTab === 'reports' ? 'bg-white text-red-900 shadow-md' : 'text-red-200 hover:text-white'}`}
             >
               <span>📊</span> Reports
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-8 print-container">
         
         {mainTab === 'hisab' && (
           <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="print-header">
                    <h1 className="text-2xl font-bold uppercase">{SCHOOL_INFO.name}</h1>
                    <h2 className="text-lg">Financial Report: {formatDateLabel()}</h2>
                    <p className="text-xs">Generated on {formatDate(new Date())}</p>
                </div>

                <div className="flex justify-end mb-4 no-print">
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        {(['daily', 'weekly', 'monthly', 'yearly'] as ViewMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-red-950 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl shadow-lg border-l-8 border-green-600 print:border flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Income</p>
                            <p className="text-2xl font-black text-green-800">₹{reportData.totalIncome.toLocaleString()}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs">
                            <div><span className="block text-[9px] text-slate-400 font-bold uppercase">Cash</span><span className="font-bold text-teal-600">₹{reportData.incomeCash.toLocaleString()}</span></div>
                            <div className="text-right"><span className="block text-[9px] text-slate-400 font-bold uppercase">Online</span><span className="font-bold text-indigo-600">₹{reportData.incomeOnline.toLocaleString()}</span></div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 print:border">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 border-b border-slate-100 pb-1">Income Sources</p>
                        <div className="space-y-1.5 overflow-y-auto max-h-24 custom-scrollbar">
                            {Object.entries(reportData.sourceBreakdown).map(([source, amount]) => (
                                <div key={source} className="flex justify-between items-center text-[11px]">
                                    <span className="font-bold text-slate-600">{source}</span>
                                    <span className="font-mono font-medium text-slate-800">₹{amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-lg border-l-8 border-red-50 print:border flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Expenses</p>
                            <p className="text-2xl font-black text-red-700">₹{reportData.totalExpense.toLocaleString()}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs">
                            <div><span className="block text-[9px] text-slate-400 font-bold uppercase">Cash</span><span className="font-bold text-red-800">₹{reportData.expenseCash.toLocaleString()}</span></div>
                            <div className="text-right"><span className="block text-[9px] text-slate-400 font-bold uppercase">Online</span><span className="font-bold text-red-800">₹{reportData.expenseOnline.toLocaleString()}</span></div>
                        </div>
                    </div>
                    <div className={`bg-white p-5 rounded-2xl shadow-lg border-l-8 print:border flex flex-col justify-between ${reportData.net >= 0 ? 'border-amber-500' : 'border-slate-800'}`}>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Net Balance</p>
                            <p className={`text-2xl font-black ${reportData.net >= 0 ? 'text-amber-700' : 'text-slate-800'}`}>₹{reportData.net.toLocaleString()}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs">
                            <div><span className="block text-[9px] text-slate-400 font-bold uppercase">Net Cash</span><span className={`font-bold ${reportData.netCash >= 0 ? 'text-amber-700' : 'text-slate-800'}`}>₹{reportData.netCash.toLocaleString()}</span></div>
                            <div className="text-right"><span className="block text-[9px] text-slate-400 font-bold uppercase">Net Online</span><span className={`font-bold ${reportData.netOnline >= 0 ? 'text-amber-700' : 'text-slate-800'}`}>₹{reportData.netOnline.toLocaleString()}</span></div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-xl border border-slate-100 no-print">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <span className="text-2xl bg-red-50 p-2 rounded-lg">📝</span>
                            <div><h3 className="font-bold text-red-950">Record Transaction</h3><p className="text-xs text-slate-400">Add manual income or expenses</p></div>
                        </div>
                        <form onSubmit={handleAddEntry} className="space-y-4">
                            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                                <button type="button" onClick={() => { setRecordType('Expense'); setNewEntry({...newEntry, category: 'Maintenance'}); }} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${recordType === 'Expense' ? 'bg-white text-red-900 shadow-sm' : 'text-slate-400'}`}>Expense</button>
                                <button type="button" onClick={() => { setRecordType('Income'); setNewEntry({...newEntry, category: 'D.Sir'}); }} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${recordType === 'Income' ? 'bg-white text-green-800 shadow-sm' : 'text-slate-400'}`}>Income</button>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Category</label>
                                <select 
                                  value={newEntry.category} 
                                  onChange={(e) => setNewEntry({...newEntry, category: e.target.value})} 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none"
                                >
                                    {recordType === 'Expense' ? (
                                        ['Salary', 'Maintenance', 'Utility', 'Event', 'Asset', 'Other'].map(c => <option key={c} value={c}>{c}</option>)
                                    ) : (
                                        ['D.Sir', 'Admission', 'Grant', 'Other'].map(c => <option key={c} value={c}>{c}</option>)
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Description</label>
                                <input type="text" value={newEntry.description} onChange={(e) => setNewEntry({...newEntry, description: e.target.value})} placeholder="Enter details..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Amount (₹)</label>
                                <input type="number" value={newEntry.amount} onChange={(e) => setNewEntry({...newEntry, amount: e.target.value})} placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Mode</label>
                                <select value={newEntry.paymentMode} onChange={(e) => setNewEntry({...newEntry, paymentMode: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none">
                                    {['Cash', 'Online', 'Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-red-950 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-red-900 transition-all">Record Transaction</button>
                        </form>
                    </div>

                    <div className="lg:col-span-8 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-red-950">Transaction Ledger</h3>
                            <button onClick={handlePrint} className="p-2 text-slate-400 hover:text-red-900 transition-colors">🖨️ Print List</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Description</th>
                                        <th className="px-6 py-3 text-right">Income</th>
                                        <th className="px-6 py-3 text-right">Expense</th>
                                        <th className="px-6 py-3">Mode</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reportData.tableData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-xs text-slate-500">{item.displayDate}</td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-800">{item.desc}</p>
                                                <p className="text-[10px] text-slate-400 uppercase">{item.category}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-green-600">{item.type === 'Income' ? `₹${item.amount.toLocaleString()}` : '-'}</td>
                                            <td className="px-6 py-4 text-right font-bold text-red-600">{item.type === 'Expense' ? `₹${item.amount.toLocaleString()}` : '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${item.mode === 'Cash' ? 'bg-teal-50 text-teal-700' : 'bg-indigo-50 text-indigo-700'}`}>{item.mode}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
           </div>
         )}

         {mainTab === 'reports' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                        <h4 className="text-xs font-black uppercase text-slate-400 mb-6">Income Channels</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-600">Offline (Cash)</span><span className="font-bold text-slate-800">₹{analytics.modes.incOffline.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-600">Online Portals</span><span className="font-bold text-indigo-600">₹{analytics.modes.incOnline.toLocaleString()}</span></div>
                            <div className="border-t border-slate-50 pt-4 flex justify-between items-center">
                              <span className="text-[11px] font-black uppercase text-amber-600">Branch Entry Income</span>
                              <span className="font-black text-amber-700">₹{analytics.incomeSource.branchEntry.toLocaleString()}</span>
                            </div>
                            <button onClick={() => setIsSettlementWindowOpen(true)} className="w-full mt-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">View Settlement Map</button>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                        <h4 className="text-xs font-black uppercase text-slate-400 mb-6">Cross-Branch Audit</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-600">External Income</span><span className="font-bold text-slate-800">₹{Object.values(analytics.branchCollections).reduce((a: number, b: number) => a + b, 0).toLocaleString()}</span></div>
                            <button onClick={() => setIsBranchReportOpen(true)} className="w-full mt-4 py-3 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all">Detailed Branch Report</button>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                        <h4 className="text-xs font-black uppercase text-slate-400 mb-6">Alumni Recoveries</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-600">Total Collected</span><span className="font-bold text-green-600">₹{analytics.alumni.collected.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-600">Pending Dues</span><span className="font-bold text-red-600">₹{analytics.alumni.restDue.toLocaleString()}</span></div>
                        </div>
                    </div>
                </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default Hisab;
