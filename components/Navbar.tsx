
import React, { useState } from 'react';
import { Page } from '../types';
import { NAV_LINKS, SCHOOL_INFO } from '../constants';

interface NavbarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isAuthenticated: boolean;
  onLogout: () => void;
  currentSession: string;
  availableSessions: string[];
  onSessionChange: (session: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  currentPage, 
  onPageChange, 
  isAuthenticated, 
  onLogout,
  currentSession,
  availableSessions,
  onSessionChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);

  const visibleLinks = NAV_LINKS.filter(link => !link.restricted || isAuthenticated);

  return (
    <nav className="glass-nav border-b border-slate-200/60 sticky top-0 z-[60]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-24">
          <div className="flex items-center">
            <div 
              className="flex-shrink-0 flex items-center cursor-pointer group"
              onClick={() => onPageChange(Page.Home)}
            >
              <div className="w-14 h-14 bg-red-900 rounded-xl flex items-center justify-center mr-4 border-b-4 border-amber-700 shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-white font-black text-3xl serif-font">U</span>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-2xl text-red-900 serif-font leading-none uppercase tracking-tighter group-hover:text-amber-700 transition-colors">
                  UES
                </span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">
                  Unique English School
                </span>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-1">
            {visibleLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => onPageChange(link.path)}
                className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 ${
                  currentPage === link.path 
                    ? 'text-red-900 bg-red-50/50' 
                    : 'text-slate-600 hover:text-red-900 hover:bg-slate-50'
                }`}
              >
                {link.name}
              </button>
            ))}
            
            <div className="h-8 w-px bg-slate-200 mx-4"></div>

            <button 
              onClick={() => onPageChange(Page.Admissions)}
              className="bg-red-900 text-white px-6 py-2.5 rounded-full text-xs font-black hover:bg-red-800 transition-all shadow-xl active:scale-95 border-b-2 border-amber-800 uppercase tracking-widest mr-4"
            >
              Apply Now
            </button>

            {isAuthenticated ? (
               <div className="flex items-center gap-3">
                 <div className="relative">
                    <button 
                      onClick={() => setSessionMenuOpen(!sessionMenuOpen)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm transition-all text-[10px] font-black uppercase tracking-widest ${
                        currentSession === '2025-26' 
                          ? 'bg-slate-100 border-slate-300 text-slate-500' 
                          : 'bg-amber-50 border-amber-300 text-amber-800'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>Session {currentSession}</span>
                    </button>
                    
                    {sessionMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden py-2 z-[70] animate-in fade-in slide-in-from-top-2">
                        <p className="px-4 py-2 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 mb-1">Select Active Ledger</p>
                        {availableSessions.map(session => (
                          <button
                            key={session}
                            onClick={() => {
                              onSessionChange(session);
                              setSessionMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-xs font-bold flex justify-between items-center hover:bg-slate-50 transition-colors ${
                              currentSession === session ? 'text-red-900 bg-red-50' : 'text-slate-600'
                            }`}
                          >
                            <span>Session {session}</span>
                            {currentSession === session && <span className="w-4 h-4 rounded-full bg-red-900 text-white flex items-center justify-center text-[8px]">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {sessionMenuOpen && (
                      <div className="fixed inset-0 z-60" onClick={() => setSessionMenuOpen(false)}></div>
                    )}
                 </div>

                 <button 
                   onClick={onLogout}
                   className="text-red-900 hover:bg-red-50 p-2.5 rounded-full transition-all border border-red-100 shadow-sm"
                   title="Logout"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                 </button>
               </div>
            ) : (
              <button 
                onClick={() => onPageChange(Page.Login)}
                className="group flex items-center px-4 py-2 text-slate-500 hover:text-red-900 transition-all text-xs font-black uppercase tracking-widest"
              >
                <span>Portal Login</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 animate-in slide-in-from-top duration-300">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {visibleLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  onPageChange(link.path);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-bold ${
                  currentPage === link.path 
                    ? 'bg-red-50 text-red-900' 
                    : 'text-slate-600 active:bg-slate-50'
                }`}
              >
                {link.name}
              </button>
            ))}
            
            {isAuthenticated && (
              <div className="pt-4 border-t border-slate-100">
                <p className="px-4 text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">Active Session</p>
                {availableSessions.map(session => (
                   <button
                    key={session}
                    onClick={() => {
                      onSessionChange(session);
                      setIsOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-bold ${
                      currentSession === session ? 'text-amber-700 bg-amber-50' : 'text-slate-50'
                    }`}
                   >
                     FY {session} {currentSession === session && '✓'}
                   </button>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                {!isAuthenticated ? (
                <button
                    onClick={() => { onPageChange(Page.Login); setIsOpen(false); }}
                    className="w-full py-3 rounded-xl text-sm font-black uppercase bg-slate-100 text-slate-600"
                >
                    Portal
                </button>
                ) : (
                <button
                    onClick={() => { onLogout(); setIsOpen(false); }}
                    className="w-full py-3 rounded-xl text-sm font-black uppercase bg-red-50 text-red-600"
                >
                    Logout
                </button>
                )}
                <button
                    onClick={() => { onPageChange(Page.Admissions); setIsOpen(false); }}
                    className="w-full py-3 rounded-xl text-sm font-black uppercase bg-red-900 text-white"
                >
                    Apply
                </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
