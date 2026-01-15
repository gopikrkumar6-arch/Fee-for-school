
import React, { useState, useMemo, useRef } from 'react';
import { FeeRecord, PaymentMode, Transaction } from '../types';
import { formatDate, getStudentPhoto } from '../constants';

interface AlumniProps {
  students: FeeRecord[];
  currentSession: string;
  onUpdateStudents: (students: FeeRecord[]) => void;
}

const Alumni: React.FC<AlumniProps> = ({ students, currentSession, onUpdateStudents }) => {
  const [view, setView] = useState<'batches' | 'list'>('batches');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<FeeRecord | null>(null);
  
  // Search States
  const [sessionSearchTerm, setSessionSearchTerm] = useState(''); 
  const [globalSearchTerm, setGlobalSearchTerm] = useState(''); 
  
  // Modal Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'ledger' | 'pay'>('profile');

  // Payment State
  const [payAmount, setPayAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('Cash');
  const [isProcessing, setIsProcessing] = useState(false);

  // Photo State
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAlumni, setNewAlumni] = useState({
      session: '',
      name: '',
      fatherName: '',
      mobile: '',
      arrears: '',
      photo: ''
  });

  // 1. Filter students
  const allAlumni = useMemo(() => {
    return students.filter(s => s.status === 'PASSED' || s.grade === 'PASSED');
  }, [students]);

  // 2. Group by Session
  const alumniBySession = useMemo(() => {
    const groups: Record<string, FeeRecord[]> = {};
    allAlumni.forEach(s => {
      // Exclude Current Session Alumni
      if (s.academicSession === currentSession) return;

      if (!groups[s.academicSession]) groups[s.academicSession] = [];
      groups[s.academicSession].push(s);
    });
    return groups;
  }, [allAlumni, currentSession]);

  // 3. Generate Sessions List (2013-14 to Current-1)
  const availableSessions = useMemo(() => {
    const startYear = 2013;
    const currentYearVal = parseInt(currentSession.split('-')[0]);
    const sessions = new Set<string>();
    
    // Add existing data sessions first
    Object.keys(alumniBySession).forEach(s => sessions.add(s));

    // Fill gaps back to 2013
    for (let y = startYear; y < currentYearVal; y++) {
        sessions.add(`${y}-${(y+1).toString().slice(-2)}`);
    }
    
    return Array.from(sessions).sort().reverse();
  }, [alumniBySession, currentSession]);

  // 4. Active List (Session Specific)
  const activeSessionList = useMemo(() => {
    if (!selectedSession) return [];
    return alumniBySession[selectedSession] || [];
  }, [selectedSession, alumniBySession]);

  // 5. Filter (Session Specific)
  const filteredSessionList = useMemo(() => {
    return activeSessionList.filter(s => 
        s.studentName.toLowerCase().includes(sessionSearchTerm.toLowerCase()) || 
        s.admissionNo?.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
        s.mobileNumber?.includes(sessionSearchTerm)
    );
  }, [activeSessionList, sessionSearchTerm]);

  // 6. Global Search List
  const globalSearchResults = useMemo(() => {
    if (!globalSearchTerm) return [];
    const term = globalSearchTerm.toLowerCase();
    // Search across ALL alumni groups excluding current session
    return allAlumni.filter(s => 
        s.academicSession !== currentSession && (
            s.studentName.toLowerCase().includes(term) || 
            s.admissionNo?.toLowerCase().includes(term) ||
            s.mobileNumber?.includes(term) ||
            s.fatherName?.toLowerCase().includes(term)
        )
    );
  }, [allAlumni, globalSearchTerm, currentSession]);

  // Helper: Get Pending Dues
  const getPendingDues = (student: FeeRecord) => {
      return Math.max(0, student.arrearsMarch2025 - student.paidAmount);
  };

  const getBatchStats = (session: string) => {
      const list = alumniBySession[session] || [];
      const totalDues = list.reduce((sum, s) => sum + getPendingDues(s), 0);
      const totalCollected = list.reduce((sum, s) => sum + s.paidAmount, 0);
      return { count: list.length, totalDues, totalCollected };
  };

  const handleBatchClick = (session: string) => {
      setSelectedSession(session);
      setView('list');
      setSessionSearchTerm('');
      setGlobalSearchTerm(''); 
  };

  const handleBackToBatches = () => {
      setSelectedSession(null);
      setView('batches');
      setSessionSearchTerm('');
      setGlobalSearchTerm('');
  };

  const openProfile = (student: FeeRecord) => {
      setSelectedStudent(student);
      setActiveTab('profile');
      setPayAmount(getPendingDues(student).toString());
      setDiscountAmount('');
  };

  const closeProfile = () => {
      setSelectedStudent(null);
      setIsProcessing(false);
      setDiscountAmount('');
  };

  const handlePayment = (e: React.FormEvent) => {
      e.preventDefault();
      const payment = parseFloat(payAmount) || 0;
      const discount = parseFloat(discountAmount) || 0;

      if (!selectedStudent || (payment <= 0 && discount <= 0)) return;

      setIsProcessing(true);
      setTimeout(() => {
          const newTransactions: Transaction[] = [];

          if (discount > 0) {
              newTransactions.push({
                  id: `WVR-ALM-${Date.now()}`,
                  receiptId: '-',
                  date: formatDate(new Date()),
                  description: 'Alumni Settlement Waiver',
                  amount: discount,
                  type: 'Credit',
                  mode: 'Waiver'
              });
          }

          if (payment > 0) {
              newTransactions.push({
                  id: `TXN-ALM-${Date.now()}`,
                  receiptId: `ALM-RCPT-${Math.floor(Math.random() * 9000) + 1000}`,
                  date: formatDate(new Date()),
                  description: 'Arrears Clearance (Alumni)',
                  amount: payment,
                  type: 'Credit',
                  mode: payMode
              });
          }

          const totalCleared = payment + discount;

          const updatedStudent = {
              ...selectedStudent,
              paidAmount: selectedStudent.paidAmount + totalCleared,
              history: [...newTransactions, ...selectedStudent.history] 
          };

          const updatedList = students.map(s => s.id === selectedStudent.id ? updatedStudent : s);
          onUpdateStudents(updatedList);
          setSelectedStudent(updatedStudent); 
          setIsProcessing(false);
          setActiveTab('ledger'); 
          setDiscountAmount('');
          setPayAmount('');
      }, 1500);
  };

  // --- Add Alumni Handlers ---
  const handleAddAlumni = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAlumni.name || !newAlumni.session) return;

      const newRecord: FeeRecord = {
          id: `ALM-${Date.now()}`,
          academicSession: newAlumni.session,
          studentName: newAlumni.name,
          fatherName: newAlumni.fatherName || 'N/A',
          motherName: 'N/A',
          grade: 'PASSED',
          section: 'N/A',
          rollNo: 'N/A',
          mobileNumber: newAlumni.mobile,
          admissionNo: `LEGACY-${Math.floor(Math.random()*10000)}`,
          monthlyFee: 0,
          cashDiscount: 0,
          totalAnnualFee: 0,
          paidAmount: 0,
          dueDate: '-',
          status: 'PASSED',
          category: 'Tuition',
          arrearsMarch2025: parseFloat(newAlumni.arrears) || 0,
          monthlyStatus: {},
          examFeeStatus: { 'Term 1': 'Unpaid', 'Term 2': 'Unpaid', 'Term 3': 'Unpaid' },
          history: [],
          siblings: [],
          photo: newAlumni.photo
      };

      onUpdateStudents([...students, newRecord]);
      setIsAddModalOpen(false);
      setNewAlumni({ session: '', name: '', fatherName: '', mobile: '', arrears: '', photo: '' });
      alert(`Alumni ${newRecord.studentName} added to Batch ${newRecord.academicSession}`);
  };

  const handlePhotoUploadAlumni = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAlumni(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const isGlobalSearchActive = globalSearchTerm.length > 0;
  const displayList = isGlobalSearchActive ? globalSearchResults : filteredSessionList;

  return (
    <div className="pb-20 min-h-screen bg-slate-50">
      
      {fullScreenPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in zoom-in duration-200" onClick={() => setFullScreenPhoto(null)}>
          <img src={fullScreenPhoto} alt="Full Screen" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border-4 border-white object-contain" />
          <button className="absolute top-6 right-6 text-white text-4xl hover:text-red-500 transition-colors">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-red-950 text-white py-12 px-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
             <h1 className="text-3xl font-bold serif-font mb-2">Alumni Archives</h1>
             <p className="font-bold text-xs uppercase tracking-widest text-amber-500">
                Passed Students & Legacy Records (2013 - {parseInt(currentSession.split('-')[0]) - 1})
             </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
             {/* Global Search Bar */}
             <div className="relative flex-1 md:w-80 w-full">
                <input 
                    type="text" 
                    placeholder="Search All Alumni Sessions..." 
                    value={globalSearchTerm}
                    onChange={(e) => setGlobalSearchTerm(e.target.value)}
                    className="w-full bg-red-900/50 border border-red-800 text-white placeholder-red-300 text-sm rounded-full pl-5 pr-10 py-3 focus:outline-none focus:bg-red-900 focus:border-amber-500 transition-all font-medium"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-300 pointer-events-none">🔍</span>
             </div>

             <div className="flex gap-2">
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                >
                    + Register Alumni
                </button>

                {view === 'list' && !isGlobalSearchActive && (
                    <button 
                        onClick={handleBackToBatches}
                        className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-white/20 shrink-0"
                    >
                        ← Batches
                    </button>
                )}
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-8">
         
         {/* VIEW 1: BATCH SELECTION (Only if not searching globally and not in list view) */}
         {!isGlobalSearchActive && view === 'batches' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                {availableSessions.length > 0 ? (
                    availableSessions.map(session => {
                        const stats = getBatchStats(session);
                        return (
                            <button 
                                key={session}
                                onClick={() => handleBatchClick(session)}
                                className={`rounded-[2rem] p-8 shadow-xl border-2 transition-all text-left group relative overflow-hidden ${stats.count > 0 ? 'bg-white hover:border-amber-500' : 'bg-slate-50 border-transparent opacity-80 hover:opacity-100 hover:border-slate-300'}`}
                            >
                                {stats.count > 0 ? (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-amber-50 transition-colors"></div>
                                ) : (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200 rounded-full translate-x-1/2 -translate-y-1/2 opacity-20"></div>
                                )}
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`font-black text-[10px] uppercase px-3 py-1 rounded-full tracking-widest ${stats.count > 0 ? 'bg-red-100 text-red-900' : 'bg-slate-200 text-slate-500'}`}>
                                            Batch {session.split('-')[0]}
                                        </div>
                                        <span className={`text-3xl transition-transform ${stats.count > 0 ? 'group-hover:scale-110' : 'grayscale opacity-50'}`}>🎓</span>
                                    </div>
                                    
                                    <h3 className={`text-2xl font-bold mb-1 ${stats.count > 0 ? 'text-slate-800' : 'text-slate-400'}`}>Session {session}</h3>
                                    <p className={`text-xs font-medium mb-6 ${stats.count > 0 ? 'text-slate-400' : 'text-slate-400 italic'}`}>
                                        {stats.count > 0 ? `${stats.count} Passed` : 'No Records'}
                                    </p>
                                    
                                    {stats.count > 0 ? (
                                        <div className="border-t border-slate-100 pt-4 mt-4 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Pending</p>
                                                <p className={`text-xl font-black ${stats.totalDues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {stats.totalDues > 0 ? `₹${stats.totalDues.toLocaleString()}` : 'Settled'}
                                                </p>
                                            </div>
                                            <div className="text-right border-l border-slate-100 pl-4">
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Collected</p>
                                                <p className="text-xl font-black text-green-700">
                                                    ₹{stats.totalCollected.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-t border-slate-200 pt-4 mt-4 text-xs text-slate-400 font-medium">
                                            Click to open & add alumni manually.
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <div className="col-span-full bg-white p-12 rounded-[2rem] text-center shadow-lg">
                        <div className="text-4xl mb-4 grayscale opacity-30">📂</div>
                        <h3 className="text-xl font-bold text-slate-400">No Archives Found</h3>
                        <p className="text-slate-400 text-xs mt-2">Promote students to 'PASSED' status to see them here.</p>
                        <p className="text-[10px] text-red-400 mt-1 italic">(Current session {currentSession} students are excluded)</p>
                    </div>
                )}
             </div>
         )}

         {/* VIEW 2: STUDENT LIST (Session Specific OR Global Search) */}
         {(isGlobalSearchActive || view === 'list') && (
             <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in">
                
                {/* Toolbar */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                   <div className="flex items-center gap-4">
                        <div className={`text-white w-12 h-12 flex items-center justify-center rounded-xl font-black text-sm shadow-md ${isGlobalSearchActive ? 'bg-amber-600' : 'bg-red-900'}`}>
                            {isGlobalSearchActive ? 'ALL' : selectedSession?.split('-')[0].slice(-2)}
                        </div>
                        <div>
                            <h2 className="font-bold text-red-950 text-lg">
                                {isGlobalSearchActive ? 'Global Search Results' : `Batch of ${selectedSession}`}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">{displayList.length} Records Found</p>
                        </div>
                   </div>

                   <div className="flex gap-3 w-full md:w-auto">
                        {!isGlobalSearchActive && (
                            <div className="relative flex-1 md:w-64">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                                <input 
                                type="text" 
                                placeholder="Filter within batch..." 
                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-900 transition-all"
                                value={sessionSearchTerm}
                                onChange={(e) => setSessionSearchTerm(e.target.value)}
                                />
                            </div>
                        )}
                        <button 
                            onClick={() => window.print()}
                            className="bg-white border border-slate-200 text-slate-500 hover:text-red-900 hover:border-red-200 px-4 rounded-xl transition-all"
                            title="Print List"
                        >
                            🖨️
                        </button>
                   </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Identity</th>
                        {isGlobalSearchActive && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Batch</th>}
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Guardian Info</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Contact</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Outstanding Dues</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayList.map(student => {
                        const dues = getPendingDues(student);
                        return (
                        <tr key={student.id} className="hover:bg-amber-50/50 transition-colors group cursor-pointer" onClick={() => openProfile(student)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-slate-200 mr-3 overflow-hidden border-2 border-white shadow-sm group-hover:border-amber-300 transition-all">
                                   <img src={getStudentPhoto(student.photo, student.studentName)} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <div className="font-bold text-red-950 text-sm group-hover:text-amber-700 transition-colors">{student.studentName}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">UID: {student.admissionNo || student.id}</div>
                                </div>
                            </div>
                          </td>
                          {isGlobalSearchActive && (
                              <td className="px-6 py-4">
                                  <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                      {student.academicSession}
                                  </span>
                              </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="text-xs font-bold text-slate-600">{student.fatherName}</div>
                            <div className="text-[10px] text-slate-400">M: {student.motherName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-bold text-slate-600">{student.mobileNumber || 'N/A'}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{student.address || 'Address not updated'}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {dues > 0 ? (
                               <span className="text-sm font-black text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                 ₹{dues.toLocaleString()}
                               </span>
                            ) : (
                               <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                 Settled
                               </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                             <button className="text-slate-300 group-hover:text-amber-600 transition-colors">
                                View →
                             </button>
                          </td>
                        </tr>
                      )})}
                      {displayList.length === 0 && (
                        <tr>
                          <td colSpan={isGlobalSearchActive ? 6 : 5} className="p-12 text-center text-slate-400 italic">
                            {isGlobalSearchActive ? 'No records matching your search.' : (
                                <div className="flex flex-col items-center">
                                    <p className="mb-4">No passed students in this session yet.</p>
                                    <button 
                                        onClick={() => { setIsAddModalOpen(true); setNewAlumni({...newAlumni, session: selectedSession || ''}); }}
                                        className="text-xs bg-amber-600 text-white px-4 py-2 rounded-full font-bold uppercase tracking-widest hover:bg-amber-700"
                                    >
                                        + Add First Alumni
                                    </button>
                                </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
         )}
      </div>

      {/* Add Alumni Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative">
                <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-900 text-2xl"
                >
                    &times;
                </button>
                
                <h2 className="text-2xl font-bold text-red-950 mb-1 serif-font">Manual Alumni Registration</h2>
                <p className="text-slate-500 text-xs mb-6">Add a past student record for legacy tracking.</p>

                <form onSubmit={handleAddAlumni} className="space-y-4">
                    {/* Alumni Photo Upload Section */}
                    <div className="flex flex-col items-center justify-center mb-6">
                        <div className="relative group">
                            <div className="w-24 h-24 bg-slate-100 rounded-full border-2 border-slate-200 flex items-center justify-center overflow-hidden mb-2 relative">
                                {newAlumni.photo ? (
                                    <img src={getStudentPhoto(newAlumni.photo, newAlumni.name || 'Preview')} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <span className="text-2xl mb-1">📷</span>
                                        <span className="text-[9px] font-bold uppercase">Photo</span>
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-2 right-0 bg-red-900 text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-red-800 transition-all active:scale-90"
                                title="Capture / Upload Alumni Photo"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handlePhotoUploadAlumni} 
                                accept="image/*" 
                                className="hidden" 
                                capture="environment"
                            />
                        </div>
                        <input 
                            type="text"
                            placeholder="Or paste Photo URL"
                            value={newAlumni.photo}
                            onChange={(e) => setNewAlumni({...newAlumni, photo: e.target.value})}
                            className="w-48 text-[10px] bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-center outline-none focus:border-red-900 mt-2"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Session *</label>
                        <select 
                            value={newAlumni.session}
                            onChange={(e) => setNewAlumni({...newAlumni, session: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none"
                            required
                        >
                            <option value="">Select Batch</option>
                            {availableSessions.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Student Name *</label>
                        <input 
                            type="text" 
                            value={newAlumni.name}
                            onChange={(e) => setNewAlumni({...newAlumni, name: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none"
                            placeholder="Full Name"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Father's Name</label>
                            <input 
                                type="text" 
                                value={newAlumni.fatherName}
                                onChange={(e) => setNewAlumni({...newAlumni, fatherName: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none"
                                placeholder="Mr. Name"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Mobile</label>
                            <input 
                                type="text" 
                                value={newAlumni.mobile}
                                onChange={(e) => setNewAlumni({...newAlumni, mobile: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-900 outline-none"
                                placeholder="9876543210"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Legacy Arrears Amount (₹)</label>
                        <input 
                            type="number" 
                            value={newAlumni.arrears}
                            onChange={(e) => setNewAlumni({...newAlumni, arrears: e.target.value})}
                            className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-lg font-black text-red-900 focus:ring-2 focus:ring-red-900 outline-none"
                            placeholder="0"
                        />
                        <p className="text-[10px] text-red-400 mt-1 italic">* Enter outstanding amount as of today. If settled, leave 0.</p>
                    </div>

                    <button 
                        type="submit" 
                        disabled={!newAlumni.session || !newAlumni.name}
                        className="w-full bg-red-950 text-white py-4 rounded-xl font-bold uppercase tracking-widest shadow-xl hover:bg-red-900 transition-all disabled:opacity-50 mt-4"
                    >
                        Create Alumni Record
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Enhanced Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={closeProfile}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-red-950 p-6 text-white relative shrink-0">
                    <button 
                        onClick={closeProfile}
                        className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-20 h-20 rounded-full border-4 border-white/20 shadow-lg overflow-hidden bg-slate-800 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setFullScreenPhoto(getStudentPhoto(selectedStudent.photo, selectedStudent.studentName))}
                            title="View Full Size"
                        >
                            <img src={getStudentPhoto(selectedStudent.photo, selectedStudent.studentName)} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                            <div className="inline-block px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest mb-1">
                                Alumni {selectedStudent.academicSession}
                            </div>
                            <h3 className="text-2xl font-bold serif-font leading-none mb-1">{selectedStudent.studentName}</h3>
                            <p className="text-xs text-red-200 font-medium">UID: {selectedStudent.admissionNo || selectedStudent.id}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
                    {['profile', 'ledger', 'pay'].map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t as any)}
                            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === t ? 'bg-white text-red-900 border-b-2 border-red-900' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {t === 'pay' ? 'Clear Dues' : t === 'ledger' ? 'Ledger History' : 'Profile'}
                        </button>
                    ))}
                </div>

                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    
                    {/* Tab: Profile */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Father's Name</p>
                                    <p className="text-sm font-bold text-slate-700">{selectedStudent.fatherName}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Mother's Name</p>
                                    <p className="text-sm font-bold text-slate-700">{selectedStudent.motherName}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Contact</p>
                                    <p className="text-sm font-bold text-slate-700">{selectedStudent.mobileNumber || '-'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">DOB</p>
                                    <p className="text-sm font-bold text-slate-700">{selectedStudent.dob || '-'}</p>
                                </div>
                                <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Address</p>
                                    <p className="text-sm font-bold text-slate-700">{selectedStudent.address || '-'}</p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="text-xs font-black uppercase text-red-950 tracking-widest mb-4">Financial Status</h4>
                                <div className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500">Current Outstanding</p>
                                        <p className="text-[10px] text-slate-400">(Includes carried over arrears)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-2xl font-black ${getPendingDues(selectedStudent) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            ₹{getPendingDues(selectedStudent).toLocaleString()}
                                        </p>
                                        {getPendingDues(selectedStudent) > 0 ? (
                                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Unpaid</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Fully Paid</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Ledger History */}
                    {activeTab === 'ledger' && (
                        <div className="space-y-4">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-amber-900">Remaining Balance</p>
                                    <p className="text-[10px] text-amber-700/70">As of batch session {selectedStudent.academicSession}</p>
                                </div>
                                <p className="text-xl font-black text-amber-800">₹{getPendingDues(selectedStudent).toLocaleString()}</p>
                            </div>

                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <tr>
                                        <th className="py-2 px-2">Date</th>
                                        <th className="py-2">Description</th>
                                        <th className="py-2 text-right">Debit</th>
                                        <th className="py-2 text-right px-2">Credit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* Show Opening Balance if history is empty or implies start */}
                                    {selectedStudent.history.length === 0 && selectedStudent.arrearsMarch2025 > 0 && (
                                        <tr>
                                            <td className="py-3 px-2 text-slate-500">01/04/{selectedStudent.academicSession.split('-')[0]}</td>
                                            <td className="py-3 font-bold text-slate-700">Opening Balance (Arrears)</td>
                                            <td className="py-3 text-right text-red-600 font-bold">₹{selectedStudent.arrearsMarch2025.toLocaleString()}</td>
                                            <td className="py-3 text-right px-2">-</td>
                                        </tr>
                                    )}
                                    
                                    {/* Render Actual History */}
                                    {selectedStudent.history.length > 0 ? (
                                        selectedStudent.history.map((txn, i) => (
                                            <tr key={i}>
                                                <td className="py-3 px-2 text-slate-500 whitespace-nowrap">{txn.date}</td>
                                                <td className="py-3 font-medium text-slate-800">{txn.description} <span className="text-[9px] bg-slate-100 px-1 rounded border border-slate-200 text-slate-500">{txn.mode}</span></td>
                                                <td className="py-3 text-right text-red-600 font-bold">{txn.type === 'Debit' ? `₹${txn.amount}` : '-'}</td>
                                                <td className="py-3 text-right px-2 text-green-600 font-bold">{txn.type === 'Credit' ? `₹${txn.amount}` : '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        selectedStudent.arrearsMarch2025 === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-slate-400 italic">No transaction history found.</td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tab: Pay Dues */}
                    {activeTab === 'pay' && (
                        <div className="space-y-6">
                            <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Current Balance Due</p>
                                <p className="text-4xl font-black text-red-950">₹{getPendingDues(selectedStudent).toLocaleString()}</p>
                            </div>

                            <form onSubmit={handlePayment} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Payment Amount (₹)</label>
                                        <input 
                                            type="number" 
                                            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-lg font-bold outline-none focus:ring-2 focus:ring-red-900"
                                            value={payAmount}
                                            onChange={(e) => setPayAmount(e.target.value)}
                                            max={getPendingDues(selectedStudent)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Discount / Waiver (₹)</label>
                                        <input 
                                            type="number" 
                                            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-lg font-bold outline-none focus:ring-2 focus:ring-green-600 text-green-700"
                                            value={discountAmount}
                                            onChange={(e) => setDiscountAmount(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                {/* Calculation Summary */}
                                <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Clearance Effect:</span>
                                    <span className="ml-2 font-black text-slate-800">
                                        ₹{((parseFloat(payAmount)||0) + (parseFloat(discountAmount)||0)).toLocaleString()}
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Payment Mode</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['Cash', 'UPI', 'Bank Transfer'].map(m => (
                                            <button 
                                                key={m}
                                                type="button"
                                                onClick={() => setPayMode(m as any)}
                                                className={`py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${
                                                    payMode === m ? 'bg-red-950 text-white border-red-950' : 'bg-white text-slate-500 border-slate-200'
                                                }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isProcessing || (!payAmount && !discountAmount) || (parseFloat(payAmount) <= 0 && parseFloat(discountAmount) <= 0)}
                                    className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest shadow-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {isProcessing ? 'Processing...' : 'Confirm Transaction'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 text-center border-t border-slate-200 shrink-0">
                    <button onClick={closeProfile} className="text-xs font-bold text-slate-500 hover:text-red-900 uppercase tracking-widest transition-colors">
                        Close Modal
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Alumni;
