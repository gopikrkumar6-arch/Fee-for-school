
import React, { useState, useMemo } from 'react';
import { FeeRecord, Transaction } from '../types';
import { SCHOOL_INFO, getFeeConfig, formatDate, CLASS_FEE_STRUCTURE } from '../constants';

const SESSION_MONTHS = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];
const EXAM_TERMS = ['Term 1', 'Term 2', 'Term 3'];

interface DemandSlipProps {
  students: FeeRecord[];
  onUpdateStudents: (list: FeeRecord[]) => void;
  currentSession: string;
  isReadOnly?: boolean;
}

const DemandSlip: React.FC<DemandSlipProps> = ({ students, onUpdateStudents, currentSession, isReadOnly = false }) => {
  const [demandMonth, setDemandMonth] = useState('APR');
  const [selectedClass, setSelectedClass] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [includeExamFee, setIncludeExamFee] = useState('');
  const [includeIdCard, setIncludeIdCard] = useState('no'); 

  const [miscModalOpen, setMiscModalOpen] = useState(false);
  const [miscStudent, setMiscStudent] = useState<FeeRecord | null>(null);
  const [miscSelection, setMiscSelection] = useState<Record<string, boolean>>({
    tie: false, belt: false, diary: false, idCard: false, booklet: false
  });

  const availableClassNames = useMemo(() => {
    return CLASS_FEE_STRUCTURE.flatMap(cat => cat.classes.map(cls => cls.name));
  }, []);

  const sessionStudents = useMemo(() => students.filter(s => s.academicSession === currentSession), [students, currentSession]);

  const filteredStudents = useMemo(() => 
    sessionStudents.filter(f => {
      const matchesSearch = f.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            f.id.includes(searchTerm);
      const matchesClass = selectedClass === 'All' || f.grade === selectedClass;
      return matchesSearch && matchesClass;
    }), [sessionStudents, searchTerm, selectedClass]
  );

  const checkDemandExists = (student: FeeRecord, month: string) => {
    return student.history.some(h => h.description.includes(`Tuition Fee Due - ${month}`));
  };

  const isMonthFeeApplicable = (student: FeeRecord, month: string) => {
    const currentIndex = SESSION_MONTHS.indexOf(month);

    if (student.academicStatus === 'Active' && student.statusMetadata?.activeFrom) {
        const activeFromIndex = SESSION_MONTHS.indexOf(student.statusMetadata.activeFrom);
        if (currentIndex < activeFromIndex) {
            if (student.statusMetadata?.dropMonth) {
                const dropIndex = SESSION_MONTHS.indexOf(student.statusMetadata.dropMonth);
                if (currentIndex >= dropIndex) return false;
            }
            if (student.statusMetadata?.leaveFrom && student.statusMetadata?.leaveTo) {
                const leaveFrom = SESSION_MONTHS.indexOf(student.statusMetadata.leaveFrom);
                const leaveTo = SESSION_MONTHS.indexOf(student.statusMetadata.leaveTo);
                if (currentIndex >= leaveFrom && currentIndex <= leaveTo) return false;
            }
        }
        return true;
    }

    if (student.academicStatus === 'Dropped') {
        const dropIndex = SESSION_MONTHS.indexOf(student.statusMetadata?.dropMonth || 'MAR');
        return currentIndex < dropIndex;
    }
    if (student.academicStatus === 'Inactive') {
        const leaveFrom = SESSION_MONTHS.indexOf(student.statusMetadata?.leaveFrom || '');
        const leaveTo = SESSION_MONTHS.indexOf(student.statusMetadata?.leaveTo || '');
        if (leaveFrom !== -1 && leaveTo !== -1) {
            return currentIndex < leaveFrom || currentIndex > leaveTo;
        }
    }
    return true;
  };

  const getConfigForMonth = (student: FeeRecord, month: string) => {
    const currentIndex = SESSION_MONTHS.indexOf(month);

    if (student.academicStatus === 'Active' && student.statusMetadata?.activeFrom) {
        const activeFromIndex = SESSION_MONTHS.indexOf(student.statusMetadata.activeFrom);
        if (currentIndex < activeFromIndex) {
            if (student.statusMetadata?.transferMonth && student.statusMetadata?.oldClass) {
                const transferIndex = SESSION_MONTHS.indexOf(student.statusMetadata.transferMonth);
                if (currentIndex < transferIndex) {
                    return getFeeConfig(student.statusMetadata.oldClass);
                }
            }
        }
    }

    if (student.academicStatus === 'Transfer' && student.statusMetadata?.transferMonth && student.statusMetadata?.oldClass) {
        const transferIndex = SESSION_MONTHS.indexOf(student.statusMetadata.transferMonth);
        if (currentIndex < transferIndex) {
            return getFeeConfig(student.statusMetadata.oldClass);
        }
    }
    return getFeeConfig(student.grade);
  };

  const checkSequence = (student: FeeRecord, month: string) => {
    const currentIndex = SESSION_MONTHS.indexOf(month);
    if (currentIndex === -1) return false;
    if (currentIndex === 0) return true;
    const prevMonth = SESSION_MONTHS[currentIndex - 1];
    const isPrevPaid = student.monthlyStatus[prevMonth] === 'Paid';
    const isPrevGenerated = checkDemandExists(student, prevMonth);
    const isPrevExempt = student.monthlyStatus[prevMonth] === 'Exempted';
    return isPrevPaid || isPrevGenerated || isPrevExempt;
  };

  const openMiscModal = (student: FeeRecord) => {
    setMiscStudent(student);
    setMiscSelection({ tie: false, belt: false, diary: false, idCard: false, booklet: false });
    setMiscModalOpen(true);
  };

  const handleMiscSubmit = () => {
    if (!miscStudent) return;
    const config = getFeeConfig(miscStudent.grade);
    let totalMiscAmount = 0;
    const itemsAdded: string[] = [];
    if (miscSelection.tie) { totalMiscAmount += config.tie; itemsAdded.push(`Tie (₹${config.tie})`); }
    if (miscSelection.belt) { totalMiscAmount += config.belt; itemsAdded.push(`Belt (₹${config.belt})`); }
    if (miscSelection.diary) { totalMiscAmount += config.diary; itemsAdded.push(`Diary (₹${config.diary})`); }
    if (miscSelection.idCard) { totalMiscAmount += config.idCard; itemsAdded.push(`ID Card (₹${config.idCard})`); }
    if (miscSelection.booklet) { totalMiscAmount += config.booklet; itemsAdded.push(`Booklet (₹${config.booklet})`); }
    
    if (totalMiscAmount === 0) { 
        alert("Please select at least one item."); 
        return; 
    }

    const description = `Misc Kit: ${itemsAdded.join(', ')}`;
    const newTxn: Transaction = { 
        id: `MISC-${Date.now()}`, 
        receiptId: '-', 
        date: formatDate(new Date()), 
        description: description, 
        amount: totalMiscAmount, 
        type: 'Debit', 
        mode: 'Demand' 
    };

    const updatedStudent = { ...miscStudent, history: [newTxn, ...miscStudent.history] };
    const updatedList = students.map(s => s.id === miscStudent.id ? updatedStudent : s);
    onUpdateStudents(updatedList);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
       printWindow.document.write(`<html><head><title>Misc Demand Slip</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap'); body { font-family: 'Inter', sans-serif; padding: 20px; box-sizing: border-box; background: #fff; } .slip-container { border: 1px solid #000; padding: 15px; height: 320px; box-sizing: border-box; position: relative; } .slip-header { border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 12px; } .slip-title { background: #eee; color: #000; font-weight: bold; font-size: 11px; margin-top: 8px; padding: 3px; text-align: center; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #ccc; } .slip-grid { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 12px; line-height: 1.4; } .label { font-size: 8px; color: #555; text-transform: uppercase; font-weight: 700; margin-right: 4px; } .slip-table { width: 100%; font-size: 10px; border-collapse: collapse; margin-bottom: 10px; } .slip-table th { border-bottom: 1px solid #000; padding: 4px; font-weight: 900; text-transform: uppercase; background: #f9f9f9; text-align:left; } .slip-table td { border-bottom: 1px solid #eee; padding: 4px; } .total-row td { border-top: 2px solid #000; border-bottom: none; font-size: 12px; background: #f0f0f0; padding: 6px; } .slip-footer { font-size: 8px; margin-top: auto; color: #444; position: absolute; bottom: 15px; width: calc(100% - 30px); }</style></head><body><div class="slip-container"><div class="slip-header"><div style="float:left; width: 60px;"><div style="background:#7f1d1d; color:white; font-weight:bold; padding:5px; text-align:center;">SA</div></div><div style="float:right; text-align:right;"><h3 style="margin:0; color:#7f1d1d;">${SCHOOL_INFO.name}</h3><p style="margin:2px 0; font-size:9px;">${SCHOOL_INFO.address}</p></div><div style="clear:both;"></div><div class="slip-title">MISCELLANEOUS KIT CHARGES</div></div><div class="slip-grid"><div><span class="label">Student:</span> <b>${updatedStudent.studentName}</b><br/><span class="label">Father:</span> ${updatedStudent.fatherName}<br/><span class="label">UID:</span> ${updatedStudent.id}</div><div style="text-align:right"><span class="label">Class:</span> <b>${updatedStudent.grade}-${updatedStudent.section}</b><br/><span class="label">Roll:</span> ${updatedStudent.rollNo}<br/><span class="label">Date:</span> ${formatDate(new Date())}</div></div><table class="slip-table"><thead><tr><th align="left">Item</th><th align="right">Amount (₹)</th></tr></thead><tbody>${Object.keys(miscSelection).map(key => { if (!miscSelection[key]) return ''; const val = (config as any)[key]; return `<tr><td>${key.toUpperCase()}</td><td align="right">${val}</td></tr>`; }).join('')}<tr class="total-row"><td><strong>NET PAYABLE</strong></td><td align="right"><strong>${totalMiscAmount}</strong></td></tr></tbody></table><div class="slip-footer"><p>• Charges added to student ledger. Please pay at counter or online.</p><div style="margin-top:15px; border-top:1px dashed #ccc; padding-top:5px; display:flex; justify-content:space-between;"><span>Authorized Signatory</span><span>Parent Signature</span></div></div></div><script>window.onload = function() { window.print(); }</script></body></html>`);
       printWindow.document.close();
    }
    setMiscModalOpen(false);
  };

  const generateAndPrintSlips = (printQueue: { student: FeeRecord, isReprint: boolean, addedExamFee: boolean, addedIdCard: boolean }[], month: string, existingWindow: Window | null) => {
    const printWindow = existingWindow || window.open('', '_blank');
    if (!printWindow) { alert("Popups are blocked! Please allow popups for this site to print demand slips."); return; }
    const slipsHtml = printQueue.map(({ student, isReprint, addedExamFee, addedIdCard }, index) => {
        const mConfig = getConfigForMonth(student, month);
        const currentFee = mConfig.tuition;
        const demandMonthIndex = SESSION_MONTHS.indexOf(month);
        const startDiscountIndex = SESSION_MONTHS.indexOf(student.discountStartMonth || 'APR');
        const isEligible = demandMonthIndex >= startDiscountIndex;
        const discount = isEligible ? (student.cashDiscount || 0) : 0;
        const netFee = Math.max(0, currentFee - discount);
        const legacyArrears = student.arrearsMarch2025; 
        let examFeeAmount = addedExamFee ? (mConfig.exam || 0) : 0;
        let idCardAmount = addedIdCard ? (mConfig.idCard || 0) : 0;
        
        const totalDebits = student.history
            .filter(t => t.type === 'Debit' && !t.description.includes('Charge Generated for Exemption'))
            .reduce((sum, t) => sum + t.amount, 0);

        const ghostDebits = SESSION_MONTHS.reduce((sum, m) => {
            if (!isMonthFeeApplicable(student, m)) return sum;
            const isPaid = student.monthlyStatus[m] === 'Paid';
            const isExempt = student.monthlyStatus[m] === 'Exempted';
            const hasDemand = checkDemandExists(student, m);
            if (isPaid && !isExempt && !hasDemand) {
                const innerConfig = getConfigForMonth(student, m);
                const idx = SESSION_MONTHS.indexOf(m);
                const mEligible = idx >= startDiscountIndex;
                const mDiscount = mEligible ? (student.cashDiscount || 0) : 0;
                const monthlyNet = Math.max(0, innerConfig.tuition - mDiscount);
                return sum + monthlyNet;
            }
            return sum;
        }, 0);

        const grossPayable = legacyArrears + totalDebits + ghostDebits;
        const netPayable = Math.max(0, grossPayable - student.paidAmount);
        
        let gradeLabel = student.grade;
        if (student.academicStatus === 'Transfer' && demandMonthIndex < SESSION_MONTHS.indexOf(student.statusMetadata?.transferMonth || '')) {
            gradeLabel = student.statusMetadata?.oldClass || student.grade;
        } else if (student.academicStatus === 'Active' && student.statusMetadata?.activeFrom && demandMonthIndex < SESSION_MONTHS.indexOf(student.statusMetadata.activeFrom)) {
             if (student.statusMetadata?.transferMonth && demandMonthIndex >= SESSION_MONTHS.indexOf(student.statusMetadata.transferMonth)) {
                // Label handled by logic
             } else if (student.statusMetadata?.oldClass) {
                 gradeLabel = student.statusMetadata.oldClass;
             }
        }

        return `<div class="slip-container">${isReprint ? '<div class="watermark">REPRINTED</div>' : ''}<div class="slip-header"><div style="float:left; width: 60px;"><div style="background:#7f1d1d; color:white; font-weight:bold; padding:5px; text-align:center;">SA</div></div><div style="float:right; text-align:right;"><h3 style="margin:0; color:#7f1d1d;">${SCHOOL_INFO.name}</h3><p style="margin:2px 0; font-size:9px;">${SCHOOL_INFO.address}</p></div><div style="clear:both;"></div><div class="slip-title">${isReprint ? '(DUPLICATE COPY)' : ''} FEE DEMAND NOTE • ${month} ${currentSession}</div></div><div class="slip-grid"><div><span class="label">Student:</span> <b>${student.studentName}</b><br/><span class="label">Father:</span> ${student.fatherName}<br/><span class="label">UID:</span> ${student.id}</div><div style="text-align:right"><span class="label">Class:</span> <b>${gradeLabel}-${student.section}</b><br/><span class="label">Roll:</span> ${student.rollNo}<br/><span class="label">Date:</span> ${formatDate(new Date())}</div></div><table class="slip-table"><thead><tr><th align="left">Particulars</th><th align="right">Amount (₹)</th></tr></thead><tbody><tr><td>Tuition Fee (${month})</td><td align="right">${currentFee.toLocaleString()}</td></tr>${discount > 0 ? `<tr><td style="color:#777;">Less: Concession / Scholarship</td><td align="right" style="color:#777;">-${discount.toLocaleString()}</td></tr>` : ''}${addedExamFee ? `<tr><td>Exam Fee (${includeExamFee})</td><td align="right">${examFeeAmount.toLocaleString()}</td></tr>` : ''}${addedIdCard ? `<tr><td>ID Card Charges</td><td align="right">${idCardAmount.toLocaleString()}</td></tr>` : ''}<tr><td>Previous Dues & Arrears</td><td align="right">${Math.max(0, netPayable - netFee - examFeeAmount - idCardAmount).toLocaleString()}</td></tr><tr style="background:#f9f9f9; font-style:italic;"><td><strong>Gross Total</strong></td><td align="right"><strong>${grossPayable.toLocaleString()}</strong></td></tr><tr><td>Less: Total Paid</td><td align="right">-${student.paidAmount.toLocaleString()}</td></tr><tr class="total-row"><td><strong>NET PAYABLE</strong></td><td align="right"><strong>${netPayable.toLocaleString()}</strong></td></tr></tbody></table><div class="slip-footer"><p>• Due Date: 10th of ${month}. Late fine applicable thereafter.</p><p>• Please present this slip at the counter or pay online via student portal.</p><div style="margin-top:15px; border-top:1px dashed #ccc; padding-top:5px; display:flex; justify-content:space-between;"><span>Authorized Signatory</span><span>Parent Signature</span></div></div></div>${(index + 1) % 3 === 0 ? '<div class="page-break"></div>' : ''}`;
    }).join('');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Demand Slips - ${month}</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap'); body { font-family: 'Inter', sans-serif; padding: 20px; box-sizing: border-box; background: #fff; } .slip-container { border: 1px solid #000; padding: 15px; margin-bottom: 20px; height: 320px; page-break-inside: avoid; background: #fff; position: relative; overflow: hidden; } .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 60px; font-weight: 900; color: #000; opacity: 0.08; border: 5px dashed #000; padding: 10px 40px; z-index: 0; pointer-events: none; white-space: nowrap; } .slip-header { border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 12px; position: relative; z-index: 1; } .slip-title { background: #eee; color: #000; font-weight: bold; font-size: 11px; margin-top: 8px; padding: 3px; text-align: center; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #ccc; } .slip-grid { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 12px; line-height: 1.4; position: relative; z-index: 1; } .label { font-size: 8px; color: #555; text-transform: uppercase; font-weight: 700; margin-right: 4px; } .slip-table { width: 100%; font-size: 10px; border-collapse: collapse; margin-bottom: 10px; position: relative; z-index: 1; } .slip-table th { border-bottom: 1px solid #000; padding: 4px; font-weight: 900; text-transform: uppercase; background: #f9f9f9; text-align:left; } .slip-table td { border-bottom: 1px solid #eee; padding: 4px; } .total-row td { border-top: 2px solid #000; border-bottom: none; font-size: 12px; background: #f0f0f0; padding: 6px; } .slip-footer { font-size: 8px; margin-top: auto; color: #444; position: absolute; bottom: 15px; width: calc(100% - 30px); z-index: 1; } .page-break { page-break-after: always; } @media print { body { padding: 0; margin: 0; } .slip-container { margin: 0; border: 1px solid #999; height: 320px; box-sizing: border-box; } }</style></head><body>${slipsHtml}<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script></body></html>`);
    printWindow.document.close();
  };

  const handleSingleAction = (student: FeeRecord) => {
    if (isReadOnly) return;
    const isReprint = checkDemandExists(student, demandMonth);
    
    if (isReprint) {
        const hasExamCharge = student.history.some(h => h.description.includes('Exam Fee Due'));
        const hasIdCardCharge = student.history.some(h => h.description.includes('ID Card Charges'));
        
        generateAndPrintSlips([{ 
            student, 
            isReprint: true, 
            addedExamFee: hasExamCharge, 
            addedIdCard: hasIdCardCharge 
        }], demandMonth, null);
    }
    else {
        const newTransactions: Transaction[] = [];
        const demandMonthIndex = SESSION_MONTHS.indexOf(demandMonth);
        const startDiscountIndex = SESSION_MONTHS.indexOf(student.discountStartMonth || 'APR');
        const isEligible = demandMonthIndex >= startDiscountIndex;
        const discount = isEligible ? (student.cashDiscount || 0) : 0;
        const mConfig = getConfigForMonth(student, demandMonth);
        const netFee = Math.max(0, mConfig.tuition - discount);
        
        newTransactions.push({ 
            id: `DEM-${demandMonth}-${student.rollNo}-${Date.now()}`, 
            receiptId: '-', 
            date: formatDate(new Date()), 
            description: `Tuition Fee Due - ${demandMonth} ${currentSession}`, 
            amount: netFee, 
            type: 'Debit', 
            mode: 'Demand' 
        });

        let addedExam = false;
        const isExamPaid = student.examFeeStatus?.[includeExamFee as keyof typeof student.examFeeStatus] === 'Paid';
        const hasExamDemand = student.history.some(h => h.description === `Exam Fee Due - ${includeExamFee}`);
        if (includeExamFee && mConfig.exam > 0 && !isExamPaid && !hasExamDemand) {
             newTransactions.push({ id: `DEM-EXAM-${includeExamFee}-${student.rollNo}-${Date.now()}`, receiptId: '-', date: formatDate(new Date()), description: `Exam Fee Due - ${includeExamFee}`, amount: mConfig.exam, type: 'Debit', mode: 'Demand' });
             addedExam = true;
        }

        let addedIdCard = false;
        const hasIdCardDemand = student.history.some(h => h.description.includes('ID Card Charges'));
        if (includeIdCard === 'yes' && mConfig.idCard > 0 && !hasIdCardDemand) {
             newTransactions.push({ id: `DEM-IDCARD-${student.rollNo}-${Date.now()}`, receiptId: '-', date: formatDate(new Date()), description: `ID Card Charges - ${currentSession}`, amount: mConfig.idCard, type: 'Debit', mode: 'Demand' });
             addedIdCard = true;
        }

        const updatedStudent = { ...student, history: [...newTransactions, ...student.history] };
        onUpdateStudents(students.map(s => s.id === student.id ? updatedStudent : s));
        generateAndPrintSlips([{ student: updatedStudent, isReprint: false, addedExamFee: addedExam, addedIdCard: addedIdCard }], demandMonth, null);
    }
  };

  return (
    <div className="pb-20 bg-slate-50 relative">
      <style>{`@media print { .no-print, nav, footer, button { display: none !important; } }`}</style>

      {/* Misc Kit Modal */}
      {miscModalOpen && miscStudent && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-red-950/40 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 border border-slate-100 animate-in zoom-in-95">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <span className="text-xl">🎒</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-red-950 serif-font italic">Misc Kit Billing</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400">Student: {miscStudent.studentName}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-8">
                 {['tie', 'belt', 'diary', 'idCard', 'booklet'].map(item => {
                    const cost = (getFeeConfig(miscStudent.grade) as any)[item];
                    return (
                        <label key={item} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${miscSelection[item] ? 'bg-amber-50 border-amber-500' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    checked={miscSelection[item]} 
                                    onChange={() => setMiscSelection({...miscSelection, [item]: !miscSelection[item]})}
                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                />
                                <span className="text-sm font-bold text-slate-700 uppercase">{item === 'idCard' ? 'ID Card' : item}</span>
                            </div>
                            <span className="font-black text-amber-700">₹{cost}</span>
                        </label>
                    );
                 })}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center mb-8">
                 <span className="text-[10px] font-black uppercase text-slate-400">Net Misc Total</span>
                 <span className="text-2xl font-black text-red-950">
                    ₹{Object.keys(miscSelection).reduce((acc, k) => miscSelection[k] ? acc + (getFeeConfig(miscStudent.grade) as any)[k] : acc, 0)}
                 </span>
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setMiscModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                 <button 
                    onClick={handleMiscSubmit} 
                    className="flex-1 py-4 bg-red-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-800 transition-all"
                 >
                    Commit & Print
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className={`text-white py-12 px-4 shadow-xl transition-colors ${isReadOnly ? 'bg-slate-800' : 'bg-red-950'} rounded-b-[2rem]`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div><h2 className="text-2xl font-bold serif-font mb-2 italic">Demand Slip Batch Control</h2><p className={`font-bold text-[10px] uppercase tracking-widest ${isReadOnly ? 'text-slate-400' : 'text-amber-500'}`}>Session {currentSession}</p></div>
          <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/10 flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-red-200 tracking-widest mb-1">Target Class</label>
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)} 
                  className="bg-white text-red-950 text-xs font-bold rounded-xl py-2 px-6 focus:outline-none cursor-pointer w-44"
                >
                  <option value="All">All Classes</option>
                  {availableClassNames.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
              <div className="h-10 w-px bg-white/20 hidden md:block"></div>
              <div><label className="block text-[9px] font-black uppercase text-red-200 tracking-widest mb-1">Target Month</label><select value={demandMonth} onChange={(e) => setDemandMonth(e.target.value)} className="bg-white text-red-950 text-xs font-bold rounded-xl py-2 px-6 focus:outline-none cursor-pointer">{SESSION_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div className="h-10 w-px bg-white/20 hidden md:block"></div>
              <div><label className="block text-[9px] font-black uppercase text-red-200 tracking-widest mb-1">Attach Exam Fee?</label><select value={includeExamFee} onChange={(e) => setIncludeExamFee(e.target.value)} className="bg-white text-red-950 text-xs font-bold rounded-xl py-2 px-4 focus:outline-none cursor-pointer w-32"><option value="">No</option>{EXAM_TERMS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="h-10 w-px bg-white/20 hidden md:block"></div>
              <div><label className="block text-[9px] font-black uppercase text-red-200 tracking-widest mb-1">Attach ID Card?</label><select value={includeIdCard} onChange={(e) => setIncludeIdCard(e.target.value)} className="bg-white text-red-950 text-xs font-bold rounded-xl py-2 px-4 focus:outline-none cursor-pointer w-24"><option value="no">No</option><option value="yes">Yes</option></select></div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input type="text" placeholder="Search by Student Name or ID..." className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-900 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Displaying {filteredStudents.length} Students {selectedClass !== 'All' ? `in ${selectedClass}` : ''}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Student Info</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Class & Roll</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Monthly Fee</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Status ({demandMonth})</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => { 
                  const isPaid = student.monthlyStatus[demandMonth] === 'Paid'; 
                  const isExempted = student.monthlyStatus[demandMonth] === 'Exempted'; 
                  const hasDemand = checkDemandExists(student, demandMonth); 
                  const isSequenceValid = checkSequence(student, demandMonth); 
                  const isApplicable = isMonthFeeApplicable(student, demandMonth); 
                  
                  const isDisabled = isReadOnly || (!hasDemand && (!isApplicable || (!isPaid && !isExempted && !isSequenceValid)));
                  
                  const demandMonthIndex = SESSION_MONTHS.indexOf(demandMonth); 
                  const startDiscountIndex = SESSION_MONTHS.indexOf(student.discountStartMonth || 'APR'); 
                  const isEligible = demandMonthIndex >= startDiscountIndex; 
                  const mConfig = getConfigForMonth(student, demandMonth); 
                  const netFee = Math.max(0, mConfig.tuition - (isEligible ? (student.cashDiscount || 0) : 0)); 
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">{student.studentName}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">UID: {student.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700 text-xs">{(student.academicStatus === 'Transfer' && demandMonthIndex < SESSION_MONTHS.indexOf(student.statusMetadata?.transferMonth || '')) ? student.statusMetadata?.oldClass : student.grade}-{student.section}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase">Roll: {student.rollNo}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-800 text-sm">
                        ₹{!isApplicable || isExempted ? '0' : netFee.toLocaleString()}
                        {isApplicable && !isExempted && isEligible && student.cashDiscount > 0 && <span className="block text-[8px] text-green-600 font-black uppercase">Disc: -{student.cashDiscount}</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {!isApplicable ? <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-slate-100 text-slate-400">Lifecycle Exemption</span> : isExempted ? <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">Exempted</span> : isPaid ? <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black bg-green-50 text-green-700 border border-green-100 uppercase">Paid</span> : <div className="flex flex-col items-center"><span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${hasDemand ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{hasDemand ? 'Generated' : 'Pending'}</span>{!hasDemand && !isSequenceValid && (<span className="text-[8px] text-red-400 font-black uppercase mt-1">Sequence Error</span>)}</div>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openMiscModal(student)} 
                            disabled={isReadOnly} 
                            title="Add Misc Kit Charges (Debit)" 
                            className="text-[9px] font-black uppercase border border-slate-200 p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-800 disabled:opacity-30"
                          >
                            + Kit
                          </button>
                          <button 
                            onClick={() => handleSingleAction(student)} 
                            disabled={isDisabled || isExempted} 
                            className={`text-[9px] font-black uppercase tracking-widest border px-4 py-2 rounded-xl transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${
                              hasDemand 
                                ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100' 
                                : 'text-red-900 border-red-200 hover:bg-red-900 hover:text-white'
                            }`}
                          >
                            {hasDemand ? 'Reprint Slip' : 'Generate Slip'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ); 
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandSlip;
