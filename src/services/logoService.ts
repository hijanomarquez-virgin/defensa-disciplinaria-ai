import { GoogleGenAI } from "@google/genai";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// A professional-looking fallback logo (Shield + Scales) in SVG format encoded as Base64
const STATIC_FALLBACK_LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIyczgtNCIDgtMTBWNWwtOC0zLTggM3Y3YzAgNiA4IDEwIDggMTBaIi8+PHBhdGggZD0iTTggMTRoOCIvPjxwYXRoIGQ9Ik0xMiAxMXY2Ii8+PHBhdGggZD0iTTkgMTNoNm0tNiA0aDYiLz48L3N2Zz4=";

export const generateLogo = async (retryCount = 0): Promise<string | null> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return STATIC_FALLBACK_LOGO;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: 'Logotipo profesional compuesto por un escudo estilizado en tonos azul oscuro que contiene en su interior una balanza de la justicia. El diseño es moderno y minimalista, con líneas limpias que transmiten autoridad, protección y rigor jurídico, ideal para una plataforma de defensa en procedimientos disciplinarios. Fondo gris muy claro o blanco.',
          },
        ],
      },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return STATIC_FALLBACK_LOGO;
  } catch (error: any) {
    const isQuotaError = error?.message?.includes("429") || error?.status === 429 || error?.code === 429;
    
    if (isQuotaError) {
      if (retryCount < 1) {
        console.log(`Quota exceeded for logo generation, retrying once...`);
        await sleep(1500);
        return generateLogo(retryCount + 1);
      }
      // Silently return fallback on quota exhaustion to avoid console noise
      return STATIC_FALLBACK_LOGO;
    }

    console.warn("Logo generation failed, using fallback:", error?.message || error);
    return STATIC_FALLBACK_LOGO;
  }
};
