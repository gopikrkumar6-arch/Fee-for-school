
import React from 'react';
import { FACULTY_MEMBERS } from '../constants';

const Faculty: React.FC = () => {
  return (
    <div className="min-h-screen pb-20 bg-cream">
      <div className="bg-school-burgundy py-24 text-center text-white px-4">
        <h1 className="text-5xl md:text-7xl font-black serif-font mb-4 italic">The Academic Council</h1>
        <p className="text-red-100/60 max-w-2xl mx-auto font-light tracking-wide uppercase text-xs">Pioneering Education through Experience & Wisdom</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FACULTY_MEMBERS.map((member) => (
            <div key={member.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 group hover:-translate-y-2 transition-all duration-500">
              <div className="h-72 relative overflow-hidden">
                <img src={member.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={member.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-school-burgundy/40 to-transparent"></div>
              </div>
              <div className="p-8 text-center">
                <div className="text-amber-700 font-black text-[10px] uppercase tracking-widest mb-2">{member.role}</div>
                <h3 className="text-xl font-bold text-red-950 serif-font italic mb-4">{member.name}</h3>
                <div className="h-px w-12 bg-slate-100 mx-auto mb-4"></div>
                <p className="text-xs text-slate-500 font-medium mb-1">Subject: <span className="text-red-900">{member.subject}</span></p>
                <p className="text-xs text-slate-500 font-medium italic">Experience: {member.experience}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 bg-red-50 rounded-[4rem] p-16 md:p-24 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <h2 className="text-4xl md:text-5xl font-black text-red-950 serif-font italic leading-tight mb-6">
              Empowering <span className="text-amber-600">Educators</span> to Lead.
            </h2>
            <p className="text-slate-600 text-lg font-light leading-relaxed italic">
              Our faculty members are more than just teachers; they are mentors, researchers, and pioneers who dedicated their lives to shaping the leaders of tomorrow.
            </p>
          </div>
          <div className="md:w-1/2 grid grid-cols-2 gap-4">
             {[
               { val: '25+', label: 'HODs' },
               { val: '150+', label: 'Staff' },
               { val: '12+', label: 'PhDs' },
               { val: '15yr', label: 'Avg Exp' }
             ].map((stat, i) => (
               <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 text-center">
                  <div className="text-3xl font-black text-red-900 mb-1">{stat.val}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Faculty;
