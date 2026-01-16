
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FeeRecord, PaymentMode, Transaction, FeeCategory, ClassFeeMetadata, AcademicStatus, ReceiptBook, CancelledReceipt, BranchCollection } from '../types';
import { SCHOOL_INFO, formatDate, getStudentPhoto, BRANCH_OPTIONS } from '../constants';

const SESSION_MONTHS = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];
const EXAM_TERMS = ['Term 1', 'Term 2', 'Term 3'] as const;

interface DashboardProps {
  students: FeeRecord[];
  onUpdateStudents: (list: FeeRecord[]) => void;
  currentSession: string;
  isReadOnly?: boolean;
  feeStructure: FeeCategory[];
  addLog?: (action: string, details: string, type: any) => void;
  targetStudentId?: string | null;
  branchCollections: BranchCollection[];
  setBranchCollections: React.Dispatch<React.SetStateAction<BranchCollection[]>>;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  students, 
  onUpdateStudents, 
  currentSession, 
  isReadOnly = false, 
  feeStructure, 
  addLog,
  targetStudentId,
  branchCollections,
  setBranchCollections
}) => {
  const [selectedStudent, setSelectedStudent] = useState<FeeRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
  
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editDiscountAmount, setEditDiscountAmount] = useState('');
  const [editDiscountStartMonth, setEditDiscountStartMonth] = useState('APR');

  const [isSiblingModalOpen, setIsSiblingModalOpen] = useState(false);
  const [isFamilyBatchOpen, setIsFamilyBatchOpen] = useState(false);
  const [siblingSearchTerm, setSiblingSearchTerm] = useState('');

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editStudentData, setEditStudentData] = useState<Partial<FeeRecord>>({});
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'ledger' | 'collect'>('ledger');

  const [isExemptionModalOpen, setIsExemptionModalOpen] = useState(false);
  const [exemptMonths, setExemptMonths] = useState<string[]>([]);
  const [exemptTerms, setExemptTerms] = useState<string[]>([]);
  const [exemptMisc, setExemptMisc] = useState<Record<string, boolean>>({
    tie: false, belt: false, idCard: false, diary: false, booklet: false
  });

  const [isHistoryEditMode, setIsHistoryEditMode] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [paymentType, setPaymentType] = useState<'monthly' | 'partial' | 'full'>('monthly');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [includeArrears, setIncludeArrears] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [additionalDiscount, setAdditionalDiscount] = useState('');
  const [waiverPercentage, setWaiverPercentage] = useState<string>('0'); 
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');

  const [isOnTimeWaiverActive, setIsOnTimeWaiverActive] = useState(false);
  const [onTimeWaiverAmount, setOnTimeWaiverAmount] = useState('0');

  const [selectedHistoryDebitIds, setSelectedHistoryDebitIds] = useState<string[]>([]);

  const [isOtherBranch, setIsOtherBranch] = useState(false);
  const [isOtherBranchModalOpen, setIsOtherBranchModalOpen] = useState(false);
  const [otherBranchDetails, setOtherBranchDetails] = useState({
    branch: 'Branch 1',
    date: new Date().toISOString().split('T')[0],
    receiptNo: ''
  });

  // --- Branch Entry Modal States ---
  const [isBranchEntryModalOpen, setIsBranchEntryModalOpen] = useState(false);
  const [branchPopupTab, setBranchPopupTab] = useState<'entry' | 'history'>('entry');

  // Lists for UPI and Banks
  const [upiAccounts, setUpiAccounts] = useState<string[]>(() => {
    const saved = localStorage.getItem('ues_upi_receivers');
    return saved ? JSON.parse(saved) : ["Director Sir", "Office Primary", "Gopi Nand"];
  });

  const [bankAccounts, setBankAccounts] = useState<string[]>(() => {
    const saved = localStorage.getItem('ues_bank_names');
    return saved ? JSON.parse(saved) : ["State Bank of India", "HDFC Bank", "Punjab National Bank"];
  });

  const [branchEntryForm, setBranchEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    branch: 'Branch 2',
    studentName: '',
    grade: 'Class 1',
    section: 'A',
    rollNo: '',
    amount: '',
    paymentMode: 'Cash' as PaymentMode,
    sourceAccount: ''
  });

  const [isUPIAccountSelectOpen, setIsUPIAccountSelectOpen] = useState(false);
  const [isUPIAccountEditMode, setIsUPIAccountEditMode] = useState(false);
  
  const [isBankSelectOpen, setIsBankSelectOpen] = useState(false);
  const [isBankEditMode, setIsBankEditMode] = useState(false);
  
  const [selectedExamTerm, setSelectedExamTerm] = useState<string>('');
  
  const [miscSelection, setMiscSelection] = useState({
    tie: false,
    belt: false,
    idCard: false,
    diary: false,
    booklet: false
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('ues_upi_receivers', JSON.stringify(upiAccounts));
  }, [upiAccounts]);

  useEffect(() => {
    localStorage.setItem('ues_bank_names', JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  useEffect(() => {
    if (targetStudentId) {
      const student = students.find(s => s.id === targetStudentId && s.academicSession === currentSession);
      if (student) {
        setSelectedStudent(student);
        setActiveTab('ledger');
      }
    }
  }, [targetStudentId, students, currentSession]);

  const getEffectiveConfig = (grade: string): ClassFeeMetadata => {
    for (const cat of feeStructure) {
      const cls = cat.classes.find(c => c.name === grade);
      if (cls) return cls;
    }
    return { name: grade, tuition: 8000, onTimeReward: 0, exam: 2000, tie: 0, belt: 0, idCard: 0, diary: 0, booklet: 0 };
  };

  const getConfigForMonth = (student: FeeRecord, month: string): ClassFeeMetadata => {
    const currentIndex = SESSION_MONTHS.indexOf(month);
    const currentClassConfig = getEffectiveConfig(student.grade);
    if (student.statusMetadata?.transferMonth && student.statusMetadata?.oldClass) {
        const transferIndex = SESSION_MONTHS.indexOf(student.statusMetadata.transferMonth);
        if (currentIndex < transferIndex) {
            return getEffectiveConfig(student.statusMetadata.oldClass);
        }
    }
    return currentClassConfig;
  };

  const availableClassNames = useMemo(() => feeStructure.flatMap(cat => cat.classes.map(cls => cls.name)), [feeStructure]);
  const sessionStudents = useMemo(() => students.filter(s => s.academicSession === currentSession), [students, currentSession]);

  const siblings = useMemo(() => {
    if (!selectedStudent) return [];
    const excluded = selectedStudent.excludedSiblings || [];
    const autoDetected = sessionStudents.filter(s => {
       if (s.id === selectedStudent.id || excluded.includes(s.id)) return false;
       const sFather = s.fatherName?.trim().toLowerCase();
       const currentFather = selectedStudent.fatherName?.trim().toLowerCase();
       const sMother = s.motherName?.trim().toLowerCase();
       const currentMother = selectedStudent.motherName?.trim().toLowerCase();
       const sMobile = s.mobileNumber?.trim();
       const currentMobile = selectedStudent.mobileNumber?.trim();
       return (currentFather && sFather === currentFather) || (currentMother && sMother === currentMother) || (currentMobile && sMobile === currentMobile);
    });
    const manualIDs = (selectedStudent.siblings || []).filter(id => !excluded.includes(id));
    const manualSiblings = sessionStudents.filter(s => manualIDs.includes(s.id));
    const combined = [...autoDetected, ...manualSiblings];
    return Array.from(new Map(combined.map(item => [item.id, item])).values());
  }, [selectedStudent, sessionStudents]);

  const filteredFees = sessionStudents.filter(f => f.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || f.id.includes(searchTerm));

  const isMonthFeeApplicable = (student: FeeRecord, month: string) => {
    const currentIndex = SESSION_MONTHS.indexOf(month);
    if (student.academicStatus === 'Active' && student.statusMetadata?.activeFrom) {
        const activeFromIndex = SESSION_MONTHS.indexOf(student.statusMetadata.activeFrom);
        if (currentIndex < activeFromIndex) return false;
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

  const getNetDue = (student: FeeRecord) => {
    const totalDebits = student.history
      .filter(t => t.type === 'Debit' && !t.description.includes('Charge Generated for Exemption'))
      .reduce((sum, t) => sum + t.amount, 0);
    return Math.max(0, (student.arrearsMarch2025 + totalDebits) - student.paidAmount);
  };

  const getOtherDebits = (student: FeeRecord, historyOverride?: Transaction[]) => {
    const history = historyOverride || student.history;
    return history
      .filter(t => t.type === 'Debit' && !t.description.startsWith('Tuition Fee Due') && t.id !== 'OPENING-BAL' && !t.description.includes('Charge Generated for Exemption'))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getNonTuitionOutstanding = (student: FeeRecord) => {
    const totalPriorObligations = student.arrearsMarch2025 + getOtherDebits(student);
    return Math.max(0, totalPriorObligations - student.paidAmount);
  };

  const getRemainingTuition = (student: FeeRecord) => {
      const startDiscountIndex = SESSION_MONTHS.indexOf(student.discountStartMonth || 'APR');
      const discount = student.cashDiscount || 0;
      let tuitionRemaining = 0;
      SESSION_MONTHS.forEach((m, idx) => {
          if (student.monthlyStatus[m] !== 'Paid' && student.monthlyStatus[m] !== 'Exempted' && isMonthFeeApplicable(student, m)) {
              const config = getConfigForMonth(student, m);
              const isEligible = idx >= startDiscountIndex;
              const netFee = Math.max(0, config.tuition - (isEligible ? discount : 0));
               tuitionRemaining += netFee;
          }
      });
      return tuitionRemaining;
  };

  const getUnpaidExamTotal = (student: FeeRecord) => {
      if (student.academicStatus === 'Dropped') return 0;
      let total = 0;
      EXAM_TERMS.forEach(term => { 
          if (student.examFeeStatus?.[term] !== 'Paid' && student.examFeeStatus?.[term] !== 'Exempted') {
              const config = getEffectiveConfig(student.grade);
              total += (config.exam || 0); 
          }
      });
      return total;
  };

  const getLegacyArrearsOutstanding = (student: FeeRecord) => Math.max(0, student.arrearsMarch2025 - student.paidAmount);
  
  const totalOutstanding = sessionStudents.reduce((acc, curr) => acc + getNetDue(curr), 0);
  const totalReceived = sessionStudents.reduce((acc, curr) => acc + curr.paidAmount, 0);

  const sortedHistory = useMemo(() => {
    if (!selectedStudent) return [];
    const chronoHistory = [...selectedStudent.history].reverse();
    const combinedList = [];
    if (selectedStudent.arrearsMarch2025 > 0) {
      combinedList.push({ id: 'OPENING-BAL', receiptId: '-', date: `01/04/${currentSession.split('-')[0]}`, description: 'Brought Forward (Arrears)', amount: selectedStudent.arrearsMarch2025, type: 'Debit', mode: 'B/F' });
    }
    combinedList.push(...chronoHistory);
    let runningBalance = 0;
    return combinedList.map(txn => {
        if (txn.description.includes('Charge Generated for Exemption')) return { ...txn, balance: runningBalance };
        if (txn.mode === 'Waiver' && txn.description.includes('Fee Exemption')) return { ...txn, balance: runningBalance };
        if (txn.type === 'Debit') runningBalance += txn.amount;
        else runningBalance -= txn.amount;
        return { ...txn, balance: runningBalance };
    });
  }, [selectedStudent, currentSession]);

  /**
   * REFINED: Only returns debits that haven't been cleared by the student's current paid amount.
   * Follows a FIFO logic (Arrears first, then history debits from oldest to newest).
   */
  const customHistoryDebits = useMemo(() => {
    if (!selectedStudent) return [];
    
    let funds = selectedStudent.paidAmount;
    
    // 1. Pay off Arrears first
    funds = Math.max(0, funds - selectedStudent.arrearsMarch2025);
    
    // 2. Process all debits from history in chronological order (oldest first)
    const chronologicalHistory = [...selectedStudent.history].reverse();
    const uncoveredManualDebits: Transaction[] = [];
    
    chronologicalHistory.forEach(txn => {
        if (txn.type !== 'Debit' || txn.description.includes('Charge Generated for Exemption')) return;
        
        // Use funds to pay this debit
        const cost = txn.amount;
        const isCovered = funds >= (cost - 0.01); // Small epsilon for precision
        
        if (isCovered) {
            funds -= cost;
        } else {
            // If not fully covered, it is "Outstanding"
            // Filter: Only show manual charges (not Tuition or Exam which are handled separately in the UI)
            if (!txn.description.includes('Tuition Fee Due') && !txn.description.includes('Exam Fee Due')) {
                uncoveredManualDebits.push(txn);
            }
            funds = 0;
        }
    });

    return uncoveredManualDebits;
  }, [selectedStudent]);

  useEffect(() => {
    if (!selectedStudent) return;
    setSuccess(false); setLastReceipt(null); setSelectedMonths([]); setIncludeArrears(false); setCustomAmount(''); setAdditionalDiscount(''); setWaiverPercentage(selectedStudent.academicStatus === 'Dropped' ? '0' : '15'); setPaymentType('monthly'); setSelectedExamTerm(''); setMiscSelection({ tie: false, belt: false, idCard: false, diary: false, booklet: false }); setIsHistoryEditMode(false);
    setIsOtherBranch(false);
    setSelectedHistoryDebitIds([]);
    setIsOnTimeWaiverActive(false);
    setOnTimeWaiverAmount('0');
  }, [selectedStudent?.id]);

  const toggleMonth = (month: string) => {
    if (isReadOnly || !selectedStudent) return;
    const monthIndex = SESSION_MONTHS.indexOf(month);
    if (selectedMonths.includes(month)) {
      setSelectedMonths(prev => prev.filter(m => SESSION_MONTHS.indexOf(m) < monthIndex));
    } else {
      const toSelect: string[] = [];
      if (getLegacyArrearsOutstanding(selectedStudent) > 0) setIncludeArrears(true);
      for (let i = 0; i <= monthIndex; i++) {
        const m = SESSION_MONTHS[i];
        const status = selectedStudent.monthlyStatus[m];
        if (status !== 'Paid' && status !== 'Exempted' && isMonthFeeApplicable(selectedStudent, m)) toSelect.push(m);
      }
      setSelectedMonths(prev => Array.from(new Set([...prev, ...toSelect])));
    }
  };

  const handleTermToggle = (term: string) => {
      if (isReadOnly || !selectedStudent) return;
      const termIdx = EXAM_TERMS.indexOf(term as any);
      if (selectedExamTerm === term) setSelectedExamTerm('');
      else {
          for (let i = 0; i < termIdx; i++) {
              if (selectedStudent.examFeeStatus[EXAM_TERMS[i]] === 'Unpaid') {
                  alert(`⚠️ Sequential Constraint: Please clear ${EXAM_TERMS[i]} before ${term}.`);
                  return;
              }
          }
          setSelectedExamTerm(term);
      }
  };

  const calculateMonthSpecificDue = (monthIndex: number, student: FeeRecord) => {
    const monthName = SESSION_MONTHS[monthIndex];
    if (!isMonthFeeApplicable(student, monthName)) return 0;
    if (student.monthlyStatus[monthName] === 'Exempted') return 0;
    const arrearsCost = student.arrearsMarch2025;
    const otherDebitsCost = getOtherDebits(student);
    const startDiscountIndex = SESSION_MONTHS.indexOf(student.discountStartMonth || 'APR');
    let previousMonthsCost = 0;
    for(let i = 0; i < monthIndex; i++) {
        if(isMonthFeeApplicable(student, SESSION_MONTHS[i]) && student.monthlyStatus[SESSION_MONTHS[i]] !== 'Exempted') {
            const mConfig = getConfigForMonth(student, SESSION_MONTHS[i]);
            previousMonthsCost += Math.max(0, mConfig.tuition - (i >= startDiscountIndex ? (student.cashDiscount || 0) : 0)); 
        }
    }
    const targetMonthConfig = getConfigForMonth(student, monthName);
    const targetMonthCost = Math.max(0, targetMonthConfig.tuition - (monthIndex >= startDiscountIndex ? (student.cashDiscount || 0) : 0));
    const totalRequiredBeforeTarget = arrearsCost + otherDebitsCost + previousMonthsCost;
    const surplusForTarget = Math.max(0, student.paidAmount - totalRequiredBeforeTarget);
    return Math.max(0, targetMonthCost - surplusForTarget);
  };

  const getMiscTotal = () => {
    if (!selectedStudent || isDropped) return 0;
    const config = getEffectiveConfig(selectedStudent.grade);
    let total = 0;
    if (miscSelection.tie) total += config.tie;
    if (miscSelection.belt) total += config.belt;
    if (miscSelection.idCard) total += config.idCard;
    if (miscSelection.diary) total += config.diary;
    if (miscSelection.booklet) total += config.booklet;
    return total;
  };

  const calculateTotal = () => {
    if (!selectedStudent) return 0;
    let total = 0; 
    if (paymentType === 'monthly') {
      selectedMonths.forEach(m => {
         const mIndex = SESSION_MONTHS.indexOf(m);
         if (mIndex !== -1) total += calculateMonthSpecificDue(mIndex, selectedStudent);
      });
      if (includeArrears) total += getLegacyArrearsOutstanding(selectedStudent);
      if (selectedExamTerm) {
          if (selectedStudent.examFeeStatus?.[selectedExamTerm as keyof typeof selectedStudent.examFeeStatus] !== 'Exempted') {
              total += (getEffectiveConfig(selectedStudent.grade).exam || 0);
          }
      }
      total += getMiscTotal();
      // Only items that appear in customHistoryDebits can be calculated
      customHistoryDebits.forEach(d => {
        if (selectedHistoryDebitIds.includes(d.id)) total += d.amount;
      });
      if (isOnTimeWaiverActive) total -= (parseFloat(onTimeWaiverAmount) || 0);
    } else if (paymentType === 'full') {
      const tuitionRemaining = getRemainingTuition(selectedStudent);
      const tuitionTotal = tuitionRemaining * (1 - ((parseFloat(waiverPercentage) || 0) / 100)); 
      total = tuitionTotal + getNonTuitionOutstanding(selectedStudent) + getUnpaidExamTotal(selectedStudent) + getMiscTotal();
    } else total = Number(customAmount) || 0;
    return Math.max(0, total - (parseFloat(additionalDiscount) || 0));
  };

  const calculateDiscountApplied = () => {
    if (paymentType !== 'monthly' || !selectedStudent) return 0;
    let totalDiscount = 0;
    const startDiscountIndex = SESSION_MONTHS.indexOf(selectedStudent.discountStartMonth || 'APR');
    selectedMonths.forEach(m => {
       if (SESSION_MONTHS.indexOf(m) >= startDiscountIndex) totalDiscount += (selectedStudent.cashDiscount || 0);
    });
    return totalDiscount;
  };

  const openDiscountModal = () => {
    if (selectedStudent) {
        setEditDiscountAmount(selectedStudent.cashDiscount.toString());
        setEditDiscountStartMonth(selectedStudent.discountStartMonth || 'APR');
        setIsDiscountModalOpen(true);
    }
  };

  const saveDiscountSettings = () => {
    if (!selectedStudent) return;
    const updatedStudent = { ...selectedStudent, cashDiscount: parseFloat(editDiscountAmount) || 0, discountStartMonth: editDiscountStartMonth };
    const updatedList = students.map(s => s.id === selectedStudent.id ? updatedStudent : s);
    onUpdateStudents(updatedList);
    setSelectedStudent(updatedStudent);
    setIsDiscountModalOpen(false);
  };

  const reSyncStudentLedger = (student: FeeRecord): FeeRecord => {
    const newMonthlyStatus: any = {};
    const newExamStatus: any = { 'Term 1': 'Unpaid', 'Term 2': 'Unpaid', 'Term 3': 'Unpaid' };
    SESSION_MONTHS.forEach(m => newMonthlyStatus[m] = 'Unpaid');
    student.history.forEach(t => {
        if (t.type === 'Credit' && t.mode === 'Waiver' && t.description.includes('Fee Exemption')) {
            SESSION_MONTHS.forEach(m => { if (t.description.includes(`Tuition ${m}`)) newMonthlyStatus[m] = 'Exempted'; });
            EXAM_TERMS.forEach(term => { if (t.description.includes(`Exam ${term}`)) newExamStatus[term] = 'Exempted'; });
        }
    });
    const totalCredits = student.history
        .filter(t => t.type === 'Credit')
        .reduce((sum, t) => sum + (t.mode === 'Waiver' && t.description.includes('Fee Exemption') ? 0 : t.amount), 0);
    let funds = totalCredits;
    const allDebits: any[] = [];
    if (student.arrearsMarch2025 > 0) allDebits.push({ desc: 'Arrears', amount: student.arrearsMarch2025 });
    [...student.history].reverse().forEach(t => {
        if (t.type === 'Debit' && !t.description.includes('Charge Generated for Exemption')) allDebits.push({ desc: t.description, amount: t.amount });
    });
    allDebits.forEach(d => {
        if (funds <= 0) return;
        let covered = false; 
        if (funds >= (d.amount - 0.01)) { funds -= d.amount; covered = true; } 
        else { funds = 0; covered = false; }
        if (d.desc.includes('Tuition Fee Due - ')) {
            const month = d.desc.split(' - ')[1].trim().split(' ')[0];
            if (SESSION_MONTHS.includes(month) && newMonthlyStatus[month] !== 'Exempted') newMonthlyStatus[month] = covered ? 'Paid' : 'Partial';
        } else if (d.desc.includes('Exam Fee Due - ')) {
            const term = d.desc.split(' - ')[1].trim();
            if (['Term 1', 'Term 2', 'Term 3'].includes(term) && newExamStatus[term] !== 'Exempted') newExamStatus[term] = covered ? 'Paid' : 'Unpaid';
        }
    });
    if (funds > 0) {
        const startIdx = SESSION_MONTHS.indexOf(student.discountStartMonth || 'APR');
        SESSION_MONTHS.forEach((m, idx) => {
            if (funds <= 0 || newMonthlyStatus[m] === 'Paid' || newMonthlyStatus[m] === 'Exempted' || !isMonthFeeApplicable(student, m)) return;
            const mConfig = getConfigForMonth(student, m);
            const cost = Math.max(0, mConfig.tuition - (idx >= startIdx ? (student.cashDiscount || 0) : 0));
            if (funds >= (cost - 0.01)) { newMonthlyStatus[m] = 'Paid'; funds -= cost; } 
            else if (funds > 0) { newMonthlyStatus[m] = 'Partial'; funds = 0; }
        });
    }
    return { ...student, paidAmount: totalCredits, monthlyStatus: newMonthlyStatus, examFeeStatus: newExamStatus, status: (totalCredits >= (student.totalAnnualFee + student.arrearsMarch2025)) ? 'Paid' : (totalCredits > 0 ? 'Partial' : 'Pending') };
  };

  const handleLinkSibling = (siblingId: string) => {
    if (!selectedStudent || isReadOnly) return;
    const clusterIds = new Set<string>();
    clusterIds.add(selectedStudent.id);
    if (selectedStudent.siblings) selectedStudent.siblings.forEach(id => clusterIds.add(id));
    const targetSibling = students.find(s => s.id === siblingId);
    if (targetSibling) {
        clusterIds.add(targetSibling.id);
        if (targetSibling.siblings) targetSibling.siblings.forEach(id => clusterIds.add(id));
    }
    const updatedList = students.map(s => {
        if (clusterIds.has(s.id)) return { ...s, siblings: Array.from(clusterIds).filter(id => id !== s.id), excludedSiblings: (s.excludedSiblings || []).filter(id => !clusterIds.has(id)) };
        return s;
    });
    onUpdateStudents(updatedList);
    const updatedCurrent = updatedList.find(s => s.id === selectedStudent.id);
    if (updatedCurrent) setSelectedStudent(updatedCurrent);
    setSiblingSearchTerm('');
  };

  const handleUnlinkSibling = (siblingId: string) => {
    if (!selectedStudent || isReadOnly) return;
    const updatedList = students.map(s => {
        if (s.id === selectedStudent.id) return { ...s, siblings: (s.siblings || []).filter(id => id !== siblingId), excludedSiblings: Array.from(new Set([...(s.excludedSiblings || []), siblingId])) };
        if (s.id === siblingId) return { ...s, siblings: (s.siblings || []).filter(id => id !== selectedStudent.id), excludedSiblings: Array.from(new Set([...(s.excludedSiblings || []), selectedStudent.id])) };
        return s;
    });
    onUpdateStudents(updatedList);
    const updatedCurrent = updatedList.find(s => s.id === selectedStudent.id);
    if (updatedCurrent) setSelectedStudent(updatedCurrent);
  };

  const openEditProfile = () => { if (selectedStudent) { setEditStudentData({ ...selectedStudent }); setIsEditProfileOpen(true); } };

  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setEditStudentData(prev => ({ ...prev, photo: reader.result as string })); };
      reader.readAsDataURL(file);
    }
  };

  const saveEditProfile = () => {
    if (!selectedStudent || !editStudentData.id) return;
    const updatedStudent = { ...selectedStudent, ...editStudentData } as FeeRecord;
    const updatedList = students.map(s => s.id === selectedStudent.id ? updatedStudent : s);
    onUpdateStudents(updatedList);
    setSelectedStudent(updatedStudent);
    if (addLog) addLog('Profile Updated', `Manually updated profile of ${updatedStudent.studentName}`, 'UPDATE');
    setIsEditProfileOpen(false);
  };

  const handleExemptSave = () => {
    if (!selectedStudent || isReadOnly) return;
    let totalExemptAmount = 0;
    const itemsExemptedParts: string[] = [];
    const startDiscountIndex = SESSION_MONTHS.indexOf(selectedStudent.discountStartMonth || 'APR');
    exemptMonths.forEach(m => {
        const idx = SESSION_MONTHS.indexOf(m);
        const mConfig = getConfigForMonth(selectedStudent, m);
        totalExemptAmount += Math.max(0, mConfig.tuition - (idx >= startDiscountIndex ? (selectedStudent.cashDiscount || 0) : 0));
        itemsExemptedParts.push(`Tuition ${m}`);
    });
    exemptTerms.forEach(term => {
        totalExemptAmount += getEffectiveConfig(selectedStudent.grade).exam;
        itemsExemptedParts.push(`Exam ${term}`);
    });
    const config = getEffectiveConfig(selectedStudent.grade);
    if (exemptMisc.tie) { totalExemptAmount += config.tie; itemsExemptedParts.push('Tie'); }
    if (exemptMisc.belt) { totalExemptAmount += config.belt; itemsExemptedParts.push('Belt'); }
    if (exemptMisc.idCard) { totalExemptAmount += config.idCard; itemsExemptedParts.push('ID Card'); }
    if (exemptMisc.diary) { totalExemptAmount += config.diary; itemsExemptedParts.push('Diary'); }
    if (exemptMisc.booklet) { totalExemptAmount += config.booklet; itemsExemptedParts.push('Booklet'); }
    if (totalExemptAmount <= 0) { setIsExemptionModalOpen(false); return; }
    const timestamp = Date.now();
    const demandTxn: Transaction = { id: `DEM-EXEMPT-${timestamp}`, receiptId: '-', date: formatDate(new Date()), description: `Charge Generated for Exemption: ${itemsExemptedParts.join(', ')}`, amount: totalExemptAmount, type: 'Debit', mode: 'Demand' };
    const waiverTxn: Transaction = { id: `WVR-EXEMPT-${timestamp}`, receiptId: '-', date: formatDate(new Date()), description: `Fee Exemption (Waiver): ${itemsExemptedParts.join(', ')}`, amount: totalExemptAmount, type: 'Credit', mode: 'Waiver' };
    let updatedStudent = { ...selectedStudent, history: [waiverTxn, demandTxn, ...selectedStudent.history] };
    updatedStudent = reSyncStudentLedger(updatedStudent);
    onUpdateStudents(students.map(s => s.id === selectedStudent.id ? updatedStudent : s));
    setSelectedStudent(updatedStudent);
    setIsExemptionModalOpen(false);
    if (addLog) addLog('Fee Exemption Granted', `₹${totalExemptAmount.toLocaleString()} waived for ${selectedStudent.studentName}`, 'UPDATE');
    setExemptMonths([]); setExemptTerms([]); setExemptMisc({ tie: false, belt: false, idCard: false, diary: false, booklet: false });
  };

  const getExemptionTotal = () => {
    if (!selectedStudent) return 0;
    let total = 0;
    const startDiscountIndex = SESSION_MONTHS.indexOf(selectedStudent.discountStartMonth || 'APR');
    exemptMonths.forEach(m => {
        const idx = SESSION_MONTHS.indexOf(m);
        const mConfig = getConfigForMonth(selectedStudent, m);
        total += Math.max(0, mConfig.tuition - (idx >= startDiscountIndex ? (selectedStudent.cashDiscount || 0) : 0));
    });
    exemptTerms.forEach(t => { total += getEffectiveConfig(selectedStudent.grade).exam; });
    const config = getEffectiveConfig(selectedStudent.grade);
    if (exemptMisc.tie) total += config.tie;
    if (exemptMisc.belt) total += config.belt;
    if (exemptMisc.idCard) total += config.idCard;
    if (exemptMisc.diary) total += config.diary;
    if (exemptMisc.booklet) total += config.booklet;
    return total;
  };

  const handleEditTransaction = (txn: Transaction) => { setEditingTransaction({ ...txn }); };

  const saveEditedTransaction = () => {
    if (!selectedStudent || !editingTransaction) return;
    const updatedHistory = selectedStudent.history.map(t => t.id === editingTransaction.id ? editingTransaction : t);
    let updatedStudent = { ...selectedStudent, history: updatedHistory };
    updatedStudent = reSyncStudentLedger(updatedStudent);
    onUpdateStudents(students.map(s => s.id === selectedStudent.id ? updatedStudent : s));
    setSelectedStudent(updatedStudent);
    setEditingTransaction(null);
    if (addLog) addLog('Ledger Modified', `Edited ${editingTransaction.type} entry for ${selectedStudent.studentName}`, 'UPDATE');
  };

  const deleteTransaction = (txnId: string) => {
    if (!selectedStudent || !window.confirm("Permanently remove this transaction from the ledger? This will trigger a re-sync.")) return;
    const updatedHistory = selectedStudent.history.filter(t => t.id !== txnId);
    let updatedStudent = { ...selectedStudent, history: updatedHistory };
    updatedStudent = reSyncStudentLedger(updatedStudent);
    onUpdateStudents(students.map(s => s.id === selectedStudent.id ? updatedStudent : s));
    setSelectedStudent(updatedStudent);
    if (addLog) addLog('Ledger Entry Deleted', `Removed transaction record for ${selectedStudent.studentName}`, 'UPDATE');
  };

  const getNextAvailableReceipt = (): string | null => {
    const savedBooks = localStorage.getItem('ues_receipt_books');
    const savedCancelled = localStorage.getItem('ues_cancelled_receipts');
    if (!savedBooks) return null;
    const books: ReceiptBook[] = JSON.parse(savedBooks);
    const activeBooks = books.filter(b => b.status === 'Active').sort((a, b) => a.startNo - b.startNo);
    if (activeBooks.length === 0) return null;
    const cancelled: CancelledReceipt[] = savedCancelled ? JSON.parse(savedCancelled) : [];
    const issuedReceiptIds = new Set<number>();
    students.forEach(s => s.history.forEach(txn => { if (txn.type === 'Credit' && txn.receiptId !== '-') { const match = txn.receiptId.match(/\d+$/); if (match) issuedReceiptIds.add(parseInt(match[0])); } }));
    branchCollections.forEach(c => { const match = c.receiptNo.match(/\d+$/); if (match) issuedReceiptIds.add(parseInt(match[0])); });
    const cancelledReceiptIds = new Set<number>();
    cancelled.forEach(c => { const match = c.receiptNo.match(/\d+$/); if (match) cancelledReceiptIds.add(parseInt(match[0])); });
    for (const book of activeBooks) { for (let i = book.startNo; i <= book.endNo; i++) { if (!issuedReceiptIds.has(i) && !cancelledReceiptIds.has(i)) return `SA-2026-${i}`; } }
    return null;
  };

  const anticipatedReceipt = useMemo(() => getNextAvailableReceipt(), [students, activeTab, branchCollections]);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !selectedStudent) return;
    if (isOtherBranch) { setIsOtherBranchModalOpen(true); return; }
    if (!anticipatedReceipt) { alert("🚨 ALERT: No available receipt numbers found in Active books.\n\nPlease register a new Receipt Book in 'Receipt Manager' before collecting payments."); return; }
    if (paymentMode === 'UPI') { setIsUPIAccountSelectOpen(true); return; }
    if (paymentMode === 'Bank Transfer') { setIsBankSelectOpen(true); return; }
    finalizeTransaction();
  };

  const finalizeTransaction = (incomingAccount?: string, branchContext?: string, customReceipt?: string, customDate?: string) => {
    if (!selectedStudent) return;
    const finalReceiptId = branchContext ? customReceipt : getNextAvailableReceipt();
    if (!finalReceiptId) { alert("Critical Error: Unable to assign a receipt number. Ensure a receipt book is active."); return; }
    const amountToPay = calculateTotal();
    const extraDisc = parseFloat(additionalDiscount) || 0;
    const onTimeWaiverAmt = isOnTimeWaiverActive ? (parseFloat(onTimeWaiverAmount) || 0) : 0;
    let waiverAmount = 0;
    let waiverDescription = 'Annual Session Payment Waiver';
    if (paymentType === 'full') {
        const tuitionRemaining = getRemainingTuition(selectedStudent);
        waiverAmount = tuitionRemaining * ((parseFloat(waiverPercentage) || 0) / 100);
        waiverDescription = `Annual Session Payment Waiver (${waiverPercentage}%)`;
    }
    setLoading(true);
    setTimeout(() => {
      const updatedList = students.map(s => {
        if (s.id !== selectedStudent.id) return s;
        const currentClassConfig = getEffectiveConfig(s.grade);
        const newTransactions: Transaction[] = [];
        const miscAmount = getMiscTotal();
        const miscItemsList = Object.keys(miscSelection).filter(k => (miscSelection as any)[k]).map(k => k === 'idCard' ? 'ID Card' : k.charAt(0).toUpperCase() + k.slice(1));
        if (miscAmount > 0) newTransactions.push({ id: `TXN-MISC-${Date.now()}`, receiptId: '-', date: customDate ? formatDate(new Date(customDate)) : formatDate(new Date()), description: `Misc Kit: ${miscItemsList.join(', ')}`, amount: miscAmount, type: 'Debit', mode: 'Demand' });
        if (paymentType === 'monthly' && selectedExamTerm) {
            const examDesc = `Exam Fee Due - ${selectedExamTerm}`;
            if (!s.history.some(h => h.type === 'Debit' && h.description === examDesc)) { newTransactions.push({ id: `DEM-EXAM-${selectedExamTerm}-${Date.now()}`, receiptId: '-', date: customDate ? formatDate(new Date(customDate)) : formatDate(new Date()), description: examDesc, amount: currentClassConfig.exam || 0, type: 'Debit', mode: 'Demand' }); }
        } else if (paymentType === 'full') {
            EXAM_TERMS.forEach(term => { if (s.examFeeStatus?.[term] !== 'Paid' && s.examFeeStatus?.[term] !== 'Exempted' && s.academicStatus !== 'Dropped') { const examDesc = `Exam Fee Due - ${term}`; if (!s.history.some(h => h.type === 'Debit' && h.description === examDesc)) { newTransactions.push({ id: `DEM-EXAM-${term}-${Date.now()}`, receiptId: '-', date: customDate ? formatDate(new Date(customDate)) : formatDate(new Date()), description: examDesc, amount: currentClassConfig.exam || 0, type: 'Debit', mode: 'Demand' }); } } });
        }
        if (paymentType === 'monthly') {
             selectedMonths.forEach(m => { if (!s.history.some(h => h.type === 'Debit' && h.description.includes(`Tuition Fee Due - ${m}`))) { const mConfig = getConfigForMonth(s, m); const idx = SESSION_MONTHS.indexOf(m); const discount = (idx >= SESSION_MONTHS.indexOf(s.discountStartMonth || 'APR')) ? (s.cashDiscount || 0) : 0; newTransactions.push({ id: `DEM-${m}-${Date.now()}`, receiptId: '-', date: customDate ? formatDate(new Date(customDate)) : formatDate(new Date()), description: `Tuition Fee Due - ${m} ${currentSession}`, amount: Math.max(0, mConfig.tuition - discount), type: 'Debit', mode: 'Demand' }); } });
        }
        if (paymentType === 'full') {
             const startIdx = SESSION_MONTHS.indexOf(s.discountStartMonth || 'APR');
             SESSION_MONTHS.forEach((m, idx) => { if (s.monthlyStatus[m] !== 'Paid' && s.monthlyStatus[m] !== 'Exempted' && isMonthFeeApplicable(s, m) && !s.history.some(h => h.type === 'Debit' && h.description.includes(`Tuition Fee Due - ${m}`))) { const mConfig = getConfigForMonth(s, m); const discount = (idx >= startIdx ? (s.cashDiscount || 0) : 0); newTransactions.push({ id: `DEM-${m}-${Date.now()}`, receiptId: '-', date: customDate ? formatDate(new Date(customDate)) : formatDate(new Date()), description: `Tuition Fee Due - ${m} ${currentSession}`, amount: Math.max(0, mConfig.tuition - discount), type: 'Debit', mode: 'Demand' }); } });
        }
        if (waiverAmount > 0) newTransactions.push({ id: `WVR-${Date.now()}`, receiptId: '-', date: customDate ? formatDate(new Date(customDate)) : formatDate(new Date()), description: waiverDescription, amount: waiverAmount, type: 'Credit', mode: 'Waiver' });
        if (extraDisc > 0) newTransactions.push({ id: `ADJ-${Date.now()}`, receiptId: '-', date: customDate ? formatDate(new Date(customDate)) : formatDate(new Date()), description: 'Additional Discount / Adjustment', amount: extraDisc, type: 'Credit', mode: 'Waiver' });
        if (onTimeWaiverAmt > 0) newTransactions.push({ id: `OTWVR-${Date.now()}`, receiptId: '-', date: customDate ? formatDate(new Date(customDate)) : formatDate(new Date()), description: 'On-Time Payment Waiver/Discount', amount: onTimeWaiverAmt, type: 'Credit', mode: 'Waiver' });
        const itemsPaidParts: string[] = [];
        if (paymentType === 'monthly' && selectedMonths.length > 0) itemsPaidParts.push(`Tuition (${selectedMonths.join(', ')})`);
        else if (paymentType === 'full') itemsPaidParts.push(s.academicStatus === 'Dropped' ? 'Full Settlement' : 'Full Session');
        else if (paymentType === 'partial') itemsPaidParts.push('Partial Payment');
        if (includeArrears) itemsPaidParts.push('Arrears');
        if (selectedExamTerm && paymentType === 'monthly') itemsPaidParts.push(`Exam (${selectedExamTerm})`);
        if (paymentType === 'full' && getUnpaidExamTotal(s) > 0) itemsPaidParts.push(`Accrued Exam Fees`);
        if (miscAmount > 0) itemsPaidParts.push(`Misc: ${miscItemsList.join(', ')}`);
        customHistoryDebits.forEach(d => { if (selectedHistoryDebitIds.includes(d.id)) itemsPaidParts.push(d.description); });
        newTransactions.push({ id: `TXN-${Date.now()}`, receiptId: finalReceiptId, date: customDate ? formatDate(new Date(customDate)) : formatDate(new Date()), description: branchContext ? `[Paid in ${branchContext}] ${itemsPaidParts.join(' + ') || 'Fee Payment'}` : `Paid: ${itemsPaidParts.join(' + ') || 'Partial Fee Payment'}`, amount: amountToPay, type: 'Credit', mode: branchContext ? 'Other Branch' : paymentMode, sourceAccount: incomingAccount, isOtherBranch: !!branchContext, branchName: branchContext });
        let initialProcessedStudent = { ...s, history: [...newTransactions.reverse(), ...s.history] };
        return reSyncStudentLedger(initialProcessedStudent);
      });
      onUpdateStudents(updatedList);
      const updatedSelf = updatedList.find(s => s.id === selectedStudent.id);
      if (updatedSelf) {
          setSelectedStudent(updatedSelf);
          const latestTxn = updatedSelf.history[0];
          setLastReceipt({ id: latestTxn.receiptId, studentName: selectedStudent.studentName, amount: amountToPay, mode: latestTxn.mode, date: latestTxn.date, type: paymentType, uid: selectedStudent.id, description: latestTxn.description, account: incomingAccount, branch: branchContext });
          setSuccess(true);
          setSelectedMonths([]); setIncludeArrears(false); setSelectedExamTerm(''); setMiscSelection({ tie: false, belt: false, idCard: false, diary: false, booklet: false }); setCustomAmount(''); setAdditionalDiscount(''); setSelectedHistoryDebitIds([]); setIsOnTimeWaiverActive(false); setOnTimeWaiverAmount('0');
          if (addLog) {
            const logDetail = branchContext ? `₹${amountToPay.toLocaleString()} paid in ${branchContext} by ${selectedStudent.studentName}` : `₹${amountToPay.toLocaleString()} received via ${paymentMode}${incomingAccount ? ` (${incomingAccount})` : ''} from ${selectedStudent.studentName} (Receipt: ${finalReceiptId})`;
            addLog('Payment Recorded', logDetail, 'PAYMENT');
          }
      }
      setLoading(false); setIsUPIAccountSelectOpen(false); setIsBankSelectOpen(false); setIsOtherBranchModalOpen(false);
    }, 1500);
  };

  const progressStats = useMemo(() => {
    if (!selectedStudent) return { percent: 0, segments: [] };
    const segments = [];
    if (selectedStudent.arrearsMarch2025 > 0) segments.push({ id: 'arrears', label: 'Legacy', status: (selectedStudent.paidAmount >= selectedStudent.arrearsMarch2025) ? 'paid' : 'arrears' });
    SESSION_MONTHS.forEach(m => {
        if (isMonthFeeApplicable(selectedStudent, m)) segments.push({ id: m, label: m, status: selectedStudent.monthlyStatus[m].toLowerCase() });
        else segments.push({ id: m, label: m, status: 'inactive' });
    });
    const activeItems = segments.filter(s => s.status !== 'inactive');
    const totalItems = activeItems.length;
    const paidItems = activeItems.filter(s => s.status === 'paid').length;
    const exemptItems = activeItems.filter(s => s.status === 'exempted').length;
    const partialItems = activeItems.filter(s => s.status === 'partial').length;
    return { percent: totalItems === 0 ? 100 : Math.round(((paidItems + exemptItems + (partialItems * 0.5)) / totalItems) * 100), segments };
  }, [selectedStudent]);

  const currentStudentConfig = useMemo(() => { if (!selectedStudent) return null; return getEffectiveConfig(selectedStudent.grade); }, [selectedStudent, feeStructure]);
  const isDropped = selectedStudent?.academicStatus === 'Dropped';
  const isTransfer = selectedStudent?.academicStatus === 'Transfer';
  const isActiveReactivated = selectedStudent?.academicStatus === 'Active' && selectedStudent?.statusMetadata?.activeFrom;
  const currentArrearsOutstanding = selectedStudent ? getLegacyArrearsOutstanding(selectedStudent) : 0;

  const handleBranchEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anticipatedReceipt) { alert("🚨 ALERT: No available receipt numbers found in Active books.\n\nPlease register a new Receipt Book in 'Receipt Manager' before collecting payments."); return; }
    const newCollection: BranchCollection = { ...branchEntryForm, receiptNo: anticipatedReceipt, id: `BR-ENT-${Date.now()}`, amount: parseFloat(branchEntryForm.amount) };
    setBranchCollections(prev => [newCollection, ...prev]);
    if (addLog) addLog('Cross-Branch Entry', `${newCollection.studentName} (${newCollection.branch}) Entry Logged • Receipt: ${newCollection.receiptNo}`, 'SYSTEM');
    alert(`Entry Successful!\nReceipt No: ${newCollection.receiptNo}\nStudent: ${newCollection.studentName}`);
    setBranchEntryForm({ date: new Date().toISOString().split('T')[0], branch: 'Branch 2', studentName: '', grade: 'Class 1', section: 'A', rollNo: '', amount: '', paymentMode: 'Cash', sourceAccount: '' });
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col bg-slate-50 relative">
      {/* Enhanced Branch Entry Modal */}
      {isBranchEntryModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-red-950/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95">
             <div className="bg-amber-600 p-8 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border-b-4 border-amber-800"><span className="text-2xl">🏢</span></div>
                  <div><h2 className="text-2xl font-bold serif-font italic leading-none">Branch Management</h2><p className="text-[10px] font-black uppercase text-amber-100 tracking-[0.2em] mt-1">External Student Billing & History</p></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setBranchPopupTab(branchPopupTab === 'entry' ? 'history' : 'entry')} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">{branchPopupTab === 'entry' ? '📋 View History' : '✏️ New Entry'}</button>
                    <button onClick={() => setIsBranchEntryModalOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-2xl">&times;</button>
                </div>
             </div>
             {branchPopupTab === 'entry' ? (
                <div className="flex flex-col">
                    <div className="bg-red-50 px-8 py-3 border-b border-red-100 flex justify-between items-center"><span className="text-[10px] font-black uppercase text-red-400">Next Real Slip:</span><span className="text-sm font-black text-red-900 bg-white border border-red-200 px-3 py-0.5 rounded-lg shadow-sm">{anticipatedReceipt || '⚠️ OUT OF RECEIPTS'}</span></div>
                    <form onSubmit={handleBranchEntrySubmit} className="p-8 space-y-5 bg-slate-50/50 overflow-y-auto max-h-[60vh] custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Today's Date</label><input type="date" value={branchEntryForm.date} onChange={e => setBranchEntryForm({...branchEntryForm, date: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-red-950 focus:ring-2 focus:ring-amber-500 outline-none" required /></div>
                        <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Select Branch</label><select value={branchEntryForm.branch} onChange={e => setBranchEntryForm({...branchEntryForm, branch: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-red-950 focus:ring-2 focus:ring-amber-500 outline-none">{BRANCH_OPTIONS.map(opt => <option key={opt} value={`Branch ${opt}`}>Branch {opt}</option>)}</select></div>
                        </div>
                        <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Student Full Name</label><input type="text" value={branchEntryForm.studentName} onChange={e => setBranchEntryForm({...branchEntryForm, studentName: e.target.value})} placeholder="Full Name" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-red-950 focus:ring-2 focus:ring-amber-500 outline-none" required /></div>
                        <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Class</label><select value={branchEntryForm.grade} onChange={e => setBranchEntryForm({...branchEntryForm, grade: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-red-950 focus:ring-2 focus:ring-amber-500 outline-none">{availableClassNames.map(cls => <option key={cls} value={cls}>{cls}</option>)}</select></div>
                        <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Sec</label><input type="text" value={branchEntryForm.section} onChange={e => setBranchEntryForm({...branchEntryForm, section: e.target.value})} placeholder="A" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-center text-red-950 focus:ring-2 focus:ring-amber-500 outline-none" required /></div>
                        <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Roll No</label><input type="text" value={branchEntryForm.rollNo} onChange={e => setBranchEntryForm({...branchEntryForm, rollNo: e.target.value})} placeholder="00" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-center text-red-950 focus:ring-2 focus:ring-amber-500 outline-none" required /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Payment Mode</label><select value={branchEntryForm.paymentMode} onChange={e => setBranchEntryForm({...branchEntryForm, paymentMode: e.target.value as any, sourceAccount: ''})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-red-950 focus:ring-2 focus:ring-amber-500 outline-none">{['Cash', 'UPI', 'Bank Transfer'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                            <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Amount (₹)</label><input type="number" value={branchEntryForm.amount} onChange={e => setBranchEntryForm({...branchEntryForm, amount: e.target.value})} placeholder="0.00" className="w-full bg-white border-2 border-amber-100 rounded-xl p-3 font-black text-red-900 focus:border-amber-500 outline-none" required /></div>
                        </div>
                        {(branchEntryForm.paymentMode === 'UPI' || branchEntryForm.paymentMode === 'Bank Transfer') && (
                            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 animate-in slide-in-from-top-2">
                                <label className="block text-[10px] font-black uppercase text-amber-700 tracking-widest mb-3">{branchEntryForm.paymentMode === 'UPI' ? 'Select UPI Receiver Account' : 'Select Destination Bank Name'}</label>
                                <select value={branchEntryForm.sourceAccount} onChange={e => setBranchEntryForm({...branchEntryForm, sourceAccount: e.target.value})} required className="w-full bg-white border border-amber-200 rounded-xl p-4 font-black text-red-950 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"><option value="">-- Choose Account --</option>{branchEntryForm.paymentMode === 'UPI' ? upiAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>) : bankAccounts.map(bank => <option key={bank} value={bank}>{bank}</option>)}</select>
                            </div>
                        )}
                        <div className="flex gap-4 pt-4 shrink-0"><button type="button" onClick={() => setIsBranchEntryModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-100 rounded-2xl transition-all">Cancel</button><button type="submit" disabled={!anticipatedReceipt || ((branchEntryForm.paymentMode === 'UPI' || branchEntryForm.paymentMode === 'Bank Transfer') && !branchEntryForm.sourceAccount)} className="flex-1 py-4 bg-red-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-900 transition-all border-b-4 border-black disabled:opacity-30">Commit Entry</button></div>
                    </form>
                </div>
             ) : (
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar max-h-[60vh]">{branchCollections.length > 0 ? (<div className="space-y-3">{branchCollections.map((item) => (<div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 font-bold text-xs">{item.branch.split(' ')[1]}</div><div><p className="font-bold text-slate-800">{item.studentName}</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{item.grade}-{item.section} (Roll: {item.rollNo})</p></div></div><div className="text-center"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Receipt ID</p><span className="px-3 py-1 bg-red-50 text-red-950 rounded-lg text-[10px] font-black border border-red-100">{item.receiptNo}</span></div><div className="text-right"><p className="font-black text-red-900">₹{item.amount.toLocaleString()}</p><p className="text-[9px] font-black text-slate-400 uppercase">{item.paymentMode} {item.sourceAccount ? `• ${item.sourceAccount}` : ''}</p></div></div>))}</div>) : (<div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-40"><span className="text-7xl mb-4">📭</span><p className="text-xl font-bold uppercase tracking-widest">No Branch History</p></div>)}</div>
             )}
          </div>
        </div>
      )}

      {isExemptionModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-red-950/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95">
              <div className="bg-red-950 p-6 text-white flex justify-between items-center"><div className="flex items-center gap-3"><span className="text-2xl">✨</span><div><h3 className="text-xl font-bold serif-font italic">Fee Exemption Registry</h3><p className="text-[10px] font-black uppercase text-red-300 tracking-widest">Mark specific items as waived</p></div></div><button onClick={() => setIsExemptionModalOpen(false)} className="text-white/50 hover:text-white transition-colors text-2xl">&times;</button></div>
              <div className="p-8 overflow-y-auto max-h-[70vh] space-y-8 bg-slate-50/50">
                 <section><h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Waive Monthly Tuition</h4><div className="grid grid-cols-4 gap-2">{SESSION_MONTHS.map(m => { const isPaid = selectedStudent.monthlyStatus[m] === 'Paid'; const isExempted = selectedStudent.monthlyStatus[m] === 'Exempted'; const isSelected = exemptMonths.includes(m); const isApplicable = isMonthFeeApplicable(selectedStudent, m); return (<button key={m} type="button" disabled={isPaid || isExempted || !isApplicable} onClick={() => setExemptMonths(prev => isSelected ? prev.filter(x => x !== m) : [...prev, m])} className={`p-3 rounded-xl border-2 text-xs font-black transition-all ${!isApplicable ? 'bg-slate-100 opacity-20 cursor-not-allowed' : isPaid ? 'bg-green-50 border-green-200 text-green-700 cursor-not-allowed' : isExempted ? 'bg-indigo-50 border-indigo-200 text-indigo-700 cursor-not-allowed' : isSelected ? 'bg-red-950 border-red-950 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-red-900'}`}>{m}</button>); })}</div></section>
                 <div className="grid md:grid-cols-2 gap-8">
                    <section><h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Waive Assessment Terms</h4><div className="space-y-2">{EXAM_TERMS.map(term => { const isPaid = selectedStudent.examFeeStatus?.[term] === 'Paid'; const isExempted = selectedStudent.examFeeStatus?.[term] === 'Exempted'; const isSelected = exemptTerms.includes(term); return (<button key={term} type="button" disabled={isPaid || isExempted || isDropped} onClick={() => setExemptTerms(prev => isSelected ? prev.filter(x => x !== term) : [...prev, term])} className={`w-full flex justify-between items-center p-3 rounded-xl border-2 transition-all font-bold text-sm ${isDropped ? 'opacity-20 cursor-not-allowed' : isPaid ? 'bg-green-50 border-green-200 text-green-700' : isExempted ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : isSelected ? 'bg-red-950 border-red-950 text-white' : 'bg-white border-slate-100 text-slate-500'}`}><span>{term}</span><span className="text-[10px] opacity-60">₹{getEffectiveConfig(selectedStudent.grade).exam}</span></button>); })}</div></section>
                    <section><h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Waive Misc Kit Items</h4><div className="grid grid-cols-2 gap-2">{['tie', 'belt', 'idCard', 'diary', 'booklet'].map(item => { const isSelected = (exemptMisc as any)[item]; return (<button key={item} type="button" disabled={isDropped} onClick={() => setExemptMisc(prev => ({ ...prev, [item]: !isSelected }))} className={`p-3 rounded-xl border-2 text-center transition-all ${isDropped ? 'opacity-20 cursor-not-allowed' : isSelected ? 'bg-red-950 border-red-950 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-red-950'}`}><p className="text-[10px] font-black uppercase">{item === 'idCard' ? 'ID' : item}</p><p className="text-[9px] font-bold opacity-60">₹{(getEffectiveConfig(selectedStudent.grade) as any)[item]}</p></button>); })}</div></section>
                 </div>
              </div>
              <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center"><div><p className="text-[10px] font-black uppercase text-slate-400">Total Exemption Value</p><p className="text-2xl font-black text-red-900">₹{getExemptionTotal().toLocaleString()}</p></div><div className="flex gap-3"><button onClick={() => setIsExemptionModalOpen(false)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-xl transition-all">Cancel</button><button disabled={getExemptionTotal() <= 0} onClick={handleExemptSave} className="px-10 py-3 bg-red-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-800 transition-all disabled:opacity-30">Apply Exemption</button></div></div>
           </div>
        </div>
      )}

      {isOtherBranchModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-red-950/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white rounded-[2rem] shadow-2xl max-md w-full p-8 border border-slate-100 animate-in zoom-in-95">
              <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg"><span className="text-xl">📍</span></div><h3 className="text-xl font-bold text-red-950 serif-font italic">Other Branch Payment</h3></div>
              <div className="space-y-4 mb-8">
                 <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Select Branch</label><div className="grid grid-cols-2 gap-2">{BRANCH_OPTIONS.map(opt => (<button key={opt} onClick={() => setOtherBranchDetails({...otherBranchDetails, branch: `Branch ${opt}`})} className={`py-2 rounded-xl text-xs font-bold border transition-all ${otherBranchDetails.branch === `Branch ${opt}` ? 'bg-amber-600 border-amber-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Branch {opt}</button>))}</div></div>
                 <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Receipt Number</label><input value={otherBranchDetails.receiptNo} onChange={(e) => setOtherBranchDetails({...otherBranchDetails, receiptNo: e.target.value})} placeholder="Ex: BR2-4451" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-950 focus:ring-2 focus:ring-amber-500 outline-none" /></div>
                 <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Payment Date</label><input type="date" value={otherBranchDetails.date} onChange={(e) => setOtherBranchDetails({...otherBranchDetails, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-950 focus:ring-2 focus:ring-amber-500 outline-none" /></div>
              </div>
              <div className="flex gap-3"><button onClick={() => { setIsOtherBranchModalOpen(false); setIsOtherBranch(false); }} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancel</button><button disabled={!otherBranchDetails.receiptNo} onClick={() => finalizeTransaction(undefined, otherBranchDetails.branch, otherBranchDetails.receiptNo, otherBranchDetails.date)} className="flex-1 py-4 bg-red-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-800 disabled:opacity-30 transition-all">Commit Entry</button></div>
           </div>
        </div>
      )}

      {isUPIAccountSelectOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-indigo-950/40 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white rounded-3xl shadow-2xl max-md w-full p-8 border border-slate-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-3"><span className="text-2xl">📱</span><h3 className="text-xl font-bold text-indigo-950 serif-font italic">Select UPI Receiver</h3></div><button onClick={() => setIsUPIAccountEditMode(!isUPIAccountEditMode)} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{isUPIAccountEditMode ? 'Done' : 'Edit List'}</button></div>
              <div className="space-y-3 mb-8">{upiAccounts.map((name, idx) => (<div key={idx} className="relative group">{isUPIAccountEditMode ? (<input value={name} onChange={(e) => { const newNames = [...upiAccounts]; newNames[idx] = e.target.value; setUpiAccounts(newNames); }} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-800 focus:border-indigo-900 outline-none" />) : (<button onClick={() => finalizeTransaction(name)} className="w-full text-left bg-white hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-200 rounded-2xl p-4 transition-all group flex items-center justify-between"><span className="font-bold text-indigo-950">{name}</span><span className="opacity-0 group-hover:opacity-100 text-[10px] font-black uppercase text-indigo-700 tracking-widest">Select</span></button>)}</div>))}</div>
              <button onClick={() => setIsUPIAccountSelectOpen(false)} className="w-full py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancel Transaction</button>
           </div>
        </div>
      )}

      {isBankSelectOpen && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-blue-950/40 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white rounded-3xl shadow-2xl max-md w-full p-8 border border-slate-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-3"><span className="text-2xl">🏛️</span><h3 className="text-xl font-bold text-blue-950 serif-font italic">Select Bank Name</h3></div><button onClick={() => setIsBankEditMode(!isBankEditMode)} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">{isBankEditMode ? 'Done' : 'Edit Banks'}</button></div>
              <div className="space-y-3 mb-8">{bankAccounts.map((bank, idx) => (<div key={idx} className="relative group">{isBankEditMode ? (<input value={bank} onChange={(e) => { const newBanks = [...bankAccounts]; newBanks[idx] = e.target.value; setBankAccounts(newBanks); }} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 font-bold text-slate-800 focus:border-blue-900 outline-none" />) : (<button onClick={() => finalizeTransaction(bank)} className="w-full text-left bg-white hover:bg-blue-50 border-2 border-slate-100 hover:border-blue-200 rounded-2xl p-4 transition-all group flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">{bank.charAt(0)}</div><span className="font-bold text-blue-950">{bank}</span></div><span className="opacity-0 group-hover:opacity-100 text-[10px] font-black uppercase text-blue-700 tracking-widest">Select</span></button>)}</div>))}</div>
              <button onClick={() => setIsBankSelectOpen(false)} className="w-full py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancel Transaction</button>
           </div>
        </div>
      )}

      {editingTransaction && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-100"><h3 className="text-xl font-bold text-red-950 serif-font italic mb-2">Modify Ledger Entry</h3><p className="text-slate-500 text-xs mb-6 uppercase font-bold tracking-widest">Entry ID: {editingTransaction.id}</p>
              <div className="space-y-4">
                 <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Date</label><input type="text" value={editingTransaction.date} onChange={e => setEditingTransaction({...editingTransaction, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none" /></div>
                 <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Description</label><input type="text" value={editingTransaction.description} onChange={e => setEditingTransaction({...editingTransaction, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none" /></div>
                 <div className="grid grid-cols-2 gap-4"><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Amount (₹)</label><input type="number" value={editingTransaction.amount} onChange={e => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-red-950 focus:ring-2 focus:ring-red-900 outline-none" /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Mode</label><select value={editingTransaction.mode} onChange={e => setEditingTransaction({...editingTransaction, mode: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none">{['Cash', 'UPI', 'Bank Transfer', 'Demand', 'Waiver', 'B/F', 'Other Branch'].map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
              </div>
              <div className="mt-8 flex gap-3"><button onClick={() => setEditingTransaction(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-100 rounded-xl transition-all">Cancel</button><button onClick={saveEditedTransaction} className="flex-1 py-3 bg-red-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-800">Commit Edit</button></div>
           </div>
        </div>
      )}

      {isSiblingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-lg w-full p-6 border-2 border-slate-100 flex flex-col max-h-[80vh]"><div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100"><h3 className="text-lg font-bold text-red-950">Manage Siblings</h3><button onClick={() => setIsSiblingModalOpen(false)} className="text-slate-400 hover:text-red-900 text-2xl">&times;</button></div>
            <div className="flex-1 overflow-y-auto mb-4"><p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Connected Students</p>{siblings.length > 0 ? (<div className="space-y-2 mb-6">{siblings.map(sib => (<div key={sib.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200"><div className="flex items-center gap-3"><img src={getStudentPhoto(sib.photo, sib.studentName)} className="w-8 h-8 rounded-full object-cover border border-white" alt="" /><div><div className="text-sm font-bold text-slate-700">{sib.studentName}</div><div className="text-[10px] text-slate-400 font-medium">{sib.grade}</div></div></div><button onClick={() => handleUnlinkSibling(sib.id)} className="text-[10px] font-black uppercase text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-100">Remove</button></div>))}</div>) : (<p className="text-sm text-slate-400 italic mb-6 pl-2">No siblings connected to this profile.</p>)}<p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Add More Siblings</p><input type="text" placeholder="Search by Name or ID..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500 mb-2" value={siblingSearchTerm} onChange={(e) => setSiblingSearchTerm(e.target.value)} />{siblingSearchTerm && (<div className="border border-slate-100 rounded-xl overflow-hidden max-h-40 overflow-y-auto bg-white shadow-inner">{sessionStudents.filter(s => s.id !== selectedStudent?.id && !siblings.some(existing => existing.id === s.id) && (s.studentName.toLowerCase().includes(siblingSearchTerm.toLowerCase()) || s.id.includes(siblingSearchTerm))).map(s => (<button key={s.id} onClick={() => handleLinkSibling(s.id)} className="w-full text-left p-3 hover:bg-amber-50 border-b border-slate-50 flex justify-between items-center group"><div><div className="text-sm font-bold text-slate-700">{s.studentName}</div><div className="text-[10px] text-slate-400">{s.grade}</div></div><span className="text-amber-600 font-bold text-xs opacity-0 group-hover:opacity-100">+ Link</span></button>))}</div>)}</div>
          </div>
        </div>
      )}

      {isFamilyBatchOpen && selectedStudent && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-red-950/60 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setIsFamilyBatchOpen(false)}>
           <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95" onClick={e => e.stopPropagation()}><div className="bg-red-950 p-8 text-white flex justify-between items-center"><div className="flex items-center gap-5"><div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3"><span className="text-3xl">👨‍👩‍👧‍👦</span></div><div><h2 className="text-2xl font-bold serif-font italic tracking-tight">The Family Ledger</h2><p className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em]">Connected Sibling Profiles & Financial Summary</p></div></div><button onClick={() => setIsFamilyBatchOpen(false)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-2xl">&times;</button></div>
              <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 custom-scrollbar"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-6 rounded-[2rem] border-2 border-red-900 shadow-xl relative overflow-hidden ring-4 ring-red-50"><div className="absolute top-0 right-0 px-4 py-1.5 bg-red-900 text-white text-[9px] font-black uppercase rounded-bl-2xl">Viewing Primary</div><div className="flex items-center gap-4 mb-6"><img src={getStudentPhoto(selectedStudent.photo, selectedStudent.studentName)} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100" alt="" /><div><h3 className="font-bold text-red-950">{selectedStudent.studentName}</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">{selectedStudent.grade}-{selectedStudent.section} (Roll: {selectedStudent.rollNo})</p></div></div><div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50"><div className="bg-green-50 p-3 rounded-2xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Received</p><p className="font-black text-green-700">₹{selectedStudent.paidAmount.toLocaleString()}</p></div><div className="bg-red-50 p-3 rounded-2xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Outstanding</p><p className="font-black text-red-700">₹{getNetDue(selectedStudent).toLocaleString()}</p></div></div></div>{siblings.map(sib => (<div key={sib.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-lg hover:border-amber-500 hover:shadow-xl transition-all group"><div className="flex items-center gap-4 mb-6"><img src={getStudentPhoto(sib.photo, sib.studentName)} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 grayscale group-hover:grayscale-0 transition-all" alt="" /><div><h3 className="font-bold text-slate-800">{sib.studentName}</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">{sib.grade}-{sib.section} (Roll: {sib.rollNo})</p></div></div><div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50 mb-6"><div className="bg-slate-50 p-3 rounded-2xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Received</p><p className="font-black text-slate-700">₹{sib.paidAmount.toLocaleString()}</p></div><div className="bg-red-50/50 p-3 rounded-2xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Outstanding</p><p className={`font-black ${getNetDue(sib) > 0 ? 'text-red-700' : 'text-green-600'}`}>₹{getNetDue(sib).toLocaleString()}</p></div></div><button onClick={() => { setSelectedStudent(sib); setIsFamilyBatchOpen(false); }} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-950 transition-all">Switch to {sib.studentName.split(' ')[0]}'s Ledger</button></div>))}{siblings.length === 0 && (<button onClick={() => { setIsFamilyBatchOpen(false); setIsSiblingModalOpen(true); }} className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center hover:bg-white hover:border-amber-500 transition-all group"><span className="text-4xl mb-4 opacity-40 group-hover:scale-110 transition-transform">➕</span><h3 className="font-black text-slate-400 uppercase text-xs">No Siblings Connected</h3><p className="text-[10px] text-slate-300 mt-1 italic">Click here to manage household links</p></button>)}</div>{siblings.length > 0 && (<div className="mt-12 bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 flex flex-col md:flex-row justify-between items-center gap-6"><div className="flex items-center gap-5"><div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-white shadow-lg">₹</div><div><h4 className="font-bold text-amber-900">Total Family Liability</h4><p className="text-xs text-amber-700 italic">Net sum of all connected sibling balances</p></div></div><div className="text-center md:text-right"><p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">Grand Consolidated Due</p><p className="text-4xl font-black text-red-950">₹{(getNetDue(selectedStudent) + siblings.reduce((acc, sib) => acc + getNetDue(sib), 0)).toLocaleString()}</p></div></div>)}</div>
              <div className="p-6 bg-white border-t border-slate-100 text-center shrink-0"><button onClick={() => setIsFamilyBatchOpen(false)} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-900 transition-colors tracking-widest px-10 py-2">Close Family Batch</button></div>
           </div>
        </div>
      )}
      {isEditProfileOpen && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 border-2 border-slate-100 my-8"><div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4"><div><h3 className="text-2xl font-bold text-red-950 serif-font">Edit Comprehensive Profile</h3><p className="text-xs text-slate-400 uppercase font-bold tracking-widest">UID: {selectedStudent.id}</p></div><button onClick={() => setIsEditProfileOpen(false)} className="text-3xl text-slate-400 hover:text-red-900 transition-colors">&times;</button></div>
            <div className="space-y-8"><div className="flex flex-col items-center"><div className="relative group"><div className="w-24 h-24 bg-slate-100 rounded-full border-2 border-slate-200 flex items-center justify-center overflow-hidden mb-2 shadow-inner"><img src={getStudentPhoto(editStudentData.photo || selectedStudent.photo, editStudentData.studentName || selectedStudent.studentName)} alt="Preview" className="w-full h-full object-cover" /></div><button onClick={() => editFileInputRef.current?.click()} className="absolute bottom-2 right-0 bg-red-950 text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-red-800 transition-all active:scale-90" title="Change Photo"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button><input type="file" ref={editFileInputRef} onChange={handleEditPhotoUpload} accept="image/*" className="hidden" capture="environment" /></div><input type="text" placeholder="Or paste Photo URL" value={editStudentData.photo || ''} onChange={e => setEditStudentData({...editStudentData, photo: e.target.value})} className="w-full max-w-xs text-[10px] bg-slate-50 border border-slate-200 rounded-full px-4 py-1 text-center mt-2 outline-none focus:border-red-900" /></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100"><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Admission No</label><input value={editStudentData.admissionNo || ''} onChange={e => setEditStudentData({...editStudentData, admissionNo: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:ring-1 focus:ring-red-900 outline-none" /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">UID No</label><input value={editStudentData.uidNo || ''} onChange={e => setEditStudentData({...editStudentData, uidNo: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:ring-1 focus:ring-red-900 outline-none" /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">PEN No</label><input value={editStudentData.penNo || ''} onChange={e => setEditStudentData({...editStudentData, penNo: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:ring-1 focus:ring-red-900 outline-none" /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">APAAR ID</label><input value={editStudentData.apaarId || ''} onChange={e => setEditStudentData({...editStudentData, apaarId: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold focus:ring-1 focus:ring-red-900 outline-none" /></div></div>
              <div className="grid md:grid-cols-2 gap-4"><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Student Full Name</label><input value={editStudentData.studentName || ''} onChange={e => setEditStudentData({...editStudentData, studentName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none" /></div><div className="grid grid-cols-2 gap-2"><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Grade</label><select value={editStudentData.grade || ''} onChange={e => setEditStudentData({...editStudentData, grade: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">{availableClassNames.map(cls => <option key={cls} value={cls}>{cls}</option>)}</select></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Section</label><input value={editStudentData.section || ''} onChange={e => setEditStudentData({...editStudentData, section: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-center outline-none" /></div></div></div>
              <div className="grid md:grid-cols-2 gap-4"><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Father's Name</label><input value={editStudentData.fatherName || ''} onChange={e => setEditStudentData({...editStudentData, fatherName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Mother's Name</label><input value={editStudentData.motherName || ''} onChange={e => setEditStudentData({...editStudentData, motherName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" /></div></div>
              <div className="grid md:grid-cols-3 gap-4"><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Roll No</label><input value={editStudentData.rollNo || ''} onChange={e => setEditStudentData({...editStudentData, rollNo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" /></div><div className="col-span-2"><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Aadhar Card</label><input value={editStudentData.aadharCard || ''} onChange={e => setEditStudentData({...editStudentData, aadharCard: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="Aadhar Number" /></div></div>
              <div className="grid md:grid-cols-3 gap-4"><div className="col-span-1"><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">School Branch</label><select value={editStudentData.schoolBranch || '1'} onChange={e => setEditStudentData({...editStudentData, schoolBranch: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">{BRANCH_OPTIONS.map(opt => <option key={opt} value={opt}>Branch {opt}</option>)}</select></div><div className="col-span-2"><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Mobile / Primary ID</label><input value={editStudentData.mobileNumber || ''} onChange={e => setEditStudentData({...editStudentData, mobileNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" /></div></div>
              <div className="grid md:grid-cols-2 gap-4"><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">WhatsApp Number</label><input value={editStudentData.whatsappNumber || ''} onChange={e => setEditStudentData({...editStudentData, whatsappNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Date of Birth</label><input type="date" value={editStudentData.dob || ''} onChange={e => setEditStudentData({...editStudentData, dob: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" /></div></div>
              <div className="w-full"><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Address</label><input value={editStudentData.address || ''} onChange={e => setEditStudentData({...editStudentData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" /></div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 grid md:grid-cols-3 gap-4"><div><label className="block text-[10px] font-black uppercase text-amber-600 mb-1">Prev Class</label><input value={editStudentData.previousClass || ''} onChange={e => setEditStudentData({...editStudentData, previousClass: e.target.value})} className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-bold outline-none" /></div><div><label className="block text-[10px] font-black uppercase text-amber-600 mb-1">Prev Roll</label><input value={editStudentData.previousRollNo || ''} onChange={e => setEditStudentData({...editStudentData, previousRollNo: e.target.value})} className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-bold outline-none" /></div><div><label className="block text-[10px] font-black uppercase text-amber-600 mb-1">Prev Branch</label><input value={editStudentData.previousBranch || ''} onChange={e => setEditStudentData({...editStudentData, previousBranch: e.target.value})} className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-bold outline-none" /></div></div>
            </div>
            <div className="flex justify-end gap-3 mt-10"><button onClick={() => setIsEditProfileOpen(false)} className="px-6 py-3 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Cancel</button><button onClick={saveEditProfile} className="px-10 py-3 bg-red-950 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:bg-red-800 transition-all active:scale-95">Commit Updates</button></div>
          </div>
        </div>
      )}
      {isDiscountModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-sm w-full p-6 border-2 border-slate-100"><div className="flex justify-between items-center mb-4 border-b border-amber-100 pb-2"><h3 className="text-lg font-bold text-amber-700">Concession Settings</h3><button onClick={() => setIsDiscountModalOpen(false)} className="text-2xl text-slate-400 hover:text-amber-700">&times;</button></div>
            <div className="space-y-4"><div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monthly Discount (₹)</label><input type="number" value={editDiscountAmount} onChange={e => setEditDiscountAmount(e.target.value)} className="w-full border-2 border-amber-100 rounded-xl p-3 text-xl font-black text-amber-800 focus:outline-none focus:border-amber-500 mt-1" /></div><div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Effective From Month</label><select value={editDiscountStartMonth} onChange={e => setEditDiscountStartMonth(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold mt-1 focus:outline-none focus:border-amber-500">{SESSION_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select><p className="text-[10px] text-slate-400 mt-1 italic">Discount applies from this month onwards for the current session.</p></div></div>
            <div className="flex justify-end gap-2 mt-6"><button onClick={() => setIsDiscountModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold uppercase tracking-widest">Cancel</button><button onClick={saveDiscountSettings} className="px-6 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-amber-700 uppercase tracking-widest">Update</button></div>
          </div>
        </div>
      )}
      {fullScreenPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in zoom-in duration-200" onClick={() => setFullScreenPhoto(null)}><img src={fullScreenPhoto} alt="Full Screen" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border-4 border-white object-contain" /><button className="absolute top-4 right-4 text-white text-4xl hover:opacity-80 transition-opacity">&times;</button></div>
      )}
      <div className={`shrink-0 text-white py-4 px-6 shadow-md transition-colors z-10 print:hidden ${isReadOnly ? 'bg-slate-800' : isDropped ? 'bg-red-600' : isTransfer ? 'bg-blue-900' : isActiveReactivated ? 'bg-emerald-900' : 'bg-red-950'}`}>
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4"><div className="flex items-center gap-4">{isReadOnly && <span className="text-2xl">🔒</span>}{isDropped && <span className="text-2xl">🛑</span>}{isTransfer && <span className="text-2xl">🔄</span>}{isActiveReactivated && <span className="text-2xl">⚡</span>}<div className="flex items-center gap-4"><div><h1 className="text-2xl font-bold serif-font tracking-tight">Ledger {currentSession}</h1><p className="text-xs font-bold uppercase tracking-widest">{isReadOnly ? 'Archive Mode' : isDropped ? 'EXITED STUDENT - SETTLEMENT MODE' : isTransfer ? 'TRANSFERRED STUDENT - CHRONO PRICING' : isActiveReactivated ? `RE-ACTIVATED FROM ${selectedStudent?.statusMetadata?.activeFrom}` : 'Live Dashboard'}</p></div></div></div><div className="flex gap-4 text-sm"><div className="bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10"><span className="opacity-60 uppercase font-bold text-[10px] block">Collection</span><span className="font-bold text-xl">₹{(totalReceived/1000).toFixed(1)}k</span></div><div className="bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10"><span className="opacity-60 uppercase font-bold text-[10px] block">Outstanding</span><span className="font-bold text-xl text-amber-200">₹{(totalOutstanding/1000).toFixed(1)}k</span></div></div></div>
      </div>
      <div className="flex-1 print:hidden">
        <div className="max-w-[1600px] mx-auto p-4 grid lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden h-[calc(100vh-7rem)] sticky top-24">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0"><div className="relative mb-3"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span><input type="text" placeholder="Search by Name or ID..." className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-12 py-3 text-base font-bold outline-none focus:ring-2 focus:ring-red-900 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />{searchTerm.length > 0 && (<button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-red-900 hover:text-white transition-all shadow-sm group active:scale-90"><span className="text-lg font-black leading-none group-hover:scale-110 transition-transform">×</span></button>)}</div><div className="px-1 text-[10px] text-right text-slate-400 uppercase font-bold tracking-widest">{filteredFees.length} Records Found</div></div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">{filteredFees.map(fee => (<button key={fee.id} onClick={() => setSelectedStudent(fee)} className={`w-full text-left p-3 rounded-xl transition-all border group flex items-center gap-3 ${selectedStudent?.id === fee.id ? 'bg-red-950 border-red-950 shadow-md' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}><div className="shrink-0" onClick={(e) => { e.stopPropagation(); setFullScreenPhoto(getStudentPhoto(fee.photo, fee.studentName)); }}><img src={getStudentPhoto(fee.photo, fee.studentName)} alt={fee.studentName} className={`w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm hover:scale-110 transition-transform cursor-pointer bg-slate-200 ${fee.academicStatus === 'Dropped' ? 'grayscale' : ''}`} /></div><div className="flex-1 min-w-0"><div className="flex justify-between items-start mb-1"><div className={`font-bold text-base line-clamp-1 ${selectedStudent?.id === fee.id ? 'text-white' : fee.academicStatus === 'Dropped' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{fee.studentName}</div><span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${fee.academicStatus === 'Dropped' ? (selectedStudent?.id === fee.id ? 'bg-red-700 text-white' : 'bg-red-100 text-red-700') : fee.academicStatus === 'Transfer' ? (selectedStudent?.id === fee.id ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700') : fee.status === 'Paid' ? (selectedStudent?.id === fee.id ? 'bg-green-50 text-white' : 'bg-green-100 text-green-700') : (selectedStudent?.id === fee.id ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700')}`}>{fee.academicStatus === 'Dropped' ? 'DROPPED' : fee.academicStatus === 'Transfer' ? 'TRANSFER' : fee.status}</span></div><div className={`flex justify-between text-xs font-medium ${selectedStudent?.id === fee.id ? 'text-red-200' : 'text-slate-400'}`}><span>{fee.grade}-{fee.section} ({fee.rollNo})</span><span className={selectedStudent?.id === fee.id ? 'text-white' : 'text-slate-600'}>Due: ₹{getNetDue(fee).toLocaleString()}</span></div></div></button>))}{filteredFees.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No students found.</div>}</div>
          </div>
          <div className="lg:col-span-8 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col min-h-[calc(100vh-7rem)]">
            {selectedStudent && currentStudentConfig ? (
              <div className="flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-4 relative">
                  <div className="flex items-center gap-5">
                    <div onClick={() => setFullScreenPhoto(getStudentPhoto(selectedStudent.photo, selectedStudent.studentName))}><img src={getStudentPhoto(selectedStudent.photo, selectedStudent.studentName)} alt="Profile" className={`w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg cursor-pointer hover:scale-105 transition-transform bg-slate-200 ${isDropped ? 'grayscale' : ''}`} /></div>
                    <div>
                      <div className="flex items-center gap-3 mb-2"><h2 className={`text-3xl font-black serif-font leading-none ${isDropped ? 'text-slate-400 line-through' : 'text-red-950'}`}>{selectedStudent.studentName}</h2><button onClick={openEditProfile} disabled={isReadOnly} title="Edit Student Profile" className="bg-white border border-slate-200 text-slate-400 p-1.5 rounded-full hover:bg-slate-50 hover:text-red-900 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-30"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button></div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 font-bold mb-2"><span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">{selectedStudent.grade}-{selectedStudent.section}</span><span title="Roll Number">Roll: {selectedStudent.rollNo}</span><span className="text-slate-300">|</span><span className="text-slate-600" title="Admission Number">ADM: {selectedStudent.admissionNo || 'N/A'}</span><span className="text-slate-300">|</span><span className="text-slate-600" title="Father's Name">F: {selectedStudent.fatherName}</span></div>
                      {isDropped && <div className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-3 shadow-md">EXITED RECORD: DROPPED FROM {selectedStudent.statusMetadata?.dropMonth}</div>}
                      {isTransfer && <div className="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-3 shadow-md italic">CHRONO-BILLING: TRANSFERRED FROM {selectedStudent.statusMetadata?.oldClass} SINCE {selectedStudent.statusMetadata?.transferMonth}</div>}
                      {isActiveReactivated && <div className="bg-emerald-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-3 shadow-md">RE-ACTIVATED FROM {selectedStudent.statusMetadata?.activeFrom}</div>}
                      <div className="flex flex-wrap items-center gap-2 mb-2 animate-in fade-in slide-in-from-left-2"><span className="text-[10px] font-black uppercase text-amber-700 tracking-widest bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">Siblings:</span>{siblings.length > 0 ? siblings.map(sib => (<button key={sib.id} onClick={(e) => { e.stopPropagation(); setSelectedStudent(sib); }} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-1 pr-3 py-0.5 hover:border-red-400 hover:shadow-sm transition-all group" title={`Switch to ${sib.studentName}`}><img src={getStudentPhoto(sib.photo, sib.studentName)} className="w-4 h-4 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" alt={sib.studentName} /><span className="text-[10px] font-bold text-slate-600 group-hover:text-red-900">{sib.studentName.split(' ')[0]}</span><span className="text-[9px] text-slate-400 bg-slate-50 px-1 rounded">{sib.grade}</span></button>)) : <span className="text-[10px] text-slate-400 italic">None detected</span>}<button onClick={() => setIsSiblingModalOpen(true)} className="text-amber-700 hover:text-red-900 transition-all active:scale-110" title="Manage Sibling Links">⚙️</button></div>
                      {!isDropped && <div className="flex flex-wrap items-center gap-2 mb-2"><div className="inline-flex items-center gap-1 bg-green-50 text-green-800 border border-green-200 px-3 py-1 rounded-md text-xs"><span className="font-bold">Structure Fee: ₹{currentStudentConfig.tuition.toLocaleString()}</span>{selectedStudent.cashDiscount > 0 && <span className="text-red-600 font-bold"> - ₹{selectedStudent.cashDiscount.toLocaleString()} (Disc)</span>}<span className="font-black ml-1 text-green-900 border-l border-green-200 pl-2">= ₹{Math.max(0, currentStudentConfig.tuition - selectedStudent.cashDiscount).toLocaleString()}/mo</span></div><button onClick={openDiscountModal} disabled={isReadOnly} className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-400 hover:text-amber-700 rounded-lg transition-colors border border-slate-200 disabled:opacity-30" title="Edit Concession"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button></div>}
                      <div className="flex gap-2 mb-1">{EXAM_TERMS.map(term => <span key={term} className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${selectedStudent.examFeeStatus?.[term] === 'Paid' ? 'bg-purple-100 text-purple-700 border-purple-200' : selectedStudent.examFeeStatus?.[term] === 'Exempted' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{term}: {selectedStudent.examFeeStatus?.[term]} {isDropped ? '' : (selectedStudent.examFeeStatus?.[term] === 'Unpaid' ? `(₹${currentStudentConfig.exam})` : '')}</span>)}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 items-end">
                    <button onClick={() => setIsFamilyBatchOpen(true)} className="group flex items-center gap-3 bg-red-950 text-white pl-3 pr-5 py-2.5 rounded-2xl shadow-xl hover:bg-red-800 transition-all border-b-4 border-amber-700 active:border-b-0 active:translate-y-1"><div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform"><span className="text-sm">👪</span></div><div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">Family Batch</p><p className="text-[8px] font-bold text-amber-300 uppercase opacity-80 lordship leading-none">{siblings.length + 1} Members Linked</p></div></button>
                    <div className="flex bg-slate-200 p-1 rounded-lg">
                      <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-white text-red-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ledger</button>
                      <button onClick={() => setActiveTab('collect')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'collect' ? 'bg-white text-school-burgundy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Collect</button>
                    </div>
                  </div>
                </div>
                {activeTab === 'ledger' && (
                  <div className="flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 bg-white">
                      <div className="flex justify-between items-end mb-2"><span className="text-xs font-black uppercase text-slate-400 tracking-widest">Fee Clearance Progress</span><span className="text-xs font-bold text-red-900">{progressStats.percent}% Complete</span></div>
                      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-100">{progressStats.segments.map((seg) => (<div key={seg.id} className={`flex-1 transition-all duration-500 relative group ${seg.status === 'paid' ? 'bg-green-500' : seg.status === 'exempted' ? 'bg-indigo-500' : seg.status === 'partial' ? 'bg-amber-400' : seg.status === 'arrears' ? 'bg-red-600' : seg.status === 'inactive' ? 'bg-slate-400 opacity-30 pattern-dots' : 'bg-slate-200'}`}><div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold uppercase z-20">{seg.label}: {seg.status}</div></div>))}</div>
                    </div>
                    <div className="bg-slate-50/30">
                      <div className="p-4 flex flex-col gap-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className={`p-3 rounded-2xl border ${currentArrearsOutstanding === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-100'}`}><p className={`text-[10px] font-black uppercase mb-1 ${currentArrearsOutstanding === 0 ? 'text-green-600' : 'text-red-400'}`}>Legacy Arrears{currentArrearsOutstanding === 0 && <span className="ml-1 text-[10px] bg-green-200 text-green-800 px-1 rounded">PAID</span>}</p>{currentArrearsOutstanding === 0 ? <p className="text-base font-bold text-green-800 flex items-center gap-1"><span>✓</span> Settled</p> : <p className="text-base font-bold text-red-950">₹{currentArrearsOutstanding.toLocaleString()}</p>}<p className="text-[9px] text-slate-400 mt-1 italic">Outstanding BF 2025</p></div>
                          <div className="p-3 bg-green-50 rounded-2xl border border-green-100"><p className="text-[10px] font-black uppercase text-green-600 mb-1">Paid Amount</p><p className="text-base font-bold text-green-800">₹{selectedStudent.paidAmount.toLocaleString()}</p></div>
                          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100"><p className="text-[10px] font-black uppercase text-amber-600 mb-1">Total Net Due</p><p className="text-base font-bold text-green-800">₹{getNetDue(selectedStudent).toLocaleString()}</p></div>
                        </div>
                        <div className="border border-slate-100 rounded-2xl p-3 bg-white">
                          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Payment Calendar</h3>
                          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                            {SESSION_MONTHS.map((mon, index) => { 
                              const status = selectedStudent.monthlyStatus[mon]; 
                              const isApplicable = isMonthFeeApplicable(selectedStudent, mon); 
                              let cumulativeCost = selectedStudent.arrearsMarch2025 + getOtherDebits(selectedStudent); 
                              for(let i = 0; i <= index; i++) {
                                  if(isMonthFeeApplicable(selectedStudent, SESSION_MONTHS[i]) && selectedStudent.monthlyStatus[SESSION_MONTHS[i]] !== 'Exempted') {
                                      const mConfig = getConfigForMonth(selectedStudent, SESSION_MONTHS[i]);
                                      cumulativeCost += Math.max(0, mConfig.tuition - (i >= SESSION_MONTHS.indexOf(selectedStudent.discountStartMonth || 'APR') ? (selectedStudent.cashDiscount || 0) : 0)); 
                                  }
                              }
                              const netDueAtMonth = cumulativeCost - selectedStudent.paidAmount; 
                              return (
                                <div key={mon} className={`p-2 rounded-lg border text-center flex flex-col justify-between h-full ${!isApplicable ? 'bg-slate-100 border-slate-200 opacity-50 grayscale' : status === 'Paid' ? 'bg-green-50 border-green-200' : status === 'Exempted' ? 'bg-indigo-50 border-indigo-200' : status === 'Partial' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 text-slate-300'}`}>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase">{mon}</p>
                                    <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${!isApplicable ? 'bg-slate-400' : status === 'Paid' ? 'bg-green-500' : status === 'Exempted' ? 'bg-indigo-500' : status === 'Partial' ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
                                  </div>
                                  {isApplicable && status !== 'Exempted' && netDueAtMonth > 0 && <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">(₹{netDueAtMonth.toLocaleString()})</p>}
                                  {isApplicable && status === 'Exempted' && <p className="text-[8px] font-black text-indigo-400 mt-1">PAID AS EXEMPT</p>}
                                  {!isApplicable && <p className="text-[8px] font-black text-slate-400 mt-1">EXEMPT</p>}
                                </div>
                              ); 
                            })}
                          </div>
                        </div>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden flex flex-col bg-white">
                          <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 shrink-0 flex justify-between items-center"><h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Transaction History</h3>{!isReadOnly && (<button onClick={() => setIsHistoryEditMode(!isHistoryEditMode)} className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${isHistoryEditMode ? 'bg-red-950 text-white border-red-950 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:text-red-900'}`}>{isHistoryEditMode ? 'Close Editor' : 'Manage Ledger'}</button>)}</div>
                          <div className="p-0">
                            {sortedHistory.length > 0 ? (
                              <table className="w-full text-left">
                                <thead className="bg-white sticky top-0 z-10 shadow-sm"><tr><th className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 bg-slate-50/80 backdrop-blur-sm">Date</th><th className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 bg-slate-50/80 backdrop-blur-sm">Description</th><th className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 bg-slate-50/80 backdrop-blur-sm">Receipt ID</th><th className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 text-right bg-slate-50/80 backdrop-blur-sm">Debit</th><th className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 text-right bg-slate-50/80 backdrop-blur-sm">Credit</th><th className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 text-right bg-slate-50/80 backdrop-blur-sm">Balance</th><th className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 text-center bg-slate-50/80 backdrop-blur-sm">Source</th>{isHistoryEditMode && <th className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 text-center bg-slate-50/80 backdrop-blur-sm">Actions</th>}</tr></thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                  {sortedHistory.map((txn: any, idx: number) => (<tr key={idx} className={`hover:bg-slate-50/50 ${txn.id === 'OPENING-BAL' ? 'bg-amber-50/40' : ''}`}><td className="px-4 py-2 font-medium text-slate-500 whitespace-nowrap align-top">{txn.date}</td><td className="px-4 py-2 font-bold text-slate-700 whitespace-normal align-top">{txn.description} {txn.isOtherBranch && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-black rounded uppercase border border-amber-200">Other Branch</span>}</td><td className="px-4 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap align-top">{txn.receiptId}</td><td className={`px-4 py-2 font-black text-right whitespace-nowrap align-top text-red-600`}>{txn.type === 'Debit' ? `₹${txn.amount.toLocaleString()}` : '-'}</td><td className="px-4 py-2 font-black text-right whitespace-nowrap text-green-600 align-top">{txn.type === 'Credit' ? `₹${txn.amount.toLocaleString()}` : '-'}</td><td className="px-4 py-2 font-bold text-slate-500 text-right whitespace-nowrap align-top">₹{txn.balance.toLocaleString()}</td><td className="px-4 py-2 text-center whitespace-nowrap align-top"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border transition-all ${txn.mode === 'Cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : txn.mode === 'UPI' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : txn.mode === 'Bank Transfer' ? 'bg-blue-50 text-blue-700 border-blue-100' : txn.mode === 'Waiver' ? 'bg-amber-50 text-amber-700 border-amber-100' : txn.mode === 'Other Branch' ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{txn.mode}{txn.sourceAccount ? ` • ${txn.sourceAccount}` : ''}{txn.branchName ? ` • ${txn.branchName}` : ''}</span></td>{isHistoryEditMode && (<td className="px-4 py-2 text-center whitespace-nowrap align-top">{txn.id !== 'OPENING-BAL' ? (<div className="flex gap-2 justify-center"><button onClick={() => handleEditTransaction(txn)} className="p-1.5 bg-slate-100 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all" title="Edit Record"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button><button onClick={() => deleteTransaction(txn.id)} className="p-1.5 bg-slate-100 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all" title="Delete Record"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>) : <span className="text-[8px] font-black text-slate-300 uppercase">LOCKED</span>}</td>)}</tr>))}
                                </tbody>
                              </table>
                            ) : <div className="p-8 text-center text-slate-400 text-sm italic">No transactions recorded.</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center mt-auto"><div className="text-xs text-slate-500 font-medium">Last Updated: {formatDate(new Date())}</div><div className="text-right"><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Net Payable</div><div className="text-2xl font-black text-red-900">₹{getNetDue(selectedStudent).toLocaleString()}</div></div></div>
                  </div>
                )}
                {activeTab === 'collect' && (
                  <div className="p-6 bg-slate-50">
                    {success ? (
                      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-300 py-12"><div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></div><h3 className="text-2xl font-bold text-red-950 mb-2">{lastReceipt?.branch ? 'Branch Entry Logged!' : 'Receipt Generated!'}</h3><p className="text-slate-500 mb-8">Transaction successfully recorded in the ledger{lastReceipt?.account ? ` for ${lastReceipt.account}` : ''}{lastReceipt?.branch ? ` at ${lastReceipt.branch}` : ''}.</p><div className="flex gap-3"><button onClick={() => window.print()} className="bg-red-950 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-red-900">Print Receipt</button><button onClick={() => { setSuccess(false); setLastReceipt(null); setIsOtherBranch(false); }} className="bg-white text-slate-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border border-slate-200 hover:bg-slate-50">New Collection</button></div></div>
                    ) : (
                      <div className="max-w-2xl mx-auto space-y-8">
                        {isDropped && (<div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-xl shadow-sm animate-in slide-in-from-top-2"><h4 className="font-black text-red-900 uppercase text-xs">EXITED STUDENT SETTLEMENT</h4><p className="text-[10px] text-red-700 mt-1 leading-relaxed">This student was dropped in <strong>{selectedStudent.statusMetadata?.dropMonth}</strong>. Only prior dues and arrears are payable. Exam and misc fees are strictly blocked.</p><div className="mt-2 flex gap-4 text-[10px] font-bold text-red-950"><span>Total Settlable Debt: ₹{getNetDue(selectedStudent).toLocaleString()}</span></div></div>)}
                        {!isOtherBranch && !anticipatedReceipt && (<div className="p-4 bg-red-600 text-white rounded-2xl shadow-xl border border-red-700 flex items-center gap-4 animate-bounce"><span className="text-3xl">⚠️</span><div><h4 className="font-black uppercase text-xs">Receipt Inventory Exhausted</h4><p className="text-[10px] font-bold">Transaction posting is locked. Please create a new book in 'Receipt Manager' to continue.</p></div></div>)}
                        <div className="grid grid-cols-3 gap-3">{['monthly', 'partial', 'full'].map(t => <button key={t} type="button" onClick={() => setPaymentType(t as any)} className={`py-3 rounded-xl border-2 transition-all text-xs font-black uppercase tracking-widest ${paymentType === t ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-400 hover:border-amber-200'}`}>{t === 'full' && isDropped ? 'Settlement' : t}</button>)}</div>
                        <form onSubmit={handlePay} className="space-y-8">
                          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            {paymentType === 'monthly' && (
                              <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center"><label className="text-xs font-black uppercase text-slate-400 tracking-widest">Select Months to Pay</label><div className="flex gap-2">{calculateDiscountApplied() > 0 && <span className="text-[10px] font-bold text-green-600 px-2 py-1 bg-green-50 rounded">Discount: ₹{calculateDiscountApplied()}</span>}<button type="button" onClick={() => setIsExemptionModalOpen(true)} className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1.5"><span>✨</span> Manage Exemptions</button></div></div>
                                    <div className="flex items-center gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 animate-in slide-in-from-top-1"><div className="flex items-center gap-2 cursor-pointer select-none"><div className="relative"><input type="checkbox" id="on-time-discount-chk" className="peer sr-only" checked={isOnTimeWaiverActive} onChange={(e) => { const checked = e.target.checked; setIsOnTimeWaiverActive(checked); if (checked && currentStudentConfig) setOnTimeWaiverAmount(currentStudentConfig.onTimeReward.toString()); }} /><div className="w-5 h-5 border-2 border-indigo-300 rounded-md bg-white peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all"></div><svg className="w-4 h-4 text-white absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div><label htmlFor="on-time-discount-chk" className="text-[10px] font-black uppercase text-indigo-700 tracking-tight cursor-pointer">Apply On-Time Reward Waiver?</label></div>{isOnTimeWaiverActive && (<div className="flex items-center gap-2 animate-in zoom-in-95 duration-200"><span className="text-[9px] font-bold text-indigo-400">Amount (₹):</span><input type="number" value={onTimeWaiverAmount} onChange={(e) => setOnTimeWaiverAmount(e.target.value)} className="w-20 bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-black text-indigo-900 outline-none focus:ring-1 focus:ring-indigo-500" /></div>)}</div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  {SESSION_MONTHS.map((m, idx) => { 
                                    const isPaid = selectedStudent.monthlyStatus[m] === 'Paid'; const isExempted = selectedStudent.monthlyStatus[m] === 'Exempted'; const isSelected = selectedMonths.includes(m); const isApplicable = isMonthFeeApplicable(selectedStudent, m); 
                                    let isSelectableSequence = true;
                                    for(let i = 0; i < idx; i++) { if (isMonthFeeApplicable(selectedStudent, SESSION_MONTHS[i])) { const prevStatus = selectedStudent.monthlyStatus[SESSION_MONTHS[i]]; if (prevStatus !== 'Paid' && prevStatus !== 'Exempted' && !selectedMonths.includes(SESSION_MONTHS[i])) { isSelectableSequence = false; break; } } }
                                    return (<button key={m} type="button" disabled={isPaid || isExempted || !isApplicable} onClick={() => toggleMonth(m)} className={`p-3 rounded-lg border text-center transition-all relative ${!isApplicable ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed opacity-30 grayscale' : isPaid ? 'bg-slate-50 border-green-100 text-green-500 cursor-not-allowed' : isExempted ? 'bg-indigo-50 border-indigo-100 text-indigo-300 cursor-not-allowed' : isSelected ? 'bg-red-950 border-red-950 text-white shadow-md' : !isSelectableSequence ? 'bg-white border-slate-100 text-slate-200 cursor-default opacity-50' : 'bg-white border-slate-200 text-slate-600 hover:border-red-200'}`}><div className="text-xs font-black">{m}</div>{!isPaid && !isExempted && isApplicable && isSelectableSequence && <div className="text-[9px] opacity-80">Due: {calculateMonthSpecificDue(idx, selectedStudent)}</div>}</button>); 
                                  })}
                                </div>
                                {customHistoryDebits.length > 0 && (
                                  <div className="pt-4 border-t border-slate-100"><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Outstanding Items from Ledger</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {customHistoryDebits.map(debit => {
                                        const isSelected = selectedHistoryDebitIds.includes(debit.id);
                                        return (<button key={debit.id} type="button" onClick={() => setSelectedHistoryDebitIds(prev => isSelected ? prev.filter(id => id !== debit.id) : [...prev, debit.id])} className={`flex justify-between items-center p-3 rounded-xl border-2 transition-all ${isSelected ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-sm' : 'bg-white border-slate-100 text-slate-600 hover:border-amber-200'}`}><div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-slate-300'}`}>{isSelected && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}</div><div className="text-left"><p className="text-[10px] font-black leading-none uppercase">{debit.description}</p><p className="text-[8px] font-bold opacity-60 mt-1">{debit.date}</p></div></div><span className="font-black text-xs">₹{debit.amount.toLocaleString()}</span></button>);
                                      })}
                                    </div>
                                  </div>
                                )}
                                {getLegacyArrearsOutstanding(selectedStudent) > 0 && (<div className="pt-4 border-t border-slate-100"><div className="p-4 bg-red-50 rounded-2xl border border-red-200 flex items-center gap-4"><div className="relative"><input type="checkbox" id="force-arrears-chk" className="peer sr-only" checked={includeArrears} onChange={() => { if (selectedMonths.length > 0) { alert("Arrears must be cleared alongside or before current session dues."); return; } setIncludeArrears(!includeArrears); }} /><div className={`w-6 h-6 border-2 rounded-md bg-white transition-all flex items-center justify-center ${includeArrears ? 'bg-red-900 border-red-900' : 'border-red-300'}`}>{includeArrears && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}</div></div><label htmlFor="force-arrears-chk" className="flex-1 cursor-pointer"><span className="block text-sm font-black text-red-900 uppercase">Legacy Arrears Clearance</span><span className="block text-xs font-bold text-red-600">Outstanding: ₹{getLegacyArrearsOutstanding(selectedStudent).toLocaleString()}</span></label></div></div>)}
                              </div>
                            )}
                            {paymentType === 'partial' && (<div><label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Custom Amount</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span><input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 font-bold text-red-950 outline-none focus:ring-2 focus:ring-amber-500" placeholder="0.00" /></div></div>)}
                            {paymentType === 'full' && (
                              <div className="text-center py-6"><div className="text-4xl mb-4">{isDropped ? '🧾' : '🏆'}</div><h3 className="text-xl font-bold text-red-950 serif-font italic">{isDropped ? 'Account Settlement Package' : 'Annual Clearance Package'}</h3><p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">{isDropped ? 'Settle all outstanding pre-drop liabilities.' : `Pay for the entire ${currentSession} session now.`}</p>
                                {!isDropped && (<div className="flex justify-center items-center gap-4 mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100"><div className="flex flex-col items-start"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Waiver %</label><div className="relative"><input type="number" value={waiverPercentage} onChange={(e) => setWaiverPercentage(e.target.value)} className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-2 text-center font-black text-red-950 text-lg outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span></div></div></div>)}
                                {!isDropped && (<div className="mt-6 pt-4 border-t border-slate-100"><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Add Misc Kit (Optional)</label><div className="grid grid-cols-3 gap-2">{['tie', 'belt', 'idCard', 'diary', 'booklet'].map(item => { const cost = (getEffectiveConfig(selectedStudent.grade) as any)[item]; return (<label key={item} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${(miscSelection as any)[item] ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200'}`}><input type="checkbox" className="sr-only" checked={(miscSelection as any)[item]} onChange={() => setMiscSelection(prev => ({ ...prev, [item]: !(prev as any)[item] }))} /><span className="text-[10px] font-black uppercase">{item === 'idCard' ? 'ID Card' : item}</span><span className="text-xs font-bold">₹{cost}</span></label>)})}</div></div>)}
                                <div className="mt-6 bg-white p-5 rounded-2xl border border-slate-200 text-sm shadow-sm max-w-sm mx-auto text-left"><h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 border-b border-slate-100 pb-2">Liability Breakdown</h4>
                                  <div className="space-y-2.5">
                                    <div className="flex justify-between items-center text-red-700"><span className="font-medium text-xs">Accrued Tuition</span><span className="font-bold">₹{getRemainingTuition(selectedStudent).toLocaleString()}</span></div>
                                    {!isDropped && parseFloat(waiverPercentage) > 0 && <div className="flex justify-between items-center text-green-600"><span className="font-medium text-xs">Waiver ({waiverPercentage}%)</span><span className="font-bold">-₹{(getRemainingTuition(selectedStudent) * (parseFloat(waiverPercentage)||0)/100).toLocaleString()}</span></div>}
                                    {getNonTuitionOutstanding(selectedStudent) > 0 && <div className="flex justify-between items-center text-red-600"><span className="font-medium text-xs">Arrears / Prior Dues</span><span className="font-bold">+₹{getNonTuitionOutstanding(selectedStudent).toLocaleString()}</span></div>}
                                    {!isDropped && getUnpaidExamTotal(selectedStudent) > 0 && <div className="flex justify-between items-center text-red-700"><span className="font-medium text-xs">Accrued Exam Fees</span><span className="font-bold">+₹{getUnpaidExamTotal(selectedStudent).toLocaleString()}</span></div>}
                                    {!isDropped && getMiscTotal() > 0 && <div className="flex justify-between items-center text-red-700"><span className="font-medium text-xs">Misc Kit Items</span><span className="font-bold">+₹{getMiscTotal().toLocaleString()}</span></div>}
                                    {parseFloat(additionalDiscount) > 0 && <div className="flex justify-between items-center text-green-600"><span className="font-medium text-xs">Additional Discount</span><span className="font-bold">-₹{parseFloat(additionalDiscount).toLocaleString()}</span></div>}
                                    <div className="border-t border-dashed border-slate-300 pt-3 mt-1 flex justify-between items-center"><span className="font-black text-red-950 uppercase text-xs tracking-widest">Net Settlement</span><span className="font-black text-xl text-red-900">₹{calculateTotal().toLocaleString()}</span></div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {paymentType === 'monthly' && (
                              <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                                {!isDropped && (
                                  <><div><label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Add Exam Fee (Sequential)</label><div className="flex gap-2">{EXAM_TERMS.map(term => { const isPaid = selectedStudent.examFeeStatus?.[term] === 'Paid'; const isExempted = selectedStudent.examFeeStatus?.[term] === 'Exempted'; const termIdx = EXAM_TERMS.indexOf(term as any); let isTermSelectable = true; for (let i = 0; i < termIdx; i++) { if (selectedStudent.examFeeStatus[EXAM_TERMS[i]] === 'Unpaid') { isTermSelectable = false; break; } } return (<button key={term} type="button" disabled={isPaid || isExempted || !isTermSelectable} onClick={() => handleTermToggle(term)} className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${isPaid ? 'bg-slate-50 text-green-400 border-green-50' : isExempted ? 'bg-indigo-50 text-indigo-300 border-indigo-100' : selectedExamTerm === term ? 'bg-amber-600 text-white border-amber-600' : !isTermSelectable ? 'bg-white text-slate-200 border-slate-100' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300'}`}>{term} {isPaid ? 'Paid' : isExempted ? '(Exempt)' : ''}</button>); })}</div></div><div><label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Add Misc Kit (Optional)</label><div className="grid grid-cols-3 gap-2">{['tie', 'belt', 'idCard', 'diary', 'booklet'].map(item => { const cost = (getEffectiveConfig(selectedStudent.grade) as any)[item]; return (<label key={item} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${(miscSelection as any)[item] ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200'}`}><input type="checkbox" className="sr-only" checked={(miscSelection as any)[item]} onChange={() => setMiscSelection(prev => ({ ...prev, [item]: !(prev as any)[item] }))} /><span className="text-[10px] font-black uppercase">{item === 'idCard' ? 'ID Card' : item}</span><span className="text-xs font-bold">₹{cost}</span></label>)})}</div></div></>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="space-y-4"><div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm"><div className="flex items-center gap-3"><div className="relative"><input type="checkbox" id="other-branch-chk" className="peer sr-only" checked={isOtherBranch} onChange={(e) => setIsOtherBranch(e.target.checked)} /><div className="w-6 h-6 border-2 border-slate-300 rounded-md bg-white peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all flex items-center justify-center"><svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div></div><label htmlFor="other-branch-chk" className="text-sm font-bold text-slate-700 cursor-pointer">Paid in other branch</label></div></div><div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm"><div className="flex flex-col"><label className="text-xs font-black uppercase text-slate-400 tracking-widest">Adjustment Discount</label></div><input type="number" placeholder="0" className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-right font-bold text-red-900 outline-none focus:ring-2 focus:ring-amber-500" value={additionalDiscount} onChange={(e) => setAdditionalDiscount(e.target.value)} /></div></div>
                          <div><label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Payment Mode</label><div className="flex gap-3 mb-8">{['Cash', 'UPI', 'Bank Transfer'].map(m => <button key={m} type="button" onClick={() => setPaymentMode(m as any)} className={`flex-1 py-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest ${paymentMode === m ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-100 bg-white text-slate-400'}`}>{m}</button>)}</div><button type="submit" disabled={loading || calculateTotal() <= 0 || (getLegacyArrearsOutstanding(selectedStudent) > 0 && selectedMonths.length > 0 && !includeArrears)} className={`w-full text-white py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-xs shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${!isOtherBranch && !anticipatedReceipt ? 'bg-red-800' : isOtherBranch ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-950 hover:bg-red-900'}`}>{loading ? 'Processing Transaction...' : isOtherBranch ? `Log Branch Entry • ₹${calculateTotal().toLocaleString()}` : !anticipatedReceipt ? (<div className="flex items-center gap-2"><span>⚠️ NO RECEIPTS AVAILABLE</span></div>) : (getLegacyArrearsOutstanding(selectedStudent) > 0 && selectedMonths.length > 0 && !includeArrears) ? '⚠️ ARREARS MUST BE INCLUDED' : (<div><span>Confirm Payment • ₹{calculateTotal().toLocaleString()}</span><span className="block text-[8px] font-black opacity-60 tracking-widest mt-1">ISSUING RECEIPT: {anticipatedReceipt}</span></div>)}</button></div>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {/* Enhanced Branch Entry Modal repeated or similar footer components... */}
    </div>
  );
};

export default Dashboard;
