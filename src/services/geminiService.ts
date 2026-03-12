import { runOCR } from "./ocrService";
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("CRITICAL: GEMINI_API_KEY is not defined in the environment!");
}

const BLOCK_CHAR_LIMIT = 12000;
const MAX_CONTEXT_FOR_CHAT = 18000;
const ANALYSIS_MODEL = "gemini-2.5-flash";
const FINAL_MODEL = "gemini-2.5-flash";

type FileData = {
  base64: string;
  mimeType: string;
};

type ChatHistory = {
  role: "user" | "model";
  parts: { text: string }[];
}[];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanBase64 = (base64: string) => {
  if (!base64) return "";
  const prefixMatch = base64.match(/^data:.*?;base64,/);
  const cleaned = prefixMatch ? base64.substring(prefixMatch[0].length) : base64;
  return cleaned.replace(/\s/g, "");
};

const cleanJsonResponse = (text: string | undefined) => {
  if (!text) {
    throw new Error("La IA no devolvió ninguna respuesta.");
  }

  const originalText = text;

  try {
    let cleaned = text.replace(/```json\n?|```/g, "").trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(cleaned);
  } catch (error: any) {
    console.error("Error parsing JSON response:", error, "Original text:", originalText);

    const match = originalText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerError) {
        console.error("Failed to parse extracted JSON block:", innerError);
      }
    }

    throw new Error("La IA devolvió una respuesta en formato no válido.");
  }
};

const normalizeText = (text: string) => {
  return (text || "")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const splitTextIntoBlocks = (text: string, maxChars = BLOCK_CHAR_LIMIT): string[] => {
  const normalized = normalizeText(text);

  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\s*\n/);
  const blocks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      blocks.push(current);
      current = "";
    }

    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }

    for (let i = 0; i < paragraph.length; i += maxChars) {
      blocks.push(paragraph.slice(i, i + maxChars));
    }
  }

  if (current) {
    blocks.push(current);
  }

  return blocks;
};

const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelay = 1500
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const retryable =
        error?.status === 429 ||
        error?.status >= 500 ||
        error?.message?.includes("fetch") ||
        error?.message?.includes("timeout") ||
        error?.message?.includes("overloaded");

      if (!retryable || attempt === retries) {
        break;
      }

      await sleep(baseDelay * (attempt + 1));
    }
  }

  throw lastError;
};

const getAI = () => {
  const userKey = localStorage.getItem("user_gemini_api_key");
  const finalKey = userKey || apiKey;

  if (!finalKey) {
    throw new Error("No Gemini API key available");
  }

  return new GoogleGenAI({ apiKey: finalKey });
};

const analyzeBlock = async (
  ai: GoogleGenAI,
  text: string,
  blockNum: number,
  totalBlocks: number,
  retryCount = 0
): Promise<any> => {
  const prompt = `
Eres una abogada especialista en Derecho Disciplinario de la Policía Nacional española y procedimiento administrativo sancionador.

Analiza SOLO este bloque del expediente.

OBJETIVOS:
1. Resumir técnicamente el contenido del bloque.
2. Extraer fechas, actuaciones, documentos y hechos clave.
3. Detectar normativa citada.
4. Señalar si hay datos relevantes para caducidad, prescripción, suspensión, reanudación, pliego de cargos, propuesta o resolución.

REGLAS:
- No inventes datos.
- Si algo no aparece, indica "NO CONSTA".
- Si el bloque es irrelevante, indica "SIN INFORMACIÓN RELEVANTE".
- Sé literal y prudente.
- No hagas conclusiones globales del expediente.
- Si ves una fecha, inclúyela aunque no estés seguro del efecto jurídico.
- Si hay una referencia de página interna del texto, recógela.

BLOQUE ${blockNum} de ${totalBlocks}

TEXTO:
"""
${text}
"""
`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumen_bloque: { type: Type.STRING },
              actuaciones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fecha: { type: Type.STRING },
                    actuacion: { type: Type.STRING },
                    documento: { type: Type.STRING },
                    pagina: { type: Type.STRING },
                    relevancia: { type: Type.STRING },
                    evidencia: { type: Type.STRING }
                  },
                  required: ["fecha", "actuacion", "documento", "pagina", "relevancia", "evidencia"]
                }
              },
              normativa: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    referencia: { type: Type.STRING },
                    pagina: { type: Type.STRING },
                    evidencia: { type: Type.STRING }
                  },
                  required: ["referencia", "pagina", "evidencia"]
                }
              },
              hechos_clave: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              alertas_plazos: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: [
              "resumen_bloque",
              "actuaciones",
              "normativa",
              "hechos_clave",
              "alertas_plazos"
            ]
          }
        }
      })
    );

    if (!response?.text) {
      throw new Error("El modelo no devolvió texto en este bloque.");
    }

    return cleanJsonResponse(response.text);
  } catch (error: any) {
    console.error(`Error in analyzeBlock ${blockNum} (Attempt ${retryCount + 1}):`, error);
    throw new Error(`Error en bloque ${blockNum}: ${error.message || "Error desconocido"}`);
  }
};

const reconstructChronology = async (ai: GoogleGenAI, blockResults: any[]) => {
  const prompt = `
Eres una jurista experta en cronología procedimental.

A partir de los datos extraídos de varios bloques de un expediente disciplinario, reconstruye una cronología unificada.

REGLAS:
- Ordena los hitos por fecha.
- Si dos hitos parecen duplicados, unifícalos.
- Identifica periodos de suspensión, paralización o inactividad.
- Marca hitos críticos: incoación, pliego, suspensión, reanudación, propuesta, alegaciones, resolución.
- No inventes fechas.
- Si una fecha no es segura, indícalo en la descripción.

DATOS:
${JSON.stringify(blockResults)}
`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cronologia_unificada: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fecha: { type: Type.STRING },
                  hito: { type: Type.STRING },
                  descripcion: { type: Type.STRING },
                  importancia: { type: Type.STRING }
                },
                required: ["fecha", "hito", "descripcion", "importancia"]
              }
            },
            periodos_criticos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  inicio: { type: Type.STRING },
                  fin: { type: Type.STRING },
                  tipo: { type: Type.STRING },
                  causa: { type: Type.STRING }
                },
                required: ["inicio", "fin", "tipo", "causa"]
              }
            }
          },
          required: ["cronologia_unificada", "periodos_criticos"]
        }
      }
    })
  );

  if (!response?.text) {
    throw new Error("El modelo no devolvió texto en la cronología.");
  }

  return cleanJsonResponse(response.text);
};

const generateFinalExpertReport = async (
  ai: GoogleGenAI,
  chronology: any,
  blockResults: any[]
) => {
  const prompt = `
Eres una abogada de despacho jurídico especializada en expedientes disciplinarios de la Policía Nacional.

Debes elaborar un informe técnico final, profundo y estructurado, basándote EXCLUSIVAMENTE en:

1. la cronología unificada
2. los resultados de extracción por bloques

NO inventes hechos, fechas ni normativa.
Cuando algo no conste, indica "NO CONSTA EN EL PDF".

ESTRUCTURA OBLIGATORIA:

1. fase1_tabla:
   Tabla completa de fechas y actuaciones con:
   fecha, actuacion, documento, pagina, relevancia, impacto

2. fase2_cronologia:
   Narrativa cronológica clara y ordenada

3. fase3_caducidad:
   - plazo_maximo
   - tiempo_total
   - dias_computables
   - dias_suspendidos
   - dias_paralizacion
   - conclusion
   - justificacion

4. fase4_prescripcion

5. fase5_pliego

6. fase6_incoherencias

7. fase7_probatorio

8. fase8_errores_instructor

9. fase9_relacion_penal

10. fase10_jurisprudencia
    No inventes sentencias concretas si no estás seguro. Puedes referirte a doctrina jurisprudencial consolidada.

11. fase11_proporcionalidad

12. fase12_argumentos:
    - muy_fuertes
    - medios
    - debiles

13. fase13_posicion_admin

14. fase14_probabilidad_exito:
    - nivel
    - justificacion

15. fase15_estrategia

16. fase16_alegaciones:
    Redacta alegaciones administrativas completas, formales y utilizables.

TONO:
- técnico
- realista
- crítico
- útil para defensa administrativa

DATOS DE ENTRADA:
CRONOLOGÍA:
${JSON.stringify(chronology)}

EXTRACCIONES:
${JSON.stringify(blockResults)}
`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: FINAL_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fase1_tabla: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fecha: { type: Type.STRING },
                  actuacion: { type: Type.STRING },
                  documento: { type: Type.STRING },
                  pagina: { type: Type.STRING },
                  relevancia: { type: Type.STRING },
                  impacto: { type: Type.STRING }
                },
                required: ["fecha", "actuacion", "documento", "pagina", "relevancia", "impacto"]
              }
            },
            fase2_cronologia: { type: Type.STRING },
            fase3_caducidad: {
              type: Type.OBJECT,
              properties: {
                plazo_maximo: { type: Type.STRING },
                tiempo_total: { type: Type.STRING },
                dias_computables: { type: Type.STRING },
                dias_suspendidos: { type: Type.STRING },
                dias_paralizacion: { type: Type.STRING },
                conclusion: { type: Type.STRING },
                justificacion: { type: Type.STRING }
              },
              required: [
                "plazo_maximo",
                "tiempo_total",
                "dias_computables",
                "dias_suspendidos",
                "dias_paralizacion",
                "conclusion",
                "justificacion"
              ]
            },
            fase4_prescripcion: { type: Type.STRING },
            fase5_pliego: { type: Type.STRING },
            fase6_incoherencias: { type: Type.STRING },
            fase7_probatorio: { type: Type.STRING },
            fase8_errores_instructor: { type: Type.STRING },
            fase9_relacion_penal: { type: Type.STRING },
            fase10_jurisprudencia: { type: Type.STRING },
            fase11_proporcionalidad: { type: Type.STRING },
            fase12_argumentos: {
              type: Type.OBJECT,
              properties: {
                muy_fuertes: { type: Type.ARRAY, items: { type: Type.STRING } },
                medios: { type: Type.ARRAY, items: { type: Type.STRING } },
                debiles: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["muy_fuertes", "medios", "debiles"]
            },
            fase13_posicion_admin: { type: Type.STRING },
            fase14_probabilidad_exito: {
              type: Type.OBJECT,
              properties: {
                nivel: { type: Type.STRING },
                justificacion: { type: Type.STRING }
              },
              required: ["nivel", "justificacion"]
            },
            fase15_estrategia: { type: Type.STRING },
            fase16_alegaciones: { type: Type.STRING },
            normativa_anexo: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  referencia: { type: Type.STRING },
                  pagina: { type: Type.STRING },
                  evidencia: { type: Type.STRING }
                },
                required: ["referencia", "pagina", "evidencia"]
              }
            }
          },
          required: [
            "fase1_tabla",
            "fase2_cronologia",
            "fase3_caducidad",
            "fase4_prescripcion",
            "fase5_pliego",
            "fase6_incoherencias",
            "fase7_probatorio",
            "fase8_errores_instructor",
            "fase9_relacion_penal",
            "fase10_jurisprudencia",
            "fase11_proporcionalidad",
            "fase12_argumentos",
            "fase13_posicion_admin",
            "fase14_probabilidad_exito",
            "fase15_estrategia",
            "fase16_alegaciones",
            "normativa_anexo"
          ]
        }
      }
    })
  );

  if (!response?.text) {
    throw new Error("El modelo no devolvió texto en el informe final.");
  }

  return cleanJsonResponse(response.text);
};

export const analyzeLegalDocument = async (
  text: string,
  fileData?: FileData,
  numPages?: number,
  onProgress?: (message: string) => void
): Promise<any> => {
  try {
    const ai = getAI();

    let normalizedText = normalizeText(text);
let blocks = splitTextIntoBlocks(normalizedText);

    if (!blocks.length) {
  if (fileData?.base64) {
    onProgress?.("No se ha extraído texto útil del PDF. Activando OCR para documento escaneado...");

    const ocrText = await runOCR(fileData.base64);

    if (!ocrText || ocrText.trim().length < 50) {
      throw new Error(
        "No se pudo extraer texto útil del PDF ni siquiera con OCR."
      );
    }

    normalizedText = normalizeText(ocrText);
    blocks = splitTextIntoBlocks(normalizedText);

    if (!blocks.length) {
      throw new Error(
        "El OCR se ejecutó, pero no se pudo obtener texto suficiente para analizar el documento."
      );
    }

    onProgress?.(`OCR completado correctamente. Se han generado ${blocks.length} bloques para análisis.`);
  } else {
    throw new Error("No se ha podido extraer texto del documento.");
  }
}

    onProgress?.(
      `Iniciando análisis jurídico profesional (${numPages || "?"} páginas, ${blocks.length} bloques)...`
    );

    const blockResults: any[] = [];

    for (let i = 0; i < blocks.length; i++) {
      onProgress?.(`Analizando bloque ${i + 1}/${blocks.length}...`);

      try {
        const result = await analyzeBlock(ai, blocks[i], i + 1, blocks.length);
        if (result) {
          blockResults.push(result);
        }
      } catch (error) {
        console.error(`Error analizando bloque ${i + 1}:`, error);
        onProgress?.(`Aviso: error parcial en bloque ${i + 1}. Se continúa con el resto.`);
      }
    }

    const validResults = blockResults.filter(
      (r) =>
        r &&
        r.resumen_bloque !== "SIN INFORMACIÓN RELEVANTE" &&
        ((Array.isArray(r.actuaciones) && r.actuaciones.length > 0) ||
          (Array.isArray(r.hechos_clave) && r.hechos_clave.length > 0))
    );

    if (!validResults.length) {
      console.warn("No se detectaron bloques jurídicos claros, usando texto completo como fallback.");

  validResults.push({
    resumen_bloque: normalizedText.slice(0, 2000),
    actuaciones: [],
    hechos_clave: []
  });
}

    onProgress?.("Reconstruyendo cronología del expediente...");
    const chronology = await reconstructChronology(ai, validResults);

    onProgress?.("Generando informe final y alegaciones...");
    const finalReport = await generateFinalExpertReport(ai, chronology, validResults);

    return finalReport;
  } catch (error: any) {
    console.error("Error in analyzeLegalDocument:", error);
    throw new Error(error?.message || "Error desconocido durante el análisis jurídico.");
  }
};

export const chatWithDocument = async (
  text: string,
  message: string,
  history: ChatHistory,
  fileData?: FileData,
  retryCount = 0
): Promise<string> => {
  try {
    const ai = getAI();

    const systemInstructionText = `
Eres un jurista experto en régimen disciplinario de la Policía Nacional española y procedimiento administrativo.

MODOS DE RESPUESTA:
1. Si existe documento o texto aportado, responde basándote en ese documento.
2. Si no existe documento, responde como consultor jurídico general en materia disciplinaria y administrativa.

REGLAS:
- Responde con precisión jurídica.
- Basa la respuesta en el documento y en la pregunta del usuario.
- Si el dato no consta claramente, dilo.
- No inventes hechos.
- Si procede, cita de forma orientativa principios o normas relevantes.
- Sé claro y útil.
`;

    const chat = ai.chats.create({
      model: ANALYSIS_MODEL,
      config: {
        systemInstruction: systemInstructionText
      },
      history: history.map((h) => ({
        role: h.role,
        parts: h.parts
      }))
    });

    const messageParts: any[] = [];

    if (history.length === 0 && text) {
      messageParts.push({
        text: `CONTEXTO DEL DOCUMENTO:\n${text.substring(0, MAX_CONTEXT_FOR_CHAT)}`
      });
    }

    if (history.length === 0 && !text && fileData?.base64) {
      const cleanedB64 = cleanBase64(fileData.base64);
      if (cleanedB64) {
        messageParts.push({
          inlineData: {
            data: cleanedB64,
            mimeType: fileData.mimeType || "application/pdf"
          }
        });
      }
    }

    messageParts.push({ text: message });

    const response = await withRetry(() =>
      chat.sendMessage({ message: messageParts })
    );

    if (!response?.text) {
      throw new Error("El modelo no devolvió una respuesta válida.");
    }

    return response.text;
  } catch (error: any) {
    console.error(`Error in chatWithDocument (Attempt ${retryCount + 1}):`, error);
    throw new Error(`Error de conexión con la IA: ${error.message || "Fallo desconocido"}`);
  }
};