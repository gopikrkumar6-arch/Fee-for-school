
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

export class GeminiService {
  async getChatResponse(history: ChatMessage[]): Promise<string> {
    try {
      // Create a new instance right before use to ensure most up-to-date API key is used
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const contents = history
        .filter((msg, index) => index > 0 || msg.role === 'user')
        .map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: `You are the Unique English School (UES) Digital Concierge (Session 2026-27). 
          UES is located in Gaya, Bihar and follows a holistic NEP 2020 pedagogical framework.
          
          Context:
          - School Branch: Unique English School, Patwatoli, Manpur.
          - Motto: "Knowledge, Character, Excellence".
          - Admissions: Currently open for 2026-27 for Pre Nursery to Class X.
          - Finance: Monthly billing, annual waiver of 15% on full prepayments.
          
          Guidelines:
          - If asked about school news, results, or general educational standards in India/Bihar, use Google Search to provide up-to-date and accurate context.
          - Always remain professional, welcoming, and precise.
          - If users ask for URLs, list them clearly.`,
          tools: [{ googleSearch: {} }]
        },
      });

      let textResponse = response.text || "I'm having difficulty accessing the school database. Please contact the front office at +91 94312 00000.";
      
      // Extract and list URLs from groundingChunks as per required guidelines
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && Array.isArray(groundingChunks)) {
        const urls = groundingChunks
          .map((chunk: any) => chunk.web?.uri)
          .filter(Boolean);
        
        if (urls.length > 0) {
          const uniqueUrls = Array.from(new Set(urls));
          textResponse += "\n\nSources explored:\n" + uniqueUrls.map(url => `- ${url}`).join('\n');
        }
      }

      return textResponse;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "I'm experiencing a temporary synchronization issue with the campus server. Please try again shortly.";
    }
  }
}

export const geminiService = new GeminiService();
