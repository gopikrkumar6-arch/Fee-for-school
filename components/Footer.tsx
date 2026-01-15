
import React from 'react';
import { SCHOOL_INFO } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-red-950 text-red-100 pt-32 pb-12 border-t-8 border-amber-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
        <div className="col-span-1 md:col-span-1 space-y-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-4 shadow-2xl border-b-4 border-amber-500">
              <span className="text-red-900 font-black text-2xl serif-font">U</span>
            </div>
            <div className="flex flex-col">
                <span className="text-white font-black text-2xl serif-font tracking-tight leading-none italic">UES GAYA</span>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-60 mt-1">Unique English School</span>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-red-200/50 italic font-light">
            "{SCHOOL_INFO.motto}" — Dedicated to the intellectual and moral development of our youth since {SCHOOL_INFO.founded}.
          </p>
          <div className="flex space-x-3">
            {['FB', 'IG', 'YT', 'LI'].map(s => (
              <div key={s} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black hover:bg-amber-600 transition-all cursor-pointer shadow-lg">{s}</div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-amber-500 font-black mb-10 uppercase tracking-[0.3em] text-[10px]">Campus Address</h4>
          <ul className="space-y-6 text-sm">
            <li className="flex items-start">
              <span className="mr-4 text-xl">📍</span>
              <span className="opacity-80 leading-relaxed font-medium">{SCHOOL_INFO.address}</span>
            </li>
            <li className="flex items-center">
              <span className="mr-4 text-xl">📞</span>
              <span className="opacity-80 font-medium">{SCHOOL_INFO.phone}</span>
            </li>
            <li className="flex items-center">
              <span className="mr-4 text-xl">✉️</span>
              <span className="opacity-80 font-medium">{SCHOOL_INFO.email}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-amber-500 font-black mb-10 uppercase tracking-[0.3em] text-[10px]">Academic Portals</h4>
          <ul className="space-y-4 text-sm font-bold">
            <li><a href="#" className="opacity-60 hover:opacity-100 hover:text-amber-400 transition-all flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/40 group-hover:bg-amber-500"></span> Parent Login</a></li>
            <li><a href="#" className="opacity-60 hover:opacity-100 hover:text-amber-400 transition-all flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/40 group-hover:bg-amber-500"></span> Student Resources</a></li>
            <li><a href="#" className="opacity-60 hover:opacity-100 hover:text-amber-400 transition-all flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/40 group-hover:bg-amber-500"></span> Alumni Network</a></li>
            <li><a href="#" className="opacity-60 hover:opacity-100 hover:text-amber-400 transition-all flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/40 group-hover:bg-amber-500"></span> Careers</a></li>
          </ul>
        </div>

        <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <h4 className="text-amber-500 font-black mb-6 uppercase tracking-[0.3em] text-[10px]">The Chronicle</h4>
          <p className="text-[11px] text-red-200/50 mb-8 leading-relaxed italic">Join our mailing list for campus updates and financial notices.</p>
          <div className="flex p-1.5 bg-white/5 rounded-full border border-white/10 focus-within:border-amber-500 transition-all">
            <input 
              type="email" 
              placeholder="Email address" 
              className="bg-transparent border-none rounded-l-full px-5 py-2 w-full text-xs text-white focus:outline-none placeholder:text-white/20" 
            />
            <button className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-full transition-all text-[10px] font-black uppercase tracking-widest shadow-xl">
              SUBMIT
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-[0.3em] font-black text-red-200/30">
        <p>© {new Date().getFullYear()} Unique English School. All Rights Reserved.</p>
        <div className="flex space-x-10 mt-8 md:mt-0">
          <a href="#" className="hover:text-amber-500 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-amber-500 transition-colors">Terms of Use</a>
          <a href="#" className="hover:text-amber-500 transition-colors">Accessibility</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
