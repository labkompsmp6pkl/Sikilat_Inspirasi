
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
                             'Kembali': 'bg-slate-100 text-slate-700 border-slate-200',
                             'Rusak Berat': 'bg-rose-100 text-rose-700 border-rose-200',
                             'Rusak Ringan': 'bg-orange-100 text-orange-700 border-orange-200',
                             'Baik': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                             'Perbaikan': 'bg-yellow-100 text-yellow-700 border-yellow-200'
                         };
                         
                         let style = 'bg-slate-100 text-slate-600 border-slate-200';
                         for (const k in statusColors) {
                             if (subVal.includes(k)) {
                                 style = statusColors[k];
                                 break;
                             }
                         }
                         
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
                            <div className="text-slate-800 text-sm font-medium text-right break-words flex-1">
                                {renderValueRecursively(subVal, subKey, level + 1)}
                            </div>
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

       if (textToParse.startsWith('```json')) {
           textToParse = textToParse.substring(7).trim();
       } else if (textToParse.startsWith('```')) {
            textToParse = textToParse.substring(3).trim();
       }
       
       if (textToParse.endsWith('```')) {
           textToParse = textToParse.slice(0, -3).trim();
       }
       
       const firstBracket = textToParse.indexOf('{');
       const firstSquare = textToParse.indexOf('[');
       
       let start = -1;
       if (firstBracket === -1) start = firstSquare;
       else if (firstSquare === -1) start = firstBracket;
       else start = Math.min(firstBracket, firstSquare);

       if (start === -1) {
           return <div className="text-slate-500 text-sm p-3 bg-slate-50 rounded-lg italic border border-slate-200">{jsonString}</div>;
       }
       
       textToParse = textToParse.substring(start);
       
       const openChar = textToParse.charAt(0);
       const closeChar = openChar === '{' ? '}' : ']';
       let balance = 0;
       let endIndex = -1;

       for (let i = 0; i < textToParse.length; i++) {
           const char = textToParse.charAt(i);
           if (char === openChar) balance++;
           else if (char === closeChar) balance--;

           if (balance === 0) {
               endIndex = i;
               break;
           }
       }

       if (endIndex === -1) throw new Error("Incomplete JSON");

       const finalJsonString = textToParse.substring(0, endIndex + 1);
       const data = JSON.parse(finalJsonString);
       
       // Handle Form Trigger (Direct pop-up)
       if (data.type === 'form_trigger') {
           return (
               <div className="my-4 animate-bounce-in">
                   <button 
                        onClick={() => onAction("Saya mengisi form", data.formId, { nama_barang: data.assetName })}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all font-black"
                   >
                       <ClipboardEdit className="w-6 h-6" />
                       {data.label || 'Buka Formulir'}
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
                            <div className={`p-2 rounded-lg ${queueData.sedang_dipakai ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {queueData.sedang_dipakai ? <Clock className="w-5 h-5" /> : <CheckCheck className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-base">{queueData.nama_barang}</h3>
                                <p className={`text-xs font-semibold ${queueData.sedang_dipakai ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {queueData.sedang_dipakai ? 'Sedang Digunakan' : 'Tersedia Sekarang'}
                                </p>
                            </div>
                        </div>
                        {queueData.sedang_dipakai && (
                             <div className="text-right">
                                 <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Berakhir Pukul</p>
                                 <p className="font-mono text-lg font-bold text-slate-800">{queueData.pemakai_saat_ini?.sampai_jam}</p>
                             </div>
                        )}
                   </div>

                   <div className="p-4">
                       {queueData.sedang_dipakai && queueData.pemakai_saat_ini && (
                           <div className="mb-4 flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                               <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                                   {queueData.pemakai_saat_ini.nama.charAt(0)}
                               </div>
                               <div>
                                   <p className="text-xs text-slate-500">Pemakai Saat Ini</p>
                                   <p className="text-sm font-semibold text-slate-700">{queueData.pemakai_saat_ini.nama}</p>
                               </div>
                           </div>
                       )}

                       <div className="flex items-center gap-2 mb-3">
                           <Users className="w-4 h-4 text-slate-400" />
                           <span className="text-sm font-semibold text-slate-700">Antrian Berikutnya ({queueData.jumlah_antrian})</span>
                       </div>

                       {queueData.antrian_berikutnya.length > 0 ? (
                           <div className="space-y-2 mb-4">
                               {queueData.antrian_berikutnya.slice(0, 3).map((item, idx) => (
                                   <div key={idx} className="flex justify-between items-center text-xs p-2 rounded hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                                       <div className="flex items-center gap-2">
                                           <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px]">{idx + 1}</span>
                                           <div>
                                               <p className="font-medium text-slate-700">{item.peminjam}</p>
                                               <p className="text-slate-400 truncate max-w-[120px]">{item.keperluan}</p>
                                           </div>
                                       </div>
                                       <div className="text-right">
                                           <span className="block font-medium text-slate-600">{item.waktu}</span>
                                           <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold uppercase ${item.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       ) : (
                           <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 mb-4">
                               <p className="text-xs text-slate-500">Belum ada antrian. Jadilah yang pertama!</p>
                           </div>
                       )}

                       <button 
                           onClick={() => onAction("Saya ingin booking ruangan ini", "booking_ruangan", { objek: queueData.nama_barang })}
                           className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md active:scale-95 ${
                               !queueData.sedang_dipakai 
                               ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-200' 
                               : 'bg-blue-600 hover:bg-blue-700 text-white'
                           }`}
                       >
                           <CalendarCheck className="w-4 h-4" />
                           {(!queueData.sedang_dipakai) ? `Booking ${queueData.nama_barang} Sekarang` : 'Ajukan Booking'}
                       </button>
                   </div>
               </div>
           );
       }

       if (data.type === 'troubleshooting_guide') {
           const guide = data as TroubleshootingGuide;
           return (
               <div className="p-4 my-2 bg-white rounded-lg shadow-sm border border-slate-200">
                   <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-600"/> Panduan Penanganan: {guide.judul}</h3>
                   <p className="text-xs text-slate-500 mb-4 pl-7">Gejala: <em>{guide.gejala}</em></p>
                   <div className="mb-4"><h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-slate-700"><ListChecks className="w-4 h-4 text-slate-500"/> LANGKAH PENANGANAN</h4><ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">{guide.langkah_penanganan.map(step => (<li key={step.urutan}><span className="font-semibold">{step.tindakan}:</span> {step.detail}</li>))}</ol></div>
                   <div className="mb-4 p-3 bg-amber-50 rounded-lg"><h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-amber-800"><Lightbulb className="w-4 h-4"/> TIPS TERBAIK</h4><ul className="list-disc list-inside space-y-1 text-amber-900">{guide.tips_terbaik.map((tip, i) => <li key={i}>{tip.teks}</li>)}</ul></div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div className="p-3 bg-emerald-50 rounded-lg"><h4 className="font-semibold mb-2 flex items-center gap-2 text-emerald-800"><ThumbsUp className="w-4 h-4"/> KELEBIHAN</h4><ul className="list-disc list-inside space-y-1 text-emerald-900">{guide.analisis_solusi.kelebihan.map((pro, i) => <li key={i}>{pro}</li>)}</ul></div><div className="p-3 bg-rose-50 rounded-lg"><h4 className="font-semibold mb-2 flex items-center gap-2 text-rose-800"><ThumbsDown className="w-4 h-4"/> KEKURANGAN</h4><ul className="list-disc list-inside space-y-1 text-rose-900">{guide.analisis_solusi.kekurangan.map((con, i) => <li key={i}>{con}</li>)}</ul></div></div>
                   <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-end gap-2"><button onClick={() => onAction(`Buat laporan kerja untuk tiket ${guide.id_tiket}`)} className="text-sm font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md flex items-center gap-1.5"><FileText className="w-4 h-4"/> Buat Laporan Kerja</button><button onClick={() => onAction(`Eskalasi tiket ${guide.id_tiket} ke teknisi eksternal`)} className="text-sm font-semibold text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-md flex items-center gap-1.5"><Share2 className="w-4 h-4"/> Eskalasi</button></div>
               </div>
           );
       }
       
       if (data.type === 'laporan_status') {
           const report = data as LaporanStatus;
           const statusColors: Record<string, string> = { 'Pending': 'bg-amber-100 text-amber-800', 'Proses': 'bg-blue-100 text-blue-800', 'Selesai': 'bg-emerald-100 text-emerald-800' };
           const color = statusColors[report.status_laporan] || 'bg-slate-100 text-slate-800';
           return (
               <div className={`p-4 my-2 bg-white rounded-lg shadow-sm border-l-4 ${color.replace('bg','border').replace('-100','-400')}`}>
                   <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800">Status Laporan: {report.id_laporan}</h3><span className={`px-3 py-1 text-xs font-bold rounded-full ${color}`}>{report.status_laporan}</span></div>
                   <p className="text-sm text-slate-600 mt-2 mb-3">{report.deskripsi_laporan}</p>
                   <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md"><p className="font-semibold text-slate-600">Catatan Terbaru:</p><p>{report.catatan_status}</p><p className="mt-1 opacity-70">Update: {report.tanggal_update}</p></div>
               </div>
           )
       }
       
       if (data.type === 'detailed_item_report') {
           const report = data as DetailedItemReport;
           const renderHistorySection = (title: string, section: HistorySection | undefined, Icon: React.FC<any>) => {
               if (!section || !section.items || section.items.length === 0) return null;
               return (
                    <div className="mt-4">
                       <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-slate-700"><Icon className="w-4 h-4 text-slate-500"/> {title}</h4>
                       <div className="space-y-2 text-xs border-l-2 border-slate-200 pl-4 ml-2">
                          {section.items.map((item, index) => (
                               <div key={index} className="p-2 bg-slate-50 rounded-md">
                                   {renderValueRecursively(item, `history-${index}`)}
                               </div>
                           ))}
                       </div>
                   </div>
               )
           };
           return (
                <div className="p-4 my-2 bg-white rounded-lg shadow-sm border border-slate-200">
                   <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-800 text-base mb-2">{report.nama_barang}</h3>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700`}>{report.status_barang}</span>
                   </div>
                    {renderHistorySection("Riwayat Kerusakan", report.riwayat_kerusakan, AlertTriangle)}
                    {renderHistorySection("Catatan Teknis & Perawatan", report.catatan_teknis, Wrench)}
                    {renderHistorySection("Riwayat Peminjaman", report.riwayat_peminjaman, Users)}
                </div>
           );
       }

       const items = Array.isArray(data) ? data : [data];
       return (
           <div className="space-y-3 mt-3">
           {items.map((item, index) => (
               <div key={index} className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                   {renderValueRecursively(item, `item-${index}`)}
               </div>
           ))}
           </div>
       );
    } catch (error) {
       console.error("JSON Parse Error:", error);
       return <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md border border-red-100 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> <span>Gagal menampilkan data terstruktur.</span></div>;
   }
 };

const renderMessageContent = (text: string, onAction: (text: string, formId?: string, initialData?: any) => void) => {
    const parts = text.split(/(:::DATA_JSON:::(?:.|\n)*)/);
    return parts.map((part, index) => {
      if (part.startsWith(':::DATA_JSON:::')) {
        const jsonString = part.replace(':::DATA_JSON:::', '');
        return <div key={index}>{renderDataWidget(jsonString, onAction)}</div>;
      } else {
        const formattedText = part
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n/g, '<br />');
        return <p key={index} dangerouslySetInnerHTML={{ __html: formattedText }} />;
      }
    });
};

const MessageBubble = React.memo(({ msg, onReply, onAction }: { msg: Message, onReply: (msg: Message) => void, onAction: (text: string, formId?: string, initialData?: any) => void }) => {
    return (
        <div className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`w-full max-w-[85%] p-3 rounded-2xl relative group ${msg.sender === 'user' ? `bg-slate-900 text-white rounded-br-none` : 'bg-white text-slate-800 rounded-bl-none shadow-sm border border-slate-100'}`}>
            
            <button 
                onClick={() => onReply(msg)}
                className={`absolute top-2 ${msg.sender === 'user' ? '-left-8' : '-right-8'} p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity`}
                title="Balas Pesan Ini"
            >
                <Reply className="w-3.5 h-3.5" />
            </button>

            {msg.replyTo && (
                <div className={`mb-2 p-2 rounded text-xs border-l-4 ${msg.sender === 'user' ? 'bg-white/10 border-white/30 text-white/80' : 'bg-slate-100 border-slate-400 text-slate-600'}`}>
                    <div className="font-bold mb-0.5">{msg.replyTo.sender === 'ai' ? 'SIKILAT Assistant' : 'Anda'}</div>
                    <div className="truncate opacity-80">{msg.replyTo.text.replace(/:::DATA_JSON:::.*$/s, '')}</div>
                </div>
            )}

            {msg.imageUrl && <img src={msg.imageUrl} alt="upload preview" className="rounded-lg mb-2 max-h-60" />}
            <div className="text-sm leading-relaxed">
              {renderMessageContent(msg.text, onAction)}
            </div>
            <div className={`text-right text-[10px] mt-2 flex items-center justify-end gap-1 ${msg.sender === 'user' ? 'text-white/50' : 'text-slate-400'}`}>
                <span>{msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.sender === 'user' && <CheckCheck className="w-3 h-3" />}
            </div>
            </div>
        </div>
    );
});


const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, roleConfig, onDataSaved, stats, isOpen, onToggle, externalMessage, onClearExternalMessage }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Halo *${user.nama_lengkap}*! 👋\nSaya asisten SIKILAT untuk ${roleConfig.label}.\n\n${
        ['penanggung_jawab', 'pengawas_sarpras', 'admin'].includes(user.peran) 
        ? 'Saya dapat membantu Anda membuat **Kesimpulan & Analisis** data aset secara otomatis. ' 
        : ''
      }Silakan pilih menu di bawah atau ketik permintaan Anda.`,
      timestamp: new Date()
    }
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if(isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (externalMessage && externalMessage.trim() !== '') {
        handleSend(externalMessage);
        if (onClearExternalMessage) {
            onClearExternalMessage();
        }
    }
  }, [externalMessage]);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
      });
  };

  const handleReplyClick = useCallback((msg: Message) => {
      setReplyingTo(msg);
      textareaRef.current?.focus();
  }, []);

  const handleAction = useCallback((text: string, formId?: string, initialData?: any) => {
      if (formId) {
          const formTemplate = FORM_TEMPLATES[formId];
          if (formTemplate) {
            setActiveForm(formTemplate);
            const emptyData = formTemplate.fields.reduce((acc, field) => {
                acc[field.name] = '';
                return acc;
            }, {} as Record<string, string>);
            setFormData({ ...emptyData, ...initialData });
          }
      } else {
          handleSend(text);
      }
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim() && !imageFile) return;

    let imageBase64: string | null = null;
    if (imageFile) imageBase64 = await fileToBase64(imageFile);

    const currentReplyingTo = replyingTo; 

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date(),
      imageUrl: imagePreview || undefined,
      replyTo: currentReplyingTo || undefined 
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setReplyingTo(null); 
    setIsTyping(true);

    let promptToSend = text;
    if (currentReplyingTo) {
        const cleanReplyText = currentReplyingTo.text.replace(/:::DATA_JSON:::.*$/s, '').slice(0, 300); 
        promptToSend = `[CONTEXT: User is replying to this previous message: "${cleanReplyText}"].\n\nUser's Reply: ${text}`;
    }

    const response: GeminiResponse = await sendMessageToGemini(promptToSend, user, imageBase64, imageFile?.type);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: response.text,
      timestamp: new Date()
    };
    
    if (response.dataToSave) {
        if (response.dataToSave.table === 'agenda_kegiatan' && !response.dataToSave.payload.status) {
            response.dataToSave.payload.status = 'Pending';
        }
        onDataSaved(response.dataToSave);
    }

    setIsTyping(false);
    setMessages(prev => [...prev, aiMsg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputText);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.formId) {
        const formTemplate = FORM_TEMPLATES[action.formId];
        if (formTemplate) {
            setActiveForm(formTemplate);
            const initialData = formTemplate.fields.reduce((acc, field) => {
                acc[field.name] = '';
                return acc;
            }, {} as Record<string, string>);
            setFormData(initialData);
        }
    } else {
        handleSend(action.prompt);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm) return;
    
    let formattedMessage = `📝 Input Formulir: ${activeForm.title}\n\n`;
    
    if (activeForm.id === 'cek_laporan') {
        formattedMessage = `Cek status untuk ID Laporan: ${formData['id_laporan']}`;
    } else {
        formattedMessage += activeForm.fields.map(field => `🔹 ${field.label}: ${formData[field.name]}`).join('\n');
    }

    handleSend(formattedMessage);
    closeForm();
  };

  const handleAutoFill = () => {
    if (!activeForm) return;

    if (activeForm.id === 'penilaian_aset') {
        const evalPresets = [
            { nama_barang: formData.nama_barang || 'Lab Komputer 1', skor: '5', ulasan: 'Fasilitas sangat memadai, ruangan sejuk dan bersih.' },
            { nama_barang: formData.nama_barang || 'Proyektor Epson', skor: '4', ulasan: 'Fungsi normal, hanya saja lensanya butuh dibersihkan sedikit.' }
        ];
        const randomEval = evalPresets[Math.floor(Math.random() * evalPresets.length)];
        setFormData(randomEval);
        return;
    }

    const autoFillData: Record<string, Record<string, string>> = {
      lapor_kerusakan: {
        nama_barang: 'Proyektor Epson',
        lokasi: 'Ruang Rapat A',
        deskripsi: 'Tampilan proyektor bergaris dan warna pudar.',
        urgensi: 'Sedang',
      },
      cek_laporan: {
        id_laporan: 'SKL-TAMU-240729-ABC'
      }
    };
    setFormData(autoFillData[activeForm.id] || {});
  };
  
  const closeForm = () => {
    setActiveForm(null);
    setFormData({});
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-slate-900 text-white flex-shrink-0">
         <div className="flex items-center gap-3">
             <div className="relative">
                 <Sparkles className="w-8 h-8 text-blue-400 fill-current" />
                 <span className="absolute -bottom-1 -right-1 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-slate-900"></span>
             </div>
             <div><h2 className="font-bold text-sm">SIKILAT Assistant</h2><p className="text-[10px] text-slate-400">AI Powered &bull; Online</p></div>
         </div>
         <div className="flex items-center gap-1">
            <button onClick={onToggle} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" title="Minimize">
                <Minimize2 className="w-4 h-4"/>
            </button>
            <button onClick={onToggle} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" title="Tutup">
                <X className="w-4 h-4"/>
            </button>
         </div>
      </div>
      
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50/50">
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble 
                    key={msg.id} 
                    msg={msg} 
                    onReply={handleReplyClick} 
                    onAction={handleAction} 
                />
              ))}
              {isTyping && (<div className="flex items-end gap-3 justify-start"><div className="w-fit p-3 rounded-2xl bg-white text-slate-800 rounded-bl-none shadow-sm border border-slate-100"><div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span></div></div></div>)}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-hide bg-white flex-shrink-0">
             {roleConfig.actions.map((action, index) => {
                const Icon = action.icon;
                const labelContent = typeof action.label === 'function' ? action.label(stats) : action.label;
                return (
                    <button key={index} onClick={() => handleQuickAction(action)} className="flex-shrink-0 flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-blue-700 whitespace-nowrap bg-white shadow-sm">
                        <Icon className="w-3.5 h-3.5 text-blue-500" />
                        {labelContent}
                    </button>
                );
             })}
          </div>
          
          {replyingTo && (
              <div className="px-4 py-2 bg-white animate-slide-up border-t border-slate-100">
                  <div className="bg-slate-50 border-l-4 border-blue-500 rounded-r-lg p-2 flex justify-between items-center">
                      <div className="overflow-hidden">
                          <div className="text-[10px] font-bold text-blue-600">Membalas asisten...</div>
                          <div className="text-[10px] text-slate-500 truncate">{replyingTo.text.replace(/:::DATA_JSON:::.*$/s, '')}</div>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                          <X className="w-3 h-3" />
                      </button>
                  </div>
              </div>
          )}

          <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0">
            <div className="relative flex items-end gap-2 bg-slate-100 rounded-2xl p-1">
              <textarea 
                ref={textareaRef} 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)} 
                onKeyDown={handleKeyDown} 
                placeholder="Ketik pesan..." 
                className="flex-1 bg-transparent px-3 py-3 focus:outline-none text-sm resize-none max-h-32" 
                rows={1}
              />
              <div className="flex items-center gap-1 pr-1 pb-1">
                 <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                 <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><Paperclip className="w-5 h-5" /></button>
                 <button onClick={() => handleSend(inputText)} disabled={!inputText.trim() && !imageFile} className="p-2.5 bg-slate-900 text-white rounded-xl disabled:bg-slate-300 hover:bg-black transition-all active:scale-95"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
      </div>

      {activeForm && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                <form onSubmit={handleFormSubmit}>
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="text-lg font-black text-slate-800">{activeForm.title}</h3>
                        <button type="button" onClick={closeForm} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {activeForm.fields.map(field => (
                            <div key={field.name}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{field.label}{field.required && '*'}</label>
                                {field.type === 'textarea' ? (
                                    <textarea 
                                        name={field.name} 
                                        required={field.required} 
                                        placeholder={field.placeholder} 
                                        value={formData[field.name] || ''} 
                                        onChange={e => setFormData({...formData, [field.name]: e.target.value})} 
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" 
                                        rows={4}
                                    />
                                ) : field.type === 'select' || field.type === 'dropdown' ? (
                                    <select 
                                        name={field.name} 
                                        required={field.required} 
                                        value={formData[field.name] || ''} 
                                        onChange={e => setFormData({...formData, [field.name]: e.target.value})} 
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-white text-sm"
                                    >
                                        <option value="" disabled>Pilih opsi...</option>
                                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input 
                                        type={field.type} 
                                        name={field.name} 
                                        required={field.required} 
                                        placeholder={field.placeholder} 
                                        value={formData[field.name] || ''} 
                                        onChange={e => setFormData({...formData, [field.name]: e.target.value})} 
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-4">
                        <button type="button" onClick={handleAutoFill} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"><Zap className="w-4 h-4"/> Demo Fill</button>
                        <div className="flex gap-2">
                            <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-200">Kirim Data</button>
                        </div>
                    </div>
                </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default ChatInterface;
