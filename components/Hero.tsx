
import React from 'react';
import { Page } from '../types';
import { SCHOOL_INFO } from '../constants';

interface HeroProps {
  onCtaClick: (page: Page) => void;
}

const Hero: React.FC<HeroProps> = ({ onCtaClick }) => {
  return (
    <section className="relative h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=1920" 
          alt="UES Campus" 
          className="w-full h-full object-cover brightness-[0.4] contrast-125 animate-subtle-zoom"
        />
        <div className="absolute inset-0 hero-gradient"></div>
        {/* Animated particles or grain effect overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500/20 backdrop-blur-xl rounded-full text-amber-300 text-[11px] font-black tracking-[0.3em] uppercase mb-8 border border-amber-500/40 shadow-2xl animate-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Academic Session 2026-27 • Admissions Open
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[1.05] serif-font animate-in slide-in-from-bottom-8 duration-1000">
            Unlocking <span className="text-amber-400 italic font-medium">Infinite</span><br />
            Potential <span className="text-white/40">&</span> Growth.
          </h1>
          
          <p className="text-xl md:text-2xl text-red-50/80 mb-12 leading-relaxed font-light italic max-w-2xl border-l-4 border-amber-600 pl-8 animate-in slide-in-from-bottom-10 duration-1000 delay-200">
            "{SCHOOL_INFO.motto}"
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 animate-in slide-in-from-bottom-12 duration-1000 delay-300">
            <button 
              onClick={() => onCtaClick(Page.Admissions)}
              className="group relative bg-amber-600 text-white px-12 py-5 rounded-full font-black hover:bg-amber-500 transition-all shadow-[0_20px_50px_rgba(180,83,9,0.3)] text-center active:scale-95 uppercase tracking-widest text-[11px] overflow-hidden"
            >
              <span className="relative z-10">Start Enrollment</span>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
            <button 
              onClick={() => onCtaClick(Page.Dashboard)}
              className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-10 py-5 rounded-full font-black hover:bg-white/20 transition-all text-center uppercase tracking-widest text-[11px] hover:border-white/60"
            >
              Access Parent Portal
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 right-16 hidden lg:block z-20 animate-in fade-in slide-in-from-right-10 duration-1000 delay-500">
         <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border-t-8 border-red-900 max-w-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full translate-x-1/2 -translate-y-1/2"></div>
           <div className="flex items-center mb-4">
             <span className="text-3xl mr-3 group-hover:rotate-12 transition-transform">📋</span>
             <h4 className="font-black text-xl text-red-950 serif-font italic">Notice Board</h4>
           </div>
           <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
             Session transition for 2026-27 is live. Please ensure all March 2025 arrears are settled to prevent service disruption.
           </p>
           <button onClick={() => onCtaClick(Page.Dashboard)} className="flex items-center gap-2 text-[11px] font-black text-amber-700 uppercase tracking-widest group-hover:gap-4 transition-all">
             Verify Ledger Status <span className="text-lg">→</span>
           </button>
         </div>
      </div>
    </section>
  );
};

export default Hero;
