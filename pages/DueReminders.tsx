import React, { useState, useMemo } from 'react';
import { DueReminder, FeeRecord, ReminderHistory } from '../types';
import { formatDate } from '../constants';

interface DueRemindersProps {
  reminders: DueReminder[];
  setReminders: React.Dispatch<React.SetStateAction<DueReminder[]>>;
  reminderHistory: ReminderHistory[];
  setReminderHistory: React.Dispatch<React.SetStateAction<ReminderHistory[]>>;
  students: FeeRecord[];
  onSelectStudent?: (studentId: string) => void;
}

type DateFilter = 'all' | 'overdue' | 'today' | 'thisWeek' | 'upcoming' | 'specificDate';
type ViewMode = 'active' | 'resolved' | 'archived' | 'history';

const DueReminders: React.FC<DueRemindersProps> = ({ reminders, setReminders, reminderHistory, setReminderHistory, students, onSelectStudent }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'archived'>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // History filters
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySortBy, setHistorySortBy] = useState<'recent' | 'oldest' | 'name' | 'frequency'>('recent');
  const [historyAmountFilter, setHistoryAmountFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Get unique classes from reminders
  const uniqueClasses = useMemo(() => {
    const classes = new Set(reminders.map(r => r.grade));
    return Array.from(classes).sort();
  }, [reminders]);

  // Helper function to check if date falls in a range
  const isOverdue = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return target < today;
  };

  const isToday = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    return target.toDateString() === today.toDateString();
  };

  const isSpecificDate = (targetDate: string, specificDate: string) => {
    const target = new Date(targetDate);
    const selected = new Date(specificDate);
    return target.toDateString() === selected.toDateString();
  };

  const isThisWeek = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const currentDay = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - currentDay);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return target >= weekStart && target <= weekEnd && !isToday(targetDate);
  };

  const isUpcoming = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 6);
    return target > weekEnd;
  };

  // Filter reminders by status, search term, and target date
  const filteredReminders = useMemo(() => {
    return reminders
      .filter(reminder => {
        const matchesTab = 
          (activeTab === 'active' && reminder.status === 'Active') ||
          (activeTab === 'resolved' && reminder.status === 'Resolved') ||
          (activeTab === 'archived' && reminder.status === 'Archived');
        
        const matchesSearch = 
          reminder.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reminder.grade.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesClass = selectedClass === null || reminder.grade === selectedClass;

        let matchesDateFilter = true;
        if (dateFilter !== 'all') {
          matchesDateFilter = 
            (dateFilter === 'overdue' && isOverdue(reminder.targetDate)) ||
            (dateFilter === 'today' && isToday(reminder.targetDate)) ||
            (dateFilter === 'thisWeek' && isThisWeek(reminder.targetDate)) ||
            (dateFilter === 'upcoming' && isUpcoming(reminder.targetDate)) ||
            (dateFilter === 'specificDate' && selectedDate && isSpecificDate(reminder.targetDate, selectedDate));
        }
        
        return matchesTab && matchesSearch && matchesDateFilter && matchesClass;
      })
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }, [reminders, activeTab, searchTerm, dateFilter, selectedDate, selectedClass]);

  // Count reminders by date category for badges
  const overduCount = reminders.filter(r => r.status === 'Active' && isOverdue(r.targetDate)).length;
  const todayCount = reminders.filter(r => r.status === 'Active' && isToday(r.targetDate)).length;
  const thisWeekCount = reminders.filter(r => r.status === 'Active' && isThisWeek(r.targetDate)).length;
  const upcomingCount = reminders.filter(r => r.status === 'Active' && isUpcoming(r.targetDate)).length;
  const specificDateCount = selectedDate ? reminders.filter(r => r.status === 'Active' && isSpecificDate(r.targetDate, selectedDate)).length : 0;

  const handleResolveReminder = (reminderId: string) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (reminder) {
      // Add to history before resolving
      const historyEntry: ReminderHistory = {
        id: `history_${Date.now()}`,
        studentId: reminder.studentId,
        studentName: reminder.studentName,
        fatherName: reminder.fatherName,
        mobileNumber: reminder.mobileNumber,
        grade: reminder.grade,
        rollNo: reminder.grade + reminder.section,
        reminderTime: new Date().toISOString(),
        dueAmount: reminder.dueAmount,
        targetDate: reminder.targetDate,
        method: 'Manual'
      };
      setReminderHistory(prev => [historyEntry, ...prev]);
    }
    setReminders(prev => 
      prev.map(r => r.id === reminderId ? { ...r, status: 'Resolved' } : r)
    );
  };

  const handleArchiveReminder = (reminderId: string) => {
    setReminders(prev => 
      prev.map(r => r.id === reminderId ? { ...r, status: 'Archived' } : r)
    );
  };

  const handleDeleteReminder = (reminderId: string) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));
  };

  // Group reminder history by student with advanced filtering
  const reminderHistoryByStudent = useMemo(() => {
    type StudentReminderGroup = { studentName: string; fatherName: string; mobileNumber: string; grade: string; rollNo: string; reminders: ReminderHistory[]; count: number; totalAmount: number };
    const grouped: Record<string, StudentReminderGroup> = {};
    
    reminderHistory.forEach(entry => {
      // Apply filters
      const matchesSearch = entry.studentName.toLowerCase().includes(historySearchTerm.toLowerCase());
      
      const matchesAmount = 
        historyAmountFilter === 'all' ||
        (historyAmountFilter === 'high' && entry.dueAmount >= 50000) ||
        (historyAmountFilter === 'medium' && entry.dueAmount >= 20000 && entry.dueAmount < 50000) ||
        (historyAmountFilter === 'low' && entry.dueAmount < 20000);

      if (!matchesSearch || !matchesAmount) return;

      if (!grouped[entry.studentId]) {
        grouped[entry.studentId] = {
          studentName: entry.studentName,
          fatherName: entry.fatherName,
          mobileNumber: entry.mobileNumber,
          grade: entry.grade,
          rollNo: entry.rollNo,
          reminders: [],
          count: 0,
          totalAmount: 0
        };
      }
      grouped[entry.studentId].reminders.push(entry);
      grouped[entry.studentId].count += 1;
      grouped[entry.studentId].totalAmount += entry.dueAmount;
    });

    // Sort by selected criteria
    const sortedGroups: StudentReminderGroup[] = Object.values(grouped);
    if (historySortBy === 'recent') {
      sortedGroups.sort((a, b) => 
        new Date(b.reminders[0]?.reminderTime || 0).getTime() - 
        new Date(a.reminders[0]?.reminderTime || 0).getTime()
      );
    } else if (historySortBy === 'oldest') {
      sortedGroups.sort((a, b) => 
        new Date(a.reminders[0]?.reminderTime || 0).getTime() - 
        new Date(b.reminders[0]?.reminderTime || 0).getTime()
      );
    } else if (historySortBy === 'name') {
      sortedGroups.sort((a, b) => a.studentName.localeCompare(b.studentName));
    } else if (historySortBy === 'frequency') {
      sortedGroups.sort((a, b) => b.count - a.count);
    }

    return sortedGroups;
  }, [reminderHistory, historySearchTerm, historyAmountFilter, historySortBy]);

  const totalReminders = reminders.filter(r => r.status === 'Active').length;
  const totalDue = reminders.filter(r => r.status === 'Active').reduce((sum, r) => sum + r.dueAmount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-black text-slate-900 mb-1">Due Reminders</h1>
          <p className="text-slate-600 text-xs">Track student fee reminders</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">Active</p>
                <p className="text-2xl font-black text-red-900 mt-0.5">{totalReminders}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">Total Due</p>
                <p className="text-2xl font-black text-amber-700 mt-0.5">₹{totalDue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">Resolved</p>
                <p className="text-2xl font-black text-green-700 mt-0.5">{reminders.filter(r => r.status === 'Resolved').length}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 mb-4">
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-900 focus:bg-white transition-all text-sm"
            />
          </div>

          {/* Date Filter Buttons */}
          <div className="flex flex-wrap gap-1.5">
            <p className="text-xs font-black uppercase text-slate-400 tracking-tight w-full mb-1">Date Filter:</p>
            
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-tight transition-all border ${
                dateFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-900'
              }`}
            >
              All
            </button>

            <button
              onClick={() => setDateFilter('overdue')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-tight transition-all border flex items-center gap-1 ${
                dateFilter === 'overdue'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-red-600 border-red-300 hover:border-red-600'
              }`}
            >
              Overdue {overduCount > 0 && <span className="bg-white text-red-600 px-1.5 py-0.5 rounded-full text-[10px] font-black">{overduCount}</span>}
            </button>

            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-tight transition-all border flex items-center gap-1 ${
                dateFilter === 'today'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-600 border-blue-300 hover:border-blue-600'
              }`}
            >
              Today {todayCount > 0 && <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded-full text-[10px] font-black">{todayCount}</span>}
            </button>

            <button
              onClick={() => setDateFilter('thisWeek')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-tight transition-all border flex items-center gap-1 ${
                dateFilter === 'thisWeek'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-amber-600 border-amber-300 hover:border-amber-600'
              }`}
            >
              Week {thisWeekCount > 0 && <span className="bg-white text-amber-600 px-1.5 py-0.5 rounded-full text-[10px] font-black">{thisWeekCount}</span>}
            </button>

            <button
              onClick={() => setDateFilter('upcoming')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-tight transition-all border flex items-center gap-1 ${
                dateFilter === 'upcoming'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-green-600 border-green-300 hover:border-green-600'
              }`}
            >
              Upcoming {upcomingCount > 0 && <span className="bg-white text-green-600 px-1.5 py-0.5 rounded-full text-[10px] font-black">{upcomingCount}</span>}
            </button>

            <button
              onClick={() => {
                setDateFilter('specificDate');
                setSelectedDate('');
              }}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-tight transition-all border flex items-center gap-1 ${
                dateFilter === 'specificDate'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-purple-600 border-purple-300 hover:border-purple-600'
              }`}
            >
              Pick {specificDateCount > 0 && <span className="bg-white text-purple-600 px-1.5 py-0.5 rounded-full text-[10px] font-black">{specificDateCount}</span>}
            </button>

            {dateFilter === 'specificDate' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-md font-bold text-xs border border-purple-300 focus:outline-none focus:border-purple-600 bg-purple-50"
              />
            )}
          </div>

          {/* Class Filter */}
          <div className="mt-3">
            <p className="text-xs font-black uppercase text-slate-400 tracking-tight mb-2">Class:</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedClass(null)}
                className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-tight transition-all border ${
                  selectedClass === null
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-blue-600 border-blue-300 hover:border-blue-600'
                }`}
              >
                All
              </button>
              {uniqueClasses.map(cls => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-tight transition-all border ${
                    selectedClass === cls
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-indigo-600 border-indigo-300 hover:border-indigo-600'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>
        </div>        {/* View Mode Buttons - History Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('active')}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-tight transition-all border ${
              viewMode === 'active'
                ? 'bg-red-900 text-white border-red-900'
                : 'bg-white text-red-900 border-red-300 hover:border-red-900'
            }`}
          >
            Reminders
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-tight transition-all border flex items-center gap-2 ${
              viewMode === 'history'
                ? 'bg-blue-900 text-white border-blue-900'
                : 'bg-white text-blue-900 border-blue-300 hover:border-blue-900'
            }`}
          >
            History
            {reminderHistoryByStudent.length > 0 && (
              <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full text-[10px] font-black">
                {reminderHistoryByStudent.length}
              </span>
            )}
          </button>
        </div>

        {viewMode === 'active' ? (
          <>
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 border-b border-slate-200">
          {(['active', 'resolved', 'archived'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold text-xs uppercase tracking-tight transition-all border-b-2 ${
                activeTab === tab
                  ? 'text-red-900 border-red-900'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              {tab === 'active' && 'Active'}
              {tab === 'resolved' && 'Resolved'}
              {tab === 'archived' && 'Archived'}
            </button>
          ))}
        </div>

        {/* Reminders List */}
        {filteredReminders.length > 0 ? (
          <div className="space-y-2">
            {filteredReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-all p-3"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div className="flex-grow">
                    <div className="flex items-start gap-2">
                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black text-slate-600">
                        {reminder.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-900">{reminder.studentName}</h3>
                        <div className="flex gap-2 mt-0.5 text-xs text-slate-600 flex-wrap">
                          <span>{reminder.grade}</span>
                          <span>•</span>
                          <span>{reminder.section}</span>
                          <span>•</span>
                          <span>{formatDate(reminder.createdDate)}</span>
                        </div>
                        <div className="mt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-tight mb-0.5">Father</p>
                            <p className="text-xs font-bold text-blue-900">{reminder.fatherName}</p>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-md p-2">
                            <p className="text-[10px] font-bold text-green-700 uppercase tracking-tight mb-0.5">Mobile</p>
                            <p className="text-xs font-bold text-green-900">{reminder.mobileNumber}</p>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight mb-0.5">Target</p>
                            <p className="text-xs font-bold text-amber-900">{formatDate(reminder.targetDate)}</p>
                          </div>
                          {reminder.description && (
                            <div className="bg-slate-50 border border-slate-200 rounded-md p-2 md:col-span-2 lg:col-span-1">
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight mb-0.5">Notes</p>
                              <p className="text-xs text-slate-700">{reminder.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => {
                        if (onSelectStudent) {
                          onSelectStudent(reminder.studentId);
                        }
                      }}
                      className="text-right hover:opacity-75 transition-opacity cursor-pointer group"
                    >
                      <p className="text-xs text-slate-600 font-semibold group-hover:text-red-900 transition-colors">Due</p>
                      <p className="text-lg font-black text-red-900 group-hover:scale-110 transition-transform origin-right">₹{reminder.dueAmount.toLocaleString()}</p>
                    </button>
                    <div className="flex gap-1">
                      {reminder.status === 'Active' && (
                        <>
                          <button
                            onClick={() => handleResolveReminder(reminder.id)}
                            className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md font-bold text-[10px] hover:bg-green-100 transition-all active:scale-95"
                            title="Resolve"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleArchiveReminder(reminder.id)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md font-bold text-[10px] hover:bg-slate-200 transition-all active:scale-95"
                            title="Archive"
                          >
                            📦
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-md font-bold text-[10px] hover:bg-red-100 transition-all active:scale-95"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-600 mb-1">No Reminders</h3>
            <p className="text-xs text-slate-500">
              {activeTab === 'active' 
                ? 'No active reminders.'
                : `No ${activeTab} reminders.`}
            </p>
          </div>
        )}
          </>
        ) : (
          <>
            {/* History View */}
            <div className="space-y-4">
              {/* History Filters */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Search student name..."
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-sm"
                    />
                  </div>
                </div>



                {/* Amount & Sort Filters */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Amount:</label>
                    <select
                      value={historyAmountFilter}
                      onChange={(e) => setHistoryAmountFilter(e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                    >
                      <option value="all">All Amounts</option>
                      <option value="high">High (≥₹50k)</option>
                      <option value="medium">Medium (₹20k-50k)</option>
                      <option value="low">Low (&lt;₹20k)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Sort By:</label>
                    <select
                      value={historySortBy}
                      onChange={(e) => setHistorySortBy(e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                    >
                      <option value="recent">Most Recent</option>
                      <option value="oldest">Oldest</option>
                      <option value="name">By Name</option>
                      <option value="frequency">Most Reminded</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setHistorySearchTerm('');
                        setHistoryAmountFilter('all');
                        setHistorySortBy('recent');
                      }}
                      className="w-full px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md font-bold text-xs hover:bg-slate-200 transition-all"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>



              {/* History List */}
              {reminderHistoryByStudent.length > 0 ? (
                <div className="space-y-2">
                  {reminderHistoryByStudent.map(group => (
                    <div
                      key={group.studentName}
                      className="bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-all p-3"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black text-blue-600">
                          {group.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {/* Row 1: Student name, Father's name, Mobile number */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="font-bold text-slate-900">{group.studentName}</span>
                            <span className="text-slate-600">👨 {group.fatherName}</span>
                            <span className="text-slate-600">📱 {group.mobileNumber}</span>
                          </div>
                          {/* Row 2: Class, Roll No */}
                          <div className="flex gap-4 text-xs text-slate-600">
                            <span>📚 {group.grade}</span>
                            <span>Roll No: {group.rollNo}</span>
                          </div>
                          {/* Row 3: Number of reminder, Target Date */}
                          <div className="flex gap-2 flex-wrap">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              {group.count} reminders
                            </span>
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              {group.reminders.length > 0 && new Date(group.reminders[0].reminderTime).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Timeline */}
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-tight mb-2">Timeline ({group.reminders.length} entries):</p>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {group.reminders.sort((a, b) => new Date(b.reminderTime).getTime() - new Date(a.reminderTime).getTime()).map((reminder) => {
                            const reminderDate = new Date(reminder.reminderTime);
                            return (
                              <div key={reminder.id} className="flex items-center gap-2 text-xs py-1.5 px-2 bg-slate-50 rounded-md hover:bg-blue-50 transition-colors border border-slate-100">
                                <span className="text-blue-600 font-bold">•</span>
                                <div className="flex-1">
                                  <span className="text-slate-600 font-semibold">{reminderDate.toLocaleDateString()}</span>
                                  <span className="text-slate-500 ml-2 text-[9px]">{reminderDate.toLocaleTimeString()}</span>
                                  {reminder.targetDate && <span className="text-red-600 font-bold ml-2 text-[9px]">Target: {new Date(reminder.targetDate).toLocaleDateString()}</span>}
                                </div>
                                <span className="text-blue-700 font-bold">₹{reminder.dueAmount.toLocaleString()}</span>
                                {reminder.method && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                    reminder.method === 'SMS' ? 'bg-purple-100 text-purple-700' :
                                    reminder.method === 'WhatsApp' ? 'bg-green-100 text-green-700' :
                                    reminder.method === 'Manual' ? 'bg-orange-100 text-orange-700' :
                                    'bg-slate-200 text-slate-700'
                                  }`}>
                                    {reminder.method}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-600 mb-1">No History Found</h3>
                  <p className="text-xs text-slate-500">No reminders match your filters. Try adjusting the search criteria.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DueReminders;
