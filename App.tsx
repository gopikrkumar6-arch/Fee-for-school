
import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AIChatbot from './components/AIChatbot';
import HistoryDrawer from './components/HistoryDrawer';
import Home from './pages/Home';
import Directory from './pages/Directory';
import Academics from './pages/Academics';
import Dashboard from './pages/Dashboard';
import CounterEntry from './pages/CounterEntry';
import DemandSlip from './pages/DemandSlip';
import Admissions from './pages/Admissions';
import Settings from './pages/Settings';
import Hisab from './pages/Hisab';
import Login from './pages/Login';
import Contact from './pages/Contact';
import ReceiptManager from './pages/ReceiptManager';
import DueReminders from './pages/DueReminders';

import { Page, FeeRecord, FeeCategory, Expense, ActionLog, BranchCollection, DueReminder, ReminderHistory, ReceiptBook, CancelledReceipt } from './types';
import { MOCK_FEES, CLASS_FEE_STRUCTURE } from './constants';
import { useAuth } from './src/hooks/useAuth';
import { supabase, isSupabaseConfigured } from './src/lib/supabase';
import AuthForm from './src/components/AuthForm';
import SyncStatus from './src/components/SyncStatus';


const App: React.FC = () => {
  // Supabase Authentication (with error handling)
  let user = null;
  let authLoading = false;
  let supabaseSignOut = () => { };
  let supabaseEnabled = false;

  try {
    const auth = useAuth();
    user = auth.user;
    authLoading = auth.loading;
    supabaseSignOut = auth.signOut;
    supabaseEnabled = isSupabaseConfigured();
  } catch (error) {
    console.error('Supabase initialization error:', error);
    // Fallback to non-Supabase mode
  }

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (!isSupabaseConfigured()) return true;
    return localStorage.getItem('ues_is_authenticated') === 'true';
  });

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
      localStorage.setItem('ues_is_authenticated', 'true');
    } else if (!authLoading && !supabaseEnabled) {
      setIsAuthenticated(true);
      localStorage.setItem('ues_is_authenticated', 'true');
    } else if (!authLoading && supabaseEnabled && !user) {
      setIsAuthenticated(false);
      localStorage.removeItem('ues_is_authenticated');
    }
  }, [user, authLoading, supabaseEnabled]);

  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('ues_current_page');
    return (saved as Page) || Page.Home;
  });
  const [students, setStudents] = useState<FeeRecord[]>([]);
  const [historyStack, setHistoryStack] = useState<FeeRecord[][]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [dashboardTargetId, setDashboardTargetId] = useState<string | null>(() => {
    return localStorage.getItem('ues_dashboard_target_id');
  });

  // UI States
  const [availableSessions, setAvailableSessions] = useState<string[]>(() => {
    const saved = localStorage.getItem('ues_available_sessions');
    return saved ? JSON.parse(saved) : ['2026-27', '2025-26'];
  });
  const [currentSession, setCurrentSession] = useState(() => {
    return localStorage.getItem('ues_current_session') || availableSessions[0] || '2026-27';
  });
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Persistent Receipt Manager State
  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptAuditBookId, setReceiptAuditBookId] = useState<string | null>(null);
  const [isReceiptAuditOpen, setIsReceiptAuditOpen] = useState(false);

  // Cross-Branch Collections State
  const [branchCollections, setBranchCollections] = useState<BranchCollection[]>([]);

  // Due Reminders State
  const [dueReminders, setDueReminders] = useState<DueReminder[]>([]);
  const [reminderHistory, setReminderHistory] = useState<ReminderHistory[]>([]);

  // Fee Structure State
  const [feeStructures, setFeeStructures] = useState<Record<string, FeeCategory[]>>(() => {
    const saved = localStorage.getItem('ues_fee_structures');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse fee structures:", e);
      }
    }
    return {
      '2026-27': CLASS_FEE_STRUCTURE,
      '2025-26': CLASS_FEE_STRUCTURE.map(cat => ({
        ...cat,
        classes: cat.classes.map(c => ({ ...c, tuition: Math.max(0, c.tuition - 500) }))
      }))
    };
  });

  // Expense State
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Receipt Manager State
  const [receiptBooks, setReceiptBooks] = useState<ReceiptBook[]>([]);
  const [cancelledReceipts, setCancelledReceipts] = useState<CancelledReceipt[]>([]);

  // Academics State
  const [academicSelections, setAcademicSelections] = useState<Record<string, boolean>>({});
  const [globalWaiver, setGlobalWaiver] = useState<number>(15);

  // Payment Account States
  const [upiAccounts, setUpiAccounts] = useState<string[]>(["Director Sir", "Office Primary", "Gopi Nand"]);
  const [upiQrCodes, setUpiQrCodes] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('ues_upi_qr_codes');
    return saved ? JSON.parse(saved) : {};
  });
  const [bankAccounts, setBankAccounts] = useState<string[]>(["State Bank of India", "HDFC Bank", "Punjab National Bank"]);
  const [lockedSessions, setLockedSessions] = useState<string[]>([]);


  const isReadOnly = lockedSessions.includes(currentSession);

  // Persistence: Load Initial Data from Supabase/LocalStorage
  useEffect(() => {
    const loadData = async () => {
      // 1. Load from LocalStorage first (for speed/offline)
      const savedStudents = localStorage.getItem('ues_students_v2');
      const savedLogs = localStorage.getItem('ues_action_logs');
      const savedExpenses = localStorage.getItem('ues_expenses');
      const savedBranch = localStorage.getItem('ues_branch_collections');
      const savedReminders = localStorage.getItem('ues_due_reminders');
      const savedHistory = localStorage.getItem('ues_reminder_history');
      const savedFeeStructures = localStorage.getItem('ues_fee_structures');
      const savedReceiptBooks = localStorage.getItem('ues_receipt_books');
      const savedCancelled = localStorage.getItem('ues_cancelled_receipts');
      const savedAcademics = localStorage.getItem('ues_schedule_selections');
      const savedWaiver = localStorage.getItem('ues_global_waiver_config');
      const savedUPI = localStorage.getItem('ues_upi_receivers');
      const savedBanks = localStorage.getItem('ues_bank_names');
      const savedAvailableSessions = localStorage.getItem('ues_available_sessions');
      const savedLockedSessions = localStorage.getItem('ues_locked_sessions');

      if (savedStudents) setStudents(JSON.parse(savedStudents));
      else setStudents([]);

      if (savedLogs) setActionLogs(JSON.parse(savedLogs));
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      if (savedBranch) setBranchCollections(JSON.parse(savedBranch));
      if (savedReminders) setDueReminders(JSON.parse(savedReminders));
      if (savedHistory) setReminderHistory(JSON.parse(savedHistory));
      if (savedFeeStructures) setFeeStructures(JSON.parse(savedFeeStructures));
      if (savedReceiptBooks) setReceiptBooks(JSON.parse(savedReceiptBooks));
      if (savedCancelled) setCancelledReceipts(JSON.parse(savedCancelled));
      if (savedAcademics) setAcademicSelections(JSON.parse(savedAcademics));
      if (savedWaiver) setGlobalWaiver(parseFloat(savedWaiver));
      if (savedUPI) setUpiAccounts(JSON.parse(savedUPI));
      if (savedBanks) setBankAccounts(JSON.parse(savedBanks));
      if (savedAvailableSessions) setAvailableSessions(JSON.parse(savedAvailableSessions));
      if (savedLockedSessions) setLockedSessions(JSON.parse(savedLockedSessions));

      // 2. If Supabase is logged in, fetch from Cloud
      if (supabaseEnabled && user) {
        try {
          // Fetch Students
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('data')
            .eq('user_id', user.id);

          if (studentData && studentData.length > 0) {
            try {
              const cloudStudents = studentData.map(item => item.data);
              setStudents(cloudStudents as any);
            } catch (err) {
              console.error("Error processing cloud students:", err);
            }
          } else if (savedStudents && students.length > 0) {
            // Migration: Push local students to cloud if cloud is empty
            handleUpdateStudents(students);
          }

          // Fetch App Metadata
          const { data: metaData, error: metaError } = await supabase
            .from('app_metadata')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (metaData) {
            if (metaData.expenses) setExpenses(metaData.expenses);
            if (metaData.action_logs) setActionLogs(metaData.action_logs);
            if (metaData.branch_collections) setBranchCollections(metaData.branch_collections);
            if (metaData.due_reminders) setDueReminders(metaData.due_reminders);
            if (metaData.reminder_history) setReminderHistory(metaData.reminder_history);
            if (metaData.fee_structures) setFeeStructures(metaData.fee_structures);
            if (metaData.receipt_books) setReceiptBooks(metaData.receipt_books);
            if (metaData.cancelled_receipts) setCancelledReceipts(metaData.cancelled_receipts);
            if (metaData.academics_selections) setAcademicSelections(metaData.academics_selections);
            if (metaData.global_waiver_config !== undefined) setGlobalWaiver(Number(metaData.global_waiver_config));
            if (metaData.upi_accounts) setUpiAccounts(metaData.upi_accounts);
            if (metaData.bank_accounts) setBankAccounts(metaData.bank_accounts);
            if (metaData.available_sessions) setAvailableSessions(metaData.available_sessions);
            if (metaData.locked_sessions) setLockedSessions(metaData.locked_sessions);
          } else if (savedExpenses || savedLogs || savedBranch || savedReceiptBooks) {
            // Migration: Push local metadata if cloud is empty
            syncMetadataToCloud();
          }
        } catch (err) {
          console.error("Error fetching from Supabase:", err);
        }
      }
    };

    loadData();
  }, [supabaseEnabled, user]);

  // Data Repair: Ensure every session has a fee structure
  useEffect(() => {
    let hasChanged = false;
    const updated = { ...feeStructures };

    availableSessions.forEach(session => {
      if (!updated[session] || !Array.isArray(updated[session]) || updated[session].length === 0) {
        console.warn(`Repairing missing fee structure for session: ${session}`);
        updated[session] = CLASS_FEE_STRUCTURE;
        hasChanged = true;
      }
    });

    if (hasChanged) {
      setFeeStructures(updated);
    }
  }, [availableSessions, feeStructures]);

  // Real-time Sync Subscription for Students
  useEffect(() => {
    if (!supabaseEnabled || !user) return;

    const channel = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Real-time change received!', payload);
          // Refresh data on remote changes
          if (payload.eventType === 'INSERT' && payload.new?.data) {
            const newStudent = payload.new.data as any;
            setStudents(prev => {
              if (prev.find(s => s.id === newStudent.id)) return prev;
              return [newStudent, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new?.data) {
            const updatedStudent = payload.new.data as any;
            setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            const deletedId = payload.old.id;
            setStudents(prev => prev.filter(s => s.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseEnabled, user, supabase]);

  // Real-time Sync Subscription for App Metadata
  useEffect(() => {
    if (!supabaseEnabled || !user) return;

    const channel = supabase
      .channel('metadata-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_metadata',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new;
          if (newData.expenses) setExpenses(newData.expenses);
          if (newData.action_logs) setActionLogs(newData.action_logs);
          if (newData.branch_collections) setBranchCollections(newData.branch_collections);
          if (newData.due_reminders) setDueReminders(newData.due_reminders);
          if (newData.reminder_history) setReminderHistory(newData.reminder_history);
          if (newData.fee_structures) setFeeStructures(newData.fee_structures);
          if (newData.receipt_books) setReceiptBooks(newData.receipt_books);
          if (newData.cancelled_receipts) setCancelledReceipts(newData.cancelled_receipts);
          if (newData.academics_selections) setAcademicSelections(newData.academics_selections);
          if (newData.global_waiver_config !== undefined) setGlobalWaiver(Number(newData.global_waiver_config));
          if (newData.upi_accounts) setUpiAccounts(newData.upi_accounts);
          if (newData.bank_accounts) setBankAccounts(newData.bank_accounts);
          if (newData.available_sessions) setAvailableSessions(newData.available_sessions);
          if (newData.locked_sessions) setLockedSessions(newData.locked_sessions);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseEnabled, user, supabase]);

  // Sync Metadata to Cloud (helper)
  const syncMetadataToCloud = useCallback(async () => {
    if (!supabaseEnabled || !user) return;

    try {
      await supabase.from('app_metadata').upsert({
        user_id: user.id,
        expenses,
        action_logs: actionLogs,
        branch_collections: branchCollections,
        due_reminders: dueReminders,
        reminder_history: reminderHistory,
        fee_structures: feeStructures,
        receipt_books: receiptBooks,
        cancelled_receipts: cancelledReceipts,
        academics_selections: academicSelections,
        global_waiver_config: globalWaiver,
        upi_accounts: upiAccounts,
        bank_accounts: bankAccounts,
        available_sessions: availableSessions,
        locked_sessions: lockedSessions,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("Metadata sync error:", err);
    }
  }, [supabaseEnabled, user, expenses, actionLogs, branchCollections, dueReminders, reminderHistory, feeStructures, receiptBooks, cancelledReceipts, academicSelections, globalWaiver, upiAccounts, bankAccounts, availableSessions, lockedSessions]);

  // Auto-sync metadata when states change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (supabaseEnabled && user) {
        syncMetadataToCloud();
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [
    expenses,
    actionLogs,
    branchCollections,
    dueReminders,
    reminderHistory,
    feeStructures,
    receiptBooks,
    cancelledReceipts,
    academicSelections,
    globalWaiver,
    upiAccounts,
    bankAccounts,
    availableSessions,
    lockedSessions
  ]);

  // Handle Updates (Save to Supabase)
  const handleUpdateStudents = useCallback(async (newList: FeeRecord[]) => {
    // 1. Local Update
    const validNewList = newList.filter(s => s && s.id);

    setStudents(prevStudents => {
      setHistoryStack(prevStack => [...prevStack, [...prevStudents]].slice(-20));
      return validNewList;
    });

    // 2. Supabase Update (Upsert changed items in chunks)
    if (supabaseEnabled && user && validNewList.length > 0) {
      try {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < validNewList.length; i += CHUNK_SIZE) {
          const chunk = validNewList.slice(i, i + CHUNK_SIZE);
          const studentsToSync = chunk.map(s => ({
            id: s.id,
            user_id: user.id,
            name: s.studentName,
            class: s.grade,
            data: s
          }));

          const { error } = await supabase
            .from('students')
            .upsert(studentsToSync);

          if (error) {
            console.error(`Sync error in chunk ${i / CHUNK_SIZE}:`, error);
            // We continue with other chunks even if one fails
          }
        }
      } catch (err) {
        console.error("Supabase sync exception:", err);
      }
    }
  }, [supabaseEnabled, user, supabase]);

  // Persistence: Save to LocalStorage (Debounced for students to prevent UI lockup)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (students.length > 0) {
        try {
          localStorage.setItem('ues_students_v2', JSON.stringify(students));
        } catch (e) {
          console.error("LocalStorage save error for students:", e);
        }
      }
    }, 3000); // 3-second debounce to allow batch operations to finish

    return () => clearTimeout(timer);
  }, [students]);

  useEffect(() => {
    localStorage.setItem('ues_action_logs', JSON.stringify(actionLogs));
    localStorage.setItem('ues_expenses', JSON.stringify(expenses));
    localStorage.setItem('ues_branch_collections', JSON.stringify(branchCollections));
    localStorage.setItem('ues_due_reminders', JSON.stringify(dueReminders));
    localStorage.setItem('ues_reminder_history', JSON.stringify(reminderHistory));
    localStorage.setItem('ues_fee_structures', JSON.stringify(feeStructures));
    localStorage.setItem('ues_receipt_books', JSON.stringify(receiptBooks));
    localStorage.setItem('ues_cancelled_receipts', JSON.stringify(cancelledReceipts));
    localStorage.setItem('ues_schedule_selections', JSON.stringify(academicSelections));
    localStorage.setItem('ues_global_waiver_config', globalWaiver.toString());
    localStorage.setItem('ues_upi_receivers', JSON.stringify(upiAccounts));
    localStorage.setItem('ues_bank_names', JSON.stringify(bankAccounts));
    localStorage.setItem('ues_locked_sessions', JSON.stringify(lockedSessions));
    localStorage.setItem('ues_available_sessions', JSON.stringify(availableSessions));
    localStorage.setItem('ues_current_page', currentPage);
    localStorage.setItem('ues_current_session', currentSession);
    if (dashboardTargetId) {
      localStorage.setItem('ues_dashboard_target_id', dashboardTargetId);
    } else {
      localStorage.removeItem('ues_dashboard_target_id');
    }
  }, [
    actionLogs,
    expenses,
    branchCollections,
    dueReminders,
    reminderHistory,
    feeStructures,
    receiptBooks,
    cancelledReceipts,
    academicSelections,
    globalWaiver,
    upiAccounts,
    bankAccounts,
    availableSessions,
    currentPage,
    currentSession,
    dashboardTargetId
  ]);

  const handleSessionChange = useCallback((newSession: string) => {
    // If we're on a student dashboard, try to follow them to the next session
    if (dashboardTargetId) {
      const currentStudent = students.find(s => s.id === dashboardTargetId);
      if (currentStudent) {
        // Advanced Matching Strategy
        const baseId = currentStudent.id.split('-PROM')[0];

        const nextStudent = students.find(s => {
          if (s.academicSession !== newSession) return false;

          // 1. Match by Base ID
          if (s.id.startsWith(baseId)) return true;

          // 2. Match by Roll No + Name (Robust fallback)
          if (s.rollNo === currentStudent.rollNo && s.studentName === currentStudent.studentName) return true;

          return false;
        });

        if (nextStudent) {
          setDashboardTargetId(nextStudent.id);
        } else {
          // If student doesn't exist in new session, clear target or stay on directory
          setDashboardTargetId(null);
          // If we were on Dashboard, move to Directory to avoid "Student Not Found" white screen
          if (currentPage === Page.Dashboard) setCurrentPage(Page.Directory);
        }
      }
    }
    setCurrentSession(newSession);
  }, [students, dashboardTargetId, currentPage]);

  const addLog = useCallback((action: string, details: string, type: ActionLog['type']) => {
    const newLog: ActionLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      action,
      details,
      type
    };
    setActionLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 100);
      localStorage.setItem('ues_action_logs', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleLogin = (session: string) => {
    handleSessionChange(session);
    setIsAuthenticated(true);
    localStorage.setItem('ues_is_authenticated', 'true');
    setCurrentPage(Page.Directory);
    addLog('System Login', `Administrator logged into Session ${session}`, 'SYSTEM');
  };

  const handleLogout = () => {
    if (supabaseEnabled) {
      supabaseSignOut();
      // Optionally reload to clear state
      window.location.reload();
      setIsAuthenticated(false);
      localStorage.removeItem('ues_is_authenticated');
      localStorage.removeItem('ues_dashboard_target_id');
      setDashboardTargetId(null); // Clear student context on logout
      setCurrentPage(Page.Home);
      setHistoryStack([]);
      addLog('System Logout', 'Administrator logged out', 'SYSTEM');
    }
  };

  const handleUpdateFeeStructure = (structure: FeeCategory[], session: string) => {
    setFeeStructures(prev => {
      const updated = { ...prev, [session]: structure };
      // Save other metadata similarly if needed
      return updated;
    });
    addLog('Fee Config Updated', `Modified structure for Session ${session}`, 'SYSTEM');
  };

  const handleAddExpense = (entry: Expense) => {
    setExpenses(prev => [entry, ...prev]);
    addLog(
      entry.recordType === 'Income' ? 'Manual Income Logged' : 'Expense Recorded',
      `${entry.description} (₹${entry.amount.toLocaleString()})`,
      entry.recordType === 'Income' ? 'PAYMENT' : 'EXPENSE'
    );
  };

  const handleStudentSelect = (student: FeeRecord) => {
    setDashboardTargetId(student.id);
    setCurrentPage(Page.Dashboard);
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.Home:
        return <Home onNavigate={handlePageChange} />;
      case Page.Directory:
        return (
          <Directory
            students={students}
            currentSession={currentSession}
            feeStructure={feeStructures[currentSession] || CLASS_FEE_STRUCTURE}
            onSelectStudent={handleStudentSelect}
            onUpdateStudents={handleUpdateStudents}
            isReadOnly={isReadOnly}
          />
        );
      case Page.Dashboard:
        return (
          <Dashboard
            students={students}
            onUpdateStudents={handleUpdateStudents}
            currentSession={currentSession}
            isReadOnly={isReadOnly}
            feeStructure={feeStructures[currentSession] || CLASS_FEE_STRUCTURE}
            addLog={addLog}
            targetStudentId={dashboardTargetId}
            onSelectStudent={handleStudentSelect}
            branchCollections={branchCollections}
            setBranchCollections={setBranchCollections}
            reminders={dueReminders}
            setReminders={setDueReminders}
            receiptBooks={receiptBooks}
            cancelledReceipts={cancelledReceipts}
            upiAccounts={upiAccounts}
            setUpiAccounts={setUpiAccounts}
            bankAccounts={bankAccounts}
            setBankAccounts={setBankAccounts}
            upiQrCodes={upiQrCodes}
          />
        );
      case Page.CounterEntry:
        return (
          <CounterEntry
            branchCollections={branchCollections}
            setBranchCollections={setBranchCollections}
            students={students}
            currentSession={currentSession}
            feeStructure={feeStructures[currentSession] || CLASS_FEE_STRUCTURE}
            addLog={addLog}
            receiptBooks={receiptBooks}
            cancelledReceipts={cancelledReceipts}
            upiAccounts={upiAccounts}
            bankAccounts={bankAccounts}
            isReadOnly={isReadOnly}
          />
        );
      case Page.ReceiptManager:
        return (
          <ReceiptManager
            students={students}
            onSelectStudent={handleStudentSelect}
            persistentSearch={receiptSearch}
            setPersistentSearch={setReceiptSearch}
            persistentAuditBookId={receiptAuditBookId}
            setPersistentAuditBookId={setReceiptAuditBookId}
            persistentAuditOpen={isReceiptAuditOpen}
            setPersistentAuditOpen={setIsReceiptAuditOpen}
            branchCollections={branchCollections}
            feeStructure={feeStructures[currentSession] || CLASS_FEE_STRUCTURE}
            onUpdateStudents={handleUpdateStudents}
            currentSession={currentSession}
            isReadOnly={isReadOnly}
            books={receiptBooks}
            setBooks={setReceiptBooks}
            cancelledReceipts={cancelledReceipts}
            setCancelledReceipts={setCancelledReceipts}
          />
        );
      case Page.Academics:
        return (
          <Academics
            feeStructure={feeStructures[currentSession] || CLASS_FEE_STRUCTURE}
            session={currentSession}
            selectedItems={academicSelections}
            setSelectedItems={setAcademicSelections}
            waiverPercent={globalWaiver}
            setWaiverPercent={setGlobalWaiver}
          />
        );
      case Page.Admissions:
        return <Admissions />;
      case Page.Hisab:
        return (
          <Hisab
            students={students}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            currentSession={currentSession}
            branchCollections={branchCollections}
            isReadOnly={isReadOnly}
          />
        );
      case Page.Settings:
        return (
          <Settings
            students={students}
            onUpdateStudents={handleUpdateStudents}
            feeStructure={feeStructures[currentSession] || CLASS_FEE_STRUCTURE}
            onUpdateFees={handleUpdateFeeStructure}
            currentSession={currentSession}
            isReadOnly={isReadOnly}
            getFeeStructureForSession={(s) => feeStructures[s] || CLASS_FEE_STRUCTURE}
            actionLogs={actionLogs}
            addLog={addLog}
            availableSessions={availableSessions}
            setAvailableSessions={setAvailableSessions}
            upiAccounts={upiAccounts}
            setUpiAccounts={setUpiAccounts}
            bankAccounts={bankAccounts}
            setBankAccounts={setBankAccounts}
            lockedSessions={lockedSessions}
            setLockedSessions={setLockedSessions}
          />
        );
      case Page.Contact:
        return <Contact />;
      case Page.Reminders:
        return (
          <DueReminders
            reminders={dueReminders}
            setReminders={setDueReminders}
            reminderHistory={reminderHistory}
            setReminderHistory={setReminderHistory}
            students={students}
            onSelectStudent={handleStudentSelect}
          />
        );

      case Page.Login:
        return <Login onLogin={handleLogin} availableSessions={availableSessions} />;
      default:
        return <Home onNavigate={handlePageChange} />;
    }
  };

  // Show Supabase auth screen if configured and not authenticated (after all hooks)
  if (supabaseEnabled) {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return <AuthForm onSuccess={() => window.location.reload()} />;
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        currentSession={currentSession}
        availableSessions={availableSessions}
        onSessionChange={handleSessionChange}
        onToggleHistory={() => setIsHistoryDrawerOpen(true)}
      />
      <main className="flex-grow">
        {renderPage()}
      </main>

      {isAuthenticated && (
        <HistoryDrawer
          isOpen={isHistoryDrawerOpen}
          onClose={() => setIsHistoryDrawerOpen(false)}
          students={students}
          branchCollections={branchCollections}
          expenses={expenses}
          onSelectStudent={handleStudentSelect}
        />
      )}

      <Footer />
      <AIChatbot />
      {supabaseEnabled && <SyncStatus />}
    </div>
  );
};

export default App;
