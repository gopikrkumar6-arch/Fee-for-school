
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { ChatMessage } from '../types';

const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    // Fixed: School branding updated to Unique English School
    { role: 'model', text: 'Welcome to Unique English School. I am your Digital Concierge. How may I assist your inquiry today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await geminiService.getChatResponse([...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "I'm experiencing a technical pause. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-red-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-red-800 transition-all hover:scale-110 z-50 border-4 border-amber-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[550px] bg-white rounded-3xl shadow-2xl flex flex-col z-50 border-t-[10px] border-red-900 overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-red-900 p-6 text-white flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3">
                {/* Fixed: Icon branding updated to UES */}
                <span className="text-red-900 font-bold text-xs">UES</span>
              </div>
              <div>
                {/* Fixed: Title branding updated to UES Concierge */}
                <h3 className="font-bold text-sm serif-font">UES Concierge</h3>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  <p className="text-[10px] text-red-200">Online & Active</p>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fcf9f2]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-red-900 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 border-l-4 border-amber-600 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-xl border border-slate-100 flex space-x-2">
                  <div className="w-2 h-2 bg-red-900 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-red-900 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-red-900 rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center space-x-2 bg-slate-100 rounded-full px-4 py-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask our Concierge..."
                className="flex-1 bg-transparent border-none py-3 text-sm focus:outline-none"
              />
              <button 
                type="submit"
                disabled={isLoading}
                className="text-red-900 hover:text-red-700 disabled:opacity-30 p-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
