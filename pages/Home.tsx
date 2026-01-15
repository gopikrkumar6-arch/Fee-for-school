
import React, { useState } from 'react';
import Hero from '../components/Hero';
import { Page } from '../types';
import { PROGRAMS, SCHOOL_INFO } from '../constants';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 py-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left hover:text-amber-600 transition-colors"
      >
        <span className="text-lg font-bold text-red-950 serif-font italic">{q}</span>
        <span className={`text-2xl transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
      </button>
      {isOpen && (
        <div className="mt-4 text-sm text-slate-500 leading-relaxed font-medium animate-in slide-in-from-top-2 duration-300">
          {a}
        </div>
      )}
    </div>
  );
};

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-32 pb-32">
      <Hero onCtaClick={onNavigate} />

      {/* Legacy Section */}
      <section className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
        <div className="relative group">
           <div className="absolute -inset-4 bg-amber-500/10 rounded-[3rem] rotate-3 group-hover:rotate-0 transition-transform duration-700"></div>
           <img 
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800" 
            className="relative rounded-[2.5rem] shadow-2xl object-cover h-[500px] w-full brightness-90 group-hover:brightness-100 transition-all"
            alt="School Heritage"
           />
           <div className="absolute -bottom-8 -right-8 bg-red-900 text-white p-10 rounded-[2rem] shadow-2xl border-b-8 border-amber-600">
              <span className="block text-4xl font-black serif-font mb-1 italic">18+</span>
              <span className="block text-[10px] font-black uppercase tracking-widest opacity-60">Years of Legacy</span>
           </div>
        </div>
        <div className="space-y-8">
            <div className="text-amber-700 font-black text-xs uppercase tracking-[0.4em]">Our Academic Pillars</div>
            <h2 className="text-4xl md:text-6xl font-black text-red-950 serif-font italic leading-tight">
              Where <span className="text-amber-600">Tradition</span> Meets Modernity.
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed font-light italic">
              Since its founding in {SCHOOL_INFO.founded}, Unique English School has been a beacon of quality education in Gaya. We believe in holistic development that extends far beyond the four walls of a classroom.
            </p>
            <div className="grid grid-cols-2 gap-8 pt-4">
               <div>
                  <h4 className="font-black text-red-900 text-sm uppercase tracking-widest mb-2 italic">Values</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">Integrity, Humility, and Pursuit of Knowledge form our core ethos.</p>
               </div>
               <div>
                  <h4 className="font-black text-red-900 text-sm uppercase tracking-widest mb-2 italic">Innovation</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">Digital literacy and modern pedagogy integrated at every stage.</p>
               </div>
            </div>
            <button 
                onClick={() => onNavigate(Page.Academics)}
                className="inline-flex items-center gap-4 text-[11px] font-black text-red-900 uppercase tracking-[0.3em] hover:gap-6 transition-all group"
            >
                Read More About Us <span className="w-12 h-px bg-red-900/30 group-hover:bg-red-900 transition-colors"></span> <span>→</span>
            </button>
        </div>
      </section>

      {/* Programs Preview */}
      <section className="bg-slate-900 py-32 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-900/20 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20 space-y-4">
             <div className="text-amber-500 font-black text-xs uppercase tracking-[0.5em]">The Learning Curve</div>
             <h2 className="text-4xl md:text-6xl font-black serif-font italic">Stage-wise Excellence</h2>
             <div className="h-1.5 w-24 bg-amber-500 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {PROGRAMS.map((program) => (
              <div key={program.id} className="group bg-white/5 backdrop-blur-sm rounded-[3rem] border border-white/10 overflow-hidden hover:bg-white/10 transition-all duration-500 hover:border-white/30">
                <div className="h-64 overflow-hidden relative">
                  <img src={program.image} alt={program.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                </div>
                <div className="p-10">
                  <div className="text-5xl mb-6 p-4 bg-white/5 inline-block rounded-[2rem] border border-white/10 group-hover:bg-amber-600 group-hover:scale-110 transition-all shadow-2xl">{program.icon}</div>
                  <h3 className="text-2xl font-black text-white mb-4 serif-font uppercase tracking-tight">{program.title}</h3>
                  <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">
                    {program.description}
                  </p>
                  <button 
                    onClick={() => onNavigate(Page.Academics)}
                    className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-red-950 transition-all"
                  >
                    View Curriculum
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
           <div className="text-amber-700 font-black text-xs uppercase tracking-[0.5em]">Support</div>
           <h2 className="text-4xl md:text-5xl font-black text-red-950 serif-font italic">Common Inquiries</h2>
        </div>
        <div className="space-y-2">
           <FAQItem 
            q="What is the minimum age for Nursery admission?" 
            a="As per the latest guidelines, children must be 3 years of age by March 31st of the academic year for which admission is sought."
           />
           <FAQItem 
            q="Does the school offer transportation services?" 
            a="Yes, UES provides safe and GPS-tracked bus services across major residential areas in Manpur and Gaya city."
           />
           <FAQItem 
            q="Are there any fee concessions for siblings?" 
            a="We offer a 10% concession on the Tuition fee for the second sibling enrolled in the school."
           />
           <FAQItem 
            q="How does the school handle holistic growth?" 
            a="UES follows an Integrated Curriculum that balances academics with Vedic Math, Robotics, Yoga, and Sports as mandatory components of student life."
           />
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-red-950 rounded-[4rem] p-16 md:p-32 text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-600/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-black text-white mb-10 serif-font italic leading-none tracking-tighter">
              Shape the <span className="text-amber-500 underline underline-offset-[16px] decoration-white/20">Leaders</span> of Tomorrow.
            </h2>
            <p className="text-red-100/60 mb-16 text-lg md:text-xl font-light italic leading-relaxed">
              Experience the warmth of our academic family and the depth of our commitment to excellence. Secure your seat for the next generation of greatness.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <button 
                onClick={() => onNavigate(Page.Admissions)}
                className="w-full sm:w-auto bg-amber-600 text-white px-14 py-6 rounded-full font-black text-[11px] uppercase tracking-widest shadow-[0_20px_50px_rgba(180,83,9,0.3)] hover:bg-amber-500 transition-all hover:scale-105 active:scale-95"
              >
                Start Inquiry
              </button>
              <button 
                onClick={() => onNavigate(Page.Contact)}
                className="w-full sm:w-auto bg-transparent border-2 border-white/20 text-white px-14 py-6 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all hover:border-white/60"
              >
                Request Prospectus
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
