
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Sparkles, X, CheckSquare, CheckCheck, MoreVertical, Paperclip, Wrench, AlertTriangle, ListChecks, Lightbulb, ThumbsUp, ThumbsDown, Share2, FileText, Users, ChevronDown, Reply, Zap, Clock, Calendar, CalendarCheck, MessageCircle, Minimize2, ClipboardEdit, Loader2, CheckCircle2 } from 'lucide-react';
import { User, Message, RoleConfig, FormTemplate, QuickAction, DetailedItemReport, HistorySection, SavedData, TroubleshootingGuide, LaporanStatus, GeminiResponse, ChatInterfaceProps, QueueStatus, Inventaris } from '../types';
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

const ChatInterface: React.FC<ChatInterfaceProps & { inventaris?: Inventaris[] }> = ({ user, roleConfig, onDataSaved, stats, isOpen, onToggle, externalMessage, onClearExternalMessage, autoFormId, onClearAutoForm, inventaris = [] }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', sender: 'ai', text: `Halo *${user.nama_lengkap}*! 👋\nApa yang bisa saya bantu hari ini?`, timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeForm, setActiveForm] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if(isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOpen, activeForm]);
  
  useEffect(() => { 
    if (externalMessage) { 
        handleSend(externalMessage); 
        if (onClearExternalMessage) onClearExternalMessage(); 
    } 
  }, [externalMessage]);

  useEffect(() => {
    if (isOpen && autoFormId && FORM_TEMPLATES[autoFormId]) {
        setActiveForm(FORM_TEMPLATES[autoFormId]);
        if (onClearAutoForm) onClearAutoForm();
    }
  }, [isOpen, autoFormId]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText(''); setIsTyping(true);
    const response = await sendMessageToGemini(text, user);
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: response.text, timestamp: new Date() }]);
    setIsTyping(false);
  };

  const handleAction = useCallback((text: string, formId?: string, initialData?: any) => {
    if (formId && FORM_TEMPLATES[formId]) {
      setActiveForm(FORM_TEMPLATES[formId]);
      setFormData(initialData || {});
    } else handleSend(text);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm) return;
    setIsSubmitting(true);

    const tableMap: Record<string, string> = {
        'booking_ruangan': 'peminjaman_antrian',
        'lapor_kerusakan': 'pengaduan_kerusakan',
        'input_kegiatan': 'agenda_kegiatan',
        'penilaian_aset': 'penilaian_aset'
    };

    let payload: any = {};
    const inputNama = formData.nama_barang || 'Aset';

    // Perbaikan: Pastikan SEMUA data dari formData disertakan dalam payload
    // agar kolom seperti tanggal_peminjaman, jam_mulai, dll tidak NULL di database.
    if (activeForm.id === 'booking_ruangan') {
        payload = {
            ...formData, // Sertakan input user: tanggal, jam_mulai, jam_selesai, keperluan
            id_peminjaman: `PM-${Date.now().toString().slice(-6)}`,
            id_barang: `GEN-${inputNama.substring(0,3).toUpperCase()}`,
            nama_barang: inputNama,
            id_pengguna: user.id_pengguna,
            status_peminjaman: 'Menunggu',
            tanggal_peminjaman: formData.tanggal || new Date().toISOString().split('T')[0]
        };
        // Hapus field yang mungkin redundan atau berbeda nama kolom
        delete payload.tanggal; 
    } else if (activeForm.id === 'lapor_kerusakan') {
        payload = {
            ...formData,
            id: `TK-${Date.now().toString().slice(-6)}`,
            id_barang: `GEN-${inputNama.substring(0,3).toUpperCase()}`,
            nama_barang: inputNama,
            id_pengadu: user.id_pengguna,
            lokasi_kerusakan: formData.lokasi || 'Umum',
            deskripsi_masalah: formData.deskripsi || '',
            status: 'Pending',
            kategori_aset: 'General',
            tanggal_lapor: new Date().toISOString()
        };
        delete payload.lokasi;
        delete payload.deskripsi;
    } else {
        payload = { ...formData, id_pengguna: user.id_pengguna };
    }

    const success = await onDataSaved({ table: tableMap[activeForm.id] as any, payload });
    
    if (success) {
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            sender: 'ai', 
            text: `✅ **Berhasil Terkirim!** Data "${inputNama}" telah masuk ke sistem Cloud Supabase. Silakan cek di Dashboard.`, 
            timestamp: new Date() 
        }]);
    } else {
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            sender: 'ai', 
            text: `❌ **Gagal Sinkronisasi!** Database menolak data. Pastikan semua field terisi dengan benar.`, 
            timestamp: new Date() 
        }]);
    }

    setActiveForm(null);
    setFormData({});
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-5 bg-slate-900 text-white">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Sparkles className="w-6 h-6" /></div>
            <div>
                <h2 className="font-black text-sm tracking-tight italic">SIKILAT Assistant</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Node Sync Active</span>
                </div>
            </div>
         </div>
         <button onClick={onToggle} className="p-2 hover:bg-white/10 rounded-full transition-all"><Minimize2 className="w-5 h-5"/></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#f8fafc] scrollbar-hide">
          {messages.map(msg => (
              <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mb-1"><Sparkles className="w-4 h-4" /></div>}
                  <div className={`w-full max-w-[85%] p-4 rounded-[1.5rem] shadow-sm ${msg.sender === 'user' ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'}`}>
                    <div className="text-sm leading-relaxed">{renderMessageContent(msg.text, handleAction)}</div>
                  </div>
              </div>
          ))}
          {isTyping && (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600"><Sparkles className="w-4 h-4" /></div>
                <div className="px-5 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-400">Berpikir...</div>
              </div>
          )}
          <div ref={messagesEndRef} />
      </div>

      {activeForm && (
          <div className="absolute inset-x-0 bottom-0 top-16 bg-white z-50 flex flex-col animate-slide-up">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-2">
                      <ClipboardEdit className="w-4 h-4 text-indigo-600" /> {activeForm.title}
                  </h3>
                  <button onClick={() => setActiveForm(null)} className="p-2 hover:bg-slate-200 rounded-full transition-all"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                  {activeForm.fields.map(field => (
                      <div key={field.name} className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                          {field.type === 'textarea' ? (
                              <textarea 
                                required={field.required}
                                className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-medium bg-slate-50"
                                value={formData[field.name] || ''}
                                onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                                placeholder={field.placeholder}
                                rows={3}
                              />
                          ) : field.type === 'select' ? (
                              <select 
                                required={field.required}
                                className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-medium bg-slate-50 cursor-pointer"
                                value={formData[field.name] || ''}
                                onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                              >
                                <option value="">Pilih...</option>
                                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                          ) : (
                              <input 
                                type={field.type}
                                required={field.required}
                                className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-medium bg-slate-50"
                                value={formData[field.name] || ''}
                                onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                                placeholder={field.placeholder}
                              />
                          )}
                      </div>
                  ))}
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                  >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      {activeForm.submitLabel}
                  </button>
              </form>
          </div>
      )}

      <div className="p-4 border-t bg-white">
          <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl items-end border border-slate-200 focus-within:border-indigo-400 transition-all">
              <textarea 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(inputText); }}}
                className="flex-1 bg-transparent px-4 py-3 outline-none text-sm font-medium resize-none placeholder:text-slate-400" 
                rows={1} 
                placeholder="Ketik pesan..." 
              />
              <button 
                onClick={() => handleSend(inputText)} 
                className="p-3.5 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
          </div>
      </div>
    </div>
  );
};
export default ChatInterface;
