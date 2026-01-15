
import React, { useState } from 'react';
import { GALLERY_IMAGES } from '../constants';

const Gallery: React.FC = () => {
  const [filter, setFilter] = useState<'All' | 'Academics' | 'Sports' | 'Campus' | 'Events'>('All');
  
  const filtered = filter === 'All' 
    ? GALLERY_IMAGES 
    : GALLERY_IMAGES.filter(img => img.category === filter);

  return (
    <div className="min-h-screen pb-20 bg-cream">
      <div className="bg-school-burgundy py-24 text-center text-white px-4">
        <h1 className="text-5xl md:text-7xl font-black serif-font mb-4 italic">Campus Life</h1>
        <p className="text-red-100/60 max-w-2xl mx-auto font-light tracking-wide uppercase text-xs">Visualizing the Journey of Excellence at UES</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12">
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {['All', 'Academics', 'Sports', 'Campus', 'Events'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat as any)}
              className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === cat 
                  ? 'bg-school-burgundy text-white shadow-xl scale-105' 
                  : 'bg-white text-slate-500 hover:text-school-burgundy border border-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {filtered.map((img) => (
            <div key={img.id} className="break-inside-avoid relative group overflow-hidden rounded-[2rem] shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer">
              <img 
                src={img.url} 
                alt={img.title} 
                className="w-full h-auto grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-school-burgundy/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8">
                <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-2">{img.category}</span>
                <h3 className="text-white font-bold text-xl serif-font italic">{img.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
