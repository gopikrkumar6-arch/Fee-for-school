
import React, { useState, useMemo, useEffect } from 'react';
import { PaymentMode, FeeRecord, Transaction } from '../types';
import { formatDate, getFeeConfig } from '../constants';

const SESSION_MONTHS = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];
const EXAM_TERMS = ['Term 1', 'Term 2', 'Term 3'] as const;

interface PaymentsProps {
  students: FeeRecord[];
  onUpdateStudents: (list: FeeRecord[]) => void;
  currentSession: string;
  isReadOnly?: boolean;
  initialStudentId?: string;
}

const Payments: React.FC<PaymentsProps> = ({ students, onUpdateStudents, currentSession, isReadOnly = false, initialStudentId }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [studentId, setStudentId] = useState(initialStudentId || '');
  const [paymentType, setPaymentType] = useState<'monthly' | 'partial' | 'full'>('monthly');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [includeArrears, setIncludeArrears] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [additionalDiscount, setAdditionalDiscount] = useState('');
  const [waiverPercentage, setWaiverPercentage] = useState<string>('15'); 
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  
  const [miscSelection, setMiscSelection] = useState({
    tie: false,
    belt: false,
    idCard: false,
    diary: false,
    booklet: false
  });

  useEffect(() => {
    if (initialStudentId) {
      setStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  const activeStudent = useMemo(() => students.find(s => s.id === studentId), [studentId, students]);

  useEffect(() => {
      setWaiverPercentage(activeStudent?.academicStatus === 'Dropped' ? '0' : '15');
      setIncludeArrears(false);
      setMiscSelection({ tie: false, belt: false, idCard: false, diary: false, booklet: false });
  }, [studentId, activeStudent?.academicStatus]);

  const isMonthFeeApplicable = (student: FeeRecord, month: string) => {
    if (student.academicStatus === 'Dropped') {
        const dropIndex = SESSION_MONTHS.indexOf(student.statusMetadata?.dropMonth || 'MAR');
        const currentIndex = SESSION_MONTHS.indexOf(month);
        return currentIndex < dropIndex;
    }
    if (student.academicStatus === 'Inactive') {
        const leaveFrom = SESSION_MONTHS.indexOf(student.statusMetadata?.leaveFrom || '');
        const leaveTo = SESSION_MONTHS.indexOf(student.statusMetadata?.leaveTo || '');
        const currentIndex = SESSION_MONTHS.indexOf(month);
        if (leaveFrom !== -1 && leaveTo !== -1) {
            return currentIndex < leaveFrom || currentIndex > leaveTo;
        }
    }
    return true;
  };

  const toggleMonth = (month: string) => {
    if (isReadOnly) return;
    if (selectedMonths.includes(month)) {
      setSelectedMonths(prev => prev.filter(m => m !== month));
    } else {
      setSelectedMonths(prev => [...prev, month]);
    }
  };

  const getRemainingTuition = (student: FeeRecord) => {
      const startDiscountIndex = SESSION_MONTHS.indexOf(student.discountStartMonth || 'APR');
      const discount = student.cashDiscount || 0;
      let tuitionRemaining = 0;
      SESSION_MONTHS.forEach((m, idx) => {
          if (student.monthlyStatus[m] !== 'Paid' && isMonthFeeApplicable(student, m)) {
              const isEligible = idx >= startDiscountIndex;
              const netFee = Math.max(0, student.monthlyFee - (isEligible ? discount : 0));
              tuitionRemaining += netFee;
          }
      });
      return tuitionRemaining;
  };

  const getOtherDebits = (student: FeeRecord) => {
    return student.history
        .filter(t => t.type === 'Debit' && !t.description.startsWith('Tuition Fee Due') && t.id !== 'OPENING-BAL')
        .reduce((sum, t) => sum + t.amount, 0);
  };

  const getNonTuitionOutstanding = (student: FeeRecord) => {
    const totalPriorObligations = student.arrearsMarch2025 + getOtherDebits(student);
    return Math.max(0, totalPriorObligations - student.paidAmount);
  };

  const getLegacyArrearsOutstanding = (student: FeeRecord) => {
    return Math.max(0, student.arrearsMarch2025 - student.paidAmount);
  };

  const getUnpaidExamTotal = (student: FeeRecord) => {
      if (student.academicStatus === 'Dropped') return 0;
      
      const config = getFeeConfig(student.grade);
      let total = 0;
      EXAM_TERMS.forEach(term => {
          if (student.examFeeStatus?.[term] !== 'Paid') {
              total += (config.exam || 0);
          }
      });
      return total;
  };

  const getMiscTotal = () => {
    if (!activeStudent) return 0;
    if (activeStudent.academicStatus === 'Dropped') return 0;
    
    const config = getFeeConfig(activeStudent.grade);
    let total = 0;
    if (miscSelection.tie) total += config.tie;
    if (miscSelection.belt) total += config.belt;
    if (miscSelection.idCard) total += config.idCard;
    if (miscSelection.diary) total += config.diary;
    if (miscSelection.booklet) total += config.booklet;
    return total;
  };

  const calculateTotal = () => {
    if (!activeStudent) return 0;
    
    let total = 0;
    
    if (paymentType === 'monthly') {
      const startDiscountIndex = SESSION_MONTHS.indexOf(activeStudent.discountStartMonth || 'APR');
      selectedMonths.forEach(m => {
        const idx = SESSION_MONTHS.indexOf(m);
        const isEligible = idx >= startDiscountIndex;
        const discount = isEligible ? (activeStudent.cashDiscount || 0) : 0;
        total += Math.max(0, activeStudent.monthlyFee - discount);
      });
      if (includeArrears) {
          total += getLegacyArrearsOutstanding(activeStudent);
      }
    } else if (paymentType === 'full') {
      const tuitionRemaining = getRemainingTuition(activeStudent);
      const waiverPercent = parseFloat(waiverPercentage) || 0;
      const tuitionTotal = tuitionRemaining * (1 - (waiverPercent / 100)); 
      total = tuitionTotal + getNonTuitionOutstanding(activeStudent) + getUnpaidExamTotal(activeStudent) + getMiscTotal();
    } else {
      total = Number(customAmount) || 0;
    }

    const extraDisc = parseFloat(additionalDiscount) || 0;
    return Math.max(0, total - extraDisc);
  };

  const calculateDiscountApplied = () => {
    if (paymentType !== 'monthly' || !activeStudent) return 0;
    let discount = 0;
    const startDiscountIndex = SESSION_MONTHS.indexOf(activeStudent.discountStartMonth || 'APR');
    
    selectedMonths.forEach(m => {
       const idx = SESSION_MONTHS.indexOf(m);
       if (idx >= startDiscountIndex) {
           discount += (activeStudent.cashDiscount || 0);
       }
    });
    return discount;
  }

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const amountToPay = calculateTotal();
    const extraDisc = parseFloat(additionalDiscount) || 0;

    if (amountToPay < 0 || !activeStudent) return; 

    let waiverAmount = 0;
    let waiverDescription = 'Full Session Payment Waiver';

    if (paymentType === 'full') {
        const tuitionRemaining = getRemainingTuition(activeStudent);
        const waiverPercent = parseFloat(waiverPercentage) || 0;
        waiverAmount = tuitionRemaining * (waiverPercent / 100);
        waiverDescription = `Full Session Payment Waiver (${waiverPercent}%)`;
    }
    
    setLoading(true);
    setTimeout(() => {
      const updatedStudents = students.map(s => {
        if (s.id !== activeStudent.id) return s;
        
        const newPaidAmount = s.paidAmount + amountToPay + waiverAmount + extraDisc;
        const newStatus: any = { ...s.monthlyStatus };
        const newDebits: Transaction[] = [];

        const miscAmount = getMiscTotal();
        const miscItemsList = Object.keys(miscSelection).filter(k => (miscSelection as any)[k]).map(k => {
           if(k === 'idCard') return 'ID Card';
           return k.charAt(0).toUpperCase() + k.slice(1);
        });

        if (miscAmount > 0 && s.academicStatus !== 'Dropped') {
            const desc = `Misc Kit: ${miscItemsList.join(', ')}`;
            newDebits.push({
                id: `TXN-MISC-${Date.now()}`,
                receiptId: '-',
                date: formatDate(new Date()),
                description: desc,
                amount: miscAmount,
                type: 'Debit',
                mode: 'Demand'
            });
        }

        if (paymentType === 'full' && s.academicStatus !== 'Dropped') {
            const config = getFeeConfig(s.grade);
            EXAM_TERMS.forEach(term => {
                if (s.examFeeStatus?.[term] !== 'Paid') {
                    const examDesc = `Exam Fee Due - ${term}`;
                    const hasExamDebit = s.history.some(h => h.type === 'Debit' && h.description === examDesc);
                    if (!hasExamDebit) {
                        newDebits.push({
                            id: `DEM-EXAM-${term}-${Date.now()}`,
                            receiptId: '-',
                            date: formatDate(new Date()),
                            description: examDesc,
                            amount: config.exam || 0,
                            type: 'Debit',
                            mode: 'Demand'
                        });
                    }
                }
            });
        }

        if (paymentType === 'monthly') {
          selectedMonths.forEach(m => {
            newStatus[m] = 'Paid';
            const hasDebit = s.history.some(h => 
                h.type === 'Debit' && h.description.includes(`Tuition Fee Due - ${m}`)
            );
            if (!hasDebit) {
               const mIdx = SESSION_MONTHS.indexOf(m);
               const startIdx = SESSION_MONTHS.indexOf(s.discountStartMonth || 'APR');
               const isEligible = mIdx >= startIdx;
               const discount = isEligible ? (s.cashDiscount || 0) : 0;
               const netFee = Math.max(0, s.monthlyFee - discount);

               newDebits.push({
                  id: `DEM-${m}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                  receiptId: '-',
                  date: formatDate(new Date()),
                  description: `Tuition Fee Due - ${m} ${currentSession}`,
                  amount: netFee,
                  type: 'Debit',
                  mode: 'Demand'
               });
            }
          });
        } else if (paymentType === 'full') {
          SESSION_MONTHS.forEach((m, idx) => {
             if (s.monthlyStatus[m] !== 'Paid' && isMonthFeeApplicable(s, m)) {
                 newStatus[m] = 'Paid';
                 const hasDebit = s.history.some(h => 
                    h.type === 'Debit' && h.description.includes(`Tuition Fee Due - ${m}`)
                 );
                 if (!hasDebit) {
                     const startIdx = SESSION_MONTHS.indexOf(s.discountStartMonth || 'APR');
                     const isEligible = idx >= startIdx;
                     const discount = isEligible ? (s.cashDiscount || 0) : 0;
                     const netFee = Math.max(0, s.monthlyFee - discount);

                     newDebits.push({
                        id: `DEM-${m}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                        receiptId: '-',
                        date: formatDate(new Date()),
                        description: `Tuition Fee Due - ${m} ${currentSession}`,
                        amount: netFee,
                        type: 'Debit',
                        mode: 'Demand'
                     });
                 }
             }
          });
        }

        const itemsPaidParts: string[] = [];
        if (paymentType === 'monthly' && selectedMonths.length > 0) itemsPaidParts.push(`Tuition (${selectedMonths.join(', ')})`);
        else if (paymentType === 'full') itemsPaidParts.push(s.academicStatus === 'Dropped' ? 'Full Settlement' : 'Full Session');
        else if (paymentType === 'partial') itemsPaidParts.push('Partial Payment');
        
        if (includeArrears) itemsPaidParts.push('Arrears');

        const creditTxn: Transaction = {
              id: `TXN-${Date.now()}`,
              receiptId: `SA-RCPT-26-${Math.floor(Math.random() * 9000) + 1000}`,
              date: formatDate(new Date()),
              description: `Fee Payment: ${itemsPaidParts.join(' + ') || 'General'}`,
              amount: amountToPay,
              type: 'Credit' as const,
              mode: paymentMode
        };

        const newHistory = [creditTxn];

        if (waiverAmount > 0) {
             newHistory.push({
              id: `WVR-${Date.now()}`,
              receiptId: '-',
              date: formatDate(new Date()),
              description: waiverDescription,
              amount: waiverAmount,
              type: 'Credit' as const,
              mode: 'Waiver'
            });
        }

        if (extraDisc > 0) {
             newHistory.push({
              id: `ADJ-${Date.now()}`,
              receiptId: '-',
              date: formatDate(new Date()),
              description: 'Additional Discount / Adjustment',
              amount: extraDisc,
              type: 'Credit' as const,
              mode: 'Waiver'
            });
        }
        
        newHistory.push(...newDebits);

        return {
          ...s,
          paidAmount: newPaidAmount,
          monthlyStatus: newStatus,
          history: [...newHistory, ...s.history]
        };
      });

      onUpdateStudents(updatedStudents);

      const receipt = {
        id: `SA-RCPT-26-${Math.floor(Math.random() * 9000) + 1000}`,
        studentName: activeStudent.studentName,
        amount: amountToPay,
        mode: paymentMode,
        date: formatDate(new Date()),
        type: paymentType,
        uid: studentId
      };
      setLastReceipt(receipt);
      setLoading(false);
      setSuccess(true);
      setSelectedMonths([]);
      setIncludeArrears(false);
      setCustomAmount('');
      setAdditionalDiscount('');
      setMiscSelection({ tie: false, belt: false, idCard: false, diary: false, booklet: false });
    }, 1500);
  };

  const printReceipt = () => {
    window.print();
  };

  const isDropped = activeStudent?.academicStatus === 'Dropped';

  return (
    <div className="py-20 px-4 min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto">
        
        <div className="hidden print:block bg-white p-10 border-2 border-slate-200 rounded-lg">
          <div className="text-center mb-10 pb-10 border-b-2 border-slate-100">
            <h1 className="text-3xl font-black text-red-950 uppercase tracking-tight serif-font">Unique English School</h1>
            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-2">Official Fee Receipt | Session {currentSession}</p>
          </div>
          {lastReceipt && (
            <div className="space-y-6 text-sm">
              <div className="flex justify-between">
                <span>Receipt No: <strong>{lastReceipt.id}</strong></span>
                <span>Date: <strong>{lastReceipt.date}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>Student UID: <strong>{lastReceipt.uid}</strong></span>
                <span>Student: <strong>{lastReceipt.studentName}</strong></span>
              </div>
              <div className="py-10 border-y border-slate-100 flex justify-between items-center">
                <span className="uppercase font-black text-slate-400 tracking-widest">Amount Settled</span>
                <span className="text-4xl font-black text-red-950">₹{lastReceipt.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode: <strong>{lastReceipt.mode}</strong></span>
                <span>Category: <strong>Educational Fees</strong></span>
              </div>
              <p className="text-[10px] text-slate-400 italic text-center pt-10">This is a system generated receipt. No signature required.</p>
            </div>
          )}
        </div>

        <div className="text-center mb-12 print:hidden">
          <div className="text-amber-700 font-bold text-xs uppercase tracking-[0.4em] mb-4">Financial Collection Unit</div>
          <h1 className="text-4xl font-bold serif-font text-red-950 mb-2">Electronic Fee Portal</h1>
          <p className="text-slate-500 italic text-sm">Session {currentSession} {isReadOnly ? '(View Only)' : ''}</p>
          {isReadOnly && (
             <div className="mt-4 inline-block px-4 py-2 bg-slate-200 rounded-full text-xs font-bold uppercase text-slate-600">
               ⚠️ Transactions Disabled for History
             </div>
          )}
        </div>

        {success ? (
          <div className="bg-white rounded-[3rem] p-16 shadow-2xl border-2 border-green-50 text-center animate-in fade-in zoom-in duration-500 print:hidden">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-bold serif-font text-red-950 mb-3 uppercase tracking-tighter">Collection Successful</h2>
            <p className="text-slate-600 mb-10 text-base font-medium italic">Ledger updated. Receipt #{lastReceipt?.id} has been logged.</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setSuccess(false)} className="bg-red-950 text-white px-10 py-4 rounded-full font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-red-900 transition-all">New Collection</button>
              <button onClick={printReceipt} className="bg-amber-600 text-white px-10 py-4 rounded-full font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-amber-700 transition-all">Download / Print Receipt</button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10 print:hidden">
            
            <div className="lg:col-span-8">
              <div className="mb-6">
                {isDropped && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-xl shadow-sm animate-in slide-in-from-top-2">
                    <h4 className="font-black text-red-900 uppercase text-xs">Student Exited (Dropped)</h4>
                    <p className="text-[10px] text-red-700 mt-1">This student was dropped in <strong>{activeStudent?.statusMetadata?.dropMonth}</strong>. Only arrears and pre-drop tuition are settlable. Exam/Misc fees are disabled.</p>
                  </div>
                )}
              </div>

              <form onSubmit={handlePay} className={`bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 space-y-10 ${isReadOnly ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Student UID</label>
                    <input 
                      type="text" 
                      placeholder="SA-101" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base focus:ring-2 focus:ring-red-900 outline-none transition-all font-bold"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="flex items-center">
                    {activeStudent ? (
                      <div className="bg-red-50 p-4 rounded-2xl w-full border border-red-100 animate-in fade-in slide-in-from-left-2">
                        <p className="text-sm font-bold text-red-950">{activeStudent.studentName}</p>
                        <p className="text-xs text-red-700 font-medium">{activeStudent.grade} • Arrears: ₹{activeStudent.arrearsMarch2025.toLocaleString()}</p>
                        <div className="mt-2 inline-flex items-center bg-white border border-red-200 rounded-lg px-2 py-1 text-xs">
                           <span className="font-bold text-slate-500 mr-1">Monthly Net:</span>
                           <span className="font-black text-red-900">₹{Math.max(0, activeStudent.monthlyFee - (activeStudent.cashDiscount || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Enter a valid Student UID</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Collection Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['monthly', 'partial', 'full'].map(t => (
                      <button 
                        key={t}
                        type="button"
                        onClick={() => setPaymentType(t as any)}
                        className={`py-4 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest ${
                          paymentType === t ? 'border-red-900 bg-red-50 text-red-900 shadow-md' : 'border-slate-100 text-slate-400 hover:border-red-100'
                        }`}
                      >
                        {t === 'full' && isDropped ? 'Settlement' : t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner">
                  {paymentType === 'monthly' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Months</p>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {SESSION_MONTHS.map((m, idx) => {
                          const isPaid = activeStudent?.monthlyStatus[m] === 'Paid';
                          const isSelected = selectedMonths.includes(m);
                          const isApplicable = activeStudent ? isMonthFeeApplicable(activeStudent, m) : true;
                          const startIdx = SESSION_MONTHS.indexOf(activeStudent?.discountStartMonth || 'APR');
                          const hasDiscount = idx >= startIdx && activeStudent?.cashDiscount && activeStudent.cashDiscount > 0;
                          
                          return (
                            <button
                              key={m}
                              type="button"
                              disabled={isPaid || !isApplicable}
                              onClick={() => toggleMonth(m)}
                              className={`p-3 rounded-xl border-2 text-xs font-black transition-all relative ${
                                !isApplicable ? 'bg-slate-200 border-slate-300 text-slate-400 opacity-40 grayscale cursor-not-allowed' :
                                isPaid ? 'bg-green-100 border-green-200 text-green-700' :
                                isSelected ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-red-200'
                              }`}
                            >
                              {m}
                              {isPaid && <span className="block text-[8px] mt-1">✓</span>}
                              {!isPaid && !isApplicable && <span className="block text-[8px] mt-1">EXEMPT</span>}
                              {!isPaid && isApplicable && hasDiscount && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {calculateDiscountApplied() > 0 && (
                         <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-center">
                           <span className="text-xs font-bold text-green-800 uppercase tracking-widest">
                             Total Concession Applied: -₹{calculateDiscountApplied()}
                           </span>
                         </div>
                      )}
                      
                      {activeStudent && getLegacyArrearsOutstanding(activeStudent) > 0 && (
                        <div className="pt-4 border-t border-slate-200">
                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only"
                                        checked={includeArrears}
                                        onChange={() => setIncludeArrears(!includeArrears)}
                                    />
                                    <div className="w-5 h-5 border-2 border-slate-300 rounded-md bg-white peer-checked:bg-red-900 peer-checked:border-red-900 transition-all"></div>
                                    <svg className="w-4 h-4 text-white absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700 group-hover:text-red-900 transition-colors">Include Outstanding Legacy Arrears</span>
                                    <span className="text-xs font-black text-red-600">Amount: ₹{getLegacyArrearsOutstanding(activeStudent).toLocaleString()}</span>
                                </div>
                            </label>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentType === 'partial' && (
                    <div className="space-y-4">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Enter Custom Amount (₹)</label>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-2xl font-black text-red-950 outline-none focus:ring-2 focus:ring-amber-600"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                      />
                    </div>
                  )}

                  {paymentType === 'full' && (
                    <div className="text-center py-6">
                      <div className="text-4xl mb-4">{isDropped ? '🧾' : '🏆'}</div>
                      <h3 className="text-xl font-bold text-red-950 serif-font italic">{isDropped ? 'Prior Dues Settlement' : 'Annual Clearance Package'}</h3>
                      <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">{isDropped ? 'Clear only outstanding pre-drop tuition and arrears.' : `Pay for the entire ${currentSession} session now.`}</p>
                      
                      {!isDropped && (
                        <div className="flex justify-center items-center gap-4 mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                           <div className="flex flex-col items-start">
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Waiver %</label>
                              <div className="relative">
                                  <input
                                     type="number"
                                     value={waiverPercentage}
                                     onChange={(e) => setWaiverPercentage(e.target.value)}
                                     className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-2 text-center font-black text-red-900 text-lg outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                              </div>
                           </div>
                        </div>
                      )}

                      {!isDropped && (
                        <div className="mt-6 pt-4 border-t border-slate-100">
                              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Add Misc Kit (Optional)</label>
                              <div className="grid grid-cols-3 gap-2">
                                  {['tie', 'belt', 'idCard', 'diary', 'booklet'].map(item => {
                                      const grade = activeStudent?.grade || 'Class 1'; 
                                      const config = getFeeConfig(grade);
                                      const cost = (config as any)[item];
                                      return (
                                          <label key={item} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                              (miscSelection as any)[item] ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200'
                                          }`}>
                                              <input 
                                                  type="checkbox" 
                                                  className="sr-only"
                                                  checked={(miscSelection as any)[item]}
                                                  onChange={() => setMiscSelection(prev => ({ ...prev, [item]: !(prev as any)[item] }))}
                                              />
                                              <span className="text-[10px] font-black uppercase">{item === 'idCard' ? 'ID Card' : item}</span>
                                              <span className="text-xs font-bold">₹{cost}</span>
                                          </label>
                                      )
                                  })}
                              </div>
                        </div>
                      )}
                      
                      <div className="mt-6 bg-white p-5 rounded-2xl border border-slate-200 text-sm shadow-sm max-w-sm mx-auto text-left">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 border-b border-slate-100 pb-2">Settlement Breakdown</h4>
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center text-red-700">
                                    <span className="font-medium text-xs">Past Tuition Accrued</span>
                                    <span className="font-bold">₹{activeStudent ? getRemainingTuition(activeStudent).toLocaleString() : 0}</span>
                                </div>
                                {!isDropped && parseFloat(waiverPercentage) > 0 && (
                                    <div className="flex justify-between items-center text-green-600">
                                        <span className="font-medium text-xs">Waiver ({waiverPercentage}%)</span>
                                        <span className="font-bold">-₹{activeStudent ? ((getRemainingTuition(activeStudent) * (parseFloat(waiverPercentage)||0)/100)).toLocaleString() : 0}</span>
                                    </div>
                                )}
                                {activeStudent && getNonTuitionOutstanding(activeStudent) > 0 && (
                                    <div className="flex justify-between items-center text-red-600">
                                        <span className="font-medium text-xs">Arrears / Prior Dues</span>
                                        <span className="font-bold">+₹{getNonTuitionOutstanding(activeStudent).toLocaleString()}</span>
                                    </div>
                                )}
                                {!isDropped && activeStudent && getUnpaidExamTotal(activeStudent) > 0 && (
                                    <div className="flex justify-between items-center text-red-700">
                                        <span className="font-medium text-xs">Exam Fees (3 Terms)</span>
                                        <span className="font-bold">+₹{getUnpaidExamTotal(activeStudent).toLocaleString()}</span>
                                    </div>
                                )}
                                {!isDropped && getMiscTotal() > 0 && (
                                    <div className="flex justify-between items-center text-red-700">
                                        <span className="font-medium text-xs">Misc Kit Items</span>
                                        <span className="font-bold">+₹{getMiscTotal().toLocaleString()}</span>
                                    </div>
                                )}
                                {parseFloat(additionalDiscount) > 0 && (
                                    <div className="flex justify-between items-center text-green-600">
                                        <span className="font-medium text-xs">Adjustment</span>
                                        <span className="font-bold">-₹{parseFloat(additionalDiscount).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t border-dashed border-slate-300 pt-3 mt-1 flex justify-between items-center">
                                    <span className="font-black text-red-950 uppercase text-xs tracking-widest">Net Payable</span>
                                    <span className="font-black text-xl text-red-900">₹{calculateTotal().toLocaleString()}</span>
                                </div>
                            </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex flex-col">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Adjustment Discount</label>
                  </div>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-right font-bold text-red-900 outline-none focus:ring-2 focus:ring-amber-500"
                    value={additionalDiscount}
                    onChange={(e) => setAdditionalDiscount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Payment Channel</label>
                  <div className="flex flex-wrap gap-4">
                    {['Cash', 'UPI', 'Bank Transfer'].map(m => (
                      <button 
                        key={m}
                        type="button"
                        onClick={() => setPaymentMode(m as any)}
                        className={`flex items-center px-6 py-4 rounded-2xl border-2 transition-all ${
                          paymentMode === m ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-lg' : 'border-slate-100 bg-white text-slate-400'
                        }`}
                      >
                        <span className="text-xl mr-3">{m === 'Cash' ? '💵' : m === 'UPI' ? '📱' : '🏛️'}</span>
                        <span className="text-xs font-black uppercase tracking-tight">{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !activeStudent || calculateTotal() <= 0} 
                  className="w-full bg-red-950 text-white py-6 rounded-2xl font-black shadow-2xl hover:bg-red-900 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.2em] text-xs flex items-center justify-center"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24"></svg>
                  ) : `Process Settlement (₹${calculateTotal().toLocaleString()})`}
                </button>
              </form>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-red-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <h4 className="text-xl font-bold serif-font mb-6 italic text-amber-500">Historical Liability</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="text-xs font-bold uppercase text-red-300">Target Session</span>
                    <span className="text-sm font-black">{currentSession}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="text-xs font-bold uppercase text-red-300">Legacy Arrears</span>
                    <span className="text-2xl font-black text-amber-400">₹{activeStudent?.arrearsMarch2025.toLocaleString() || '0'}</span>
                  </div>
                  {isDropped && (
                    <div className="pt-4 text-[10px] text-red-300 italic font-medium">
                      * Non-educational charges and future-dated exam fees are excluded from this dossier for dropped records.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
