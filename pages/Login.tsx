
import React, { useState } from 'react';
import { SCHOOL_INFO } from '../constants';

interface LoginProps {
  onLogin: (session: string) => void;
  showArchive: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, showArchive }) => {
  const [selectedSession, setSelectedSession] = useState('2026-27');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would verify credentials. For this concierge app, any 4-digit numeric password works for demo purposes.
    if (password === '2026' || password === 'admin') {
      onLogin(selectedSession);
    } else {
      setError('Invalid Administrator Credentials');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-900/5 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full -translate-x-1/3 translate-y-1/3 blur-3xl"></div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-red-950 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border-b-4 border-amber-600">
            <span className="text-white font-black text-3xl serif-font">U</span>
          </div>
          <h1 className="text-2xl font-black text-red-950 serif-font italic leading-none mb-2">Internal Portal</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">{SCHOOL_INFO.name}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Select Entry Ledger</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedSession('2026-27')}
                className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                  selectedSession === '2026-27' 
                    ? 'bg-red-950 border-red-950 text-white shadow-lg scale-105' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-red-200'
                }`}
              >
                Session 2026-27
              </button>
              <button
                type="button"
                disabled={!showArchive}
                onClick={() => setSelectedSession('2025-26')}
                className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                  !showArchive ? 'opacity-30 cursor-not-allowed grayscale' :
                  selectedSession === '2025-26' 
                    ? 'bg-amber-600 border-amber-600 text-white shadow-lg scale-105' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200'
                }`}
              >
                Archive 2025-26
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Access PIN</label>
            <input 
              type="password" 
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-center text-2xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-950 focus:bg-white transition-all"
            />
          </div>

          {error && (
            <p className="text-red-600 text-[10px] font-black text-center uppercase tracking-widest animate-bounce">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-red-950 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-red-900 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            Authenticate Access
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Systems Online & Secure</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
