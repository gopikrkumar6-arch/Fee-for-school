
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FeeRecord, MonthlyStatus, FeeCategory, ClassFeeMetadata, ActionLog, Transaction } from '../types';
import { getStudentPhoto, formatDate, BRANCH_OPTIONS, CLASS_FEE_STRUCTURE } from '../constants';

const SESSION_MONTHS = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];

interface SettingsProps {
  students: FeeRecord[];
  onUpdateStudents: (list: FeeRecord[]) => void;
  feeStructure: FeeCategory[];
  onUpdateFees: (structure: FeeCategory[], session: string) => void;
  currentSession: string;
  isReadOnly?: boolean;
  getFeeStructureForSession: (session: string) => FeeCategory[];
  actionLogs?: ActionLog[];
  addLog?: (action: string, details: string, type: ActionLog['type']) => void;
  upiAccounts: string[];
  setUpiAccounts: React.Dispatch<React.SetStateAction<string[]>>;
  bankAccounts: string[];
  setBankAccounts: React.Dispatch<React.SetStateAction<string[]>>;
  availableSessions: string[];
  setAvailableSessions: React.Dispatch<React.SetStateAction<string[]>>;
  lockedSessions: string[];
  setLockedSessions: (sessions: string[]) => void;
}

const Settings: React.FC<SettingsProps> = ({
  students,
  onUpdateStudents,
  feeStructure,
  onUpdateFees,
  currentSession,
  isReadOnly = false,
  getFeeStructureForSession,
  actionLogs = [],
  addLog,
  upiAccounts,
  setUpiAccounts,
  bankAccounts,
  setBankAccounts,
  availableSessions,
  setAvailableSessions,
  lockedSessions,
  setLockedSessions
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'fees' | 'import' | 'system'>('students');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportInputRef = useRef<HTMLInputElement>(null);
  const [isImportingJSON, setIsImportingJSON] = useState(false);

  const availableClassNames = useMemo(() => {
    return feeStructure.flatMap(cat => cat.classes.map(cls => cls.name));
  }, [feeStructure]);

  const [newStudent, setNewStudent] = useState({
    name: '',
    grade: '',
    section: '',
    rollNo: '',
    admissionNo: '',
    uidNo: '',
    schoolBranch: '1',
    motherName: '',
    fatherName: '',
    mobileNumber: '',
    whatsappNumber: '',
    penNo: '',
    apaarId: '',
    aadharCard: '',
    address: '',
    dob: '',
    previousClass: '',
    previousRollNo: '',
    previousBranch: '',
    monthlyFee: '',
    discount: '0',
    arrears: '',
    photoUrl: '',
    isNewAdmission: false,
    admissionCharge: '1000'
  });

  const [activeCategory, setActiveCategory] = useState(feeStructure[0].category);
  const selectedStructure = feeStructure.find(c => c.category === activeCategory);

  const [importText, setImportText] = useState('');
  const [csvUrl, setCsvUrl] = useState('');
  const [importMode, setImportMode] = useState<'paste' | 'url'>('paste');
  const [previewData, setPreviewData] = useState<(FeeRecord & { historicalMatch?: string })[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [importTargetSession, setImportTargetSession] = useState(currentSession);

  const [isPromoting, setIsPromoting] = useState(false);
  const [newSessionInput, setNewSessionInput] = useState('');
  const [promoFromSession, setPromoFromSession] = useState('');
  const [promoToSession, setPromoToSession] = useState('');

  const [upiQrCodes, setUpiQrCodes] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('ues_upi_qr_codes');
    return saved ? JSON.parse(saved) : {};
  });
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedQrUpiIndex, setSelectedQrUpiIndex] = useState<number | null>(null);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>, upiIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = { ...upiQrCodes, [upiIndex.toString()]: reader.result as string };
        setUpiQrCodes(updated);
        localStorage.setItem('ues_upi_qr_codes', JSON.stringify(updated));
        if (addLog) addLog('UPI QR Code Updated', `QR code uploaded for UPI account ${upiIndex + 1}`, 'SYSTEM');
      };
      reader.readAsDataURL(file);
    }
  };

  const findExistingSessions = (
    name: string,
    father: string,
    mother: string,
    mobile: string,
    existingList: FeeRecord[]
  ): string[] => {
    const normalizedName = name.trim().toLowerCase();
    const normalizedFather = (father || '').trim().toLowerCase();
    const normalizedMother = (mother || '').trim().toLowerCase();
    const normalizedMobile = (mobile || '').trim();

    return existingList
      .filter(s =>
        s.studentName.trim().toLowerCase() === normalizedName &&
        (s.fatherName || '').trim().toLowerCase() === normalizedFather &&
        (s.motherName || '').trim().toLowerCase() === normalizedMother &&
        (s.mobileNumber || '').trim() === normalizedMobile
      )
      .map(s => s.academicSession);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStudent(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getNextClass = (currentClass: string): string => {
    const cls = currentClass.trim();
    if (cls === 'Pre Nursery') return 'Nursery';
    if (cls === 'Nursery') return 'LKG';
    if (cls === 'LKG') return 'UKG';
    if (cls === 'UKG') return 'Class 1';

    const match = cls.match(/Class\s*(\d+)/i);
    if (match) {
      const num = parseInt(match[1]);
      if (num < 10) return `Class ${num + 1}`;
      if (num === 10) return 'PASSED';
    }
    return cls;
  };

  const getNextSession = (currentSession: string): string => {
    const parts = currentSession.split('-');
    if (parts.length !== 2) return '';
    const fromYear = parseInt(parts[0]);
    const toYear = parseInt(`20${parts[1]}`);
    return `${toYear}-${(toYear + 1).toString().slice(-2)}`;
  };

  const findClassFeeMetadata = (grade: string, structure: FeeCategory[]): ClassFeeMetadata | undefined => {
    const normalizedGrade = grade.toLowerCase().replace(/\s+/g, '');
    for (const cat of structure) {
      const matched = cat.classes.find(c => c.name.toLowerCase().replace(/\s+/g, '') === normalizedGrade);
      if (matched) return matched;
    }
    return undefined;
  };

  const handleDownloadAsJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      currentSession,
      availableSessions,
      students,
      feeStructure,
      lockedSessions,
      upiAccounts,
      bankAccounts
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `school-data-${currentSession}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAsCSV = () => {
    const headers = ['Student Name', 'Grade', 'Section', 'Roll No', 'Father Name', 'Mobile', 'Monthly Fee', 'Paid Amount', 'Status', 'Session'];
    const csvContent = [
      headers.join(','),
      ...students.map(s => [
        `"${s.studentName || ''}"`,
        `"${s.grade || ''}"`,
        `"${s.section || ''}"`,
        s.rollNo || '',
        `"${s.fatherName || ''}"`,
        s.mobileNumber || '',
        s.monthlyFee || '0',
        s.paidAmount || '0',
        s.status || 'Pending',
        s.academicSession || ''
      ].join(','))
    ].join('\n');
    
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `school-data-${currentSession}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShareViaText = async () => {
    const summary = {
      session: currentSession,
      totalStudents: students.filter(s => s.academicSession === currentSession).length,
      totalFeeCollected: students.filter(s => s.academicSession === currentSession).reduce((sum, s) => sum + (s.paidAmount || 0), 0),
      exportDate: new Date().toLocaleDateString('en-IN'),
      exportTime: new Date().toLocaleTimeString('en-IN')
    };

    const shareText = `📊 School Fee Manager Data Export\n\nSession: ${summary.session}\nTotal Students: ${summary.totalStudents}\nTotal Collection: ₹${summary.totalFeeCollected}\n\nExported on: ${summary.exportDate} at ${summary.exportTime}\n\nFull data available in JSON/CSV formats in System Control settings.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'School Data Export',
          text: shareText
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Summary copied to clipboard!');
      }).catch(() => {
        alert(shareText);
      });
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        
        // Validate the JSON structure
        if (!jsonData.students || !Array.isArray(jsonData.students)) {
          alert('❌ Invalid JSON file! Missing "students" array.');
          return;
        }

        const importSummary = `
📋 Import Data Summary:

Sessions: ${jsonData.availableSessions?.length || 0} found
Students: ${jsonData.students?.length || 0} records
Fee Categories: ${jsonData.feeStructure?.length || 0}
UPI Accounts: ${jsonData.upiAccounts?.length || 0}
Bank Accounts: ${jsonData.bankAccounts?.length || 0}
Locked Sessions: ${jsonData.lockedSessions?.length || 0}

⚠️ WARNING: This will REPLACE all current data!
Current Data:
- ${students.length} students
- ${availableSessions.length} sessions

Do you want to proceed with the import?
`;

        if (window.confirm(importSummary)) {
          setIsImportingJSON(true);
          
          // Apply all imported data
          if (jsonData.students && Array.isArray(jsonData.students)) {
            onUpdateStudents(jsonData.students);
          }
          
          if (jsonData.feeStructure && Array.isArray(jsonData.feeStructure)) {
            onUpdateFees(jsonData.feeStructure, jsonData.currentSession || currentSession);
          }
          
          if (jsonData.availableSessions && Array.isArray(jsonData.availableSessions)) {
            setAvailableSessions(jsonData.availableSessions);
          }
          
          if (jsonData.upiAccounts && Array.isArray(jsonData.upiAccounts)) {
            setUpiAccounts(jsonData.upiAccounts);
          }
          
          if (jsonData.bankAccounts && Array.isArray(jsonData.bankAccounts)) {
            setBankAccounts(jsonData.bankAccounts);
          }
          
          if (jsonData.lockedSessions && Array.isArray(jsonData.lockedSessions)) {
            setLockedSessions(jsonData.lockedSessions);
            localStorage.setItem('ues_locked_sessions', JSON.stringify(jsonData.lockedSessions));
          }

          setTimeout(() => {
            setIsImportingJSON(false);
            alert('✅ Data imported successfully! All information has been restored.');
            if (addLog) addLog('Data Import', `Imported ${jsonData.students?.length || 0} student records from JSON file`, 'SYSTEM');
          }, 1000);
        }
      } catch (error) {
        console.error('JSON Parse Error:', error);
        alert('❌ Error parsing JSON file! Please ensure it\'s a valid JSON export file.');
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be selected again
    if (jsonImportInputRef.current) {
      jsonImportInputRef.current.value = '';
    }
  };

  const handlePromotion = () => {
    setIsPromoting(true);
    setTimeout(() => {
      const prevSession = promoFromSession;
      const nextSession = promoToSession;

      if (!prevSession || !nextSession || prevSession === nextSession) {
        alert("Please select distinct 'From' and 'To' sessions.");
        setIsPromoting(false);
        return;
      }

      // Validate that nextSession is EXACTLY the next session (no skipping)
      const expectedNextSession = getNextSession(prevSession);
      if (nextSession !== expectedNextSession) {
        alert(`❌ Invalid session sequence!\n\nFrom session ${prevSession} must promote to ${expectedNextSession}, not ${nextSession}.\n\n⚠️ Session skipping is NOT allowed.`);
        setIsPromoting(false);
        return;
      }

      if (lockedSessions.includes(nextSession)) {
        alert(`Destination session ${nextSession} is locked (Read-Only). Promotion is not allowed.`);
        setIsPromoting(false);
        return;
      }

      const allSessionStudents = students.filter(s => s.academicSession === prevSession && s.status !== 'PASSED');

      if (allSessionStudents.length === 0) {
        alert(`No students found in Session ${prevSession} to process.`);
        setIsPromoting(false);
        return;
      }

      // Separate students into two groups:
      // 1. Class 1-9: Promote to next class in next session
      // 2. Class 10: Graduate (mark PASSED) in current session - NO new record created
      const promoteToNextSession = allSessionStudents.filter(s => {
        const nextClass = getNextClass(s.grade);
        return nextClass !== 'PASSED';
      });

      const graduatingClass10 = allSessionStudents.filter(s => {
        const nextClass = getNextClass(s.grade);
        return nextClass === 'PASSED';
      });

      const targetFeeStructure = getFeeStructureForSession(nextSession);

      // Process students promoting to next class/session
      const promotedStudents: FeeRecord[] = promoteToNextSession.map(student => {
        const nextClass = getNextClass(student.grade);
        const existingArrears = student.arrearsMarch2025 || 0;
        const totalHistoryDebits = student.history
          .filter(t => t.type === 'Debit' && !t.description.includes('Charge Generated for Exemption'))
          .reduce((sum, t) => sum + t.amount, 0);
        const totalPaid = student.paidAmount || 0;
        const pendingAmount = Math.max(0, (existingArrears + totalHistoryDebits) - totalPaid);

        const classMeta = findClassFeeMetadata(nextClass, targetFeeStructure);
        const newMonthlyFee = classMeta ? classMeta.tuition : 0;

        const emptyStatus: MonthlyStatus = {};
        SESSION_MONTHS.forEach(m => emptyStatus[m] = 'Unpaid');

        const baseId = student.id.split('-PROM')[0];
        const newId = `${baseId}-PROM-${nextSession.replace(/[^a-zA-Z0-9]/g, '')}`;

        return {
          ...student,
          id: newId,
          academicSession: nextSession,
          grade: nextClass,
          previousClass: student.grade,
          previousRollNo: student.rollNo,
          monthlyFee: newMonthlyFee,
          cashDiscount: 0,
          totalAnnualFee: newMonthlyFee * 12,
          paidAmount: 0,
          status: 'Pending',
          arrearsMarch2025: pendingAmount,
          monthlyStatus: emptyStatus,
          examFeeStatus: { 'Term 1': 'Unpaid', 'Term 2': 'Unpaid', 'Term 3': 'Unpaid' },
          history: []
        };
      });

      // Process Class 10 students - mark as PASSED in current session (in-place update, no new record)
      const passedStudents: FeeRecord[] = graduatingClass10.map(student => ({
        ...student,
        grade: 'PASSED',
        previousClass: student.grade,
        previousRollNo: student.rollNo,
        status: 'PASSED',
        monthlyFee: 0,
        totalAnnualFee: 0
        // Keep same academicSession - they graduate in their current session
      }));

      // Merge: Update in-place records + new promoted records
      const allUpdatedStudents = students.map(s => {
        const passedVersion = passedStudents.find(p => p.id === s.id);
        return passedVersion || s;
      }).concat(promotedStudents);

      const existingNextSessionIds = new Set(students.filter(s => s.academicSession === nextSession).map(s => s.rollNo + s.grade));
      const validPromotions = promotedStudents.filter(s => !existingNextSessionIds.has(s.rollNo + s.grade));

      if (validPromotions.length === 0 && passedStudents.length === 0) {
        alert("No students to process. Promotion may already be executed.");
      } else {
        if (addLog) addLog('Batch Promotion & Graduation', `Promoted ${validPromotions.length} to ${nextSession} & graduated ${passedStudents.length} in ${prevSession}.`, 'SYSTEM');
        onUpdateStudents(allUpdatedStudents);
        alert(`✅ Promoted ${validPromotions.length} students to ${nextSession}\n✅ Graduated ${passedStudents.length} Class 10 students in ${prevSession}`);
      }
      setIsPromoting(false);
    }, 1500);
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const {
      name, grade, section, rollNo, admissionNo, uidNo, schoolBranch,
      motherName, fatherName, mobileNumber, whatsappNumber, penNo, apaarId, aadharCard, address, dob,
      previousClass, previousRollNo, previousBranch,
      monthlyFee, discount, arrears, photoUrl, isNewAdmission, admissionCharge
    } = newStudent;

    // === VALIDATION TESTS ===
    
    // 1. Required Fields
    if (!name || !name.trim()) {
      alert("❌ Student Name is required");
      return;
    }
    if (!grade || !grade.trim()) {
      alert("❌ Grade/Class is required");
      return;
    }
    if (!section || !section.trim()) {
      alert("❌ Section is required");
      return;
    }
    if (!rollNo || !rollNo.trim()) {
      alert("❌ Roll Number is required");
      return;
    }

    // 2. Name Validation - Letters, spaces, and hyphens only
    if (!/^[a-zA-Z\s\-']{2,}$/.test(name.trim())) {
      alert("❌ Invalid Name!\nOnly letters, spaces, hyphens, and apostrophes allowed.\nMinimum 2 characters.");
      return;
    }

    // 3. Roll Number Validation - Exactly 2 digits
    if (!/^\d{2}$/.test(rollNo.trim())) {
      alert("❌ Invalid Roll Number!\nMust be exactly 2 digits (e.g., 01, 02, ..., 99).");
      return;
    }

    // 4. Section Validation - Letters/Numbers only, max 5 chars
    if (!/^[a-zA-Z0-9]{1,5}$/.test(section.trim())) {
      alert("❌ Invalid Section!\nUse letters/numbers only (A, B, C, 1, 2, etc).\nMax 5 characters.");
      return;
    }

    // 5. Mobile Number - Exactly 10 digits
    if (mobileNumber && !/^\d{10}$/.test(mobileNumber.replace(/\D/g, ''))) {
      alert("❌ Invalid Mobile Number!\nMust be exactly 10 digits (e.g., 9876543210).");
      return;
    }

    // 6. WhatsApp Number - Exactly 10 digits (if provided)
    if (whatsappNumber && whatsappNumber.trim() && !/^\d{10}$/.test(whatsappNumber.replace(/\D/g, ''))) {
      alert("❌ Invalid WhatsApp Number!\nMust be exactly 10 digits.");
      return;
    }

    // 7. Aadhar Card - Exactly 12 digits (if provided)
    if (aadharCard && aadharCard.trim()) {
      if (!/^\d{12}$/.test(aadharCard.replace(/\D/g, ''))) {
        alert("❌ Invalid Aadhar Number!\nMust be exactly 12 digits (e.g., 123456789012).");
        return;
      }
      // Check if Aadhar already exists
      if (students.some(s => s.aadharCard === aadharCard && s.academicSession === currentSession)) {
        alert("⚠️ This Aadhar number is already registered in current session!");
        return;
      }
    }

    // 8. Father/Mother Name Validation
    if (fatherName && !/^[a-zA-Z\s\-']{2,}$/.test(fatherName.trim())) {
      alert("❌ Invalid Father's Name!\nOnly letters, spaces, hyphens, and apostrophes allowed.");
      return;
    }
    if (motherName && !/^[a-zA-Z\s\-']{2,}$/.test(motherName.trim())) {
      alert("❌ Invalid Mother's Name!\nOnly letters, spaces, hyphens, and apostrophes allowed.");
      return;
    }

    // 9. DOB Validation (if provided)
    if (dob && dob.trim()) {
      const dobDate = new Date(dob);
      const today = new Date();
      if (isNaN(dobDate.getTime())) {
        alert("❌ Invalid Date of Birth!\nUse YYYY-MM-DD format.");
        return;
      }
      if (dobDate > today) {
        alert("❌ Date of Birth cannot be in the future!");
        return;
      }
    }

    // 10. Address Validation (if provided)
    if (address && address.trim().length < 5) {
      alert("❌ Address too short!\nMinimum 5 characters required.");
      return;
    }

    // 11. Admission Number Uniqueness
    if (admissionNo && admissionNo.trim()) {
      if (students.some(s => s.admissionNo === admissionNo && s.academicSession === currentSession)) {
        alert("⚠️ Admission Number already exists in current session!");
        return;
      }
    }

    // 12. Previous Class/Roll validations (if both provided, both must be filled)
    if ((previousClass || previousRollNo) && (!previousClass || !previousRollNo)) {
      alert("❌ If entering Previous Class, you must also enter Previous Roll Number (and vice versa).");
      return;
    }

    // === HISTORY CHECK ===
    const existingSessions = findExistingSessions(name, fatherName, motherName, mobileNumber, students);
    if (existingSessions.length > 0) {
      if (existingSessions.includes(currentSession)) {
        alert(`❌ Registration Blocked: "${name}" is already registered in the current session (${currentSession}).`);
        return;
      } else {
        const confirmed = window.confirm(
          `⚠️ History Found: "${name}" was previously registered in Session(s): ${existingSessions.join(', ')}.\n\n` +
          `Would you like to proceed with a NEW record for the current session? \n(Tip: For returning students, use "System Control > Promotion" to preserve history).`
        );
        if (!confirmed) return;
      }
    }

    // === CREATE NEW RECORD ===
    const emptyStatus: MonthlyStatus = {};
    SESSION_MONTHS.forEach(m => emptyStatus[m] = 'Unpaid');

    let calculatedFee = monthlyFee ? parseFloat(monthlyFee) : 0;
    let calculatedDiscount = discount ? parseFloat(discount) : 0;

    if (calculatedFee === 0) {
      const classMeta = findClassFeeMetadata(grade, feeStructure);
      if (classMeta) {
        calculatedFee = classMeta.tuition;
      }
    }

    const uniqueId = admissionNo ? admissionNo : `${grade.replace(/\s+/g, '')}-${section}-${rollNo}-${currentSession}`;
    const initialHistory: Transaction[] = [];

    if (isNewAdmission) {
      const chargeAmt = parseFloat(admissionCharge) || 0;
      if (chargeAmt > 0) {
        initialHistory.push({
          id: `ADM-CHG-${Date.now()}`,
          receiptId: '-',
          date: formatDate(new Date()),
          description: 'New Admission / Registration Charges',
          amount: chargeAmt,
          type: 'Debit',
          mode: 'Demand'
        });
      }
    }

    const newRecord: FeeRecord = {
      id: uniqueId,
      academicSession: currentSession,
      admissionNo: admissionNo,
      uidNo: uidNo,
      rollNo,
      studentName: name,
      grade,
      section,
      schoolBranch: schoolBranch || '1',
      motherName,
      fatherName,
      mobileNumber,
      whatsappNumber,
      penNo,
      apaarId,
      aadharCard,
      address,
      dob,
      previousClass,
      previousRollNo,
      previousBranch,
      siblings: [],
      monthlyFee: calculatedFee,
      cashDiscount: calculatedDiscount,
      totalAnnualFee: calculatedFee * 12,
      paidAmount: 0,
      dueDate: `20${currentSession.split('-')[1]}-04-10`,
      status: 'Pending',
      category: 'Tuition',
      arrearsMarch2025: arrears ? parseFloat(arrears) : 0,
      monthlyStatus: emptyStatus,
      examFeeStatus: { 'Term 1': 'Unpaid', 'Term 2': 'Unpaid', 'Term 3': 'Unpaid' },
      history: initialHistory,
      photo: photoUrl
    };

    onUpdateStudents([...students, newRecord]);
    if (addLog) addLog('New Student Added', `Added ${name} (${rollNo}) to ${grade}-${section}`, 'CREATE');
    alert(`✅ Student ${name} registered successfully!`);
    setNewStudent({
      name: '', grade: '', section: '', rollNo: '', admissionNo: '', uidNo: '', schoolBranch: '1',
      motherName: '', fatherName: '', mobileNumber: '', whatsappNumber: '', penNo: '', apaarId: '', aadharCard: '', address: '', dob: '',
      previousClass: '', previousRollNo: '', previousBranch: '', monthlyFee: '', discount: '0', arrears: '', photoUrl: '', isNewAdmission: false,
      admissionCharge: '1000'
    });
    alert(`Student ${name} added successfully to ${currentSession} Ledger! ${isNewAdmission ? `₹${parseFloat(admissionCharge).toLocaleString()} admission charge applied.` : ''}`);
  };

  const handleFeeInputChange = (categoryName: string, className: string, field: string, value: string) => {
    if (isReadOnly) return;
    const numValue = parseInt(value) || 0;
    const updated = feeStructure.map(cat => {
      if (cat.category !== categoryName) return cat;
      return {
        ...cat,
        classes: cat.classes.map(cls => {
          if (cls.name !== className) return cls;
          return { ...cls, [field]: numValue };
        })
      };
    });
    onUpdateFees(updated, currentSession);
  };

  const parseLines = (text: string) => {
    const lines = text.trim().split('\n');
    const parsed: (FeeRecord & { historicalMatch?: string })[] = [];
    const targetStructure = getFeeStructureForSession(importTargetSession);
    let sessionDuplicateCount = 0;

    lines.forEach(line => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length < 5) return;

      const grade = parts[0]?.trim() || '';
      const section = parts[1]?.trim() || '';
      const rollNo = parts[2]?.trim() || '';
      const admissionNo = parts[3]?.trim() || '';
      const uidNo = parts[4]?.trim() || '';
      const name = parts[5]?.trim() || '';
      const fatherName = parts[6]?.trim() || '';
      const motherName = parts[7]?.trim() || '';
      const mobileNumber = parts[8]?.trim() || '';
      const whatsappNumber = parts[9]?.trim() || '';
      const address = parts[10]?.trim() || '';
      const dob = parts[11]?.trim() || '';
      const schoolBranch = parts[12]?.trim() || '1';
      const penNo = parts[13]?.trim() || '';
      const apaarId = parts[14]?.trim() || '';
      const previousClass = parts[15]?.trim() || '';
      const previousRollNo = parts[16]?.trim() || '';
      const previousBranch = parts[17]?.trim() || '';
      const monthlyFeeInput = parts[18] ? parseFloat(parts[18].replace(/[^0-9.]/g, '')) : 0;
      const discountInput = parts[19] ? parseFloat(parts[19].replace(/[^0-9.]/g, '')) : 0;
      const arrearsInput = parts[20] ? parseFloat(parts[20].replace(/[^0-9.]/g, '')) : 0;
      const photoUrl = parts[21]?.trim() || '';
      const aadharCard = parts[22]?.trim() || '';

      if (!name || name.toLowerCase().includes('name')) return;

      const matches = findExistingSessions(name, fatherName, motherName, mobileNumber, students);
      if (matches.includes(importTargetSession)) {
        sessionDuplicateCount++;
        return;
      }

      const historicalMatch = matches.length > 0 ? matches[0] : undefined;

      let finalMonthlyFee = monthlyFeeInput;
      if (finalMonthlyFee === 0) {
        const classMeta = findClassFeeMetadata(grade, targetStructure);
        finalMonthlyFee = classMeta ? classMeta.tuition : 8000;
      }

      const emptyStatus: MonthlyStatus = {};
      SESSION_MONTHS.forEach(m => emptyStatus[m] = 'Unpaid');
      const id = admissionNo || `${grade.replace(/\s+/g, '')}-${section}-${rollNo}-${importTargetSession}`;

      parsed.push({
        id, academicSession: importTargetSession, admissionNo, uidNo, rollNo, studentName: name, grade, section, motherName, fatherName, mobileNumber, whatsappNumber, penNo, apaarId, aadharCard, address, dob, schoolBranch, previousClass, previousRollNo, previousBranch, monthlyFee: finalMonthlyFee, cashDiscount: discountInput, totalAnnualFee: finalMonthlyFee * 12, paidAmount: 0, dueDate: `20${importTargetSession.split('-')[1]}-04-10`, status: 'Pending', category: 'Tuition', arrearsMarch2025: arrearsInput, monthlyStatus: emptyStatus, examFeeStatus: { 'Term 1': 'Unpaid', 'Term 2': 'Unpaid', 'Term 3': 'Unpaid' }, history: [], siblings: [], photo: photoUrl, historicalMatch
      });
    });

    if (sessionDuplicateCount > 0) {
      alert(`${sessionDuplicateCount} records ignored because they already exist in ${importTargetSession}.`);
    }
    setPreviewData(parsed);
  };

  const handleValidate = () => parseLines(importText);

  const handleFetchUrl = async () => {
    if (!csvUrl) return;
    setIsFetching(true);
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error('Failed to fetch CSV');
      const text = await response.text();
      parseLines(text);
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Error fetching remote CSV. Check URL permissions.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleFinalImport = () => {
    if (previewData.length > 0) {
      if (addLog) addLog('Bulk Import', `Committed ${previewData.length} extended records to ${importTargetSession}.`, 'IMPORT');
      onUpdateStudents([...students, ...previewData.map(({ historicalMatch, ...rest }) => rest)]);
      setPreviewData([]);
      setImportText('');
      alert(`Successfully imported ${previewData.length} student profiles.`);
      setActiveTab('students');
    }
  };

  const resetImport = () => {
    setImportText('');
    setCsvUrl('');
    setPreviewData([]);
  };

  const removePreviewRow = (index: number) => {
    setPreviewData(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="pb-20 min-h-screen bg-slate-50 relative">

      {isLogModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[80vh] overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-xl">📜</span>
                <h3 className="font-bold text-lg serif-font">System Activity Log</h3>
              </div>
              <button onClick={() => setIsLogModalOpen(false)} className="text-white/60 hover:text-white text-2xl transition-colors">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {actionLogs.length > 0 ? (
                actionLogs.map(log => (
                  <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
                    <div className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${log.type === 'SYSTEM' ? 'bg-blue-500' :
                      log.type === 'PAYMENT' ? 'bg-green-500' :
                        log.type === 'EXPENSE' ? 'bg-red-500' :
                          log.type === 'IMPORT' ? 'bg-purple-500' : 'bg-slate-400'
                      }`}></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-black uppercase text-slate-800 tracking-tight">{log.action}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">{log.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{log.details}</p>
                      <div className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-300">
                        Type: {log.type}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 opacity-40">
                  <span className="text-4xl mb-2">📭</span>
                  <p className="text-xs font-bold uppercase tracking-widest">No Recent Activity</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t border-slate-100 text-center">
              <button onClick={() => setIsLogModalOpen(false)} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-900 transition-colors tracking-widest">Close Activity Viewer</button>
            </div>
          </div>
        </div>
      )}

      <div className={`text-white py-12 px-4 shadow-xl transition-colors ${isReadOnly ? 'bg-slate-800' : 'bg-red-950'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold serif-font mb-2">Global Settings</h1>
              <p className={`font-bold text-xs uppercase tracking-widest ${isReadOnly ? 'text-slate-400' : 'text-amber-500'}`}>Admin Control Panel</p>
            </div>

            <button
              onClick={() => setIsLogModalOpen(true)}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center border border-white/20 transition-all active:scale-95 group relative"
              title="View Action Logs"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">📜</span>
              {actionLogs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-50 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-red-950 shadow-lg">
                  {actionLogs.length > 99 ? '99+' : actionLogs.length}
                </span>
              )}
            </button>
          </div>

          {isReadOnly && (
            <div className="mt-4 md:mt-0 px-4 py-2 bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-600">
              🔒 Configuration Locked (Archive Mode)
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className={`bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}>

          <div className="flex border-b border-slate-100 flex-wrap">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex-1 min-w-[120px] py-6 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'students' ? 'bg-white text-red-900 border-b-4 border-red-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              Add Student
            </button>
            <button
              onClick={() => setActiveTab('fees')}
              className={`flex-1 min-w-[120px] py-6 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'fees' ? 'bg-white text-red-900 border-b-4 border-red-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              Fee Configuration
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 min-w-[120px] py-6 text-xs font-black uppercase tracking-widest transition-all pointer-events-auto ${activeTab === 'import' ? 'bg-white text-red-900 border-b-4 border-red-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              Bulk Import
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex-1 min-w-[120px] py-6 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-white text-red-900 border-b-4 border-red-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              System Control
            </button>
          </div>

          <div className="p-10">
            {activeTab === 'students' && (
              <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-left-4">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-bold text-red-950 serif-font">Student Onboarding</h2>
                  <p className="text-slate-400 text-xs mt-2">Manually register a student into the {currentSession} Ledger.</p>
                </div>

                <form onSubmit={handleStudentSubmit} className="space-y-8">

                  <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-200 mb-8 flex items-center justify-between shadow-sm flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="font-bold text-amber-900 serif-font italic">New Admission Candidate?</h3>
                      <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-1">Enable to apply a one-time registration debit.</p>
                    </div>

                    <div className="flex items-center gap-6">
                      {newStudent.isNewAdmission && (
                        <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                          <label className="text-[9px] font-black uppercase text-amber-600 mb-1">Set Charge Amount</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-amber-700">₹</span>
                            <input
                              type="number"
                              value={newStudent.admissionCharge}
                              onChange={(e) => setNewStudent({ ...newStudent, admissionCharge: e.target.value })}
                              className="w-24 bg-white border border-amber-300 rounded-lg pl-6 pr-2 py-2 text-center font-black text-red-700 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      )}

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={newStudent.isNewAdmission}
                          onChange={(e) => setNewStudent({ ...newStudent, isNewAdmission: e.target.checked })}
                          disabled={isReadOnly}
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-600 shadow-inner"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center mb-6">
                    <div className="relative group">
                      <div className="w-24 h-24 bg-slate-100 rounded-full border-2 border-slate-200 flex items-center justify-center overflow-hidden mb-2 relative">
                        {newStudent.photoUrl ? (
                          <img src={getStudentPhoto(newStudent.photoUrl, newStudent.name || 'Preview')} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-slate-400">
                            <span className="text-2xl mb-1">📷</span>
                            <span className="text-[9px] font-bold uppercase">Photo</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-0 bg-red-950 text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-red-800 transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed group"
                        title="Capture from Camera / Upload"
                      >
                        <svg className="w-3 h-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/*"
                        className="hidden"
                        capture="environment"
                      />
                    </div>

                    <div className="flex gap-2 w-64 mb-4">
                      <input
                        type="text"
                        placeholder="Or paste Photo URL"
                        value={newStudent.photoUrl}
                        onChange={(e) => setNewStudent({ ...newStudent, photoUrl: e.target.value })}
                        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-center outline-none focus:border-red-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">PEN NO.</label>
                        <input
                          type="text"
                          placeholder="Permanent Education No"
                          value={newStudent.penNo}
                          onChange={(e) => setNewStudent({ ...newStudent, penNo: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-900 outline-none text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 text-right">Aadhar Card <span className="text-red-500 text-[7px]">(12 digits)</span></label>
                        <input
                          type="text"
                          placeholder="123456789012"
                          value={newStudent.aadharCard}
                          onChange={(e) => setNewStudent({ ...newStudent, aadharCard: e.target.value.replace(/\D/g, '') })}
                          maxLength="12"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-900 outline-none text-xs font-bold text-right"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Admission No.</label>
                        <input
                          type="text"
                          placeholder="ADM-XXXX"
                          value={newStudent.admissionNo}
                          onChange={(e) => setNewStudent({ ...newStudent, admissionNo: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-900 outline-none text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 text-right">APAAR ID</label>
                        <input
                          type="text"
                          placeholder="Permanent Academic Acc."
                          value={newStudent.apaarId}
                          onChange={(e) => setNewStudent({ ...newStudent, apaarId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-900 outline-none text-xs font-bold text-right"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Student Name * <span className="text-red-500 text-[8px]">(Letters only)</span></label>
                      <input
                        type="text" required
                        placeholder="e.g., Rajesh Kumar"
                        value={newStudent.name}
                        onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Grade *</label>
                        <select
                          required
                          value={newStudent.grade}
                          onChange={(e) => {
                            const selectedGrade = e.target.value;
                            const meta = findClassFeeMetadata(selectedGrade, feeStructure);
                            setNewStudent(prev => ({
                              ...prev,
                              grade: selectedGrade,
                              monthlyFee: meta ? meta.tuition.toString() : prev.monthlyFee,
                              discount: '0' // Manual override reset on class change, no auto-detection from meta
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                        >
                          <option value="">Select Class</option>
                          {availableClassNames.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Sec * <span className="text-red-500 text-[8px]">(A, B, etc)</span></label>
                        <input
                          type="text" required placeholder="A"
                          value={newStudent.section}
                          onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value.toUpperCase() })}
                          maxLength="5"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">School Branch</label>
                      <select
                        value={newStudent.schoolBranch}
                        onChange={(e) => setNewStudent({ ...newStudent, schoolBranch: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      >
                        {BRANCH_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>Branch {opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Roll No * <span className="text-red-500 text-[8px]">(2 digits)</span></label>
                      <input
                        type="text" required placeholder="01"
                        value={newStudent.rollNo}
                        onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                        maxLength="2"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold text-center"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Father's Name <span className="text-amber-600 text-[8px]">(Letters only)</span></label>
                      <input
                        type="text"
                        placeholder="e.g., Rajesh Kumar"
                        value={newStudent.fatherName}
                        onChange={(e) => setNewStudent({ ...newStudent, fatherName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Mother's Name <span className="text-amber-600 text-[8px]">(Letters only)</span></label>
                      <input
                        type="text"
                        placeholder="e.g., Priya Singh"
                        value={newStudent.motherName}
                        onChange={(e) => setNewStudent({ ...newStudent, motherName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Mobile / Family ID * <span className="text-red-500 text-[8px]">(10 digits)</span></label>
                      <input
                        type="tel"
                        placeholder="e.g., 9876543210"
                        value={newStudent.mobileNumber}
                        onChange={(e) => setNewStudent({ ...newStudent, mobileNumber: e.target.value.replace(/\D/g, '') })}
                        maxLength="10"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">WhatsApp No <span className="text-amber-600 text-[8px]">(10 digits)</span></label>
                      <input
                        type="tel"
                        placeholder="e.g., 9876543210"
                        value={newStudent.whatsappNumber}
                        onChange={(e) => setNewStudent({ ...newStudent, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                        maxLength="10"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Student Address <span className="text-amber-600 text-[8px]">(min 5 chars)</span></label>
                      <input
                        type="text"
                        placeholder="Full Residential Address..."
                        value={newStudent.address}
                        onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                        minLength={5}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={newStudent.dob}
                        onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Previous Class</label>
                      <select
                        value={newStudent.previousClass}
                        onChange={(e) => setNewStudent({ ...newStudent, previousClass: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      >
                        <option value="">N/A</option>
                        {availableClassNames.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Previous Roll No</label>
                      <input
                        type="text"
                        placeholder="Old Roll"
                        value={newStudent.previousRollNo}
                        onChange={(e) => setNewStudent({ ...newStudent, previousRollNo: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Previous Branch</label>
                      <select
                        value={newStudent.previousBranch}
                        onChange={(e) => setNewStudent({ ...newStudent, previousBranch: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      >
                        <option value="">N/A</option>
                        {BRANCH_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>Branch {opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Monthly Fee (₹)</label>
                      <input
                        type="number" placeholder="Auto"
                        value={newStudent.monthlyFee}
                        onChange={(e) => setNewStudent({ ...newStudent, monthlyFee: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Concession / Discount (₹)</label>
                      <input
                        type="number" placeholder="0"
                        value={newStudent.discount}
                        onChange={(e) => setNewStudent({ ...newStudent, discount: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold text-green-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Previous Session Arrears (₹)</label>
                      <input
                        type="number" placeholder="0"
                        value={newStudent.arrears}
                        onChange={(e) => setNewStudent({ ...newStudent, arrears: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none text-sm font-bold text-red-600"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={isReadOnly} className="w-full bg-red-950 text-white py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-xs shadow-lg hover:bg-red-900 transition-all disabled:opacity-50">
                    {isReadOnly ? 'Additions Disabled' : 'Register Student'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'fees' && (
              <div className="animate-in fade-in slide-in-from-right-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-red-950 serif-font">Fee Structure Config</h2>
                    <p className="text-slate-400 text-xs mt-2">Modifications here affect global calculations immediately.</p>
                  </div>
                  <div className={`mt-4 md:mt-0 px-4 py-2 ${isReadOnly ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-800 border-amber-200'} text-[10px] font-bold uppercase tracking-widest rounded-lg border`}>
                    {isReadOnly ? '🔒 Read Only Mode' : `⚠️ Live Editing Mode (${currentSession})`}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  {feeStructure.map(cat => (
                    <button
                      key={cat.category}
                      onClick={() => setActiveCategory(cat.category)}
                      className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeCategory === cat.category
                        ? (isReadOnly ? 'bg-slate-700 text-white border-slate-700' : 'bg-red-950 text-white border-red-950')
                        : 'bg-white text-slate-400 border-slate-200 hover:border-red-200'
                        }`}
                    >
                      {cat.category}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-slate-50/50">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="bg-white border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Class</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Tuition (M)</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-amber-700 text-center bg-amber-50/50">On Time Reward</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Exam (Term)</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Tie</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Belt</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">ID Card</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Diary</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Booklet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedStructure?.classes.map((cls, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold text-red-950 text-sm border-r border-slate-50">
                            {cls.name}
                          </td>
                          {[
                            { field: 'tuition' },
                            { field: 'onTimeReward', isSpecial: true },
                            { field: 'exam' },
                            { field: 'tie' },
                            { field: 'belt' },
                            { field: 'idCard' },
                            { field: 'diary' },
                            { field: 'booklet' }
                          ].map((col, colIdx) => (
                            <td key={colIdx} className={`px-2 py-2 text-center ${col.isSpecial ? 'bg-amber-50/30' : ''}`}>
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={(cls as any)[col.field]}
                                onChange={(e) => handleFeeInputChange(selectedStructure.category, cls.name, col.field, e.target.value)}
                                className={`w-20 border border-slate-200 rounded-lg p-2 text-center text-sm font-bold focus:ring-2 outline-none focus:bg-white transition-all disabled:opacity-50 ${col.isSpecial ? 'bg-white border-amber-200 text-amber-700' : 'bg-slate-50 text-slate-700 focus:ring-amber-500'}`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="animate-in fade-in zoom-in-95 pointer-events-auto opacity-100">
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-red-950 serif-font italic">Google Sheets Migration Hub</h2>
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Extended Profile Import Supported (23 Fields). Concessions must be manually defined in the CSV column.
                  </p>
                  {isReadOnly && (
                    <div className="mt-4 inline-block px-4 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-200">
                      🔓 Archive Upload Access Granted
                    </div>
                  )}
                </div>

                <div className="max-w-xl mx-auto mb-8 bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Session</p>
                    <p className="text-xs font-bold text-red-900">Where should this data be saved?</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {availableSessions.map(session => (
                      <button
                        key={session}
                        onClick={() => setImportTargetSession(session)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold border transition-all ${importTargetSession === session ? 'bg-red-900 text-white border-red-900' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                      >
                        {session}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center gap-4 mb-8">
                  <button
                    onClick={() => setImportMode('paste')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'paste' ? 'bg-red-950 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}
                  >
                    📋 Paste from Sheet
                  </button>
                  <button
                    onClick={() => setImportMode('url')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'url' ? 'bg-red-950 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}
                  >
                    🌐 Fetch from URL
                  </button>
                </div>

                <div className="grid lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-5 space-y-6">
                    {importMode === 'paste' ? (
                      <>
                        <div className="flex justify-between items-center px-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Extended Header Map (23 Columns)</label>
                          {importText && <button onClick={resetImport} className="text-[10px] font-black text-red-600 uppercase hover:underline">Clear</button>}
                        </div>
                        <textarea
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          className="w-full h-96 bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-[11px] font-mono outline-none focus:border-amber-500 transition-colors shadow-inner resize-none whitespace-pre"
                          placeholder={`Header: Grade | Sec | Roll | Adm# | UID | Name | Father | Mother | Mobile | WA | Address | DOB | Branch | PEN | APAAR | PrevClass | PrevRoll | PrevBranch | Fee | CD | Dues | PhotoUrl | Aadhar\n\nExample Row:\nClass 1\tA\t05\tADM-001\t1001\tAryan Sharma\tMr. Sharma\tMrs. Sharma\t9876543210\t9876543210\tGaya, Bihar\t2018-05-15\tMain Wing\tPEN-XYZ\tAP-123\tNursery\t12\tBranch A\t7800\t0\t1200\thttps://...\t1234-5678-9012`}
                        />
                        <button
                          onClick={handleValidate}
                          disabled={!importText.trim()}
                          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all disabled:opacity-30"
                        >
                          Analyze Records
                        </button>
                      </>
                    ) : (
                      <div className="space-y-6 py-10 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Public CSV URL</label>
                        <input
                          type="url"
                          value={csvUrl}
                          onChange={(e) => setCsvUrl(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                          className="w-full bg-white border-2 border-slate-100 rounded-3xl p-6 text-[13px] font-medium outline-none focus:border-amber-500 shadow-inner disabled:opacity-50"
                        />
                        <button
                          onClick={handleFetchUrl}
                          disabled={!csvUrl || isFetching}
                          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all disabled:opacity-30 flex items-center justify-center"
                        >
                          {isFetching ? "Syncing..." : "Load from Remote CSV"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Data Verification Preview</label>
                      {previewData.length > 0 && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full">{previewData.length} Valid Profiles Found</span>
                      )}
                    </div>

                    <div className="h-96 border-2 border-slate-100 rounded-3xl bg-white overflow-hidden shadow-inner flex flex-col">
                      {previewData.length > 0 ? (
                        <div className="flex-1 overflow-auto custom-scrollbar">
                          <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
                            <thead className="sticky top-0 bg-slate-100 z-10">
                              <tr>
                                <th className="p-4 font-black uppercase text-slate-500 border-b border-slate-200">Identity</th>
                                <th className="p-4 font-black uppercase text-slate-500 border-b border-slate-200">Extended IDs</th>
                                <th className="p-4 font-black uppercase text-slate-500 border-b border-slate-200">Family/WA</th>
                                <th className="p-4 font-black uppercase text-slate-500 border-b border-slate-200 text-right">M. Fee</th>
                                <th className="p-4 font-black uppercase text-slate-500 border-b border-slate-200 text-right">Indiv. Waiver</th>
                                <th className="p-4 font-black uppercase text-slate-500 border-b border-slate-200 text-right">B/F Dues</th>
                                <th className="p-4 border-b border-slate-200"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {previewData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                  <td className="p-4 font-bold text-red-900">
                                    <div className="flex items-center gap-2">
                                      {row.studentName}
                                      {row.historicalMatch && (
                                        <span className="text-[8px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full border border-amber-200 shadow-sm animate-pulse">
                                          Returning ({row.historicalMatch})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-normal">{row.grade}-{row.section} | R#{row.rollNo}</div>
                                  </td>
                                  <td className="p-4 font-mono text-[9px] text-slate-600">
                                    <div>Adm: {row.admissionNo}</div>
                                    <div className="opacity-50">Aadhar: {row.aadharCard}</div>
                                  </td>
                                  <td className="p-4">
                                    <div className="font-bold text-slate-700">{row.fatherName}</div>
                                    <div className="text-[9px] text-green-600 font-bold">WA: {row.whatsappNumber || row.mobileNumber}</div>
                                  </td>
                                  <td className="p-4 font-black text-slate-900 text-right">
                                    ₹{row.monthlyFee.toLocaleString()}
                                  </td>
                                  <td className="p-4 font-black text-amber-600 text-right">
                                    ₹{row.cashDiscount.toLocaleString()}
                                  </td>
                                  <td className="p-4 font-black text-red-600 text-right">₹{row.arrearsMarch2025.toLocaleString()}</td>
                                  <td className="p-4 text-center">
                                    <button onClick={() => removePreviewRow(i)} className="text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">✕</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400 opacity-40">
                          <div className="text-4xl mb-4">📋</div>
                          <p className="text-xs font-bold uppercase tracking-widest">No data mapped.</p>
                          <p className="text-[10px] mt-2">Paste your spreadsheet content into the zone on the left.</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleFinalImport}
                      disabled={isReadOnly || previewData.length === 0}
                      className="w-full bg-red-950 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-red-900 transition-all disabled:opacity-30"
                    >
                      {isReadOnly ? '🔒 IMPORT DISABLED (READ-ONLY)' : `Finalize & Write to ${importTargetSession} Ledger`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="animate-in fade-in slide-in-from-right-4 max-w-3xl mx-auto space-y-12">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-red-950 serif-font">System Configuration</h2>
                  <p className="text-slate-400 text-xs mt-2">Manage global application access and visibility settings.</p>
                </div>

                {/* Data Export Section */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-3xl border border-cyan-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-bold text-blue-950 mb-1 flex items-center gap-2">
                      <span>📥</span> Data Export & Backup
                    </h3>
                    <p className="text-xs text-slate-600">Download or share all school data for backup, reporting, or records transfer.</p>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <button
                      onClick={handleDownloadAsJSON}
                      className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-cyan-200 hover:border-cyan-400 hover:shadow-md transition-all active:scale-95 group"
                    >
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📋</span>
                      <span className="text-[10px] font-black uppercase text-blue-950 text-center">Download JSON</span>
                      <span className="text-[9px] text-slate-500 mt-1 text-center">Full data backup</span>
                    </button>

                    <button
                      onClick={handleDownloadAsCSV}
                      className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-cyan-200 hover:border-cyan-400 hover:shadow-md transition-all active:scale-95 group"
                    >
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</span>
                      <span className="text-[10px] font-black uppercase text-blue-950 text-center">Download CSV</span>
                      <span className="text-[9px] text-slate-500 mt-1 text-center">Excel compatible</span>
                    </button>

                    <button
                      onClick={handleShareViaText}
                      className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-cyan-200 hover:border-cyan-400 hover:shadow-md transition-all active:scale-95 group"
                    >
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔗</span>
                      <span className="text-[10px] font-black uppercase text-blue-950 text-center">Share Summary</span>
                      <span className="text-[9px] text-slate-500 mt-1 text-center">Quick summary</span>
                    </button>

                    <button
                      onClick={() => jsonImportInputRef.current?.click()}
                      disabled={isImportingJSON}
                      className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-cyan-200 hover:border-cyan-400 hover:shadow-md transition-all active:scale-95 group disabled:opacity-50"
                    >
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{isImportingJSON ? '⏳' : '📥'}</span>
                      <span className="text-[10px] font-black uppercase text-blue-950 text-center">Import JSON</span>
                      <span className="text-[9px] text-slate-500 mt-1 text-center">Restore backup</span>
                    </button>
                  </div>

                  <input
                    ref={jsonImportInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    style={{ display: 'none' }}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-[10px] text-blue-900 font-medium leading-relaxed">
                      <strong>📌 Tip:</strong> Use JSON for complete data backup with all records and history. Use CSV for reports in Excel/Sheets. Share Summary is perfect for quick statistics via WhatsApp or Email. Import JSON to restore a complete backup.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                  <div>
                    <h3 className="font-bold text-red-950 mb-1 flex items-center gap-2">
                      <span>📅</span> Session Management
                    </h3>
                    <p className="text-xs text-slate-500">Create new academic sessions for future operations.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Existing Sessions</label>
                      <div className="flex flex-wrap gap-2">
                        {availableSessions.map((session) => (
                          <div key={session} className="px-4 py-2 rounded-xl text-xs font-bold border bg-red-50 border-red-200 text-red-900 flex items-center justify-between gap-4">
                            <span>{session} {session === currentSession && <span className="text-[9px] bg-red-200 px-2 py-0.5 rounded ml-1 font-black">ACTIVE</span>}</span>
                            <button
                              onClick={() => {
                                if (session === currentSession) {
                                  alert("⚠️ Cannot lock the currently active session! Please switch to another session first.");
                                  return;
                                }
                                const isLocked = lockedSessions.includes(session);
                                if (!isLocked) {
                                  const confirmed = window.confirm(`🔒 Lock Session ${session}?\n\nThis session will become READ-ONLY and you won't be able to edit student records, add fees, or make payments.\n\nAre you sure?`);
                                  if (!confirmed) return;
                                }
                                const newLocked = isLocked
                                  ? lockedSessions.filter(s => s !== session)
                                  : [...lockedSessions, session];
                                setLockedSessions(newLocked);
                                localStorage.setItem('ues_locked_sessions', JSON.stringify(newLocked));
                                if (addLog) addLog('Session Lock Toggle', `Session ${session} is now ${!isLocked ? 'LOCKED' : 'UNLOCKED'}`, 'SYSTEM');
                              }}
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${lockedSessions.includes(session)
                                ? 'bg-amber-600 text-white shadow-inner hover:bg-amber-700'
                                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                }`}
                            >
                              {lockedSessions.includes(session) ? '🔒 Locked' : '🔓 Active'}
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {lockedSessions.length === availableSessions.length - 1 && availableSessions.length > 1 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                          <p className="text-[10px] text-red-800 font-bold">⚠️ Almost all sessions are locked! Only {availableSessions.find(s => !lockedSessions.includes(s))} is active.</p>
                        </div>
                      )}

                      {lockedSessions.length > 0 && (
                        <button
                          onClick={() => {
                            const confirmed = window.confirm(`🔓 Unlock ALL Sessions?\n\nThis will make all sessions editable again.\n\nAre you sure?`);
                            if (!confirmed) return;
                            setLockedSessions([]);
                            localStorage.setItem('ues_locked_sessions', JSON.stringify([]));
                            if (addLog) addLog('Emergency Unlock', 'All sessions unlocked', 'SYSTEM');
                            alert('✅ All sessions are now unlocked and editable!');
                          }}
                          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          🔓 Unlock All Sessions
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Register New Session</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 2027-28 (Next session only)"
                          value={newSessionInput}
                          onChange={(e) => setNewSessionInput(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-red-950 focus:ring-2 focus:ring-red-900 outline-none"
                        />
                        <button
                          onClick={() => {
                            const input = newSessionInput.trim();
                            
                            // Format validation
                            if (!input || !/^\d{4}-\d{2}$/.test(input)) {
                              alert("❌ Invalid format!\n\nUse YYYY-YY format (e.g., 2027-28)");
                              return;
                            }

                            // Parse session
                            const parts = input.split('-');
                            const fromYear = parseInt(parts[0]);
                            const toYearShort = parseInt(parts[1]);
                            const toYear = parseInt(`20${parts[1]}`);

                            // Logical validation
                            if (toYear !== fromYear + 1) {
                              alert(`❌ Invalid session logic!\n\nFor session starting in ${fromYear}, ending year must be ${fromYear + 1} (got ${toYear}).`);
                              return;
                            }

                            // Check if already exists
                            if (availableSessions.includes(input)) {
                              alert("⚠️ Session already exists!");
                              return;
                            }

                            // Find the latest session to ensure no skipping
                            const sortedSessions = [...availableSessions].sort().reverse();
                            const latestSession = sortedSessions[0];

                            if (latestSession) {
                              const expectedNext = getNextSession(latestSession);
                              if (input !== expectedNext) {
                                alert(`❌ Session skipping not allowed!\n\nLatest session: ${latestSession}\nExpected next: ${expectedNext}\nYou entered: ${input}\n\n⚠️ Sessions must be sequential without gaps.`);
                                return;
                              }
                            }

                            // All validations passed - register the session
                            onUpdateFees(CLASS_FEE_STRUCTURE, input);
                            setAvailableSessions([input, ...availableSessions]);
                            setNewSessionInput('');
                            if (addLog) addLog('New Session Registered', `Added Session ${input} and initialized with default fees.`, 'SYSTEM');
                            alert(`✅ Session ${input} registered successfully! (Next valid: ${getNextSession(input)})`);
                          }}
                          className="px-6 py-2 bg-red-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-900 shadow-md active:scale-95 transition-all"
                        >
                          Add
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">✓ Format: YYYY-YY (e.g., 2027-28) • Must be next session • No skipping allowed</p>
                    </div>
                  </div>

                </div>

                {/* Payment Account Configuration */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                  <div>
                    <h3 className="font-bold text-red-950 mb-1 flex items-center gap-2">
                      <span>📱</span> UPI Receiving Accounts
                    </h3>
                    <p className="text-xs text-slate-500">Configure the list of authorized UPI receivers for fee collection.</p>
                  </div>

                  <div className="space-y-3">
                    {upiAccounts.map((acc, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200 space-y-3">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">UPI ID {idx + 1}</label>
                            <input
                              type="text"
                              placeholder="9876543210@okaxis or name@bankupi"
                              value={acc}
                              onChange={(e) => {
                                const updated = [...upiAccounts];
                                updated[idx] = e.target.value;
                                setUpiAccounts(updated);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold text-red-950 focus:ring-2 focus:ring-red-900 outline-none"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const updated = upiAccounts.filter((_, i) => i !== idx);
                              const updatedQr = { ...upiQrCodes };
                              delete updatedQr[idx.toString()];
                              setUpiQrCodes(updatedQr);
                              localStorage.setItem('ues_upi_qr_codes', JSON.stringify(updatedQr));
                              setUpiAccounts(updated);
                            }}
                            className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            ✕
                          </button>
                        </div>

                        {/* QR Code Section */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                          {upiQrCodes[idx.toString()] ? (
                            <div className="col-span-2 flex flex-col items-center gap-2">
                              <div className="w-full max-w-[150px] bg-white border-2 border-green-300 rounded-xl p-2 overflow-hidden">
                                <img src={upiQrCodes[idx.toString()]} alt={`QR Code for ${acc}`} className="w-full h-auto" />
                              </div>
                              <p className="text-[9px] text-green-700 font-bold">✓ QR Code Uploaded</p>
                              <button
                                onClick={() => {
                                  const updated = { ...upiQrCodes };
                                  delete updated[idx.toString()];
                                  setUpiQrCodes(updated);
                                  localStorage.setItem('ues_upi_qr_codes', JSON.stringify(updated));
                                }}
                                className="text-[9px] px-3 py-1 bg-amber-100 text-amber-800 rounded-lg font-black hover:bg-amber-200 transition-all"
                              >
                                Change QR
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedQrUpiIndex(idx);
                                setTimeout(() => qrFileInputRef.current?.click(), 0);
                              }}
                              disabled={!acc || acc.trim() === ''}
                              className="col-span-2 flex items-center justify-center gap-2 py-3 px-3 bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl text-[10px] font-black text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              <span>📱</span> Upload QR Code
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <input
                      ref={qrFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (selectedQrUpiIndex !== null) {
                          handleQrUpload(e, selectedQrUpiIndex);
                          setSelectedQrUpiIndex(null);
                        }
                        if (qrFileInputRef.current) qrFileInputRef.current.value = '';
                      }}
                      className="hidden"
                    />

                    <button
                      onClick={() => setUpiAccounts([...upiAccounts, ''])}
                      disabled={isReadOnly}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-red-200 hover:text-red-900 transition-all disabled:opacity-30"
                    >
                      + Add UPI Receiver
                    </button>
                  </div>

                  <hr className="border-slate-100" />

                  <div>
                    <h3 className="font-bold text-red-950 mb-1 flex items-center gap-2">
                      <span>🏛️</span> Bank Destinations
                    </h3>
                    <p className="text-xs text-slate-500">Manage the list of banks available for direct transfers.</p>
                  </div>

                  <div className="space-y-3">
                    {bankAccounts.map((bank, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={bank}
                          onChange={(e) => {
                            const updated = [...bankAccounts];
                            updated[idx] = e.target.value;
                            setBankAccounts(updated);
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-red-950 focus:ring-2 focus:ring-red-900 outline-none"
                        />
                        <button
                          onClick={() => {
                            const updated = bankAccounts.filter((_, i) => i !== idx);
                            setBankAccounts(updated);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setBankAccounts([...bankAccounts, ''])}
                      disabled={isReadOnly}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-red-200 hover:text-red-900 transition-all disabled:opacity-30"
                    >
                      + Add Bank Account
                    </button>
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
                    <h3 className="font-bold text-red-950 text-lg mb-4 serif-font">Session Lifecycle Automation</h3>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="text-sm text-slate-600 space-y-6">
                        <div className="space-y-2">
                          <p>Use this engine to transition students between academic sessions.</p>
                          <ul className="list-disc pl-5 text-xs space-y-1 text-slate-500">
                            <li>Increments Grade (e.g. Class V → Class VI).</li>
                            <li>Carries forward unpaid balance as arrears.</li>
                            <li>Resets individual concessions to 0.</li>
                            <li>Calculates new fees based on target structure.</li>
                          </ul>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400">Migrate From</label>
                            <select
                              value={promoFromSession}
                              onChange={(e) => {
                                setPromoFromSession(e.target.value);
                                // Auto-populate next session
                                if (e.target.value) {
                                  setPromoToSession(getNextSession(e.target.value));
                                } else {
                                  setPromoToSession('');
                                }
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="">Select From</option>
                              {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400">Migrate To (Next Session Only)</label>
                            <select
                              value={promoToSession}
                              onChange={(e) => setPromoToSession(e.target.value)}
                              disabled={!promoFromSession}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">
                                {!promoFromSession ? 'Select From first' : 'Select To'}
                              </option>
                              {promoFromSession && (
                                <option value={getNextSession(promoFromSession)}>
                                  {getNextSession(promoFromSession)} (Next Required)
                                </option>
                              )}
                            </select>
                            {promoFromSession && promoToSession && (
                              <p className="text-[9px] text-amber-600 font-bold">✅ Only next session allowed</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-end">
                        <button
                          onClick={handlePromotion}
                          disabled={isPromoting || !promoFromSession || !promoToSession}
                          className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPromoting ? 'Processing Ledger...' : `Run Promotion (${promoFromSession || '...'} → ${promoToSession || '...'})`}
                        </button>
                        <p className="mt-4 text-[9px] text-red-500 font-bold uppercase tracking-wider text-center">Caution: This process is permanent and affects entire session batch.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
