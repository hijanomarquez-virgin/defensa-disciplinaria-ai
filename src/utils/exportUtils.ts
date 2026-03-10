import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const exportToWord = async (data: any) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "INFORME TÉCNICO-JURÍDICO ESPECIALIZADO",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "Defensa Disciplinaria - Policía Nacional",
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),

          new Paragraph({ text: "FASE 1: EXTRACCIÓN DE INFORMACIÓN", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          ...(data.fase1_tabla?.map((r: any) => new Paragraph({ 
            text: `• ${r.fecha} | ${r.actuacion} | ${r.documento} (Pág ${r.pagina}) - Relevancia: ${r.relevancia} | Impacto: ${r.impacto}`, 
            bullet: { level: 0 } 
          })) || []),

          new Paragraph({ text: "FASE 2: RECONSTRUCCIÓN CRONOLÓGICA", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase2_cronologia || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 3: DETECTOR DE CADUCIDAD", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: `Conclusión: ${data.fase3_caducidad?.conclusion || "N/A"}`, bold: true })] }),
          new Paragraph({ text: `Días Computables: ${data.fase3_caducidad?.dias_computables || "0"}` }),
          new Paragraph({ text: `Días Suspendidos: ${data.fase3_caducidad?.dias_suspendidos || "0"}` }),
          new Paragraph({ text: data.fase3_caducidad?.justificacion || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 4: ANÁLISIS DE PRESCRIPCIÓN", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase4_prescripcion || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 5: ANÁLISIS DEL PLIEGO DE CARGOS", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase5_pliego || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 6: DETECTOR DE INCOHERENCIAS", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase6_incoherencias || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 7: ANÁLISIS PROBATORIO", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase7_probatorio || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 8: ERRORES DEL INSTRUCTOR", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase8_errores_instructor || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 9: RELACIÓN PENAL-DISCIPLINARIO", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase9_relacion_penal || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 10: ANÁLISIS DE JURISPRUDENCIA", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase10_jurisprudencia || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 11: ANÁLISIS DE PROPORCIONALIDAD", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase11_proporcionalidad || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 12: ARGUMENTOS DE DEFENSA", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: "Muy Fuertes:", bold: true })] }),
          ...(data.fase12_argumentos?.muy_fuertes?.map((a: string) => new Paragraph({ text: `• ${a}`, bullet: { level: 0 } })) || []),
          new Paragraph({ children: [new TextRun({ text: "Medios:", bold: true })] }),
          ...(data.fase12_argumentos?.medios?.map((a: string) => new Paragraph({ text: `• ${a}`, bullet: { level: 0 } })) || []),
          new Paragraph({ children: [new TextRun({ text: "Débiles:", bold: true })] }),
          ...(data.fase12_argumentos?.debiles?.map((a: string) => new Paragraph({ text: `• ${a}`, bullet: { level: 0 } })) || []),

          new Paragraph({ text: "FASE 13: POSICIÓN DE LA ADMINISTRACIÓN", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase13_posicion_admin || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 14: PROBABILIDAD DE ÉXITO", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: `Nivel: ${data.fase14_probabilidad_exito?.nivel || "N/A"}`, bold: true })] }),
          new Paragraph({ text: data.fase14_probabilidad_exito?.justificacion || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 15: ESTRATEGIA DE DEFENSA", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase15_estrategia || "N/A", spacing: { after: 400 } }),

          new Paragraph({ text: "FASE 16: ALEGACIONES", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Paragraph({ text: data.fase16_alegaciones || "N/A", spacing: { after: 400 } }),

          new Paragraph({
            text: "\nEste informe ha sido generado automáticamente por el Sistema de Defensa Disciplinaria y debe ser validado por un abogado colegiado.",
            spacing: { before: 800 },
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Analisis_Disciplinario.docx");
};

export const exportAlegacionesToWord = async (text: string) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "BORRADOR DE ALEGACIONES",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          ...text.split("\n").map(line => new Paragraph({
            children: [new TextRun({ text: line, size: 24 })],
            spacing: { after: 120 }
          }))
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Borrador_Alegaciones.docx");
};

export const exportToPDF = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save("Analisis_Disciplinario.pdf");
};
