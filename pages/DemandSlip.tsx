
import React, { useState, useMemo } from 'react';
import { FeeRecord, Transaction } from '../types';
import { SCHOOL_INFO, getFeeConfig, formatDate, CLASS_FEE_STRUCTURE } from '../constants';
import printService from '../services/printService';

const SESSION_MONTHS = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];
const EXAM_TERMS = ['Term 1', 'Term 2', 'Term 3'];

interface DemandSlipProps {
  students: FeeRecord[];
  onUpdateStudents: (list: FeeRecord[]) => void;
  currentSession: string;
  isReadOnly?: boolean;
  feeStructure?: any[];
}

const DemandSlip: React.FC<DemandSlipProps> = ({ students, onUpdateStudents, currentSession, isReadOnly = false, feeStructure = [] }) => {
  const findFeeConfig = (grade: string) => {
    const structureToUse = feeStructure.length > 0 ? feeStructure : CLASS_FEE_STRUCTURE;
    for (const cat of structureToUse) {
      const cls = cat.classes.find((c: any) => c.name === grade);
      if (cls) return cls;
    }
    return getFeeConfig(grade); // Fallback to default in constants if not found
  };

  const [demandMonth, setDemandMonth] = useState('APR');

  const toggleBulkMonth = (month: string) => {
    setBulkMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const [selectedClass, setSelectedClass] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [includeExamFee, setIncludeExamFee] = useState('');
  const [includeIdCard, setIncludeIdCard] = useState('no');

  const [miscModalOpen, setMiscModalOpen] = useState(false);
  const [miscStudent, setMiscStudent] = useState<FeeRecord | null>(null);
  const [miscSelection, setMiscSelection] = useState<Record<string, boolean>>({
    tie: false, belt: false, diary: false, idCard: false, booklet: false
  });

  // Bulk Generation States
  const [bulkMonths, setBulkMonths] = useState<string[]>([demandMonth]);
  const [bulkMiscSelection, setBulkMiscSelection] = useState<Record<string, boolean>>({
    tie: false, belt: false, diary: false, idCard: false, booklet: false
  });
  const [isBulkMode, setIsBulkMode] = useState(false);


  const availableClassNames = useMemo(() => {
    const structureToUse = feeStructure.length > 0 ? feeStructure : CLASS_FEE_STRUCTURE;
    return structureToUse.flatMap(cat => cat.classes.map((cls: any) => cls.name));
  }, [feeStructure]);

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
            return findFeeConfig(student.statusMetadata.oldClass);
          }
        }
      }
    }

    if (student.academicStatus === 'Transfer' && student.statusMetadata?.transferMonth && student.statusMetadata?.oldClass) {
      const transferIndex = SESSION_MONTHS.indexOf(student.statusMetadata.transferMonth);
      if (currentIndex < transferIndex) {
        return findFeeConfig(student.statusMetadata.oldClass);
      }
    }
    return findFeeConfig(student.grade);
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
    const config = findFeeConfig(miscStudent.grade);
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
      printWindow.document.write(`
        <html>
        <head>
          <title>Misc Demand Slip</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;700;900&display=swap');
            * { margin:0; padding:0; box-sizing: border-box; }
            body { font-family: 'Crimson Pro', serif; padding: 20px; display: flex; justify-content: center; background: white; }
            .slip-inner { border: 1px solid black; width: 105mm; padding: 10px; display: flex; flex-direction: column; }
            .header { text-align: center; margin-bottom: 10px; }
            .om { font-size: 20px; }
            .label-top { font-size: 10px; }
            .school-name { font-size: 24px; font-weight: 900; margin: 4px 0; }
            .address { font-size: 10px; text-decoration: underline; text-decoration-color: red; }
            .branch { font-size: 13px; font-weight: bold; margin-top: 4px; }
            .student-info { font-size: 14px; margin: 10px 0; line-height: 1.5; }
            .bold { font-weight: bold; }
            .fees-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 14px; }
            .fees-table th, .fees-table td { border: 1px solid black; padding: 6px; }
            .col-particular { width: 70%; text-align: center; }
            .col-rs { width: 20%; text-align: center; }
            .col-p { width: 10%; }
            .total-row td { font-weight: bold; height: 35px; }
            .footer { margin-top: 10px; position: relative; min-height: 60px; }
            .nb { font-size: 11px; width: 80%; }
            .signature { position: absolute; right: 10px; bottom: 0; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="slip-inner">
            <div class="header">
              <div class="om">ॐ</div>
              <div class="label-top">MISC KIT DEMAND SLIP</div>
              <h1 class="school-name">UNIQUE ENGLISH SCHOOL</h1>
              <div class="address">Manpur Patwatoli Gaya</div>
              <div class="branch">Branch – IV</div>
            </div>

            <div class="student-info">
              <div>Date – ${formatDate(new Date())}</div>
              <div>Name - <span class="bold">${updatedStudent.studentName}</span></div>
              <div style="display:flex; justify-content:space-between;">
                <span>Class -${updatedStudent.grade}</span>
                <span>Sec -${updatedStudent.section}</span>
                <span>Roll –${updatedStudent.rollNo}</span>
              </div>
            </div>

            <table class="fees-table">
              <thead>
                <tr>
                  <th class="col-particular">Particular</th>
                  <th class="col-rs">Rs.</th>
                  <th class="col-p">P.</th>
                </tr>
              </thead>
              <tbody>
                ${Object.keys(miscSelection).map(key => {
        if (!miscSelection[key]) return '';
        const val = (config as any)[key];
        if (val <= 0) return '';
        return `<tr><td>${key.toUpperCase()} KIT CHARGES</td><td align="center">${val}</td><td></td></tr>`;
      }).join('')}
                <tr class="total-row">
                  <td align="right">NET PAYABLE</td>
                  <td align="center">${totalMiscAmount}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              <div class="nb">Charges added to student ledger. Please pay at counter or online.</div>
              <div class="signature">Sign.</div>
            </div>
          </div>
          <script>window.onload = function() { setTimeout(() => { window.print(); }, 100); }</script>
        </body>
        </html>`);

      printWindow.document.close();
    }
    setMiscModalOpen(false);
  };

  const generateAndPrintSlips = (printQueue: { student: FeeRecord, month: string, isReprint: boolean, addedExamFee: boolean, addedIdCard: boolean }[], existingWindow: Window | null) => {
    const printWindow = existingWindow || window.open('', '_blank');
    if (!printWindow) { alert("Popups are blocked! Please allow popups for this site to print demand slips."); return; }

    const slipsHtml = printQueue.map(({ student, month, isReprint, addedExamFee, addedIdCard }, index) => {
      const mConfig = getConfigForMonth(student, month);
      const currentFee = mConfig.tuition;
      const demandMonthIndex = SESSION_MONTHS.indexOf(month);
      const startDiscountIndex = SESSION_MONTHS.indexOf(student.discountStartMonth || 'APR');
      const isEligible = demandMonthIndex >= startDiscountIndex;
      const discount = isEligible ? (student.cashDiscount || 0) : 0;
      const netFee = Math.max(0, currentFee - discount);
      const legacyArrears = (student as any).arrearsMarch2025 || 0;
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

      // Format full month name set for the image style
      const monthMap: any = { 'APR': 'April', 'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August', 'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December', 'JAN': 'January', 'FEB': 'February', 'MAR': 'March' };
      const fullMonth = monthMap[month] || month;
      const yearSuffix = month === 'JAN' || month === 'FEB' || month === 'MAR' ? currentSession.split('-')[1] : currentSession.split('-')[0].substring(2);

      const backDues = Math.max(0, netPayable - netFee - examFeeAmount - idCardAmount);

      return `
        <div class="slip-outer">
          <div class="slip-inner">
            ${isReprint ? '<div class="watermark">REPRINT</div>' : ''}
            <div class="header">
              <div class="om">ॐ</div>
              <div class="demand-slip-label">Demand Slip</div>
              <h1 class="school-name">UNIQUE ENGLISH SCHOOL</h1>
              <div class="address">Manpur Patwatoli Gaya</div>
              <div class="branch">Branch – IV</div>
            </div>

            <div class="student-info">
              <div class="info-row">Date – ${formatDate(new Date())}</div>
              <div class="info-row">Name - <span class="bold">${student.studentName}</span></div>
              <div class="info-row flex-row">
                <span>Class -${gradeLabel}</span>
                <span>Sec -${student.section}</span>
                <span>Roll –${student.rollNo}</span>
              </div>
            </div>

            <table class="fees-table">
              <thead>
                <tr>
                  <th class="col-particular">Particular</th>
                  <th class="col-rs">Rs.</th>
                  <th class="col-p">P.</th>
                </tr>
              </thead>
              <tbody>
                ${netFee > 0 ? `
                <tr>
                  <td>Fee of Month – ${fullMonth} '${yearSuffix} -</td>
                  <td align="center">${netFee}</td>
                  <td></td>
                </tr>
                ` : ''}
                ${backDues > 0 ? `
                <tr>
                  <td>Back Dues –</td>
                  <td align="center">${backDues}</td>
                  <td></td>
                </tr>
                ` : ''}
                ${examFeeAmount > 0 ? `
                <tr>
                  <td>Exam Fee –</td>
                  <td align="center">${examFeeAmount}</td>
                  <td></td>
                </tr>
                ` : ''}
                ${idCardAmount > 0 ? `
                <tr>
                  <td>Other Charge –</td>
                  <td align="center">${idCardAmount}</td>
                  <td></td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td align="right" class="bold">Total</td>
                  <td align="center" class="bold">${netPayable}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              <div class="nb">N.B. – Pay it by the end of this month to avail the discount in monthly fee.</div>
              <div class="signature">
                <div class="sign-line">Sign.</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Demand Slips Batch</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;700;900&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Crimson Pro', serif; background: white; }
          
          .page-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            page-break-after: always;
          }

          .slip-outer {
            width: 105mm;
            height: 148.5mm;
            padding: 5mm;
            border: 0.1mm dashed #ccc;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .slip-inner {
            border: 1px solid black;
            height: 100%;
            padding: 5px;
            display: flex;
            flex-direction: column;
          }

          .header { text-align: center; margin-bottom: 5px; }
          .om { font-size: 18px; line-height: 1; }
          .demand-slip-label { font-size: 10px; margin-top: -2px; }
          .school-name { font-size: 20px; font-weight: 900; letter-spacing: 0.5px; margin: 2px 0; }
          .address { font-size: 9px; text-decoration: underline; text-decoration-color: red; }
          .branch { font-size: 12px; font-weight: bold; margin-top: 2px; }

          .student-info { font-size: 13px; margin: 5px 0; line-height: 1.4; }
          .info-row { margin-bottom: 2px; }
          .flex-row { display: flex; justify-content: space-between; padding-right: 10px; }
          .bold { font-weight: bold; }

          .fees-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            flex-grow: 1;
          }
          .fees-table th, .fees-table td {
            border: 1px solid black;
            padding: 4px;
          }
          .col-particular { width: 68%; text-align: center; }
          .col-rs { width: 22%; text-align: center; }
          .col-p { width: 10%; }

          .fees-table tbody td {
            height: 25px;
            vertical-align: middle;
          }
          
          .total-row td { height: 30px; }

          .footer { margin-top: 5px; position: relative; }
          .nb { font-size: 10px; width: 75%; line-height: 1.1; }
          .signature {
            position: absolute;
            right: 5px;
            bottom: 0px;
            text-align: center;
          }
          .sign-line { font-size: 10px; border-top: none; padding-top: 20px; }

          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 40px;
            opacity: 0.1;
            font-weight: bold;
            pointer-events: none;
          }

          @media print {
            body { background: none; }
            .slip-outer { border: none; }
            .page-container { margin: 0; border: none; }
          }
        </style>
      </head>
      <body>
        <div id="slips-root"></div>
        <script>
          const slips = \`${slipsHtml}\`;
          const root = document.getElementById('slips-root');
          const slipGroups = [];
          
          // Helper to group slips into pages of 4
          const parser = new DOMParser();
          const doc = parser.parseFromString(\`<div>\${slips}</div>\`, 'text/html');
          const slipElements = Array.from(doc.body.firstChild.children);
          
          for (let i = 0; i < slipElements.length; i += 4) {
            const page = document.createElement('div');
            page.className = 'page-container';
            slipElements.slice(i, i + 4).forEach(el => page.appendChild(el.cloneNode(true)));
            root.appendChild(page);
          }

          window.onload = () => {
            setTimeout(() => { window.print(); }, 100);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };


  const handleBulkGenerate = () => {
    if (isReadOnly) return;
    if (bulkMonths.length === 0) { alert("Please select at least one month."); return; }

    const count = filteredStudents.length;
    if (count === 0) { alert("No students match the current filters."); return; }

    const confirmMsg = `Generate & Print demand slips for ${count} students across ${bulkMonths.length} month(s)?\n\nThis will create debit transactions for any missing fees.`;
    if (!window.confirm(confirmMsg)) return;

    let updatedStudentsList = [...students];
    const printQueue: { student: FeeRecord, month: string, isReprint: boolean, addedExamFee: boolean, addedIdCard: boolean }[] = [];

    const sortedBulkMonths = [...bulkMonths].sort((a, b) => SESSION_MONTHS.indexOf(a) - SESSION_MONTHS.indexOf(b));

    filteredStudents.forEach(student => {
      let currentStudent = { ...student };
      let anyNewTxn = false;

      sortedBulkMonths.forEach(month => {
        const isReprint = checkDemandExists(currentStudent, month);
        const isApplicable = isMonthFeeApplicable(currentStudent, month);
        const isSeqValid = checkSequence(currentStudent, month);

        if (!isReprint && (!isApplicable || (!isSeqValid && currentStudent.monthlyStatus[month] !== 'Paid' && currentStudent.monthlyStatus[month] !== 'Exempted'))) {
          return;
        }

        const newTransactions: Transaction[] = [];
        let addedExam = false;
        let addedIdCard = false;

        if (!isReprint) {
          const demandMonthIndex = SESSION_MONTHS.indexOf(month);
          const startDiscountIndex = SESSION_MONTHS.indexOf(currentStudent.discountStartMonth || 'APR');
          const isEligible = demandMonthIndex >= startDiscountIndex;
          const discount = isEligible ? (currentStudent.cashDiscount || 0) : 0;
          const mConfig = getConfigForMonth(currentStudent, month);
          const netFee = Math.max(0, mConfig.tuition - discount);

          newTransactions.push({
            id: `DEM-${month}-${currentStudent.rollNo}-${Date.now()}-${Math.random()}`,
            receiptId: '-',
            date: formatDate(new Date()),
            description: `Tuition Fee Due - ${month} ${currentSession}`,
            amount: netFee,
            type: 'Debit',
            mode: 'Demand'
          });

          const isExamPaid = currentStudent.examFeeStatus?.[includeExamFee as keyof typeof currentStudent.examFeeStatus] === 'Paid';
          const hasExamDemand = currentStudent.history.some(h => h.description === `Exam Fee Due - ${includeExamFee}`);
          if (includeExamFee && mConfig.exam > 0 && !isExamPaid && !hasExamDemand) {
            newTransactions.push({ id: `DEM-EXAM-${includeExamFee}-${currentStudent.rollNo}-${Date.now()}-${Math.random()}`, receiptId: '-', date: formatDate(new Date()), description: `Exam Fee Due - ${includeExamFee}`, amount: mConfig.exam, type: 'Debit', mode: 'Demand' });
            addedExam = true;
          }

          const hasIdCardDemand = currentStudent.history.some(h => h.description.includes('ID Card Charges'));
          if (includeIdCard === 'yes' && mConfig.idCard > 0 && !hasIdCardDemand) {
            newTransactions.push({ id: `DEM-IDCARD-${currentStudent.rollNo}-${Date.now()}-${Math.random()}`, receiptId: '-', date: formatDate(new Date()), description: `ID Card Charges - ${currentSession}`, amount: mConfig.idCard, type: 'Debit', mode: 'Demand' });
            addedIdCard = true;
          }

          const config = findFeeConfig(currentStudent.grade);
          let totalMiscAmount = 0;
          const itemsAdded: string[] = [];
          Object.keys(bulkMiscSelection).forEach(key => {
            if (bulkMiscSelection[key]) {
              const val = (config as any)[key];
              totalMiscAmount += val;
              itemsAdded.push(`${key.toUpperCase()} (₹${val})`);
            }
          });

          if (totalMiscAmount > 0) {
            newTransactions.push({
              id: `MISC-${Date.now()}-${Math.random()}`,
              receiptId: '-',
              date: formatDate(new Date()),
              description: `Misc Kit: ${itemsAdded.join(', ')}`,
              amount: totalMiscAmount,
              type: 'Debit',
              mode: 'Demand'
            });
          }

          if (newTransactions.length > 0) {
            currentStudent.history = [...newTransactions, ...currentStudent.history];
            anyNewTxn = true;
          }
        } else {
          addedExam = currentStudent.history.some(h => h.description.includes('Exam Fee Due'));
          addedIdCard = currentStudent.history.some(h => h.description.includes('ID Card Charges'));
        }

        printQueue.push({ student: { ...currentStudent }, month, isReprint, addedExamFee: addedExam, addedIdCard: addedIdCard });
      });

      if (anyNewTxn) {
        updatedStudentsList = updatedStudentsList.map(s => s.id === student.id ? currentStudent : s);
      }
    });

    onUpdateStudents(updatedStudentsList);
    generateAndPrintSlips(printQueue, null);
  };


  const handleSingleAction = (student: FeeRecord) => {
    if (isReadOnly) return;
    const isReprint = checkDemandExists(student, demandMonth);

    if (isReprint) {
      const hasExamCharge = student.history.some(h => h.description.includes('Exam Fee Due'));
      const hasIdCardCharge = student.history.some(h => h.description.includes('ID Card Charges'));

      generateAndPrintSlips([{
        student,
        month: demandMonth,
        isReprint: true,
        addedExamFee: hasExamCharge,
        addedIdCard: hasIdCardCharge
      }], null);
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
      generateAndPrintSlips([{ student: updatedStudent, month: demandMonth, isReprint: false, addedExamFee: addedExam, addedIdCard: addedIdCard }], null);

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
                const cost = (findFeeConfig(miscStudent.grade) as any)[item];
                return (
                  <label key={item} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${miscSelection[item] ? 'bg-amber-50 border-amber-500' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={miscSelection[item]}
                        onChange={() => setMiscSelection({ ...miscSelection, [item]: !miscSelection[item] })}
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
                ₹{Object.keys(miscSelection).reduce((acc, k) => miscSelection[k] ? acc + (findFeeConfig(miscStudent.grade) as any)[k] : acc, 0)}
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
          <div><h2 className="text-2xl font-bold serif-font mb-2 italic">Demand Slip Control Center</h2><p className={`font-bold text-[10px] uppercase tracking-widest ${isReadOnly ? 'text-slate-400' : 'text-amber-500'}`}>Session {currentSession}</p></div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsBulkMode(!isBulkMode)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isBulkMode ? 'bg-amber-500 text-red-950 shadow-inner' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'}`}
            >
              {isBulkMode ? '⚡ Standard Mode' : '📦 Bulk Batch Mode'}
            </button>
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
              {!isBulkMode ? (
                <div><label className="block text-[9px] font-black uppercase text-red-200 tracking-widest mb-1">Target Month</label><select value={demandMonth} onChange={(e) => setDemandMonth(e.target.value)} className="bg-white text-red-950 text-xs font-bold rounded-xl py-2 px-6 focus:outline-none cursor-pointer">{SESSION_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              ) : (
                <div>
                  <label className="block text-[9px] font-black uppercase text-red-200 tracking-widest mb-1">Select Months ({bulkMonths.length})</label>
                  <div className="flex gap-1 overflow-x-auto max-w-[300px] no-scrollbar py-1">
                    {SESSION_MONTHS.map(m => (
                      <button
                        key={m}
                        onClick={() => toggleBulkMonth(m)}
                        className={`min-w-[40px] h-8 rounded-lg text-[9px] font-black transition-all ${bulkMonths.includes(m) ? 'bg-amber-500 text-red-950' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="h-10 w-px bg-white/20 hidden md:block"></div>
              <div><label className="block text-[9px] font-black uppercase text-red-200 tracking-widest mb-1">Attach Exam Fee?</label><select value={includeExamFee} onChange={(e) => setIncludeExamFee(e.target.value)} className="bg-white text-red-950 text-xs font-bold rounded-xl py-2 px-4 focus:outline-none cursor-pointer w-32"><option value="">No</option>{EXAM_TERMS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="h-10 w-px bg-white/20 hidden md:block"></div>
              <div><label className="block text-[9px] font-black uppercase text-red-200 tracking-widest mb-1">Attach ID Card?</label><select value={includeIdCard} onChange={(e) => setIncludeIdCard(e.target.value)} className="bg-white text-red-950 text-xs font-bold rounded-xl py-2 px-4 focus:outline-none cursor-pointer w-24"><option value="no">No</option><option value="yes">Yes</option></select></div>
            </div>
          </div>
        </div>

        {isBulkMode && (
          <div className="max-w-7xl mx-auto mt-8 p-6 bg-white/5 rounded-[2.5rem] border border-white/10 animate-in slide-in-from-top-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Bulk Misc Kit Selection
                </h3>
                <div className="flex flex-wrap gap-3">
                  {['tie', 'belt', 'diary', 'idCard', 'booklet'].map(item => (
                    <label key={item} className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all border-2 ${bulkMiscSelection[item] ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}>
                      <input
                        type="checkbox"
                        checked={bulkMiscSelection[item]}
                        onChange={() => setBulkMiscSelection({ ...bulkMiscSelection, [item]: !bulkMiscSelection[item] })}
                        className="w-4 h-4 rounded border-white/20 text-amber-500 focus:ring-amber-500 bg-transparent"
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest">{item === 'idCard' ? 'ID Card' : item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={handleBulkGenerate}
                  disabled={isReadOnly || bulkMonths.length === 0}
                  className="group relative overflow-hidden px-10 py-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl text-red-950 font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                >
                  <div className="relative z-10 flex items-center gap-3">
                    <span>Launch Batch Process</span>
                    <span className="text-lg">🚀</span>
                  </div>
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                </button>
              </div>
            </div>
          </div>
        )}
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
                            className={`text-[9px] font-black uppercase tracking-widest border px-4 py-2 rounded-xl transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${hasDemand
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
