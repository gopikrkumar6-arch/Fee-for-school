
import React, { useState } from 'react';
import { SCHOOL_INFO } from '../constants';

const Contact: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-red-950 text-white pt-20 pb-32 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-black serif-font italic mb-4 leading-tight">Connect with <span className="text-amber-500">UES</span></h1>
          <p className="text-red-100/60 text-[10px] font-black uppercase tracking-[0.5em]">Gaya's Premier English Medium Institute • Established {SCHOOL_INFO.founded}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20 pb-20">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Info Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
              <h3 className="text-xl font-bold text-red-950 serif-font italic mb-8">Official Channels</h3>
              <div className="space-y-8">
                <div className="flex gap-5">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 border border-red-100 shadow-sm">
                    <span className="text-xl">📍</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Campus Location</p>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{SCHOOL_INFO.address}</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 border border-red-100 shadow-sm">
                    <span className="text-xl">📞</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Admissions Helpdesk</p>
                    <p className="text-sm font-bold text-slate-700">{SCHOOL_INFO.phone}</p>
                    <p className="text-[10px] text-slate-400 mt-1 italic">9:00 AM - 4:00 PM (IST)</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 border border-red-100 shadow-sm">
                    <span className="text-xl">✉️</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Electronic Mail</p>
                    <p className="text-sm font-bold text-slate-700">{SCHOOL_INFO.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3"></div>
              <h3 className="text-xl font-bold serif-font italic mb-4 text-amber-500">School Hours</h3>
              <div className="space-y-4 text-sm font-medium">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="opacity-60">Mon - Fri</span>
                  <span>7:30 AM - 1:30 PM</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="opacity-60">Saturday</span>
                  <span>7:30 AM - 11:30 AM</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Sunday</span>
                  <span className="text-amber-500 font-black uppercase text-[10px]">Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col h-full">
              {submitted ? (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8 shadow-inner">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-3xl font-black text-red-950 serif-font italic mb-4">Pranam! Message Received</h2>
                  <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium">Our administrative concierge will review your inquiry and connect with you shortly.</p>
                  <button onClick={() => setSubmitted(false)} className="text-amber-600 font-black uppercase text-[11px] tracking-widest hover:underline decoration-2 underline-offset-8 transition-all">Submit another inquiry</button>
                </div>
              ) : (
                <div className="p-10 md:p-16">
                  <h2 className="text-3xl font-black text-red-950 serif-font italic mb-10">Send an Inquiry</h2>
                  <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-8">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Full Legal Name</label>
                        <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-950 focus:bg-white transition-all" placeholder="Enter your name" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Contact Number</label>
                        <input required type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-950 focus:bg-white transition-all" placeholder="+91" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Subject Category</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-950 focus:bg-white transition-all">
                          <option>General Inquiry</option>
                          <option>Admissions 2026-27</option>
                          <option>Fee Management</option>
                          <option>Career Opportunities</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-8">
                      <div className="h-full">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Your Message</label>
                        <textarea required className="w-full h-[230px] bg-slate-50 border border-slate-200 rounded-3xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-950 focus:bg-white transition-all resize-none" placeholder="Describe your requirement in detail..."></textarea>
                      </div>
                    </div>
                    <div className="md:col-span-2 mt-4">
                      <button type="submit" className="w-full bg-red-950 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-red-900 transition-all active:scale-[0.98]">Dispatch Message</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="mt-12 bg-white rounded-[3rem] p-4 shadow-xl border border-slate-100 h-96 relative overflow-hidden">
           <div className="absolute inset-0 bg-slate-200 animate-pulse flex flex-col items-center justify-center text-slate-400">
              <span className="text-5xl mb-4">🗺️</span>
              <p className="font-black text-xs uppercase tracking-widest">Interactive Campus Map Loading...</p>
              <p className="text-[10px] mt-1 italic font-medium opacity-60">Located at Patwatoli, Manpur, Gaya</p>
           </div>
           {/* In a real scenario, an <iframe> would go here */}
        </div>
      </div>
    </div>
  );
};

export default Contact;
