
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
import { Page, FeeRecord, FeeCategory, Expense, ActionLog, BranchCollection } from './types';
import { MOCK_FEES, CLASS_FEE_STRUCTURE } from './constants';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Home);
  const [students, setStudents] = useState<FeeRecord[]>([]);
  const [historyStack, setHistoryStack] = useState<FeeRecord[][]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [dashboardTargetId, setDashboardTargetId] = useState<string | null>(null);
  
  // UI States
  const [currentSession, setCurrentSession] = useState('2026-27');
  const [showArchivedSession, setShowArchivedSession] = useState(true);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  
  // Persistent Receipt Manager State
  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptAuditBookId, setReceiptAuditBookId] = useState<string | null>(null);
  const [isReceiptAuditOpen, setIsReceiptAuditOpen] = useState(false);

  // Cross-Branch Collections State
  const [branchCollections, setBranchCollections] = useState<BranchCollection[]>([]);

  // Fee Structure State
  const [feeStructures, setFeeStructures] = useState<Record<string, FeeCategory[]>>({
    '2026-27': CLASS_FEE_STRUCTURE,
    '2025-26': CLASS_FEE_STRUCTURE.map(cat => ({
      ...cat,
      classes: cat.classes.map(c => ({ ...c, tuition: Math.max(0, c.tuition - 500) }))
    }))
  });

  // Expense State
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: '1', date: new Date().toISOString(), category: 'Utility', description: 'Electricity Bill - Jan', amount: 4500, paymentMode: 'Online', recordedBy: 'Admin', recordType: 'Expense' },
    { id: '2', date: new Date().toISOString(), category: 'Maintenance', description: 'Plumbing Repair', amount: 1200, paymentMode: 'Cash', recordedBy: 'Admin', recordType: 'Expense' }
  ]);
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const isReadOnly = currentSession === '2025-26';

  // Persistence: Load Initial Data
  useEffect(() => {
    const savedStudents = localStorage.getItem('ues_students_v2');
    const savedLogs = localStorage.getItem('ues_action_logs');
    const savedExpenses = localStorage.getItem('ues_expenses');
    const savedBranch = localStorage.getItem('ues_branch_collections');
    
    if (savedStudents) {
      setStudents(JSON.parse(savedStudents));
    } else {
      setStudents(MOCK_FEES);
    }

    if (savedLogs) setActionLogs(JSON.parse(savedLogs));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedBranch) setBranchCollections(JSON.parse(savedBranch));
  }, []);

  // Persistence: Save Data
  useEffect(() => {
    if (students.length > 0) {
      localStorage.setItem('ues_students_v2', JSON.stringify(students));
    }
  }, [students]);

  useEffect(() => {
    localStorage.setItem('ues_action_logs', JSON.stringify(actionLogs));
  }, [actionLogs]);

  useEffect(() => {
    localStorage.setItem('ues_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('ues_branch_collections', JSON.stringify(branchCollections));
  }, [branchCollections]);

  const addLog = useCallback((action: string, details: string, type: ActionLog['type']) => {
    const newLog: ActionLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      action,
      details,
      type
    };
    setActionLogs(prev => [newLog, ...prev].slice(0, 100));
  }, []);

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleLogin = (session: string) => {
    setIsAuthenticated(true);
    setCurrentSession(session);
    setCurrentPage(Page.Directory);
    addLog('System Login', `Administrator logged into Session ${session}`, 'SYSTEM');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage(Page.Home);
    setHistoryStack([]); 
    addLog('System Logout', 'Administrator logged out', 'SYSTEM');
  };

  const handleUpdateStudents = useCallback((newList: FeeRecord[]) => {
    setStudents(prevStudents => {
      if (JSON.stringify(prevStudents) === JSON.stringify(newList)) {
        return prevStudents;
      }
      setHistoryStack(prevStack => [...prevStack, [...prevStudents]].slice(-20)); 
      return newList;
    });
  }, []);

  const handleUpdateFeeStructure = (structure: FeeCategory[], session: string) => {
    setFeeStructures(prev => ({
      ...prev,
      [session]: structure
    }));
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
            feeStructure={feeStructures[currentSession]}
            onSelectStudent={handleStudentSelect}
            onUpdateStudents={handleUpdateStudents}
          />
        );
      case Page.Dashboard:
        return (
          <Dashboard 
            students={students} 
            onUpdateStudents={handleUpdateStudents}
            currentSession={currentSession}
            isReadOnly={isReadOnly}
            feeStructure={feeStructures[currentSession]}
            addLog={addLog}
            targetStudentId={dashboardTargetId}
            branchCollections={branchCollections}
            setBranchCollections={setBranchCollections}
          />
        );
      case Page.CounterEntry:
        return (
          <CounterEntry
            branchCollections={branchCollections}
            setBranchCollections={setBranchCollections}
            students={students}
            currentSession={currentSession}
            feeStructure={feeStructures[currentSession]}
            addLog={addLog}
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
            onUpdateStudents={handleUpdateStudents}
            currentSession={currentSession}
            isReadOnly={isReadOnly}
          />
        );
      case Page.Academics:
        return <Academics feeStructure={feeStructures[currentSession]} session={currentSession} />;
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
          />
        );
      case Page.Settings:
        return (
          <Settings 
            students={students} 
            onUpdateStudents={handleUpdateStudents}
            feeStructure={feeStructures[currentSession]}
            onUpdateFees={handleUpdateFeeStructure}
            currentSession={currentSession}
            isReadOnly={isReadOnly}
            showArchivedSession={showArchivedSession}
            onToggleArchive={setShowArchivedSession}
            getFeeStructureForSession={(s) => feeStructures[s] || CLASS_FEE_STRUCTURE}
            actionLogs={actionLogs}
            addLog={addLog}
          />
        );
      case Page.Contact:
        return <Contact />;
      case Page.Login:
        return <Login onLogin={handleLogin} showArchive={showArchivedSession} />;
      default:
        return <Home onNavigate={handlePageChange} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar 
        currentPage={currentPage} 
        onPageChange={handlePageChange} 
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        currentSession={currentSession}
        availableSessions={['2026-27', '2025-26']}
        onSessionChange={setCurrentSession}
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
    </div>
  );
};

export default App;
