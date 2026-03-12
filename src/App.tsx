import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Shield, 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Download, 
  Lock,
  Key, 
  ChevronRight, 
  Scale, 
  User, 
  LogOut,
  Loader2,
  FileSearch,
  Gavel,
  Users,
  Activity,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  CreditCard,
  Eye,
  ArrowLeft,
  MessageSquare,
  Mail,
  Send,
  Bot,
  Paperclip,
  BookOpen,
  FileCheck,
  History,
  HelpCircle,
  Briefcase,
  Table as TableIcon,
  Calculator,
  Target,
  Zap,
  ShieldCheck,
  FileWarning,
  FileQuestion,
  TrendingUp,
  Stethoscope,
  SearchCode
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { analyzeLegalDocument, chatWithDocument } from "./services/geminiService";
import { exportToWord, exportToPDF, exportAlegacionesToWord } from "./utils/exportUtils";
import { LegalModal, PrivacyPolicy, TermsAndConditions, LegalDisclaimer } from "./components/LegalModals";
import { loadStripe } from "@stripe/stripe-js";

const getStripe = () => {
  const key = (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.warn("VITE_STRIPE_PUBLISHABLE_KEY is missing. Stripe features will not work.");
    return null;
  }
  return loadStripe(key);
};

const stripePromise = getStripe();

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = "primary", 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "ghost" }) => {
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
    secondary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    outline: "border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700",
    ghost: "hover:bg-slate-100 text-slate-600",
  };

  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("legal-card p-6", className)}>
    {children}
  </div>
);

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
      >
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="text-slate-500">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onConfirm(); onClose(); }}>Confirmar Exportación</Button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Views ---

const LandingPage = ({ 
  onVerify, 
  authError, 
  paymentStatus, 
  email: initialEmail, 
  appLogo 
}: { 
  onVerify: (email: string) => void; 
  authError?: string | null; 
  paymentStatus?: string | null; 
  email?: string | null; 
  appLogo: string | null 
}) => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState(initialEmail || "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(paymentStatus === "pendiente_verificacion");
  const [legalModal, setLegalModal] = useState<{ type: "privacy" | "terms" | "disclaimer" | null; isOpen: boolean }>({ type: null, isOpen: false });

  useEffect(() => {
    if (paymentStatus === "pendiente_verificacion") {
      setConfirmed(true);
    }
  }, [paymentStatus]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onVerify(email.toLowerCase());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("Submitting access request for:", email);
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), name, phone, reason }),
      });
      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);
      if (data.success) {
        setSuccess(true);
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Error al enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch("/api/access-request/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setConfirmed(true);
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Error al confirmar el pago.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fdfcfb]">
      <LegalModal 
        isOpen={legalModal.isOpen}
        onClose={() => setLegalModal({ ...legalModal, isOpen: false })}
        title={legalModal.type === "privacy" ? "Política de Privacidad" : legalModal.type === "terms" ? "Términos y Condiciones" : "Descargo de Responsabilidad"}
        content={legalModal.type === "privacy" ? <PrivacyPolicy /> : legalModal.type === "terms" ? <TermsAndConditions /> : <LegalDisclaimer />}
      />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full text-center space-y-8"
      >
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl overflow-hidden border border-slate-100">
            {appLogo ? (
              <img src={appLogo} alt="Logo Defensa Disciplinaria" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Shield className="text-slate-900 w-12 h-12" />
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 tracking-tight">
            Defensa Disciplinaria
          </h1>
          <p className="text-lg text-slate-600 font-medium max-w-lg mx-auto">
            Acceso beta por invitación
          </p>
        </div>

        <div className="glass p-8 rounded-2xl shadow-xl border-slate-200/50">
          {authError && !success && paymentStatus !== 'no_iniciado' && paymentStatus !== 'pendiente_verificacion' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {authError}
            </motion.div>
          )}
          {(success || (paymentStatus && paymentStatus !== 'confirmado')) ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-6 space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-emerald-900">
                  {paymentStatus === 'pendiente_verificacion' ? "Verificación en Curso" : "Solicitud Recibida"}
                </h3>
                <p className="text-emerald-700 text-sm">
                  {paymentStatus === 'pendiente_verificacion' 
                    ? "Estamos revisando tu pago. Recibirás acceso en breve." 
                    : "Para activar tu cuenta beta de inmediato, sigue estas instrucciones:"}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-emerald-200 text-left space-y-4 shadow-sm">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-slate-400">Instrucciones de Pago</p>
                  <p className="text-slate-700 font-medium">Bizum: <span className="text-slate-900 font-bold">29€</span> al número: <span className="text-slate-900 font-bold">696135080</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-slate-400">Concepto Obligatorio</p>
                  <p className="text-slate-700 font-medium bg-slate-50 p-2 rounded border border-slate-100 font-mono text-xs">
                    BETA + {email}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  * Una vez verificado el pago (aprox. 1 min), activaremos tu acceso por 30 días y recibirás un aviso.
                </p>
              </div>

              {confirmed ? (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm font-medium">
                  Estado: <span className="font-bold">Pendiente de verificación</span>. Revisaremos tu Bizum en breve.
                </div>
              ) : (
                <Button 
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200"
                  onClick={handleConfirmPayment}
                  disabled={isConfirming}
                >
                  {isConfirming ? <Loader2 className="animate-spin mx-auto" /> : "He realizado el pago"}
                </Button>
              )}

              <Button variant="outline" className="w-full" onClick={() => { setSuccess(false); setConfirmed(false); setIsLogin(false); }}>
                Volver
              </Button>
            </motion.div>
          ) : isLogin ? (
            <form onSubmit={handleLogin} className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Profesional</label>
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                  placeholder="tu@email.com"
                />
              </div>
              <Button type="submit" className="w-full py-4 text-lg font-bold">
                Entrar a la Beta
              </Button>
              <div className="text-center">
                <button 
                  type="button" 
                  onClick={() => setIsLogin(false)}
                  className="text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors"
                >
                  ¿No tienes cuenta? Solicita acceso
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nombre Completo</label>
                  <input 
                    required
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Profesional</label>
                    <input 
                      required
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                      placeholder="tu@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Teléfono (Opcional)</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                      placeholder="600 000 000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Perfil / Motivo de acceso</label>
                  <textarea 
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all h-24 resize-none"
                    placeholder="¿Por qué necesitas acceder a la beta?"
                  />
                </div>
                <Button type="submit" className="w-full py-4 text-lg font-bold" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Solicitar Invitación Beta"}
                </Button>
              </form>
              <div className="text-center">
                <button 
                  type="button" 
                  onClick={() => setIsLogin(true)}
                  className="text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors"
                >
                  ¿Ya tienes acceso? Entra aquí
                </button>
              </div>
              <p className="text-center text-xs text-slate-400">
                Acceso limitado por invitación. Revisión manual de perfiles.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-8 text-slate-400 text-sm">
          <button onClick={() => setLegalModal({ type: "privacy", isOpen: true })} className="hover:text-slate-600 transition-colors">Privacidad</button>
          <button onClick={() => setLegalModal({ type: "terms", isOpen: true })} className="hover:text-slate-600 transition-colors">Términos</button>
          <button onClick={() => setLegalModal({ type: "disclaimer", isOpen: true })} className="hover:text-slate-600 transition-colors">Aviso Legal</button>
        </div>
      </motion.div>
    </div>
  );
};

const Chat = ({ extractedText, isPaid, fileData }: { extractedText: string; isPaid: boolean; fileData?: { base64: string, mimeType: string } }) => {
  const [messages, setMessages] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(() => {
  const saved = sessionStorage.getItem("chat_question_count");
  return saved ? Number(saved) : 0;
});
  const FREE_QUESTIONS_WITHOUT_OWN_KEY = 2;
  const MAX_QUESTIONS_WITH_OWN_KEY = 10;
  const hasOwnGeminiKey = !!localStorage.getItem("user_gemini_api_key");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading ) return;
    if (!hasOwnGeminiKey && questionCount >= FREE_QUESTIONS_WITHOUT_OWN_KEY) {
  setMessages(prev => [
    ...prev,
    {
      role: "model",
      text: "Has agotado tus 2 consultas gratuitas. Para seguir usando la IA, introduce tu propia API Key de Gemini en 'Configuración de IA'."
    }
  ]);
  return;
}

if (hasOwnGeminiKey && questionCount >= MAX_QUESTIONS_WITH_OWN_KEY) {
  setMessages(prev => [
    ...prev,
    {
      role: "model",
      text: `Has alcanzado el límite de ${MAX_QUESTIONS_WITH_OWN_KEY} consultas en esta sesión.`
    }
  ]);
  return;
}
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      
      const response = await chatWithDocument(extractedText, userMessage, history, fileData);

setMessages(prev => [
  ...prev,
  { role: "model", text: response || "Lo siento, no he podido procesar tu pregunta." }
]);

setQuestionCount(prev => {
  const next = prev + 1;
  sessionStorage.setItem("chat_question_count", String(next));
  return next;
});
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = error.message || "Error al conectar con la IA. Por favor, inténtalo de nuevo.";
      setMessages(prev => [...prev, { role: "model", text: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-[500px] flex flex-col p-0 overflow-hidden border-slate-200">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Bot className="w-5 h-5 text-slate-900" />
        <h4 className="font-bold text-sm">Consultoría Jurídica IA</h4>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-40">
            <MessageSquare className="w-8 h-8" />
            <p className="text-xs">
  Puedes preguntar cualquier duda sobre el expediente o hacer una consulta jurídica general.
  <br />
  Ej: "¿Qué plazo tengo para alegar?" o "¿Cuándo caduca un expediente disciplinario?"
</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn(
            "flex flex-col max-w-[85%]",
            m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
          )}>
            <div className={cn(
              "p-3 rounded-2xl text-sm leading-relaxed",
              m.role === "user" 
                ? "bg-slate-900 text-white rounded-tr-none" 
                : "bg-slate-100 text-slate-800 rounded-tl-none"
            )}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs animate-pulse">
            <Bot className="w-4 h-4" />
            <span>Escribiendo respuesta...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta jurídica..."
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading}
          className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-slate-800 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      <p className="text-xs text-slate-400 px-4 pb-4 bg-slate-50">
  Consultas usadas: {questionCount}/{hasOwnGeminiKey ? MAX_QUESTIONS_WITH_OWN_KEY : FREE_QUESTIONS_WITHOUT_OWN_KEY}
</p>
    </Card>
  );
};

const Dashboard = ({ userEmail, onLogout, verifyAccess, appLogo, initialPaymentStatus }: { userEmail: string; onLogout: () => void; verifyAccess: (email: string) => Promise<void>; appLogo: string | null; initialPaymentStatus: string | null }) => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [fileData, setFileData] = useState<{ base64: string, mimeType: string } | undefined>(undefined);
  const [isPaid, setIsPaid] = useState(initialPaymentStatus === 'confirmado');
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [savingGeminiKey, setSavingGeminiKey] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [confirmExport, setConfirmExport] = useState<{ type: "word" | "pdf" | null; isOpen: boolean }>({ type: null, isOpen: false });

  useEffect(() => {
    verifyAccess(userEmail);
    
    if (initialPaymentStatus === 'confirmado') {
      setIsPaid(true);
    }
    
    // Check if disclaimer was acknowledged this session
    const acknowledged = sessionStorage.getItem("disclaimer_acknowledged");
    if (!acknowledged) {
      setShowDisclaimer(true);
    }
    
    // Check for session_id in URL
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    
    if (sessionId) {
      verifyPayment(sessionId);
    }

    // Load cached analysis if exists
    const cachedResult = sessionStorage.getItem("pending_analysis");
    const cachedText = sessionStorage.getItem("pending_text");
    const cachedFileData = sessionStorage.getItem("pending_file_data");
    if (cachedResult) {
      setAnalysisResult(JSON.parse(cachedResult));
    }
    if (cachedText) {
      setExtractedText(cachedText);
    }
    if (cachedFileData) {
      setFileData(JSON.parse(cachedFileData));
    }
  }, [initialPaymentStatus]);

  const verifyPayment = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/verify-payment?session_id=${sessionId}`);
      const data = await res.json();
      if (data.paid) {
        setIsPaid(true);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Refresh global access status to sync with DB
        await verifyAccess(userEmail);
      }
    } catch (err) {
      console.error("Error verifying payment", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
        alert("Por favor, selecciona un archivo PDF válido.");
        return;
      }
      if (selectedFile.size > 20 * 1024 * 1024) { // 20MB
        alert("El archivo es demasiado grande. El límite es de 20MB.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const runAnalysis = async () => {
    if (!file) return;
    setAnalyzing("Subiendo y procesando archivo...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/analyze-pdf", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Error al procesar el archivo PDF.");
        setFile(null);
        setAnalyzing(null);
        return;
      }
      
      setAnalyzing("Iniciando análisis jurídico con IA...");
      setExtractedText(data.text);
      const fData = { base64: data.base64, mimeType: data.mimeType };
      setFileData(fData);
      
      if (!data.text || data.text.length < 100) {
        setAnalyzing("Modo OCR activado: Leyendo escaneo...");
      }

      const result = await analyzeLegalDocument(
        data.text, 
        fData, 
        data.numPages, 
        (msg) => setAnalyzing(msg)
      );
      setAnalysisResult(result);
      sessionStorage.setItem("pending_analysis", JSON.stringify(result));
      sessionStorage.setItem("pending_text", data.text);
      sessionStorage.setItem("pending_file_data", JSON.stringify(fData));
    } catch (err: any) {
      console.error("Analysis error:", err);
      const errorMsg = err.message || "Error desconocido";
      alert(`Error durante el análisis con IA: ${errorMsg}\n\nEsto puede deberse a la complejidad del documento, a un límite temporal o a restricciones de la API. Por favor, inténtalo de nuevo con un documento más corto o espera unos momentos.`);
    } finally {
      setAnalyzing(null);
    }
  };

  const handlePayment = async () => {
    try {
      if (!stripePromise) {
        alert("La configuración de pago no está disponible. Por favor, contacta con soporte.");
        return;
      }
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      const { id } = await res.json();
      const stripe = await stripePromise;
      if (stripe) {
        await (stripe as any).redirectToCheckout({ sessionId: id });
      }
    } catch (err) {
      alert("Error al iniciar el pago.");
    }
  };

  const handleConfirmExport = () => {
    if (confirmExport.type === "word") {
      exportToWord(analysisResult);
    } else if (confirmExport.type === "pdf") {
      exportToPDF("analysis-content");
    }
  };

  const handleDeleteData = async () => {
  if (confirm("¿Estás absolutamente seguro? Esta acción borrará permanentemente tu cuenta y todos tus análisis. No se puede deshacer.")) {
    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Tus datos han sido eliminados correctamente.");
        onLogout();
      }
    } catch (err) {
      alert("Error al eliminar los datos.");
    }
  }
};

const handleSaveGeminiKey = async () => {
  if (!geminiApiKey.trim()) {
    alert("Introduce tu API Key de Gemini.");
    return;
  }

  try {
    setSavingGeminiKey(true);

    const res = await fetch("/api/save-gemini-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userEmail,
        apiKey: geminiApiKey,
      }),
    });

    const data = await res.json();

    if (data.success) {
      alert("API Key guardada correctamente.");
    } else {
      alert("No se pudo guardar la API Key.");
    }
  } catch (error) {
    console.error(error);
    alert("Error al guardar la API Key.");
  } finally {
    setSavingGeminiKey(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <LegalModal 
        isOpen={showDisclaimer}
        onClose={() => {
          setShowDisclaimer(false);
          sessionStorage.setItem("disclaimer_acknowledged", "true");
        }}
        title="Descargo de Responsabilidad Legal"
        content={<LegalDisclaimer />}
      />
      <ConfirmDialog 
        isOpen={confirmExport.isOpen}
        onClose={() => setConfirmExport({ ...confirmExport, isOpen: false })}
        onConfirm={handleConfirmExport}
        title={`Exportar a ${confirmExport.type === "word" ? "Word" : "PDF"}`}
        message={`¿Estás seguro de que deseas exportar el análisis actual a un archivo ${confirmExport.type === "word" ? ".docx" : ".pdf"}?`}
      />
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden border border-slate-100">
            {appLogo ? (
              <img src={appLogo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Shield className="text-slate-900 w-5 h-5" />
            )}
          </div>
          <span className="font-serif font-bold text-xl tracking-tight">Defensa Disciplinaria</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowDisclaimer(true)}
            className="text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Aviso Legal Crítico
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-600">
              <User className="w-4 h-4" />
              <span>{userEmail}</span>
            </div>
            <button onClick={onLogout} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="space-y-4 border-blue-100 bg-blue-50/10">
  <div className="flex items-center gap-2 text-blue-700">
    <Key className="w-5 h-5" />
    <h4 className="font-bold uppercase tracking-wider text-xs">
      Configuración de IA
    </h4>
  </div>

  <p className="text-xs text-slate-600">
    Introduce tu API Key de Gemini para usar tu propia cuota de IA.
  </p>

  <input
    type="text"
    placeholder="AIzaSy..."
    className="w-full px-3 py-2 border rounded-lg text-sm"
    value={geminiApiKey}
    onChange={(e) => setGeminiApiKey(e.target.value)}
  />

  <Button onClick={handleSaveGeminiKey} disabled={savingGeminiKey}>
    Guardar API Key
  </Button>

  <p className="text-[10px] text-slate-400">
    Crea tu API Key gratis en https://aistudio.google.com/app/apikey
  </p>
</Card>

          <Card className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">Nuevo Análisis</h3>
              <p className="text-sm text-slate-500">Sube el pliego de cargos o la propuesta de resolución.</p>
            </div>

            <div 
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                file ? "border-emerald-200 bg-emerald-50" : "border-slate-200 hover:border-slate-300 bg-slate-50"
              )}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <input 
                id="file-upload"
                type="file" 
                className="hidden" 
                accept=".pdf"
                onChange={handleFileUpload}
              />
              {file ? (
                <div className="space-y-2">
                  <FileText className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-sm font-medium text-emerald-900 truncate">{file.name}</p>
                  <button className="text-xs text-emerald-600 underline" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Cambiar archivo</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm text-slate-500">Haz clic para subir PDF</p>
                </div>
              )}
            </div>

            <Button 
              className="w-full py-3" 
              disabled={!file || !!analyzing}
              onClick={runAnalysis}
            >
              {analyzing ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  {analyzing}
                </>
              ) : (
                <>
                  <FileSearch className="w-4 h-4" />
                  Iniciar Análisis IA
                </>
              )}
            </Button>
          </Card>

          <Card className="bg-slate-900 text-white border-none">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Scale className="w-5 h-5" />
                <h4 className="font-semibold">Base Legal</h4>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Análisis basado en la Ley Orgánica 4/2010 (Policía Nacional), Ley 39/2015 (Procedimiento Administrativo Común), Ley 40/2015 (Régimen Jurídico) y jurisprudencia del Tribunal Supremo.
              </p>
            </div>
          </Card>

          <div className="pt-4 border-t border-slate-200">
            <button 
              onClick={() => setShowExtractedText(!showExtractedText)}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors flex items-center gap-1 mb-4"
            >
              <Eye className="w-3 h-3" />
              {showExtractedText ? "Ocultar texto extraído" : "Ver texto extraído del PDF"}
            </button>
            
            <AnimatePresence>
              {showExtractedText && extractedText && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-slate-100 rounded-lg text-[10px] text-slate-500 font-mono max-h-40 overflow-y-auto mb-4">
                    {extractedText}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={handleDeleteData}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              Eliminar mis datos permanentemente
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {analysisResult ? (
              <div className="space-y-8">
                {!isPaid ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12 bg-white rounded-2xl border border-slate-200 shadow-sm"
                  >
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                      <Lock className="w-10 h-10 text-amber-600" />
                    </div>
                    <div className="space-y-2 max-w-md px-6">
                      <h2 className="text-2xl font-serif font-bold text-slate-900">Análisis Completado</h2>
                      <p className="text-slate-500 text-sm">
                        Hemos analizado tu documento con éxito. Para desbloquear el informe completo, las líneas de defensa, la jurisprudencia del Tribunal Supremo y el Chat Jurídico en tiempo real, por favor realiza el pago único.
                      </p>
                    </div>
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl w-full max-w-sm space-y-4 mx-6">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Acceso Completo + Chat IA</span>
                        <span className="font-bold text-slate-900 text-xl">29.00€</span>
                      </div>
                      <Button onClick={handlePayment} className="w-full py-6 text-lg font-bold">
                        Desbloquear Todo
                      </Button>
                      <p className="text-[10px] text-slate-400">
                        Pago seguro mediante Stripe. Recibirás una factura y acceso inmediato a la descarga en Word y PDF.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-serif font-bold text-slate-900">Resultado del Análisis</h2>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="text-sm"
                          onClick={() => setConfirmExport({ type: "word", isOpen: true })}
                        >
                          <Download className="w-4 h-4" />
                          Exportar Word
                        </Button>
                        <Button
                          variant="outline"
                          className="text-sm"
                          onClick={() => setConfirmExport({ type: "pdf", isOpen: true })}
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </Button>
                      </div>
                    </div>

                    <div id="analysis-content" className="space-y-10">
                      <Card className="space-y-4 border-blue-100 bg-blue-50/10">
  <div className="flex items-center gap-2 text-blue-700">
    <Scale className="w-5 h-5" />
    <h4 className="font-bold uppercase tracking-wider text-xs">
      Fase 0: Determinación del Régimen Jurídico Aplicable
    </h4>
  </div>
  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
    {analysisResult.fase0_norma_aplicable}
  </p>
</Card>
                      <Card className="space-y-4 border-l-4 border-slate-900">
                        <div className="flex items-center gap-2 text-slate-900">
                          <TableIcon className="w-5 h-5" />
                          <h4 className="font-bold uppercase tracking-wider text-xs">Fase 1: Extracción de Información Clave</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px] text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-2 font-bold text-slate-600">Fecha</th>
                                <th className="p-2 font-bold text-slate-600">Actuación</th>
                                <th className="p-2 font-bold text-slate-600">Documento</th>
                                <th className="p-2 font-bold text-slate-600">Pág</th>
                                <th className="p-2 font-bold text-slate-600">Relevancia</th>
                                <th className="p-2 font-bold text-slate-600">Impacto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysisResult.fase1_tabla?.map((row: any, i: number) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-2 font-mono text-slate-600">{row.fecha}</td>
                                  <td className="p-2 text-slate-700 font-medium">{row.actuacion}</td>
                                  <td className="p-2 text-slate-500">{row.documento}</td>
                                  <td className="p-2 text-slate-400">{row.pagina}</td>
                                  <td className="p-2 text-slate-600">{row.relevancia}</td>
                                  <td className="p-2 text-blue-600 font-medium">{row.impacto}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>

                      <Card className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-900">
                          <History className="w-5 h-5" />
                          <h4 className="font-bold uppercase tracking-wider text-xs">Fase 2: Reconstrucción Cronológica</h4>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {analysisResult.fase2_cronologia}
                        </p>
                      </Card>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="space-y-4 border-amber-100 bg-amber-50/10">
                          <div className="flex items-center gap-2 text-amber-700">
                            <Calculator className="w-5 h-5" />
                            <h4 className="font-bold uppercase tracking-wider text-xs">Fase 3: Detector de Caducidad</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-white rounded-lg border border-amber-200">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Días Computables</p>
                              <p className="text-xl font-bold text-slate-900">{analysisResult.fase3_caducidad?.dias_computables}</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-amber-200">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Días Suspendidos</p>
                              <p className="text-xl font-bold text-amber-600">{analysisResult.fase3_caducidad?.dias_suspendidos}</p>
                            </div>
                          </div>
                          <div className="p-4 bg-white rounded-xl border border-amber-200 space-y-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  analysisResult.fase3_caducidad?.conclusion?.includes("CADUCADO")
                                    ? "bg-red-500"
                                    : analysisResult.fase3_caducidad?.conclusion?.includes("POSIBLE")
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                )}
                              />
                              <p className="text-sm font-bold text-slate-900">
                                Estado: {analysisResult.fase3_caducidad?.conclusion}
                              </p>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed italic">
                              {analysisResult.fase3_caducidad?.justificacion}
                            </p>
                          </div>
                        </Card>

                        <Card className="space-y-4 border-blue-100 bg-blue-50/10">
                          <div className="flex items-center gap-2 text-blue-700">
                            <Target className="w-5 h-5" />
                            <h4 className="font-bold uppercase tracking-wider text-xs">Fase 4: Análisis de Prescripción</h4>
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {analysisResult.fase4_prescripcion}
                          </p>
                        </Card>
                      </div>

                      <Card className="space-y-4 border-emerald-100 bg-emerald-50/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-700">
                            <Briefcase className="w-5 h-5" />
                            <h4 className="font-bold uppercase tracking-wider text-xs">Fase 16: Escrito de Alegaciones Administrativas</h4>
                          </div>
                          <Button
                            variant="secondary"
                            className="text-[10px] h-7"
                            onClick={() => exportAlegacionesToWord(analysisResult.fase16_alegaciones)}
                          >
                            <Download className="w-3 h-3" />
                            Descargar Word
                          </Button>
                        </div>
                        <div className="p-8 bg-white rounded-xl border border-emerald-200 shadow-inner max-h-[600px] overflow-y-auto">
                          <pre className="text-xs text-slate-700 font-serif whitespace-pre-wrap leading-relaxed">
                            {analysisResult.fase16_alegaciones}
                          </pre>
                        </div>
                      </Card>

                      <Card className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-900">
                          <BookOpen className="w-5 h-5" />
                          <h4 className="font-bold uppercase tracking-wider text-xs">Anexo: Normativa y Jurisprudencia Citada</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {analysisResult.normativa_anexo?.map((n: any, i: number) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-800 mb-1">{n.referencia}</p>
                              <p className="text-[10px] italic text-slate-400">
                                Pág {n.pagina}: "{n.evidencia}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium text-slate-900">Consulta Jurídica o Análisis de Documento</h3>
                  <p className="text-slate-500 max-w-sm">
                    Puedes subir un expediente en PDF o usar el chat para hacer consultas jurídicas generales.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>

          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-900" />
              <h3 className="text-xl font-serif font-bold text-slate-900">
                Consultoría en Tiempo Real
              </h3>
            </div>
            <Chat extractedText={extractedText} isPaid={isPaid} fileData={fileData} />
          </div>
        </div>
      </main>
    </div>
  );
};

const AdminDashboard = ({ onBack, adminEmail }: { onBack: () => void; adminEmail: string }) => {
  const [view, setView] = useState<"stats" | "users" | "detail">("stats");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", payment_status: "", access_status: "" });
  const [note, setNote] = useState("");

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json();
      if (data && !data.error) {
        setStats(data);
      } else {
        console.error("Error fetching stats:", data);
        setStats(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

const fetchUsers = async () => {
  setLoading(true);

  try {
    const query = new URLSearchParams(filters).toString();

    const res = await fetch(`/api/admin/users?${query}`, {
      headers: { "x-admin-email": adminEmail }
    });

    const data = await res.json();
    console.log("USERS API RESPONSE:", data);

    if (Array.isArray(data)) {
      setUsers(data);
    } else {
      console.error("Expected array for users, got:", data);
      alert(JSON.stringify(data));
      setUsers([]);
    }
  } catch (err) {
    console.error("Error fetching users:", err);
    setUsers([]);
  } finally {
    setLoading(false);
  }
};

  const fetchUserDetail = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/user/${email}`, {
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json();
      setSelectedUser(data);
      setNote(data.user.payment_notes || "");
      setView("detail");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (email: string, action: string, details = {}) => {
    try {
      const res = await fetch("/api/admin/user/action", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({ email, action, details }),
      });
      if (res.ok) {
        if (view === "detail") fetchUserDetail(email);
        else fetchUsers();
        fetchStats();
      }
    } catch (err) {
      alert("Error al procesar la acción.");
    }
  };

  const handleSaveNote = async () => {
    try {
      await fetch("/api/admin/user/note", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({ email: selectedUser.user.email, note }),
      });
      alert("Nota guardada.");
    } catch (err) {
      alert("Error al guardar nota.");
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [filters]);

  const StatusBadge = ({ status, type }: { status: string; type: "payment" | "access" }) => {
    const configs: any = {
      payment: {
        no_iniciado: { label: "No Iniciado", color: "bg-slate-100 text-slate-600" },
        pendiente_verificacion: { label: "Pendiente Verif.", color: "bg-amber-100 text-amber-700" },
        confirmado: { label: "Confirmado", color: "bg-emerald-100 text-emerald-700" },
        rechazado: { label: "Rechazado", color: "bg-red-100 text-red-700" },
      },
      access: {
        bloqueado: { label: "Bloqueado", color: "bg-red-100 text-red-700" },
        activo: { label: "Activo", color: "bg-emerald-100 text-emerald-700" },
      }
    };
    const config = configs[type][status] || { label: status, color: "bg-slate-100 text-slate-600" };
    return (
      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", config.color)}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Shield className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-serif font-bold">Admin Panel</h1>
          <nav className="flex gap-4 ml-8">
            <button 
              onClick={() => setView("stats")}
              className={cn("text-sm font-medium transition-colors", view === "stats" ? "text-white" : "text-slate-400 hover:text-white")}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView("users")}
              className={cn("text-sm font-medium transition-colors", view === "users" ? "text-white" : "text-slate-400 hover:text-white")}
            >
              Usuarios
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">{adminEmail}</span>
          <Button variant="outline" className="text-white border-slate-700 hover:bg-slate-800" onClick={onBack}>
            Salir Admin
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {view === "stats" && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                  <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </Card>
              <Card className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Solicitudes</p>
                  <p className="text-xl font-bold text-slate-900">{stats.new_requests}</p>
                </div>
              </Card>
              <Card className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pendientes Verif.</p>
                  <p className="text-xl font-bold text-slate-900">{stats.pending}</p>
                </div>
              </Card>
              <Card className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Activos</p>
                  <p className="text-xl font-bold text-slate-900">{stats.active}</p>
                </div>
              </Card>
              <Card className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Bloqueados</p>
                  <p className="text-xl font-bold text-slate-900">{stats.blocked}</p>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Últimos Registros
              </h3>
              <Card className="p-0 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Usuario</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Registro</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Pago</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase">Acceso</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.recent.map((u: any) => (
                      <tr key={u.email} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-4"><StatusBadge status={u.payment_status} type="payment" /></td>
                        <td className="p-4"><StatusBadge status={u.access_status} type="access" /></td>
                        <td className="p-4 text-right">
                          <button onClick={() => fetchUserDetail(u.email)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                            <Eye className="w-4 h-4 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        )}

        {view === "users" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Email o nombre..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>
              <div className="w-full md:w-48 space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Estado Pago</label>
                <select 
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  value={filters.payment_status}
                  onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="no_iniciado">No Iniciado</option>
                  <option value="pendiente_verificacion">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>
              <div className="w-full md:w-48 space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Estado Acceso</label>
                <select 
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  value={filters.access_status}
                  onChange={(e) => setFilters({ ...filters, access_status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
            </div>

            <Card className="p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Usuario</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Registro</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Pago</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Acceso</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Activación</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400">No se encontraron usuarios.</td></tr>
                  ) : (
                    users.map((u: any) => (
                      <tr key={u.email} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-4"><StatusBadge status={u.payment_status} type="payment" /></td>
                        <td className="p-4"><StatusBadge status={u.access_status} type="access" /></td>
                        <td className="p-4 text-sm text-slate-500">{u.activated_at ? new Date(u.activated_at).toLocaleDateString() : "-"}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => fetchUserDetail(u.email)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                            <Eye className="w-4 h-4 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    )))
                  }
                </tbody>
                </table>
              </Card>
          </div>
        )}

        {view === "detail" && selectedUser && (
          <div className="space-y-8">
            <button onClick={() => setView("users")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Volver a la lista
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Card className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                        <User className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedUser.user.name}</h2>
                        <p className="text-slate-500">{selectedUser.user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={selectedUser.user.payment_status} type="payment" />
                      <StatusBadge status={selectedUser.user.access_status} type="access" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Registro</p>
                      <p className="text-sm font-medium text-slate-900">{new Date(selectedUser.user.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Último Login</p>
                      <p className="text-sm font-medium text-slate-900">{selectedUser.user.last_login_at ? new Date(selectedUser.user.last_login_at).toLocaleString() : "Nunca"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Expira</p>
                      <p className="text-sm font-medium text-slate-900">{selectedUser.user.expires_at ? new Date(selectedUser.user.expires_at).toLocaleString() : "-"}</p>
                    </div>
                  </div>
                </Card>

                <Card className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Historial de Auditoría
                  </h3>
                  <div className="space-y-4">
                    {selectedUser.logs.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">No hay registros de actividad.</p>
                    ) : (
                      selectedUser.logs.map((log: any) => (
                        <div key={log.id} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shrink-0">
                            <Shield className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">{log.action.replace("_", " ")}</span>
                              <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-500">Por: {log.admin_email}</p>
                            {log.details && log.details !== "{}" && (
                              <pre className="text-[10px] bg-white p-2 rounded border border-slate-100 mt-2 overflow-x-auto">
                                {JSON.stringify(JSON.parse(log.details), null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              <div className="space-y-8">
                <Card className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Acciones</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAction(selectedUser.user.email, "confirm_payment")}
                      disabled={selectedUser.user.payment_status === "confirmado"}
                    >
                      Confirmar Pago Bizum
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 border-red-100 hover:bg-red-50"
                      onClick={() => handleAction(selectedUser.user.email, "reject_payment")}
                    >
                      Rechazar Pago
                    </Button>
                    <div className="h-px bg-slate-100 my-2" />
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleAction(selectedUser.user.email, selectedUser.user.access_status === "activo" ? "block_user" : "activate_user")}
                    >
                      {selectedUser.user.access_status === "activo" ? "Bloquear Acceso" : "Activar Acceso"}
                    </Button>
                  </div>
                </Card>

                <Card className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Notas de Pago
                  </h3>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all h-32 resize-none text-sm"
                    placeholder="Añade detalles sobre el Bizum, fecha de recepción, etc..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button className="w-full" onClick={handleSaveNote}>Guardar Nota</Button>
                </Card>

                {selectedUser.requests.length > 0 && (
                  <Card className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Solicitud Original</h3>
                    {selectedUser.requests.map((r: any) => (
                      <div key={r.id} className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Teléfono</p>
                          <p className="text-sm font-medium text-slate-900">{r.phone || "No proporcionado"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Motivo</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{r.reason}</p>
                        </div>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<"landing" | "dashboard" | "admin">("landing");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [appLogo, setAppLogo] = useState<string | null>(null);

  useEffect(() => {
  setAppLogo("/logo.png");
}, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem("auth_email");
    if (savedEmail) {
      verifyAccess(savedEmail);
    } else {
      setChecking(false);
    }
  }, []);

  const verifyAccess = async (email: string) => {
    try {
      const res = await fetch("/api/verify-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.authorized) {
        setUserEmail(email);
        localStorage.setItem("auth_email", email);
        setAuthError(null);
        setPaymentStatus(data.user?.payment_status || 'confirmado');
        setView("dashboard");
      } else {
        setAuthError(data.message || "Acceso no autorizado.");
        setPaymentStatus(data.payment_status || null);
        setUserEmail(email); // Keep email for landing page instructions
        localStorage.removeItem("auth_email");
        setView("landing");
      }
    } catch (err) {
      setView("landing");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
  localStorage.removeItem("auth_email");
  localStorage.removeItem("app_logo_cache");
  setUserEmail(null);
  setView("landing");
};

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <Loader2 className="animate-spin text-slate-900 w-8 h-8" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {view === "landing" ? (
        <motion.div key="landing" className="w-full">
          <LandingPage 
            onVerify={verifyAccess} 
            authError={authError} 
            paymentStatus={paymentStatus}
            email={userEmail}
            appLogo={appLogo}
          />
          <div className="fixed bottom-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
            <button onClick={() => setView("admin")} className="text-[10px] text-slate-300">Admin</button>
          </div>
        </motion.div>
      ) : view === "admin" ? (
        <motion.div key="admin" className="w-full">
          {!userEmail ? (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
              <Card className="max-w-md w-full p-8 space-y-6">
                <div className="text-center space-y-2">
                  <Shield className="w-12 h-12 text-slate-900 mx-auto" />
                  <h2 className="text-2xl font-bold">Acceso Admin</h2>
                  <p className="text-slate-500 text-sm">Introduce tu email de administrador</p>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const email = (e.target as any).email.value;
                  setUserEmail(email.toLowerCase());
                }} className="space-y-4">
                  <input 
                    name="email"
                    type="email" 
                    required 
                    placeholder="admin@ejemplo.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                  <Button type="submit" className="w-full py-3">Entrar al Panel</Button>
                  <button type="button" onClick={() => setView("landing")} className="w-full text-xs text-slate-400 hover:text-slate-600">Volver</button>
                </form>
              </Card>
            </div>
          ) : (
            <AdminDashboard onBack={() => setView("landing")} adminEmail={userEmail!} />
          )}
        </motion.div>
      ) : (
        <motion.div key="dashboard" className="w-full">
          <Dashboard 
            userEmail={userEmail!} 
            onLogout={handleLogout} 
            verifyAccess={verifyAccess}
            appLogo={appLogo}
            initialPaymentStatus={paymentStatus}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
