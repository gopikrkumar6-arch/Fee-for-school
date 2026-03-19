
import React, { useState, useMemo, useRef } from 'react';
import { FeeRecord, FeeCategory, PaymentMode, Transaction, Complaint, AcademicStatus } from '../types';
import { getStudentPhoto, formatDate, SCHOOL_INFO } from '../constants';
import MessagingTool from '../components/MessagingTool';
import printService from '../services/printService';

interface DirectoryProps {
  students: FeeRecord[];
  currentSession: string;
  feeStructure: FeeCategory[];
  onSelectStudent: (student: FeeRecord) => void;
  onUpdateStudents: (students: FeeRecord[]) => void;
  isReadOnly?: boolean;
}

type SortCriteria = 'name' | 'roll' | 'due' | 'id' | 'class' | 'mobile';
type SortOrder = 'asc' | 'desc';

interface SortState {
  key: SortCriteria;
  order: SortOrder;
}

const SESSION_MONTHS = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];

const Directory: React.FC<DirectoryProps> = ({
  students,
  currentSession,
  feeStructure,
  onSelectStudent,
  onUpdateStudents,
  isReadOnly = false
}) => {
  const [viewMode, setViewMode] = useState<'current' | 'archives'>('current');
  const [displayLayout, setDisplayLayout] = useState<'grid' | 'list' | 'compact'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [viewingStudent, setViewingStudent] = useState<FeeRecord | null>(null);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  const [statusDialog, setStatusDialog] = useState<{
    student: FeeRecord;
    targetStatus: AcademicStatus;
  } | null>(null);
  const [dialogData, setDialogData] = useState<any>({});

  const [messageTemplate, setMessageTemplate] = useState("Pranam! This is to inform you that {name} (Roll: {roll}) has an outstanding balance of ₹{due} for the month of {month}. Requesting {mother} or {father} to settle this at the earliest.");
  const [referenceMonth, setReferenceMonth] = useState('April');
  const [senderProfile, setSenderProfile] = useState({ name: 'Accounts Dept', phone: SCHOOL_INFO.phone });
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [sortStack, setSortStack] = useState<SortState[]>([
    { key: 'class', order: 'asc' },
    { key: 'roll', order: 'asc' },
    { key: 'name', order: 'asc' }
  ]);

  const [selectedArchiveBatch, setSelectedArchiveBatch] = useState<string | null>(null);
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');
  const [isAddAlumniOpen, setIsAddAlumniOpen] = useState(false);
  const [newAlumni, setNewAlumni] = useState({ session: '', name: '', fatherName: '', mobile: '', arrears: '', photo: '' });

  const [activeTab, setActiveTab] = useState<'profile' | 'ledger' | 'pay' | 'complaints'>('profile');
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [complaintForm, setComplaintForm] = useState<{
    date: string;
    category: Complaint['category'];
    description: string;
    status: Complaint['status'];
  }>({
    date: new Date().toISOString().split('T')[0],
    category: 'Behavioral',
    description: '',
    status: 'Pending'
  });

  const formatGradeDisplay = (grade: string) => grade.replace(/Class\s+/i, '');

  const getClassWeight = (cls: string) => {
    const c = cls.toLowerCase();
    if (c.includes('pre nursery')) return 1;
    if (c.includes('nursery')) return 2;
    if (c.includes('lkg')) return 3;
    if (c.includes('ukg')) return 4;
    const match = c.match(/\d+/);
    if (match) return parseInt(match[0]) + 10;
    if (c === 'passed') return 100;
    return 0;
  };

  const getPendingDues = (student: FeeRecord) => {
    return Math.max(0, student.arrearsMarch2025 - student.paidAmount);
  };

  const getNetDueCurrent = (student: FeeRecord) => {
    const totalDebits = student.history
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0);
    return Math.max(0, (student.arrearsMarch2025 + totalDebits) - student.paidAmount);
  };

  const currentStudents = useMemo(() =>
    students.filter(s => s.academicSession === currentSession && s.status !== 'PASSED' && s.grade !== 'PASSED'),
    [students, currentSession]
  );

  const availableClasses = useMemo(() =>
    ['All', ...feeStructure.flatMap(cat => cat.classes.map(cls => cls.name))],
    [feeStructure]
  );

  const filteredAndSortedList = useMemo(() => {
    let list = viewMode === 'current'
      ? currentStudents.filter(s => {
        const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGrade = selectedGrade === 'All' || s.grade === selectedGrade;
        return matchesSearch && matchesGrade;
      })
      : (archiveSearchTerm
        ? students.filter(s => (s.status === 'PASSED' || s.grade === 'PASSED') && (s.studentName.toLowerCase().includes(archiveSearchTerm.toLowerCase()) || s.id.toLowerCase().includes(archiveSearchTerm.toLowerCase())))
        : (students.filter(s => s.academicSession === selectedArchiveBatch && (s.status === 'PASSED' || s.grade === 'PASSED')))
      );

    return [...list].sort((a, b) => {
      for (const sort of sortStack) {
        let comparison = 0;
        const { key, order } = sort;
        if (key === 'class') comparison = getClassWeight(a.grade) - getClassWeight(b.grade);
        else if (key === 'name') comparison = a.studentName.localeCompare(b.studentName);
        else if (key === 'roll') comparison = (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0);
        else if (key === 'mobile') comparison = (a.mobileNumber || '').localeCompare(b.mobileNumber || '');
        else if (key === 'id') comparison = (a.admissionNo || a.id).localeCompare(b.admissionNo || b.id);
        else if (key === 'due') {
          const dueA = viewMode === 'current' ? getNetDueCurrent(a) : getPendingDues(a);
          const dueB = viewMode === 'current' ? getNetDueCurrent(b) : getPendingDues(b);
          comparison = dueA - dueB;
        }
        if (comparison !== 0) return order === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  }, [students, currentStudents, viewMode, searchTerm, archiveSearchTerm, selectedArchiveBatch, selectedGrade, sortStack]);

  const filteredMetrics = useMemo(() => {
    const count = filteredAndSortedList.length;
    const outstanding = filteredAndSortedList.reduce((acc, student) => {
      const due = viewMode === 'current' ? getNetDueCurrent(student) : getPendingDues(student);
      return acc + due;
    }, 0);
    return { count, outstanding };
  }, [filteredAndSortedList, viewMode]);

  const handleHeaderClick = (key: SortCriteria, event: React.MouseEvent) => {
    if (event.shiftKey) {
      setSortStack(prev => {
        const existingIndex = prev.findIndex(s => s.key === key);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], order: updated[existingIndex].order === 'asc' ? 'desc' : 'asc' };
          return updated;
        } else return [...prev, { key, order: 'asc' }];
      });
    } else {
      setSortStack(prev => {
        const existing = prev.find(s => s.key === key);
        if (prev.length === 1 && existing) return [{ key, order: existing.order === 'asc' ? 'desc' : 'asc' }];
        return [{ key, order: 'asc' }];
      });
    }
  };

  const getSortIcon = (key: SortCriteria) => {
    const sortIndex = sortStack.findIndex(s => s.key === key);
    if (sortIndex === -1) return <span className="opacity-20 ml-1 text-[10px]">⇅</span>;
    const sort = sortStack[sortIndex];
    return (
      <span className="ml-1 inline-flex items-center gap-0.5">
        <span className="text-red-900 font-black text-xs">{sort.order === 'asc' ? '↑' : '↓'}</span>
        {sortStack.length > 1 && <span className="bg-red-950 text-white text-[8px] px-1 rounded-full leading-none py-0.5 min-w-[12px] text-center font-bold">{sortIndex + 1}</span>}
      </span>
    );
  };

  const handleDownloadFilteredList = () => {
    if (filteredAndSortedList.length === 0) {
      alert("Filtered list is empty. Nothing to export.");
      return;
    }

    const headers = [
      "Student Name", "UID", "Class", "Section", "Roll No",
      "Father Name", "Mother Name", "Mobile Number", "Total Dues (INR)"
    ];

    const rows = filteredAndSortedList.map(s => {
      const due = viewMode === 'current' ? getNetDueCurrent(s) : getPendingDues(s);
      return [
        `"${s.studentName}"`,
        `"${s.admissionNo || s.id}"`,
        `"${s.grade}"`,
        `"${s.section}"`,
        `"${s.rollNo}"`,
        `"${s.fatherName}"`,
        `"${s.motherName}"`,
        `"${s.mobileNumber || ''}"`,
        due
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `UES_Student_List_${viewMode}_${selectedGrade}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChange = (student: FeeRecord, status: AcademicStatus) => {
    if (isReadOnly) {
      alert("This session is locked (Read-Only). Lifecycle updates are disabled.");
      return;
    }
    if (status === 'Active') {
      if (student.academicStatus !== 'Active' && student.academicStatus) {
        setDialogData({ from: 'APR' });
        setStatusDialog({ student, targetStatus: 'Active' });
      } else {
        updateStudentStatus(student, 'Active', { leaveFrom: undefined, leaveTo: undefined, dropMonth: undefined, transferMonth: undefined, oldClass: undefined, activeFrom: undefined });
      }
    } else if (status === 'Inactive') {
      setDialogData({ from: 'APR', to: 'JUN' });
      setStatusDialog({ student, targetStatus: 'Inactive' });
    } else if (status === 'Dropped') {
      setDialogData({ from: 'APR' });
      setStatusDialog({ student, targetStatus: 'Dropped' });
    } else if (status === 'Transfer') {
      setDialogData({
        from: 'APR',
        targetClass: student.grade,
        targetRoll: student.rollNo
      });
      setStatusDialog({ student, targetStatus: 'Transfer' });
    } else if (status === 'Promoted') {
      const confirmed = window.confirm(`Promote ${student.studentName} to the next grade? This usually happens at session end.`);
      if (confirmed) updateStudentStatus(student, 'Promoted', {});
    }
  };

  const updateStudentStatus = (student: FeeRecord, status: AcademicStatus, metadata: any) => {
    let finalMetadata = { ...student.statusMetadata, ...metadata };

    if (status === 'Dropped') {
      finalMetadata.dropMonth = metadata.from;
      finalMetadata.activeFrom = undefined;
    } else if (status === 'Inactive') {
      finalMetadata.leaveFrom = metadata.from;
      finalMetadata.leaveTo = metadata.to;
      finalMetadata.activeFrom = undefined;
    } else if (status === 'Transfer') {
      finalMetadata.transferMonth = metadata.from;
      finalMetadata.activeFrom = undefined;
    } else if (status === 'Active') {
      finalMetadata.activeFrom = metadata.from;
    }

    let updatedStudent: FeeRecord = {
      ...student,
      academicStatus: status,
      statusMetadata: finalMetadata
    };

    let logMessage = `Lifecycle Update: ${status}`;

    if (status === 'Transfer') {
      const oldClass = student.grade;
      const oldRoll = student.rollNo;
      const newClass = metadata.targetClass || oldClass;
      const newRoll = metadata.targetRoll || oldRoll;

      updatedStudent.grade = newClass;
      updatedStudent.rollNo = newRoll;
      updatedStudent.statusMetadata = {
        ...updatedStudent.statusMetadata,
        oldClass,
        oldRoll,
        transferMonth: metadata.from
      };

      for (const cat of feeStructure) {
        const matched = cat.classes.find(c => c.name === newClass);
        if (matched) {
          updatedStudent.monthlyFee = matched.tuition;
          updatedStudent.cashDiscount = matched.cashDiscount || 0;
          updatedStudent.totalAnnualFee = matched.tuition * 12;
          break;
        }
      }
      logMessage += ` (${oldClass} R:${oldRoll} → ${newClass} R:${newRoll}) from ${metadata.from}`;
    } else if (status === 'Dropped') {
      logMessage += ` starting from ${metadata.from}`;
    } else if (status === 'Active' && metadata.from) {
      logMessage += ` reactivated from ${metadata.from}`;
    }

    const logEntry: Transaction = {
      id: `LOG-STS-${Date.now()}`,
      receiptId: '-',
      date: formatDate(new Date()),
      description: logMessage,
      amount: 0,
      type: 'Debit',
      mode: 'Demand'
    };
    updatedStudent.history = [logEntry, ...updatedStudent.history];

    onUpdateStudents(students.map(s => s.id === student.id ? updatedStudent : s));
    setStatusDialog(null);

    if (status === 'Transfer') {
      alert(`Student ${student.studentName} has been transferred to ${updatedStudent.grade} (Roll: ${updatedStudent.rollNo}). Fees will update from ${metadata.from}.`);
    } else if (status === 'Dropped') {
      alert(`Student ${student.studentName} is now marked as DROPPED starting ${metadata.from}. Future payments blocked.`);
    } else if (status === 'Active' && metadata.from) {
      alert(`Student ${student.studentName} is now ACTIVE again starting ${metadata.from}.`);
    }
  };

  const handleQuickSend = (e: React.MouseEvent, student: FeeRecord) => {
    e.stopPropagation();
    if (sendingId) return;
    setSendingId(student.id);
    const netDue = getNetDueCurrent(student);
    const targetNo = student.whatsappNumber || student.mobileNumber || 'N/A';
    const parsed = messageTemplate
      .replace(/{name}/g, student.studentName)
      .replace(/{id}/g, student.id)
      .replace(/{grade}/g, student.grade)
      .replace(/{roll}/g, student.rollNo || 'N/A')
      .replace(/{due}/g, netDue.toLocaleString())
      .replace(/{father}/g, student.fatherName || 'Guardian')
      .replace(/{mother}/g, student.motherName || 'Guardian')
      .replace(/{month}/g, referenceMonth);

    setTimeout(() => {
      setSendingId(null);
      alert(`Dispatched from ${senderProfile.name} to ${student.studentName}'s WhatsApp (${targetNo})`);
    }, 1500);
  };

  const alumniBySession = useMemo(() => {
    const groups: Record<string, FeeRecord[]> = {};
    students.filter(s => s.status === 'PASSED' || s.grade === 'PASSED').forEach(s => {
      if (!groups[s.academicSession]) groups[s.academicSession] = [];
      groups[s.academicSession].push(s);
    });
    return groups;
  }, [students]);

  const getBatchYear = (session: string) => {
    return session.split('-')[1] || session;
  };

  const availableArchiveBatches = useMemo(() => {
    const startYear = 2013;
    const currentYearVal = parseInt(currentSession.split('-')[0]);
    const sessions = new Set<string>();
    Object.keys(alumniBySession).forEach(s => sessions.add(s));
    for (let y = startYear; y < currentYearVal; y++) sessions.add(`${y}-${(y + 1).toString().slice(-2)}`);
    return Array.from(sessions).sort().reverse();
  }, [alumniBySession, currentSession]);

  const getBatchStats = (session: string) => {
    const list = alumniBySession[session] || [];
    const totalDues = list.reduce((sum, s) => sum + getPendingDues(s), 0);
    const totalCollected = list.reduce((sum, s) => sum + s.paidAmount, 0);
    return { count: list.length, totalDues, totalCollected };
  };

  const modalSiblings = useMemo(() => {
    if (!viewingStudent) return [];
    const excluded = viewingStudent.excludedSiblings || [];
    const autoDetected = students.filter(s => {
      if (s.id === viewingStudent.id || excluded.includes(s.id)) return false;
      const sFather = s.fatherName?.trim().toLowerCase();
      const currentFather = viewingStudent.fatherName?.trim().toLowerCase();
      const sMother = s.motherName?.trim().toLowerCase();
      const currentMother = viewingStudent.motherName?.trim().toLowerCase();
      const sMobile = s.mobileNumber?.trim();
      const currentMobile = viewingStudent.mobileNumber?.trim();
      if (!currentFather && !currentMother && !currentMobile) return false;
      return (currentFather && sFather === currentFather) ||
        (currentMother && sMother === currentMother) ||
        (currentMobile && sMobile === currentMobile);
    });
    const manualIDs = (viewingStudent.siblings || []).filter(id => !excluded.includes(id));
    const manualSiblings = students.filter(s => manualIDs.includes(s.id));
    const combined = [...autoDetected, ...manualSiblings];
    return Array.from(new Map(combined.map(item => [item.id, item])).values());
  }, [viewingStudent, students]);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const payment = parseFloat(payAmount) || 0;
    const discount = parseFloat(discountAmount) || 0;
    if (!viewingStudent || (payment <= 0 && discount <= 0)) return;
    setIsProcessing(true);
    setTimeout(() => {
      const newTransactions: Transaction[] = [];
      if (discount > 0) newTransactions.push({ id: `WVR-ALM-${Date.now()}`, receiptId: '-', date: formatDate(new Date()), description: 'Alumni Settlement Waiver', amount: discount, type: 'Credit', mode: 'Waiver' });
      if (payment > 0) newTransactions.push({ id: `TXN-ALM-${Date.now()}`, receiptId: `ALM-RCPT-${Math.floor(Math.random() * 9000) + 1000}`, date: formatDate(new Date()), description: 'Arrears Clearance (Alumni)', amount: payment, type: 'Credit', mode: payMode });
      const updatedStudent = { ...viewingStudent, paidAmount: viewingStudent.paidAmount + payment + discount, history: [...newTransactions, ...viewingStudent.history] };
      onUpdateStudents(students.map(s => s.id === viewingStudent.id ? updatedStudent : s));
      setViewingStudent(updatedStudent);
      setIsProcessing(false);
      setActiveTab('ledger');
      setPayAmount('');
      setDiscountAmount('');
    }, 1200);
  };

  const handleAddAlumni = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlumni.name || !newAlumni.session) return;
    const newRecord: FeeRecord = {
      id: `ALM-${Date.now()}`, academicSession: newAlumni.session, studentName: newAlumni.name, fatherName: newAlumni.fatherName || 'N/A', motherName: 'N/A', grade: 'PASSED', section: 'N/A', rollNo: 'N/A', mobileNumber: newAlumni.mobile, admissionNo: `LEGACY-${Math.floor(Math.random() * 10000)}`, monthlyFee: 0, cashDiscount: 0, totalAnnualFee: 0, paidAmount: 0, dueDate: '-', status: 'PASSED', category: 'Tuition', arrearsMarch2025: parseFloat(newAlumni.arrears) || 0, monthlyStatus: {}, examFeeStatus: { 'Term 1': 'Unpaid', 'Term 2': 'Unpaid', 'Term 3': 'Unpaid' }, history: [], siblings: [], photo: newAlumni.photo
    };
    onUpdateStudents([...students, newRecord]);
    setIsAddAlumniOpen(false);
    setNewAlumni({ session: '', name: '', fatherName: '', mobile: '', arrears: '', photo: '' });
  };

  const handleAddComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingStudent || !complaintForm.description) return;
    const newComplaint: Complaint = { id: `CMP-${Date.now()}`, date: formatDate(new Date(complaintForm.date)), category: complaintForm.category, description: complaintForm.description, status: complaintForm.status };
    const updatedStudent = { ...viewingStudent, complaints: [...(viewingStudent.complaints || []), newComplaint] };
    onUpdateStudents(students.map(s => s.id === viewingStudent.id ? updatedStudent : s));
    setViewingStudent(updatedStudent);
    setComplaintForm({ date: new Date().toISOString().split('T')[0], category: 'Behavioral', description: '', status: 'Pending' });
  };

  const getChronologicalHistory = (student: FeeRecord) => {
    let balance = student.arrearsMarch2025;
    return [...student.history].reverse().map(txn => {
      if (txn.type === 'Debit') balance += txn.amount;
      else if (txn.type === 'Credit') balance -= txn.amount;
      return { ...txn, runningBalance: balance };
    });
  };

  const activeHeaderSearchTerm = viewMode === 'current' ? searchTerm : archiveSearchTerm;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      <style>{`@media print { .no-print, nav, footer, button { display: none !important; } }`}</style>

      {statusDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-red-950/40 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-red-950 serif-font italic mb-2">Adjust Academic Lifecycle</h3>
            <p className="text-slate-500 text-sm mb-6">Configuring <strong>{statusDialog.targetStatus}</strong> status for {statusDialog.student.studentName}.</p>

            <div className="space-y-4">
              {statusDialog.targetStatus === 'Inactive' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">From Month</label>
                    <select value={dialogData.from} onChange={e => setDialogData({ ...dialogData, from: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold">
                      {SESSION_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">To Month</label>
                    <select value={dialogData.to} onChange={e => setDialogData({ ...dialogData, to: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold">
                      {SESSION_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {statusDialog.targetStatus === 'Transfer' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Target Class</label>
                    <select
                      value={dialogData.targetClass || statusDialog.student.grade}
                      onChange={e => setDialogData({ ...dialogData, targetClass: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
                    >
                      {availableClasses.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Target Roll No</label>
                    <input
                      type="text"
                      value={dialogData.targetRoll || ''}
                      onChange={e => setDialogData({ ...dialogData, targetRoll: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
                      placeholder="Enter New Roll No"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Effective Transfer Month</label>
                    <select value={dialogData.from} onChange={e => setDialogData({ ...dialogData, from: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold">
                      {SESSION_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <p className="text-[9px] text-red-900 mt-2 italic font-bold">Dynamic Pricing: New class fees will apply automatically from this month onwards.</p>
                  </div>
                </div>
              )}

              {statusDialog.targetStatus === 'Dropped' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Starting Month (Dropped From)</label>
                  <select value={dialogData.from} onChange={e => setDialogData({ ...dialogData, from: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold">
                    {SESSION_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <p className="text-[9px] text-red-500 mt-2 font-bold italic">Note: All tuition and exam fee demands will be blocked from this month onwards.</p>
                </div>
              )}

              {statusDialog.targetStatus === 'Active' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Effective Reactivation Month</label>
                  <select value={dialogData.from} onChange={e => setDialogData({ ...dialogData, from: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold">
                    {SESSION_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <p className="text-[9px] text-green-700 mt-2 font-bold italic">Standard class billing and exam demands will resume from this month.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStatusDialog(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
              <button onClick={() => updateStudentStatus(statusDialog.student, statusDialog.targetStatus, dialogData)} className="flex-1 py-3 bg-red-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-900 transition-all">Apply Change</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-red-950 text-white pt-16 pb-24 px-4 relative overflow-hidden no-print">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-black serif-font italic mb-4">Master Directory</h1>
          <div className="flex justify-center mb-10">
            <div className="flex bg-white/10 p-1.5 rounded-full border border-white/20 backdrop-blur-md">
              <button onClick={() => { setViewMode('current'); setSelectedArchiveBatch(null); }} className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'current' ? 'bg-white text-red-950 shadow-xl' : 'text-white hover:bg-white/10'}`}>Active Ledger</button>
              <button onClick={() => setViewMode('archives')} className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'archives' ? 'bg-white text-red-950 shadow-xl' : 'text-white hover:bg-white/10'}`}>Legacy Archives</button>
            </div>
          </div>
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
              <input
                type="text"
                placeholder={viewMode === 'current' ? "Search Active Students..." : "Global Alumni Search across all batches..."}
                value={viewMode === 'current' ? searchTerm : archiveSearchTerm}
                onChange={(e) => viewMode === 'current' ? setSearchTerm(e.target.value) : setArchiveSearchTerm(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl py-6 pl-16 pr-14 text-xl font-bold placeholder:text-white/30 focus:outline-none focus:bg-white focus:text-red-950 transition-all shadow-2xl"
              />
              {activeHeaderSearchTerm && (
                <button
                  onClick={() => viewMode === 'current' ? setSearchTerm('') : setArchiveSearchTerm('')}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-red-950/20 hover:bg-red-950/40 text-white transition-all"
                  title="Clear Search"
                >
                  <span className="text-xl font-black leading-none">×</span>
                </button>
              )}
            </div>
            <button onClick={() => setIsMessagingOpen(true)} className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-amber-500 hover:border-amber-400 transition-all shadow-xl relative group active:scale-95 shrink-0" title="Configure Message Template"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg><span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-50 rounded-full border-2 border-red-950 animate-pulse"></span></button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-20">
        {/* Dynamic Summary Bar */}
        {(viewMode === 'current' || archiveSearchTerm || selectedArchiveBatch) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 no-print">
            <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-200 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Filtered Students</p>
              <p className="text-2xl font-black text-red-950">{filteredMetrics.count}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-200 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Group Outstanding</p>
              <p className={`text-2xl font-black ${filteredMetrics.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{filteredMetrics.outstanding.toLocaleString()}
              </p>
            </div>
            <div className="col-span-2 flex items-center justify-end gap-1">
              <button onClick={handleDownloadFilteredList} className="p-3 rounded-2xl bg-white text-slate-400 hover:text-green-600 border border-slate-100 hover:border-green-200 transition-all shadow-sm mr-2 group" title="Download Filtered Data (CSV)">
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button onClick={() => setDisplayLayout('grid')} className={`p-3 rounded-2xl transition-all ${displayLayout === 'grid' ? 'bg-red-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100'}`} title="Grid View"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg></button>
              <button onClick={() => setDisplayLayout('list')} className={`p-3 rounded-2xl transition-all ${displayLayout === 'list' ? 'bg-red-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100'}`} title="List View (Sortable)"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
              <button onClick={() => setDisplayLayout('compact')} className={`p-3 rounded-2xl transition-all ${displayLayout === 'compact' ? 'bg-red-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100'}`} title="Compact View"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
            </div>
          </div>
        )}

        {viewMode === 'current' && (
          <div className="flex items-center gap-3 overflow-x-auto pb-8 no-scrollbar custom-scrollbar no-print w-full">
            {availableClasses.map(grade => (
              <button key={grade} onClick={() => setSelectedGrade(grade)} className={`shrink-0 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border-2 ${selectedGrade === grade ? 'bg-red-900 border-red-800 text-white shadow-[0_0_25px_rgba(127,29,29,0.4)] scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200 hover:text-red-900'}`}>{formatGradeDisplay(grade)}</button>
            ))}
          </div>
        )}

        {viewMode === 'archives' && !archiveSearchTerm && !selectedArchiveBatch && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6">
            {availableArchiveBatches.map(session => {
              const stats = getBatchStats(session);
              return (
                <button key={session} onClick={() => setSelectedArchiveBatch(session)} className="bg-white rounded-[2.5rem] p-8 shadow-xl border-2 border-transparent hover:border-amber-500 transition-all text-left relative overflow-hidden group"><div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full translate-x-1/2 -translate-y-1/2 opacity-20"></div><div className="relative z-10"><div className="flex justify-between items-start mb-4"><span className="text-3xl group-hover:scale-110 transition-transform">🎓</span><div className="px-3 py-1 bg-red-50 text-red-900 text-[10px] font-black uppercase rounded-full">Batch {getBatchYear(session)}</div></div><h3 className="text-2xl font-black text-slate-800 mb-1">Session {session}</h3><p className="text-xs font-bold text-slate-400 mb-8">{stats.count} Passed Records</p><div className="border-t border-slate-50 pt-4 flex justify-between items-center"><div><p className="text-[9px] font-black text-slate-400 uppercase">Outstanding</p><p className={`font-black ${stats.totalDues > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{stats.totalDues.toLocaleString()}</p></div><div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Collected</p><p className="font-black text-green-700">₹{stats.totalCollected.toLocaleString()}</p></div></div></div></button>
              );
            })}
            <button onClick={() => setIsAddAlumniOpen(true)} className="bg-red-50 rounded-[2.5rem] p-8 border-2 border-dashed border-red-200 flex flex-col items-center justify-center text-center hover:bg-red-100 transition-all group"><span className="text-4xl mb-4 group-hover:scale-110 transition-transform">➕</span><h3 className="font-black text-red-900 uppercase text-sm">Register Legacy Alumni</h3><p className="text-xs text-red-600/60 mt-1">Add manual archives</p></button>
          </div>
        )}

        {(viewMode === 'current' || archiveSearchTerm || selectedArchiveBatch) && (
          <div className="space-y-6">
            {(archiveSearchTerm || selectedArchiveBatch) && !isAddAlumniOpen && (
              <div className="flex justify-between items-center mb-4 no-print relative">
                <button onClick={() => { setSelectedArchiveBatch(null); setArchiveSearchTerm(''); }} className="group flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-md border border-slate-200 rounded-full shadow-lg hover:bg-white transition-all active:scale-90" title="Back to Batches"><svg className="w-6 h-6 text-red-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg></button>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">{selectedArchiveBatch ? `Archive Batch ${getBatchYear(selectedArchiveBatch)}` : 'Global Search Results'}</p>
              </div>
            )}

            {filteredAndSortedList.length > 0 ? (
              displayLayout === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                  {filteredAndSortedList.map(student => {
                    const due = student.status === 'PASSED' ? getPendingDues(student) : getNetDueCurrent(student);
                    const isDropped = student.academicStatus === 'Dropped';
                    const isTransfer = student.academicStatus === 'Transfer';
                    return (
                      <div key={student.id} className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 group hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col items-center text-center relative overflow-hidden" onClick={() => { setViewingStudent(student); setActiveTab('profile'); }}><div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="relative mb-6"><div className={`w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-slate-100 ${isDropped ? 'grayscale' : ''}`}><img src={getStudentPhoto(student.photo, student.studentName)} className="w-full h-full object-cover transition-all duration-500" alt={student.studentName} /></div><div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-lg ${isDropped ? 'bg-red-700' : isTransfer ? 'bg-blue-600' : due === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div></div><h3 className="text-xl font-bold text-red-950 serif-font italic leading-tight mb-1 truncate w-full px-2">{student.studentName}</h3><div className="flex flex-wrap justify-center gap-2 mb-6"><span className="px-3 py-1 bg-red-50 text-red-900 text-[10px] font-black rounded-lg border border-red-100">{student.grade === 'PASSED' ? student.academicSession : formatGradeDisplay(student.grade)}</span>{student.grade !== 'PASSED' && <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-100">Roll: {student.rollNo}</span>}{isDropped && <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded-lg shadow-sm">DROPPED</span>}{isTransfer && <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase rounded-lg shadow-sm">TRANSFERRED</span>}</div><div className="w-full pt-4 border-t border-slate-50 flex justify-between items-center mt-auto"><div className="text-left"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance Dues</p><p className={`text-sm font-black ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>{due > 0 ? `₹${due.toLocaleString()}` : 'Settled'}</p></div><div className="text-right text-[9px] font-black text-slate-300 uppercase">{isDropped ? 'EXITED' : student.grade === 'PASSED' ? 'ALUMNI' : 'CURRENT'}</div></div></div>
                    );
                  })}
                </div>
              ) : displayLayout === 'list' ? (
                <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-200 animate-in fade-in duration-500">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-red-950 transition-colors select-none" onClick={(e) => handleHeaderClick('class', e)}>Class Info {getSortIcon('class')}</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-red-950 transition-colors select-none" onClick={(e) => handleHeaderClick('roll', e)}>Roll No {getSortIcon('roll')}</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-red-950 transition-colors select-none" onClick={(e) => handleHeaderClick('name', e)}>Student Identity {getSortIcon('name')}</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-red-950 transition-colors select-none" onClick={(e) => handleHeaderClick('mobile', e)}>Mobile Number {getSortIcon('mobile')}</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer hover:text-red-950 transition-colors select-none" onClick={(e) => handleHeaderClick('due', e)}>Outstanding {getSortIcon('due')}</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">Academic Action</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">Notify</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAndSortedList.map(student => {
                          const due = student.status === 'PASSED' ? getPendingDues(student) : getNetDueCurrent(student);
                          const isSending = sendingId === student.id;
                          const acadStatus = student.academicStatus || 'Active';
                          return (
                            <tr key={student.id} className="hover:bg-amber-50/30 transition-colors group cursor-pointer" onClick={() => { setViewingStudent(student); setActiveTab('profile'); }}>
                              <td className="px-6 py-4"><div className="text-sm font-bold text-slate-700">{student.grade === 'PASSED' ? student.academicSession : formatGradeDisplay(student.grade)}</div><div className="text-[10px] text-slate-400 font-medium">Section: {student.section}</div></td>
                              <td className="px-6 py-4"><div className="text-sm font-black text-slate-700">{student.rollNo}</div></td>
                              <td className="px-6 py-4"><div className="flex items-center gap-4"><img src={getStudentPhoto(student.photo, student.studentName)} className={`w-10 h-10 rounded-full object-cover border border-slate-200 ${acadStatus === 'Dropped' ? 'grayscale opacity-50' : ''}`} alt="" /><div><div className={`font-bold ${acadStatus === 'Dropped' ? 'text-slate-400 line-through' : 'text-red-950'}`}>{student.studentName}</div>{acadStatus === 'Dropped' && <div className="text-[8px] font-black text-red-600 uppercase">DROPPED • From {student.statusMetadata?.dropMonth}</div>}{acadStatus === 'Transfer' && <div className="text-[8px] font-black text-blue-600 uppercase">TRANSFERRED • From {student.statusMetadata?.transferMonth}</div>}</div></div></td>
                              <td className="px-6 py-4"><div className="text-sm font-bold text-slate-700">{student.mobileNumber || '-'}</div><div className="text-[9px] text-slate-400 font-medium uppercase">{student.whatsappNumber ? 'WhatsApp Linked' : ''}</div></td>
                              <td className="px-6 py-4 text-right"><div className={`font-black ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{due.toLocaleString()}</div></td>
                              <td className="px-6 py-4 text-center no-print">
                                <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                                  <select
                                    disabled={isReadOnly}
                                    value={acadStatus}
                                    onChange={(e) => handleStatusChange(student, e.target.value as AcademicStatus)}
                                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all outline-none appearance-none pr-8 ${acadStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                                      acadStatus === 'Inactive' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        acadStatus === 'Dropped' ? 'bg-red-50 text-red-700 border-red-200' :
                                          acadStatus === 'Promoted' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                      } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Dropped">Dropped</option>
                                    <option value="Promoted">Promoted</option>
                                    <option value="Transfer">Transfer</option>
                                  </select>
                                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-40">▼</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {student.grade !== 'PASSED' && acadStatus !== 'Dropped' && (
                                  <button onClick={(e) => handleQuickSend(e, student)} disabled={!!sendingId} className={`p-2.5 rounded-xl border transition-all active:scale-90 disabled:opacity-30 ${isSending ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-400 hover:border-red-900 hover:text-red-900 shadow-sm'}`}>
                                    {isSending ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {filteredAndSortedList.map(student => {
                    const due = student.status === 'PASSED' ? getPendingDues(student) : getNetDueCurrent(student);
                    const isDropped = student.academicStatus === 'Dropped';
                    const isTransfer = student.academicStatus === 'Transfer';
                    return (
                      <div key={student.id} className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-4 hover:border-red-950 hover:shadow-md transition-all cursor-pointer group ${isDropped ? 'opacity-80' : ''}`} onClick={() => { setViewingStudent(student); setActiveTab('profile'); }}><img src={getStudentPhoto(student.photo, student.studentName)} className={`w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100 ${isDropped ? 'grayscale' : ''}`} alt="" /><div className="flex-1 min-w-0"><div className={`font-bold truncate text-sm ${isDropped ? 'text-slate-500 line-through' : 'text-red-950'}`}>{student.studentName}</div><div className="text-[9px] font-black uppercase text-slate-400">{formatGradeDisplay(student.grade)} • Roll {student.rollNo}{isDropped && <span className="text-red-600 ml-1"> • DROPPED</span>}{isTransfer && <span className="text-blue-600 ml-1"> • TRANSFERRED</span>}</div></div><div className="text-right shrink-0"><div className={`text-xs font-black ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{due.toLocaleString()}</div><div className="text-[8px] font-bold text-slate-300 uppercase">Balance</div></div></div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center"><div className="text-8xl mb-6 opacity-10">📂</div><h3 className="text-2xl font-bold text-slate-400">No Records Found</h3><p className="text-slate-400 text-sm mt-2 italic">Refine filters or switch between Active and Archive modes.</p></div>
            )}
          </div>
        )}
      </div>

      {viewingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/40 backdrop-blur-md p-4 animate-in fade-in no-print" onClick={() => setViewingStudent(null)}>
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-5xl w-full flex flex-col md:flex-row overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingStudent(null)} className="absolute top-6 left-6 z-[110] group flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full shadow-lg hover:bg-white transition-all active:scale-90 md:bg-white/10" title="Close Dossier"><svg className="w-6 h-6 text-red-950 md:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg></button>
            <div className="md:w-1/3 bg-red-950 p-10 text-white flex flex-col items-center text-center relative overflow-y-auto max-h-screen">
              <div className="relative mb-8 mt-8"><div className={`w-40 h-40 rounded-full border-8 border-white/10 shadow-2xl overflow-hidden bg-slate-800 ${viewingStudent.academicStatus === 'Dropped' ? 'grayscale' : ''}`} onClick={() => setFullScreenPhoto(getStudentPhoto(viewingStudent.photo, viewingStudent.studentName))}><img src={getStudentPhoto(viewingStudent.photo, viewingStudent.studentName)} className="w-full h-full object-cover cursor-pointer" alt="" /></div></div>
              <h2 className="text-3xl font-black serif-font italic mb-2">{viewingStudent.studentName}</h2>
              <div className="mb-6">
                {viewingStudent.academicStatus === 'Dropped' && <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">DROPPED RECORD</span>}
                {viewingStudent.academicStatus === 'Transfer' && <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">TRANSFER RECORD</span>}
              </div>
              <p className="text-red-200/60 text-xs font-black uppercase tracking-widest mb-10">UID: {viewingStudent.uidNo || viewingStudent.id}</p>
              <div className="w-full space-y-4 mb-10">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5"><p className="text-[10px] font-black uppercase text-red-300">Admission No</p><p className="text-lg font-bold">{viewingStudent.admissionNo || 'N/A'}</p></div>
                {viewingStudent.grade === 'PASSED' ? (<div className="bg-white/10 p-4 rounded-2xl border border-white/5"><p className="text-[10px] font-black uppercase text-amber-500">Graduation Batch</p><p className="text-lg font-bold">Class of {getBatchYear(viewingStudent.academicSession)}</p></div>) : (<><div className="bg-white/10 p-4 rounded-2xl border border-white/5"><p className="text-[10px] font-black uppercase text-red-300">Grade & Sec</p><p className="text-lg font-bold">{formatGradeDisplay(viewingStudent.grade)}-{viewingStudent.section}</p></div><div className="bg-white/10 p-4 rounded-2xl border border-white/5"><p className="text-[10px] font-black uppercase text-red-300">Roll No</p><p className="text-lg font-bold">{viewingStudent.rollNo}</p></div></>)}
              </div>
              <div className="mt-auto pt-8 flex flex-col w-full gap-3"><button onClick={() => printService.safePrint()} className="w-full py-4 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 font-bold text-xs uppercase tracking-widest transition-all">Print Dossier</button>{viewingStudent.grade !== 'PASSED' && (<button onClick={() => { setViewingStudent(null); onSelectStudent(viewingStudent); }} className="w-full py-4 rounded-xl bg-amber-600 text-white hover:bg-amber-500 font-bold text-xs uppercase tracking-widest shadow-lg transition-all">Go to Ledger Portal</button>)}</div>
            </div>
            <div className="flex-1 bg-white flex flex-col">
              <div className="flex border-b border-slate-100 bg-slate-50"><button onClick={() => setActiveTab('profile')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white text-red-900 border-b-2 border-red-900' : 'text-slate-400 hover:text-slate-600'}`}>Identity Profile</button>{viewingStudent.grade === 'PASSED' ? (<><button onClick={() => setActiveTab('ledger')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-white text-red-900 border-b-2 border-red-900' : 'text-slate-400 hover:text-slate-600'}`}>Legacy Ledger</button><button onClick={() => setActiveTab('complaints')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'complaints' ? 'bg-white text-red-900 border-b-2 border-red-900' : 'text-slate-400 hover:text-slate-600'}`}>Conduct Registry</button><button onClick={() => setActiveTab('pay')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pay' ? 'bg-white text-red-900 border-b-2 border-red-900' : 'text-slate-400 hover:text-slate-600'}`}>Settle Dues</button></>) : (<><button onClick={() => setActiveTab('ledger')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-white text-red-900 border-b-2 border-red-900' : 'text-slate-400 hover:text-slate-600'}`}>Academic Ledger</button><button onClick={() => setActiveTab('complaints')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'complaints' ? 'bg-white text-red-900 border-b-2 border-red-900' : 'text-slate-400 hover:text-slate-600'}`}>Conduct Registry</button></>)}</div>
              <div className="p-10 overflow-y-auto custom-scrollbar flex-1 max-h-[75vh]">
                {activeTab === 'profile' && (
                  <div className="space-y-12">
                    {viewingStudent.academicStatus === 'Dropped' && (
                      <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-2xl flex items-center gap-4">
                        <span className="text-3xl">⚠️</span>
                        <div>
                          <h4 className="font-black text-red-900 uppercase text-xs">Exited Student Record</h4>
                          <p className="text-xs text-red-700 mt-1 font-medium">This student was marked as DROPPED on {viewingStudent.statusMetadata?.dropMonth}. Billing and payments are restricted.</p>
                        </div>
                      </div>
                    )}
                    {viewingStudent.academicStatus === 'Transfer' && (
                      <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-2xl flex items-center gap-4">
                        <span className="text-3xl">🔄</span>
                        <div>
                          <h4 className="font-black text-blue-900 uppercase text-xs">Transfer Record Active</h4>
                          <p className="text-xs text-blue-700 mt-1 font-medium">Student transferred from {viewingStudent.statusMetadata?.oldClass} to {viewingStudent.grade} effective from {viewingStudent.statusMetadata?.transferMonth}.</p>
                        </div>
                      </div>
                    )}
                    <section>
                      <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-[0.3em] mb-6">Security & Government Identifiers</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">PEN No</p><p className="text-sm font-bold text-slate-700">{viewingStudent.penNo || 'N/A'}</p></div>
                        <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Aadhar Card</p><p className="text-sm font-bold text-slate-700">{viewingStudent.aadharCard || 'N/A'}</p></div>
                        <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">APAAR ID</p><p className="text-sm font-bold text-slate-700">{viewingStudent.apaarId || 'N/A'}</p></div>
                      </div>
                    </section>
                    <section>
                      <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-[0.3em] mb-6">Guardian & Reachability</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-6"><div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Father's Name</p><p className="text-base font-bold text-slate-700">{viewingStudent.fatherName}</p></div><div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Mother's Name</p><p className="text-base font-bold text-slate-700">{viewingStudent.motherName}</p></div><div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Date of Birth</p><p className="text-base font-bold text-slate-700">{viewingStudent.dob || 'Not Disclosed'}</p></div></div><div className="space-y-6"><div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Primary Mobile</p><p className="text-base font-bold text-slate-700">{viewingStudent.mobileNumber || 'N/A'}</p></div><div><p className="text-[9px] font-black text-slate-400 uppercase mb-1 text-green-600">WhatsApp Connectivity</p><p className="text-base font-bold text-green-700">{viewingStudent.whatsappNumber || viewingStudent.mobileNumber || 'N/A'}</p></div><div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Campus Branch</p><p className="text-base font-bold text-slate-700">Branch {viewingStudent.schoolBranch || '1'}</p></div></div><div className="col-span-1 md:col-span-2"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Residential Address</p><p className="text-sm font-bold text-slate-700">{viewingStudent.address || 'Patwatoli, Manpur, Gaya'}</p></div></div>
                    </section>
                    <section>
                      <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-[0.3em] mb-6">Registered Sibling Connections</h4>
                      <div className="space-y-2">{modalSiblings.length > 0 ? modalSiblings.map(sib => (<div key={sib.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><div className="flex items-center gap-4"><img src={getStudentPhoto(sib.photo, sib.studentName)} className="w-10 h-10 rounded-full object-cover" alt="" /><div><p className="text-sm font-bold text-slate-800">{sib.studentName}</p><p className="text-[10px] text-slate-400 font-black uppercase">{formatGradeDisplay(sib.grade)} • Roll: {sib.rollNo}</p></div></div><div className="text-right"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${sib.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sib.status}</span></div></div>)) : <p className="text-sm text-slate-400 italic">No registered siblings found in the database.</p>}</div>
                    </section>
                    <div className="bg-amber-50 p-8 rounded-3xl border border-amber-100 flex justify-between items-center"><div><p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Financial Summary</p><p className="text-xs text-amber-600 font-medium italic">Status verified for {viewingStudent.academicSession}</p></div><div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Current Session Dues</p><p className={`text-3xl font-black ${viewingStudent.grade === 'PASSED' ? (getPendingDues(viewingStudent) > 0 ? 'text-red-600' : 'text-green-600') : (getNetDueCurrent(viewingStudent) > 0 ? 'text-red-600' : 'text-green-600')}`}>₹{(viewingStudent.grade === 'PASSED' ? getPendingDues(viewingStudent) : getNetDueCurrent(viewingStudent)).toLocaleString()}</p></div></div>
                  </div>
                )}
                {activeTab === 'ledger' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center"><h4 className="text-[10px] font-black uppercase text-amber-700 tracking-[0.3em]">Transaction Chronology</h4><span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">Session: {viewingStudent.academicSession}</span></div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-100"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100"><tr><th className="py-4 px-4">Date</th><th>Details</th><th className="text-right">Debit</th><th className="text-right px-4">Credit</th><th className="text-right px-4">Cumulative</th></tr></thead><tbody className="divide-y divide-slate-100">{viewingStudent.arrearsMarch2025 > 0 && (<tr className="bg-amber-50/30"><td className="py-4 px-4 text-slate-500 font-medium">B/F Arrears</td><td className="py-4 font-black text-red-950">Opening Balance 2025</td><td className="py-4 text-right text-red-600 font-black">₹{viewingStudent.arrearsMarch2025.toLocaleString()}</td><td className="py-4 text-right px-4 font-bold text-slate-300">-</td><td className="py-4 text-right px-4 font-black text-slate-900">₹{viewingStudent.arrearsMarch2025.toLocaleString()}</td></tr>)}{viewingStudent.history.length === 0 && viewingStudent.arrearsMarch2025 === 0 ? (<tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">No formal transactions recorded for this session.</td></tr>) : (getChronologicalHistory(viewingStudent).map((txn, i) => (<tr key={i} className="hover:bg-slate-50/80 transition-colors"><td className="py-4 px-4 text-slate-500 whitespace-nowrap">{txn.date}</td><td className="py-4 font-medium text-slate-800">{txn.description} <span className="text-[8px] bg-slate-100 border px-1.5 py-0.5 rounded ml-2 uppercase font-black tracking-tighter text-slate-400">{txn.mode}</span></td><td className="py-4 text-right text-red-600 font-black">{txn.type === 'Debit' ? `₹${txn.amount.toLocaleString()}` : '-'}</td><td className="py-4 text-right px-4 text-green-600 font-black">{txn.type === 'Credit' ? `₹${txn.amount.toLocaleString()}` : '-'}</td><td className="py-4 text-right px-4 font-black text-slate-600">₹{txn.runningBalance.toLocaleString()}</td></tr>)))}</tbody></table></div>
                  </div>
                )}
                {activeTab === 'complaints' && (
                  <div className="space-y-10"><section className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner"><h4 className="text-[10px] font-black uppercase text-red-900 tracking-[0.2em] mb-6">Log New Conduct Incident</h4><form onSubmit={handleAddComplaint} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Incident Date</label><input type="date" value={complaintForm.date} onChange={e => setComplaintForm({ ...complaintForm, date: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-red-900 outline-none" /></div><div><label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Category</label><select value={complaintForm.category} onChange={e => setComplaintForm({ ...complaintForm, category: e.target.value as any })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-red-900 outline-none">{['Behavioral', 'Academic', 'Attendance', 'Discipline', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}</select></div><div><label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Initial Status</label><select value={complaintForm.status} onChange={e => setComplaintForm({ ...complaintForm, status: e.target.value as any })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-red-900 outline-none">{['Pending', 'Investigating', 'Parent Notified', 'Resolved'].map(s => <option key={s} value={s}>{s}</option>)}</select></div></div><div><label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Description / Notes</label><textarea value={complaintForm.description} onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })} placeholder="Describe the concern or disciplinary action..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-red-900 outline-none h-24 resize-none" /></div><button type="submit" className="w-full bg-red-950 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-red-900 transition-all active:scale-95">Add to Registry</button></form></section><section><h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Incident Registry History</h4><div className="space-y-3">{viewingStudent.complaints && viewingStudent.complaints.length > 0 ? (viewingStudent.complaints.map((cmp, idx) => (<div key={cmp.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group"><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{cmp.date}</span><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-black uppercase">{cmp.category}</span></div><span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${cmp.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-200' : cmp.status === 'Investigating' ? 'bg-amber-50 text-amber-700 border-amber-200' : cmp.status === 'Parent Notified' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{cmp.status}</span></div><p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{cmp.description}"</p></div>))) : (<div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200"><p className="text-xs text-slate-400 font-medium">No behavioral or academic incidents recorded in this session.</p></div>)}</div></section></div>
                )}
                {activeTab === 'pay' && viewingStudent.grade === 'PASSED' && (
                  <div className="space-y-6"><div className="bg-red-50 p-8 rounded-3xl border border-red-100 text-center shadow-inner"><p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Global Outstanding Archive Balance</p><p className="text-5xl font-black text-red-950 mt-2">₹{getPendingDues(viewingStudent).toLocaleString()}</p></div><form onSubmit={handlePayment} className="space-y-8 bg-slate-50 p-8 rounded-3xl border border-slate-200"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Payable Amount (₹)</label><input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-red-900/10 transition-all" /></div><div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Relief / Waiver (₹)</label><input type="number" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xl font-black text-green-600 outline-none focus:ring-4 focus:ring-green-900/10 transition-all" /></div></div><div><label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest text-center">Settlement Channel</label><div className="flex gap-3">{['Cash', 'UPI', 'Bank'].map(m => <button key={m} type="button" onClick={() => setPayMode(m as any)} className={`flex-1 py-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${payMode === m ? 'bg-red-950 text-white border-red-950 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{m}</button>)}</div></div><button type="submit" disabled={isProcessing || (!payAmount && !discountAmount)} className="w-full bg-green-700 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-green-800 transition-all disabled:opacity-50 active:scale-95">{isProcessing ? 'Synchronizing Transaction...' : 'Execute Account Settlement'}</button></form></div>
                )}
              </div><div className="p-4 bg-slate-50 text-center border-t border-slate-100 shrink-0"><button onClick={() => setViewingStudent(null)} className="text-[10px] font-black text-slate-400 uppercase hover:text-red-900 transition-colors tracking-widest px-10 py-2">Close Student Record</button></div></div>
          </div>
        </div>
      )}

      {isAddAlumniOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative overflow-y-auto max-h-[90vh]"><button onClick={() => setIsAddAlumniOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-900 text-3xl transition-colors">&times;</button><h2 className="text-2xl font-black text-red-950 mb-1 serif-font">Archives Registration</h2><p className="text-slate-500 text-xs mb-8">Add a historical record to the Alumni database.</p><form onSubmit={handleAddAlumni} className="space-y-5"><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Batch Session *</label><select value={newAlumni.session} onChange={e => setNewAlumni({ ...newAlumni, session: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900" required><option value="">Select Session</option>{availableArchiveBatches.map(s => <option key={s} value={s}>Batch {getBatchYear(s)} (Session {s})</option>)}</select></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Student Name *</label><input type="text" value={newAlumni.name} onChange={e => setNewAlumni({ ...newAlumni, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900" required /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Father's Name</label><input type="text" value={newAlumni.fatherName} onChange={e => setNewAlumni({ ...newAlumni, fatherName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900" /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Mobile</label><input type="tel" value={newAlumni.mobile} onChange={e => setNewAlumni({ ...newAlumni, mobile: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900" /></div></div><div><label className="block text-[10px] font-black text-red-950 uppercase mb-1">Legacy Arrears (₹)</label><input type="number" value={newAlumni.arrears} onChange={e => setNewAlumni({ ...newAlumni, arrears: e.target.value })} className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-lg font-black text-red-900 focus:ring-2 focus:ring-red-900" placeholder="0" /></div><button type="submit" className="w-full bg-red-950 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl hover:bg-red-900 mt-4 transition-all">Commit to Archives</button></form></div></div>
      )}

      {fullScreenPhoto && (<div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 animate-in zoom-in duration-200" onClick={() => setFullScreenPhoto(null)}><img src={fullScreenPhoto} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border-4 border-white object-contain" alt="" /></div>)}

      {isMessagingOpen && (
        <MessagingTool isOpen={isMessagingOpen} onClose={() => setIsMessagingOpen(false)} students={students} currentSession={currentSession} messageTemplate={messageTemplate} setMessageTemplate={setMessageTemplate} referenceMonth={referenceMonth} setReferenceMonth={setReferenceMonth} senderProfile={senderProfile} setSenderProfile={setSenderProfile} />
      )}
    </div>
  );
};

export default Directory;
