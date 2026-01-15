
import React, { useState } from 'react';

const Admissions: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="text-amber-700 font-bold text-xs uppercase tracking-[0.4em] mb-4">Academic Session 2026 - 2027</div>
          <h1 className="text-4xl md:text-5xl font-black text-red-950 mb-4 serif-font">Admission Enquiry</h1>
          <p className="text-slate-600 max-w-2xl mx-auto italic font-light">Secure your child's future in the upcoming 2026-27 session.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Documentation Checklist */}
          <div className="lg:col-span-1">
             <div className="bg-red-50 p-8 rounded-3xl border border-red-100">
               <h3 className="font-bold text-red-950 mb-6 serif-font uppercase tracking-tighter">Required for 2026</h3>
               <ul className="space-y-4">
                 {[
                   'Birth Certificate (Original & Photocopy)',
                   'Transfer Certificate (Countersigned)',
                   'Aadhaar Card of Student & Parents',
                   'Academic Record (up to March 2025)',
                   'Passport sized photographs (6)'
                 ].map(doc => (
                   <li key={doc} className="flex items-start text-xs text-slate-700">
                     <span className="text-amber-700 mr-2">✦</span>
                     {doc}
                   </li>
                 ))}
               </ul>
               <div className="mt-8 pt-8 border-t border-red-200">
                 <p className="text-[10px] text-red-900 font-bold uppercase tracking-widest leading-relaxed">
                   Note: Age for Nursery admission is 3+ years as of 31st March 2026.
                 </p>
               </div>
             </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-10 shadow-xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-red-950 mb-2 serif-font uppercase">Request Logged</h2>
                <p className="text-slate-600 max-w-xs mx-auto">Pranam! Our admissions coordinator for Session 2026-27 will contact you shortly.</p>
                <button onClick={() => setSubmitted(false)} className="mt-8 text-amber-700 font-bold hover:underline uppercase tracking-tighter text-xs">New Enquiry</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Guardian's Name</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none transition-all text-sm" placeholder="Full Name" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Phone (WhatsApp)</label>
                    <input type="tel" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none transition-all text-sm" placeholder="+91" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Student's Full Name</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target Class (2026-27)</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-900 outline-none transition-all text-sm">
                      <option>Pre Nursery / Nursery / KG</option>
                      <option>Class I - V</option>
                      <option>Class VI - X</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-red-950 text-white py-5 rounded-xl font-bold hover:bg-red-900 transition-all shadow-xl active:scale-95 uppercase tracking-[0.2em] text-xs">
                  Apply for 2026-27
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admissions;
