
import React, { useState, useMemo, useEffect } from 'react';
import { FeeRecord } from '../types';
import { getStudentPhoto, SCHOOL_INFO } from '../constants';

interface SenderProfile {
    name: string;
    phone: string;
}

interface MessagingToolProps {
  isOpen: boolean;
  onClose: () => void;
  students: FeeRecord[];
  currentSession: string;
  messageTemplate: string;
  setMessageTemplate: (t: string) => void;
  referenceMonth: string;
  setReferenceMonth: (m: string) => void;
  senderProfile: SenderProfile;
  setSenderProfile: (p: SenderProfile) => void;
}

const SESSION_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SENDER_PROFILES: SenderProfile[] = [
    { name: 'Accounts Department', phone: SCHOOL_INFO.phone },
    { name: 'Principal Office', phone: SCHOOL_INFO.phone },
    { name: 'General Administration', phone: SCHOOL_INFO.phone },
    { name: 'Academic Coordinator', phone: SCHOOL_INFO.phone }
];

const MessagingTool: React.FC<MessagingToolProps> = ({ 
  isOpen, onClose, students, currentSession, 
  messageTemplate, setMessageTemplate,
  referenceMonth, setReferenceMonth,
  senderProfile, setSenderProfile
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Filter students for the current session
  const sessionStudents = useMemo(() => 
    students.filter(s => s.academicSession === currentSession), 
    [students, currentSession]
  );

  const filteredStudents = useMemo(() => 
    sessionStudents.filter(s => 
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.id.includes(searchTerm)
    ), [sessionStudents, searchTerm]
  );

  useEffect(() => {
    if (filteredStudents.length > 0 && !selectedStudentId) {
        setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents]);

  const activeStudent = useMemo(() => 
    students.find(s => s.id === selectedStudentId), 
    [students, selectedStudentId]
  );

  // --- ENHANCED PLACEHOLDER ENGINE ---
  const parseMessage = (template: string, student: FeeRecord | undefined): string => {
    if (!student) return template;
    
    // Calculate Net Due (Arrears + Debits - Paid)
    const totalDebits = student.history
      .filter(t => t.type === 'Debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const netDue = Math.max(0, (student.arrearsMarch2025 + totalDebits) - student.paidAmount);

    return template
      .replace(/{name}/g, student.studentName)
      .replace(/{id}/g, student.id)
      .replace(/{grade}/g, student.grade)
      .replace(/{roll}/g, student.rollNo || 'N/A')
      .replace(/{due}/g, netDue.toLocaleString())
      .replace(/{father}/g, student.fatherName || 'Guardian')
      .replace(/{mother}/g, student.motherName || 'Guardian')
      .replace(/{month}/g, referenceMonth);
  };

  const previewMessage = useMemo(() => 
    parseMessage(messageTemplate, activeStudent), 
    [messageTemplate, activeStudent, referenceMonth]
  );

  const handleSend = () => {
    setIsSending(true);
    // Simulate API call to communication gateway
    setTimeout(() => {
        setIsSending(false);
        const target = activeStudent?.whatsappNumber || activeStudent?.mobileNumber || 'N/A';
        alert(`Personalized Broadcast dispatched from "${senderProfile.name}" to "${activeStudent?.studentName}" on ${target}.`);
        onClose();
    }, 2000);
  };

  const insertPlaceholder = (ph: string) => {
    const textarea = document.getElementById('message-composer') as HTMLTextAreaElement;
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        const newText = before + `{${ph}}` + after;
        setMessageTemplate(newText);
        // Reset focus
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + ph.length + 2, start + ph.length + 2);
        }, 10);
    } else {
        setMessageTemplate(messageTemplate + ` {${ph}}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-red-950/40 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-[3rem] shadow-2xl max-w-6xl w-full h-[88vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                 <span className="text-2xl">✉️</span>
              </div>
              <div>
                 <h2 className="text-2xl font-bold serif-font italic">Smart Outbound Console</h2>
                 <p className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em]">Personalized Messaging Engine</p>
              </div>
           </div>
           <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">&times;</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
           
           {/* Sidebar: Student Selector */}
           <div className="w-1/4 border-r border-slate-100 flex flex-col bg-slate-50/50">
              <div className="p-4 border-b border-slate-100 bg-white">
                 <label className="block text-[9px] font-black uppercase text-slate-400 mb-2">Search Receivers</label>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                    <input 
                        type="text" 
                        placeholder="Name or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-red-900 outline-none"
                    />
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                 {filteredStudents.map(s => (
                    <button 
                       key={s.id}
                       onClick={() => setSelectedStudentId(s.id)}
                       className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedStudentId === s.id ? 'bg-red-900 text-white shadow-md' : 'hover:bg-white text-slate-600'}`}
                    >
                       <img src={getStudentPhoto(s.photo, s.studentName)} className="w-8 h-8 rounded-full object-cover border border-white/20" alt="" />
                       <div className="text-left overflow-hidden">
                          <p className="text-xs font-bold truncate">{s.studentName}</p>
                          <p className={`text-[9px] uppercase font-black tracking-tighter ${selectedStudentId === s.id ? 'text-red-200' : 'text-slate-400'}`}>{s.grade} • Roll: {s.rollNo}</p>
                       </div>
                    </button>
                 ))}
              </div>
           </div>

           {/* Main Work Area */}
           <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col">
              
              <div className="mb-6 grid md:grid-cols-2 gap-6 items-end">
                  <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Sender Identity (From)</label>
                      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-inner">
                         <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white text-lg">🏫</div>
                         <div className="flex-1">
                            <select 
                                value={senderProfile.name}
                                onChange={(e) => {
                                    const p = SENDER_PROFILES.find(sp => sp.name === e.target.value);
                                    if(p) setSenderProfile(p);
                                }}
                                className="w-full bg-transparent font-black text-sm text-amber-900 focus:outline-none cursor-pointer"
                            >
                                {SENDER_PROFILES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                            </select>
                            <p className="text-[10px] text-amber-700/60 font-bold">Verified Outbound API Profile</p>
                         </div>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block text-right">Reference Timing</label>
                      <div className="flex justify-end gap-2">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Demand Month:</label>
                            <select 
                                value={referenceMonth}
                                onChange={(e) => setReferenceMonth(e.target.value)}
                                className="bg-transparent font-black text-xs text-red-900 focus:outline-none"
                            >
                                {SESSION_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                      </div>
                  </div>
              </div>

              <div className="mb-6">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Compose Template</label>
                 <textarea 
                    id="message-composer"
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    className="w-full h-44 bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-sm font-medium focus:border-red-950 focus:bg-white transition-all outline-none resize-none shadow-inner leading-relaxed"
                    placeholder="Type your message here..."
                 />
                 
                 <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase mr-1 self-center">Smart Inserts:</span>
                    {[
                        { key: 'name', label: 'Student Name' },
                        { key: 'roll', label: 'Roll No' },
                        { key: 'mother', label: 'Mother' },
                        { key: 'father', label: 'Father' },
                        { key: 'due', label: 'Outstanding' },
                        { key: 'month', label: 'Ref Month' },
                        { key: 'grade', label: 'Grade' },
                        { key: 'id', label: 'UID' }
                    ].map(ph => (
                       <button 
                          key={ph.key}
                          type="button"
                          onClick={() => insertPlaceholder(ph.key)}
                          className="px-3 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1"
                          title={`Insert ${ph.label}`}
                       >
                          <span className="opacity-40 text-[8px]">＋</span>
                          {ph.key}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="mt-auto">
                 <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Live Personalized Preview</label>
                 <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 relative overflow-hidden group shadow-sm border-l-8 border-l-amber-500">
                    <div className="absolute top-0 right-0 p-3 bg-slate-50 border-bl rounded-bl-2xl text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                       Preview for {activeStudent?.studentName.split(' ')[0]}
                    </div>
                    
                    {activeStudent ? (
                       <div className="space-y-4">
                          <p className="text-sm text-slate-700 font-medium leading-relaxed italic pr-12">
                             "{previewMessage}"
                          </p>
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold text-slate-400">Target Recipient: <span className="font-black text-slate-800">{activeStudent.whatsappNumber || activeStudent.mobileNumber || 'N/A'}</span></span>
                                <span className="ml-1 text-[8px] font-black uppercase bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">{activeStudent.whatsappNumber ? 'WhatsApp' : 'SMS'}</span>
                             </div>
                             <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase">
                                Valid Template ✅
                             </div>
                          </div>
                       </div>
                    ) : (
                       <p className="text-xs text-slate-400 italic">Select a student from the sidebar to generate preview.</p>
                    )}
                 </div>
              </div>

           </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
           <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                 <span className="w-2 h-2 rounded-full bg-red-950"></span>
                 <span>Placeholders are <span className="font-black text-red-950">Case-Sensitive</span></span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                 <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                 <span>Gateway Source: <span className="font-black text-amber-700">{senderProfile.name} ({senderProfile.phone})</span></span>
              </div>
           </div>
           <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="px-8 py-3 text-xs font-black uppercase text-slate-400 hover:text-red-950 transition-colors tracking-widest"
              >
                 Discard
              </button>
              <button 
                onClick={handleSend}
                disabled={isSending || !activeStudent}
                className="bg-red-950 text-white px-10 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-red-900 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
              >
                 {isSending ? (
                    <>
                       <svg className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24"></svg>
                       Dispatched...
                    </>
                 ) : (
                    <>🚀 Send Personalized Broadcast</>
                 )}
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default MessagingTool;
