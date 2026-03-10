import React from "react";
import { motion } from "motion/react";
import { Shield, X } from "lucide-react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

export const LegalModal = ({ isOpen, onClose, title, content }: LegalModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-900" />
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto text-slate-600 space-y-4 leading-relaxed">
          {content}
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const PrivacyPolicy = () => (
  <div className="space-y-6">
    <section>
      <h4 className="font-bold text-slate-900 mb-2">1. Responsable del Tratamiento</h4>
      <p>Defensa Disciplinaria trata sus datos de forma confidencial. Los datos proporcionados en el formulario de acceso se utilizan exclusivamente para validar su perfil profesional.</p>
    </section>
    <section>
      <h4 className="font-bold text-slate-900 mb-2">2. Datos Recogidos</h4>
      <p>Recogemos su nombre, correo electrónico y perfil profesional. Los documentos PDF subidos para análisis se procesan en memoria y no se almacenan de forma persistente en nuestros servidores tras finalizar la sesión de análisis.</p>
    </section>
    <section>
      <h4 className="font-bold text-slate-900 mb-2">3. Derechos del Usuario</h4>
      <p>Usted tiene derecho a acceder, rectificar y suprimir sus datos. Puede solicitar el borrado completo de su cuenta y registros asociados desde el panel de configuración.</p>
    </section>
  </div>
);

export const TermsAndConditions = () => (
  <div className="space-y-6">
    <section>
      <h4 className="font-bold text-slate-900 mb-2">1. Uso del Servicio</h4>
      <p>Este servicio está destinado exclusivamente a funcionarios de la Policía Nacional y abogados colegiados. El uso indebido de la plataforma resultará en la revocación inmediata del acceso.</p>
    </section>
    <section>
      <h4 className="font-bold text-slate-900 mb-2">2. Propiedad Intelectual</h4>
      <p>Los algoritmos de análisis y la estructura de los informes son propiedad de Defensa Disciplinaria. El usuario tiene licencia para utilizar los informes generados en sus propios procedimientos legales.</p>
    </section>
    <section>
      <h4 className="font-bold text-slate-900 mb-2">3. Limitación de Responsabilidad</h4>
      <p>Defensa Disciplinaria no garantiza resultados específicos en los procedimientos disciplinarios. La plataforma es una herramienta de apoyo técnico.</p>
    </section>
  </div>
);

export const LegalDisclaimer = () => (
  <div className="space-y-6">
    <div className="p-5 bg-red-50 border-l-4 border-red-600 text-red-900 font-bold flex items-start gap-3 shadow-sm">
      <Shield className="w-6 h-6 shrink-0 mt-0.5" />
      <div>
        <h4 className="text-lg mb-1 uppercase tracking-tight">ADVERTENCIA LEGAL CRÍTICA Y OBLIGATORIA</h4>
        <p className="text-sm font-medium leading-relaxed">
          Esta plataforma utiliza Inteligencia Artificial avanzada para el análisis técnico de expedientes disciplinarios. El uso de esta herramienta implica la aceptación de las siguientes limitaciones:
        </p>
      </div>
    </div>
    
    <div className="space-y-4 text-slate-700">
      <section className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">1</span>
          AUSENCIA DE ASESORAMIENTO JURÍDICO
        </h4>
        <p className="text-sm leading-relaxed">
          Los informes, análisis y sugerencias generados por Defensa Disciplinaria <strong>NO CONSTITUYEN, BAJO NINGUNA CIRCUNSTANCIA, ASESORAMIENTO JURÍDICO VINCULANTE</strong>. Esta herramienta es un asistente técnico-jurisprudencial diseñado para apoyar la labor de defensa, no para sustituir el criterio profesional de un abogado colegiado o experto en derecho administrativo.
        </p>
      </section>

      <section className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">2</span>
          OBLIGACIÓN DE REVISIÓN CRÍTICA
        </h4>
        <p className="text-sm leading-relaxed">
          El usuario tiene la <strong>OBLIGACIÓN INEXCUSABLE E INDELEGABLE</strong> de revisar exhaustivamente toda la información, citas legales, plazos y jurisprudencia proporcionada por la IA antes de su incorporación en cualquier escrito, recurso o procedimiento oficial. La IA puede generar "alucinaciones" o citar normativa derogada o inaplicable al caso concreto.
        </p>
      </section>

      <section className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">3</span>
          EXCLUSIÓN DE RESPONSABILIDAD
        </h4>
        <p className="text-sm leading-relaxed">
          Defensa Disciplinaria, sus desarrolladores y proveedores <strong>NO SE HACEN RESPONSABLES</strong> de las decisiones tomadas, documentos presentados, pérdida de derechos o resultados desfavorables en procedimientos administrativos o judiciales basados en el contenido generado por esta plataforma. El riesgo del uso de la IA es asumido íntegramente por el usuario.
        </p>
      </section>

      <section className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">4</span>
          VERIFICACIÓN DE JURISPRUDENCIA
        </h4>
        <p className="text-sm leading-relaxed">
          Las sentencias y bases legales citadas deben ser verificadas en bases de datos oficiales (CENDOJ, BOE, etc.). La IA facilita la localización de argumentos, pero la vigencia y exactitud de los mismos debe ser validada manualmente por el profesional.
        </p>
      </section>
    </div>

    <p className="text-xs text-slate-400 italic text-center pt-4">
      Al continuar utilizando esta plataforma, usted confirma que ha leído, comprendido y aceptado íntegramente este descargo de responsabilidad legal.
    </p>
  </div>
);
