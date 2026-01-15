
import React, { useState, useEffect } from 'react';
import { SCHOOL_INFO, CLASS_FEE_STRUCTURE, formatDate } from '../constants';
import { FeeCategory } from '../types';

interface AcademicsProps {
  feeStructure?: FeeCategory[];
  session?: string;
}

const Academics: React.FC<AcademicsProps> = ({ feeStructure = CLASS_FEE_STRUCTURE, session = '2026-27' }) => {
  // State to track checkbox selections
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('ues_schedule_selections');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  
  // State for Editable Waiver Percentage
  const [waiverPercent, setWaiverPercent] = useState<number>(() => {
    const saved = localStorage.getItem('ues_global_waiver_config');
    return saved !== null ? parseFloat(saved) : 15;
  });

  // Auto-save selections
  useEffect(() => {
    localStorage.setItem('ues_schedule_selections', JSON.stringify(selectedItems));
  }, [selectedItems]);

  // Auto-save waiver config
  useEffect(() => {
    localStorage.setItem('ues_global_waiver_config', waiverPercent.toString());
  }, [waiverPercent]);

  const isSelected = (className: string, item: string) => {
    const key = `${className}-${item}`;
    return !!selectedItems[key];
  };

  const toggleItem = (className: string, item: string) => {
    const key = `${className}-${item}`;
    setSelectedItems(prev => ({
      ...prev,
      [key]: !isSelected(className, item)
    }));
  };

  const allClasses = feeStructure.flatMap(cat => cat.classes);

  const stageGroups = [
    {
      title: "Foundational Stage - Pre Nursery to Class 2",
      color: "#7f1d1d", // Burgundy
      bg: "#fef2f2",
      classes: allClasses.filter(c => ['Pre Nursery', 'Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2'].includes(c.name))
    },
    {
      title: "Preparatory Stage - 3 to 5",
      color: "#b45309", // Amber
      bg: "#fffbeb",
      classes: allClasses.filter(c => ['Class 3', 'Class 4', 'Class 5'].includes(c.name))
    },
    {
      title: "Middle Stage - 6 to 8",
      color: "#1e40af", // Blue
      bg: "#eff6ff",
      classes: allClasses.filter(c => ['Class 6', 'Class 7', 'Class 8'].includes(c.name))
    },
    {
      title: "Secondary Stage - 9 to 10",
      color: "#334155", // Slate
      bg: "#f8fafc",
      classes: allClasses.filter(c => ['Class 9', 'Class 10'].includes(c.name))
    }
  ];

  // Logic to print the EXACT copy of the schedule with detailed tuition and exam breakdown
  const handlePrintFullSchedule = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download the fee schedule.");
      return;
    }

    let tableBodyHtml = '';
    stageGroups.forEach(group => {
      // Add Stage Header Row
      tableBodyHtml += `
        <tr style="background-color: ${group.bg} !important; -webkit-print-color-adjust: exact; font-weight: 900; color: ${group.color} !important;">
          <td colspan="6" style="padding: 4px 12px; border-left: 6px solid ${group.color}; text-transform: uppercase; font-size: 8.5px; letter-spacing: 1px;">
            ${group.title}
          </td>
        </tr>
      `;

      group.classes.forEach(cls => {
        const annualTuitionRaw = cls.tuition * 12;
        const discountAmount = annualTuitionRaw * (waiverPercent / 100);
        const annualTuitionDiscounted = annualTuitionRaw - discountAmount;
        const totalExamFee = cls.exam * 3;

        const miscItems = [
          { key: 'tie', label: 'Tie', cost: cls.tie },
          { key: 'belt', label: 'Belt', cost: cls.belt },
          { key: 'idCard', label: 'ID Card', cost: cls.idCard },
          { key: 'diary', label: 'Diary', cost: cls.diary },
          { key: 'booklet', label: 'Booklet', cost: cls.booklet },
        ];

        const activeMiscCost = miscItems.reduce((total, item) => 
          isSelected(cls.name, item.key) ? total + item.cost : total, 0
        );

        const grandTotal = annualTuitionDiscounted + totalExamFee + activeMiscCost;

        const selectedMiscLabels = miscItems
          .filter(item => isSelected(cls.name, item.key))
          .map(item => item.label)
          .join(', ');

        tableBodyHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 4px 12px; font-weight: 900; color: #7f1d1d !important; font-size: 11.5px;">${cls.name}</td>
            <td style="padding: 4px 5px; text-align: center; color: #1e293b; font-size: 10.5px; font-weight: 700;">₹${cls.tuition.toLocaleString()}</td>
            
            <td style="padding: 4px 5px; text-align: center; background: #f0fdf4 !important; -webkit-print-color-adjust: exact; border-left: 1px solid #dcfce7; border-right: 1px solid #dcfce7;">
               <div style="font-size: 7.5px; color: #166534; font-weight: bold; margin-bottom: 0px; opacity: 0.6; text-decoration: line-through; line-height: 1;">₹${annualTuitionRaw.toLocaleString()}</div>
               <div style="font-size: 11.5px; font-weight: 900; color: #15803d !important; line-height: 1.1;">₹${annualTuitionDiscounted.toLocaleString()}</div>
               <div style="display: inline-block; background: #15803d !important; color: white !important; font-size: 6.5px; font-weight: 900; padding: 1px 6px; border-radius: 4px; margin-top: 2px; -webkit-print-color-adjust: exact; text-transform: uppercase;">
                  SAVE ₹${discountAmount.toLocaleString()}
               </div>
            </td>

            <td style="padding: 4px 5px; text-align: center; color: #1e293b;">
               <div style="font-size: 10.5px; font-weight: 900; color: #000; line-height: 1;">₹${totalExamFee.toLocaleString()}</div>
               <div style="font-size: 7px; color: #334155; font-weight: 700; line-height: 1;">(₹${cls.exam.toLocaleString()} x 3)</div>
            </td>
            <td style="padding: 4px 5px; text-align: center; color: #92400e !important; font-weight: 800;">
               <div style="font-size: 10.5px; line-height: 1;">₹${activeMiscCost.toLocaleString()}</div>
               <div style="font-size: 6px; color: #475569; font-weight: 700; line-height: 1; margin-top: 1px;">
                 ${selectedMiscLabels || 'None'}
               </div>
            </td>
            <td style="padding: 4px 5px; text-align: center; font-weight: 900; background: #fffbeb !important; color: #000 !important; font-size: 12.5px; -webkit-print-color-adjust: exact; border-left: 1px solid #fed7aa;">₹${grandTotal.toLocaleString()}</td>
          </tr>
        `;
      });
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Session Fee Dossier - ${session}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Playfair+Display:ital,wght@1,700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 landscape; margin: 6mm; }
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 0; 
              margin: 0; 
              background: white; 
              color: #0f172a; 
              line-height: 1.0; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
            .content-wrapper { width: 100%; box-sizing: border-box; padding: 2mm; }
            .letterhead { text-align: center; margin-bottom: 5px; border-bottom: 2.5px solid #7f1d1d; padding-bottom: 4px; }
            .school-name { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 900; color: #7f1d1d !important; text-transform: uppercase; margin: 0; font-style: italic; line-height: 1.1; }
            .motto { font-size: 6.5px; font-weight: 900; letter-spacing: 2px; color: #b45309 !important; margin: 0; text-transform: uppercase; line-height: 1; }
            .doc-title { background: #7f1d1d; color: white !important; display: inline-block; padding: 2px 18px; border-radius: 50px; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 5px; }
            .info-bar { display: flex; align-items: center; width: 100%; margin-top: 5px; font-size: 8.5px; font-weight: 800; color: #1e293b; border-top: 1px solid #e2e8f0; padding-top: 3px; }
            .info-bar-item { flex: 1; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; border: 1px solid #cbd5e1; table-layout: fixed; }
            th { background: #7f1d1d !important; color: white !important; padding: 6px 4px; text-transform: uppercase; font-size: 8px; letter-spacing: 0.8px; font-weight: 900; text-align: center; border: 1.5px solid #991b1b; }
            td { border: 1px solid #cbd5e1; font-size: 10px; word-wrap: break-word; vertical-align: middle; }
            .footer { margin-top: 6px; border-top: 1px solid #cbd5e1; padding-top: 4px; font-size: 7px; color: #334155; text-align: center; font-style: italic; font-weight: 600; }
            
            .print-btn-fixed {
              position: fixed;
              top: 10px;
              right: 10px;
              background: #7f1d1d;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              font-family: 'Inter', sans-serif;
              font-weight: 900;
              text-transform: uppercase;
              font-size: 10px;
              cursor: pointer;
              box-shadow: 0 5px 15px rgba(0,0,0,0.2);
              z-index: 9999;
              display: flex;
              align-items: center;
              gap: 8px;
            }

            @media print {
              .print-btn-fixed { display: none !important; }
              body { margin: 0; padding: 0; }
              .content-wrapper { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn-fixed" onclick="window.print()">
            Confirm Print
          </button>
          
          <div class="content-wrapper">
            <div class="letterhead">
              <h1 class="school-name">${SCHOOL_INFO.name}</h1>
              <div class="motto">${SCHOOL_INFO.motto}</div>
              <div class="doc-title">Detailed Annual Fee Structure • Session ${session}</div>
              <div class="info-bar">
                 <div class="info-bar-item" style="text-align: left;">Campus: ${SCHOOL_INFO.address.split(',')[0]}</div>
                 <div class="info-bar-item" style="text-align: center; font-size: 8.5px; color: #000;">Early Bird Waiver: ${waiverPercent}% (Reflected Below)</div>
                 <div class="info-bar-item" style="text-align: right;">Generated: ${new Date().toLocaleDateString('en-GB')}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 14%; text-align: left; padding-left: 12px;">Grade</th>
                  <th style="width: 10%;">Monthly Fee</th>
                  <th style="width: 26%;">Net Session Total</th>
                  <th style="width: 15%;">Exam Fees (Annual)</th>
                  <th style="width: 15%;">Misc Kit Selection</th>
                  <th style="width: 20%;">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                ${tableBodyHtml}
              </tbody>
            </table>
            <div class="footer">
              Valid for session ${session} only. This is an official computer-generated fee estimation. Figures in INR (₹).
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintSingle = (cls: any, grandTotal: number, activeMiscCost: number, miscItems: any[]) => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) {
      alert("Please allow popups to download individual cards.");
      return;
    }

    const selectedMiscLabels = miscItems
      .filter(item => isSelected(cls.name, item.key))
      .map(item => `<li>${item.label}: ₹${item.cost}</li>`)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Fee Card - ${cls.name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; }
            .header { text-align: center; border-bottom: 3px solid #7f1d1d; padding-bottom: 20px; margin-bottom: 30px; }
            .school-name { font-size: 26px; font-weight: 900; color: #7f1d1d; text-transform: uppercase; margin-bottom: 5px; }
            .sub-header { font-size: 11px; color: #334155; text-transform: uppercase; letter-spacing: 2.5px; font-weight: bold; }
            .card { border: 1px solid #e2e8f0; padding: 40px; border-radius: 20px; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; font-weight: 600; }
            .total-row { display: flex; justify-content: space-between; padding: 25px 0; border-top: 2px solid #000; margin-top: 25px; font-weight: 900; font-size: 20px; color: #000; }
            .misc-list { font-size: 11px; color: #475569; list-style: none; padding: 0; margin: 10px 0; text-align: right; font-weight: bold; }
            .footer-note { font-size: 10px; color: #64748b; margin-top: 40px; text-align: center; line-height: 1.5; font-weight: 600; }
            .print-btn { background: #7f1d1d; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
            @media print { .print-btn { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">🖨️ Print Card</button>
          <div class="header">
            <div class="school-name">${SCHOOL_INFO.name}</div>
            <div class="sub-header">Official Fee Estimation • Session ${session}</div>
          </div>
          <div class="card">
            <h2 style="margin-top: 0; color: #000; font-size: 22px; font-weight: 900;">Standard: ${cls.name}</h2>
            <div class="row">
              <span>Monthly Tuition Fee</span>
              <span>₹${cls.tuition.toLocaleString()}</span>
            </div>
            <div class="row">
              <span>Annual Net Tuition (${waiverPercent}% Waiver)</span>
              <span>₹${(cls.tuition * 12 * (1 - waiverPercent/100)).toLocaleString()}</span>
            </div>
            <div class="row">
              <span>Assessment Charges (Annual)</span>
              <span>₹${(cls.exam * 3).toLocaleString()}</span>
            </div>
            <div class="row">
              <span>Miscellaneous Kit Selection</span>
              <span>₹${activeMiscCost.toLocaleString()}</span>
            </div>
            ${selectedMiscLabels ? `<ul class="misc-list">${selectedMiscLabels}</ul>` : ''}
            <div class="total-row">
              <span>TOTAL ESTIMATED</span>
              <span>₹${grandTotal.toLocaleString()}</span>
            </div>
            <p class="footer-note">
              * This document is a digital estimation generated for planning purposes only.<br/>
              Actual fees may vary based on student-specific concessions.
            </p>
          </div>
          <script>
            window.onload = function() { 
              window.print(); 
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="pb-20 print:pb-0 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 6mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; color: black !important; }
          .no-print, nav, footer, .chatbot-btn, button:not(.print-allow) { display: none !important; }
        }
      `}</style>

      <div className="bg-red-950 text-white py-24 text-center border-b-8 border-amber-700 no-print">
        <h1 className="text-5xl font-extrabold mb-4 serif-font tracking-tight">Academic Excellence</h1>
        <p className="text-xl text-red-200/60 max-w-2xl mx-auto italic font-light">{SCHOOL_INFO.affiliation.replace(/Session.*/, `Session ${session}`)}</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-24 print:mt-0 print:px-0">
        
        <section className="bg-white rounded-[3.5rem] p-4 md:p-12 shadow-2xl border-2 border-red-50 relative overflow-hidden print:rounded-none print:shadow-none print:border-none print:p-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full translate-x-1/2 -translate-y-1/2 opacity-50 no-print"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start mb-8 relative z-10 px-4 md:px-0">
            <div className="text-left">
              <div className="text-amber-700 font-bold text-xs uppercase tracking-[0.3em] mb-4 no-print">Session Fee Dossier</div>
              <h2 className="text-4xl font-black text-red-950 serif-font italic">Fee Schedule {session}</h2>
              <p className="text-slate-500 mt-4 max-w-xl text-sm no-print">
                Configure the <strong>Global Waiver (%)</strong> and <strong>Misc Items</strong> below. The PDF export will include a full breakdown of tuition and exam fees.
              </p>
            </div>
            <div className="mt-6 md:mt-0 flex flex-wrap gap-4 no-print">
               <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                  <label className="text-[9px] font-black uppercase text-amber-700 tracking-widest mb-1">Global Waiver (%)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={waiverPercent}
                      onChange={(e) => setWaiverPercent(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-white border border-amber-300 rounded-lg py-1.5 text-center font-black text-red-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-400">%</span>
                  </div>
               </div>
               <div className="flex flex-col gap-2">
                 <button 
                  onClick={handlePrintFullSchedule}
                  className="bg-red-950 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg hover:bg-red-800 transition-all flex items-center justify-center border-b-4 border-black active:border-b-0 active:translate-y-1"
                 >
                   <span className="mr-2 text-lg">📄</span> Download Detailed PDF
                 </button>
               </div>
            </div>
          </div>

          <div className="overflow-x-auto relative z-10 rounded-3xl border border-slate-100 shadow-sm bg-white">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-red-950 text-white">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest border-r border-white/10">Standard</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest border-r border-white/10 text-center bg-red-900/50">
                    <div>Tuition</div>
                    <div className="opacity-50 text-[8px]">(Monthly)</div>
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest border-r border-white/10 text-center bg-green-900/50">
                    <div>Net Session Tuition</div>
                    <div className="opacity-50 text-[8px]">({waiverPercent}% Waiver Applied)</div>
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest border-r border-white/10 text-center">
                     <div>Assessments</div>
                     <div className="opacity-50 text-[8px]">(Annual Total)</div>
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest border-r border-white/10 text-center bg-amber-600 text-white">
                    Grand Total
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center min-w-[250px]">
                    <div>Misc Kit Selection</div>
                    <div className="opacity-50 text-[8px] print:hidden">(Add items to total)</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stageGroups.map((group) => (
                  <React.Fragment key={group.title}>
                    <tr className="bg-slate-50 font-black uppercase tracking-widest text-xs" style={{ color: group.color }}>
                      <td colSpan={6} className="px-6 py-4 border-l-8" style={{ borderLeftColor: group.color }}>
                        {group.title}
                      </td>
                    </tr>
                    
                    {group.classes.map((cls) => {
                      const annualTuitionRaw = cls.tuition * 12;
                      const discountAmount = annualTuitionRaw * (waiverPercent / 100);
                      const annualTuitionDiscounted = annualTuitionRaw - discountAmount;
                      const totalExamFee = cls.exam * 3;

                      const miscItems = [
                        { key: 'tie', label: 'Tie', cost: cls.tie },
                        { key: 'belt', label: 'Belt', cost: cls.belt },
                        { key: 'idCard', label: 'ID Card', cost: cls.idCard },
                        { key: 'diary', label: 'Diary', cost: cls.diary },
                        { key: 'booklet', label: 'Booklet', cost: cls.booklet },
                      ];

                      const activeMiscCost = miscItems.reduce((total, item) => {
                        return isSelected(cls.name, item.key) ? total + item.cost : total;
                      }, 0);

                      const grandTotal = annualTuitionDiscounted + totalExamFee + activeMiscCost;

                      return (
                        <tr key={cls.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-5 border-r border-slate-100 align-top">
                            <div className="flex justify-between items-center">
                              <div className="font-bold text-red-950 text-base mt-2">{cls.name}</div>
                              <button 
                                onClick={() => handlePrintSingle(cls, grandTotal, activeMiscCost, miscItems)}
                                className="no-print p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-900 transition-colors"
                                title={`Download ${cls.name} Estimator`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                              </button>
                            </div>
                          </td>
                          
                          <td className="px-6 py-5 text-center border-r border-slate-100 bg-slate-50/50 align-top">
                            <span className="font-bold text-slate-700 mt-2 block">₹{cls.tuition.toLocaleString()}</span>
                          </td>

                          <td className="px-6 py-5 text-center border-r border-slate-100 bg-green-50/30 align-top">
                            <div className="flex flex-col items-center mt-1">
                              <span className="text-[10px] line-through text-slate-500 no-print">₹{annualTuitionRaw.toLocaleString()}</span>
                              <span className="font-black text-green-700 text-lg">₹{annualTuitionDiscounted.toLocaleString()}</span>
                              <span className="text-[9px] font-bold text-white bg-green-600 px-2 py-0.5 rounded-md mt-1 shadow-sm no-print">
                                Save ₹{discountAmount.toLocaleString()}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-center border-r border-slate-100 align-top">
                            <div className="flex flex-col items-center mt-2">
                              <span className="font-bold text-slate-800">₹{totalExamFee.toLocaleString()}</span>
                              <span className="text-[9px] text-slate-500 no-print">@ ₹{cls.exam}/term x 3</span>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-center bg-amber-50/50 border-r border-slate-100 align-top">
                            <div className="mt-2">
                              <span className="font-black text-red-950 text-xl block transition-all duration-300 transform">
                                ₹{grandTotal.toLocaleString()}
                              </span>
                              <span className="text-[9px] text-amber-800 font-bold uppercase tracking-tight no-print">Yearly Projection</span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-left">
                             <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                {miscItems.map((item) => (
                                  <label key={item.key} className="flex items-center space-x-2 cursor-pointer group select-none">
                                    <div className="relative no-print">
                                      <input 
                                        type="checkbox" 
                                        className="peer sr-only"
                                        checked={isSelected(cls.name, item.key)}
                                        onChange={() => toggleItem(cls.name, item.key)}
                                      />
                                      <div className="w-4 h-4 border-2 border-slate-300 rounded bg-white peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all"></div>
                                      <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-slate-700 group-hover:text-red-900 transition-colors">
                                        <span className="print:hidden">{item.label}</span>
                                        <span className="hidden print:inline text-[9px] font-bold">
                                           {isSelected(cls.name, item.key) ? `• ${item.label}` : ''}
                                        </span>
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-bold">₹{item.cost}</span>
                                    </div>
                                  </label>
                                ))}
                             </div>
                             <div className="mt-3 pt-2 border-t border-slate-100 text-right print:hidden">
                               <span className="text-[10px] text-slate-500 mr-2 font-black uppercase">Misc Total:</span>
                               <span className="text-xs font-bold text-amber-700">₹{activeMiscCost.toLocaleString()}</span>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-red-950 no-print">
                <tr>
                  <td colSpan={6} className="px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center text-xs">
                      <div className="flex gap-6">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-100 border border-green-200 mr-2"></div>
                          <span className="text-slate-700 font-bold">{waiverPercent}% Waiver Applied on Session Total</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-white border border-slate-200 mr-2"></div>
                          <span className="text-slate-700 font-bold">Exam Fee Calculated x3 Terms</span>
                        </div>
                      </div>
                      <p className="text-slate-500 font-bold mt-2 md:mt-0 italic">* All figures in INR. Select "Download Detailed PDF" for a comprehensive breakdown.</p>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div className="bg-white rounded-[3rem] p-12 shadow-xl border-2 border-red-50 no-print">
          <h2 className="text-3xl font-bold text-red-950 mb-8 serif-font text-center">Pedagogical Framework (NEP 2020)</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-red-50 rounded-2xl">
              <h3 className="font-bold text-red-900 mb-2">Foundational (5 Years)</h3>
              <p className="text-sm text-slate-700 font-medium">Nursery to Class II. Emphasis on language development and play-based pedagogy.</p>
            </div>
            <div className="p-6 bg-amber-50 rounded-2xl">
              <h3 className="font-bold text-amber-800 mb-2">Preparatory (3 Years)</h3>
              <p className="text-sm text-slate-700 font-medium">Classes III to V. Introduction to formal subjects like Science, Math, and Social Studies.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <h3 className="font-bold text-slate-800 mb-2">Middle (3 Years)</h3>
              <p className="text-sm text-slate-700 font-medium">Classes VI to VIII. Focus on vocational crafts and subject-oriented learning.</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center no-print pb-20">
          <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white h-[400px]">
            <img src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800" alt="Yoga Session" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
          </div>
          <div>
            <h2 className="text-4xl font-bold text-red-950 mb-6 serif-font italic">Holistic Development</h2>
            <p className="text-slate-700 leading-relaxed mb-8 text-lg font-medium italic">
              Beyond academics, UES focuses on the spiritual and physical well-being of every scholar. From Vedic Mathematics to Yoga, our integrated curriculum ensures a balanced growth of body and mind.
            </p>
            <div className="grid grid-cols-2 gap-6">
              {[
                { title: 'Vedic Math', desc: 'Ancient Speed Calculation' },
                { title: 'Robotics', desc: '21st Century Engineering' },
                { title: 'Yoga', desc: 'Spiritual Connectivity' },
                { title: 'Hindi Sahitya', desc: 'Linguistic Heritage' }
              ].map(feature => (
                <div key={feature.title} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="font-black text-red-900 text-xs uppercase mb-1 tracking-widest">{feature.title}</div>
                  <div className="text-[10px] text-slate-500 font-bold">{feature.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Academics;
