
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Sparkles, X, CheckSquare, CheckCheck, MoreVertical, Paperclip, Wrench, AlertTriangle, ListChecks, Lightbulb, ThumbsUp, ThumbsDown, Share2, FileText, Users, ChevronDown, Reply, Zap, Clock, Calendar, CalendarCheck, MessageCircle, Minimize2, ClipboardEdit } from 'lucide-react';
import { User, Message, RoleConfig, FormTemplate, QuickAction, DetailedItemReport, HistorySection, SavedData, TroubleshootingGuide, LaporanStatus, GeminiResponse, ChatInterfaceProps, QueueStatus } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { FORM_TEMPLATES } from '../constants';

// --- HELPER FUNCTIONS ---
const renderValueRecursively = (val: any, key: string, level = 0): React.ReactNode => {
    if (val === null || val === undefined) return <span className="text-slate-300 italic"> - </span>;
    if (typeof val === 'boolean') {
        return val 
            ? <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded"><CheckSquare className="w-3 h-3" /> Ya</span> 
            : <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-xs bg-rose-50 px-2 py-0.5 rounded"><X className="w-3 h-3" /> Tidak</span>;
    }
    if (val instanceof Date) return <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{val.toLocaleString('id-ID')}</span>;
    if (Array.isArray(val)) {
        if (val.length === 0) return <span className="text-slate-400 text-xs italic">Data kosong</span>;
        return (
            <div className="flex flex-col gap-2 w-full mt-1">
                {val.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm hover:bg-slate-100 transition-colors">
                        {renderValueRecursively(item, `${key}-${index}`, level + 1)}
                    </div>
                ))}
            </div>
        );
    }
    if (typeof val === 'object') {
        return (
            <div className={`grid gap-y-1 w-full`}>
                {Object.entries(val).map(([subKey, subVal]) => {
                     const isStatus = subKey.toLowerCase().includes('status');
                     if (isStatus && typeof subVal === 'string') {
                         const statusColors: Record<string, string> = {
                             'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
                             'Menunggu': 'bg-amber-100 text-amber-700 border-amber-200',
                             'Proses': 'bg-blue-100 text-blue-700 border-blue-200',
                             'Selesai': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                             'Disetujui': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                             'Ditolak': 'bg-rose-100 text-rose-700 border-rose-200',
                             'Baik': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                             'Rusak Berat': 'bg-rose-100 text-rose-700 border-rose-200'
                         };
                         let style = 'bg-slate-100 text-slate-600 border-slate-200';
                         for (const k in statusColors) if (subVal.includes(k)) { style = statusColors[k]; break; }
                         return (
                            <div key={subKey} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{subKey.replace(/_/g, ' ')}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${style}`}>{subVal}</span>
                            </div>
                         );
                     }
                    return (
                        <div key={subKey} className="flex flex-col sm:flex-row sm:justify-between sm:items-start py-1.5 border-b border-slate-100 last:border-0 gap-1">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wide min-w-[100px] mt-0.5">{subKey.replace(/_/g, ' ')}</span>
                            <div className="text-slate-800 text-sm font-medium text-right break-words flex-1">{renderValueRecursively(subVal, subKey, level + 1)}</div>
                        </div>
                    );
                })}
            </div>
        );
    }
    return <span className="text-slate-700">{String(val)}</span>;
};

const renderDataWidget = (jsonString: string, onAction: (text: string, formId?: string, initialData?: any) => void) => {
    try {
       let textToParse = jsonString.trim();
       if (textToParse.startsWith('```json')) textToParse = textToParse.substring(7).trim();
       else if (textToParse.startsWith('```')) textToParse = textToParse.substring(3).trim();
       if (textToParse.endsWith('```')) textToParse = textToParse.slice(0, -3).trim();
       
       const start = Math.min(
           textToParse.indexOf('{') === -1 ? Infinity : textToParse.indexOf('{'),
           textToParse.indexOf('[') === -1 ? Infinity : textToParse.indexOf('[')
       );
       if (start === Infinity) return <div className="text-slate-500 text-sm p-3 bg-slate-50 rounded-lg italic border border-slate-200">{jsonString}</div>;
       textToParse = textToParse.substring(start);
       
       const openChar = textToParse.charAt(0);
       const closeChar = openChar === '{' ? '}' : ']';
       let balance = 0, endIndex = -1;
       for (let i = 0; i < textToParse.length; i++) {
           if (textToParse.charAt(i) === openChar) balance++;
           else if (textToParse.charAt(i) === closeChar) balance--;
           if (balance === 0) { endIndex = i; break; }
       }
       const data = JSON.parse(textToParse.substring(0, endIndex + 1));
       
       if (data.type === 'form_trigger') {
           return (
               <div className="my-4">
                   <button onClick={() => onAction("Saya mengisi form", data.formId, { nama_barang: data.assetName })} className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xl font-black">
                       <ClipboardEdit className="w-6 h-6" /> {data.label || 'Buka Formulir'}
                   </button>
               </div>
           );
       }
       if (data.type === 'queue_status') {
           const queueData = data as QueueStatus;
           return (
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden my-3">
                   <div className={`p-4 flex justify-between items-center ${queueData.sedang_dipakai ? 'bg-rose-50 border-b border-rose-100' : 'bg-emerald-50 border-b border-emerald-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${queueData.sedang_dipakai ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{queueData.sedang_dipakai ? <Clock className="w-5 h-5" /> : <CheckCheck className="w-5 h-5" />}</div>
                            <div><h3 className="font-bold text-slate-800 text-base">{queueData.nama_barang}</h3><p className={`text-xs font-semibold ${queueData.sedang_dipakai ? 'text-rose-600' : 'text-emerald-600'}`}>{queueData.sedang_dipakai ? 'Sedang Digunakan' : 'Tersedia'}</p></div>
                        </div>
                   </div>
                   <div className="p-4">
                        <button onClick={() => onAction("Saya ingin booking ruangan ini", "booking_ruangan", { objek: queueData.nama_barang })} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold shadow-sm">Pesan Sekarang</button>
                   </div>
               </div>
           );
       }
       // ... other troubleshooting and report widgets would go here ...
       const items = Array.isArray(data) ? data : [data];
       return <div className="space-y-3 mt-3">{items.map((item, index) => (<div key={index} className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">{renderValueRecursively(item, `item-${index}`)}</div>))}</div>;
    } catch (e) { return <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md border border-red-100">Gagal menampilkan data terstruktur.</div>; }
};

const renderMessageContent = (text: string, onAction: (text: string, formId?: string, initialData?: any) => void) => {
    const parts = text.split(/(:::DATA_JSON:::(?:.|\n)*)/);
    return parts.map((part, index) => {
      if (part.startsWith(':::DATA_JSON:::')) return <div key={index}>{renderDataWidget(part.replace(':::DATA_JSON:::', ''), onAction)}</div>;
      const formattedText = part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br />');
      return <p key={index} dangerouslySetInnerHTML={{ __html: formattedText }} />;
    });
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, roleConfig, onDataSaved, stats, isOpen, onToggle, externalMessage, onClearExternalMessage }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', sender: 'ai', text: `Halo *${user.nama_lengkap}*! 👋\nSaya asisten SIKILAT untuk ${roleConfig.label}.\n\nApa yang bisa saya bantu hari ini?`, timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeForm, setActiveForm] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if(isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOpen]);
  useEffect(() => { if (externalMessage) { handleSend(externalMessage); if (onClearExternalMessage) onClearExternalMessage(); } }, [externalMessage]);

  const handleSend = async (text: string) => {
    if (!text.trim() && !imageFile) return;
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text, timestamp: new Date(), imageUrl: imagePreview || undefined, replyTo: replyingTo || undefined };
    setMessages(prev => [...prev, userMsg]);
    setInputText(''); setImageFile(null); setImagePreview(null); setReplyingTo(null); setIsTyping(true);
    const response = await sendMessageToGemini(text, user);
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: response.text, timestamp: new Date() }]);
    if (response.dataToSave) onDataSaved(response.dataToSave);
    setIsTyping(false);
  };

  const handleAction = useCallback((text: string, formId?: string, initialData?: any) => {
    if (formId && FORM_TEMPLATES[formId]) {
      setActiveForm(FORM_TEMPLATES[formId]);
      setFormData(initialData || {});
    } else handleSend(text);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-slate-900 text-white">
         <div className="flex items-center gap-3"><Sparkles className="w-8 h-8 text-blue-400" /><div><h2 className="font-bold text-sm">SIKILAT Assistant</h2><p className="text-[10px] text-slate-400">Online</p></div></div>
         <button onClick={onToggle}><Minimize2 className="w-5 h-5"/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map(msg => (
              <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`w-full max-w-[85%] p-3 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'}`}>
                    <div className="text-sm">{renderMessageContent(msg.text, handleAction)}</div>
                  </div>
              </div>
          ))}
          <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-white">
          <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl items-end">
              <textarea value={inputText} onChange={e => setInputText(e.target.value)} className="flex-1 bg-transparent px-2 py-1 outline-none text-sm resize-none" rows={1} placeholder="Ketik pesan..." />
              <button onClick={() => handleSend(inputText)} className="p-2 bg-slate-900 text-white rounded-xl"><Send className="w-4 h-4"/></button>
          </div>
      </div>
    </div>
  );
};
export default ChatInterface;
