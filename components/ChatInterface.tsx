import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Database, X, CheckSquare, Zap, Check, CheckCheck, MoreVertical, Paperclip, Smile, Wrench, AlertTriangle, ListChecks, FileSearch, Lightbulb, ThumbsUp, ThumbsDown, ArrowRight, Share2, Calendar, Users, ChevronsRight, FileText, ClipboardList, Building2, Monitor, Phone, Mail, ChevronDown, ChevronUp, Info, Clock } from 'lucide-react';
import { User, Message, RoleConfig, FormTemplate, QuickAction, DetailedItemReport, HistorySection, SavedData, PaginationInfo, ChatInterfaceProps, MaintenanceGuide, TroubleshootingGuide, WorkReportDraft, LaporanStatus, GeminiResponse } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { FORM_TEMPLATES } from '../constants';


const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, roleConfig, onDataSaved, stats, isOpen, onToggle }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Halo *${user.nama_lengkap}*! 👋\nSaya asisten SIKILAT untuk ${roleConfig.label}.\n\nSilakan pilih menu di bawah atau ketik permintaan Anda.`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
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

  const handleSend = async (text: string) => {
    if (!text.trim() && !imageFile) return;

    let imageBase64: string | null = null;
    if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date(),
      imageUrl: imagePreview || undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setIsTyping(true);

    const response: GeminiResponse = await sendMessageToGemini(text, user, imageBase64, imageFile?.type);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: response.text,
      timestamp: new Date()
    };
    
    // If the AI response includes data to be saved, trigger the callback
    if (response.dataToSave) {
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
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
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
    const autoFillData: Record<string, Record<string, string>> = {
      agenda_kegiatan: {
        waktu_mulai: '2025-12-09T08:00',
        waktu_selesai: '2025-12-09T10:00',
        posisi: 'Lab Komputer 2',
        objek_pengguna: 'Siswa Kelas 11B',
        uraian_kegiatan: 'Praktikum Jaringan Komputer Dasar.',
        hasil_kegiatan: 'Semua siswa berhasil mengkonfigurasi IP Address.',
      },
      lapor_kerusakan: {
        nama_barang: 'Proyektor Epson',
        lokasi: 'Ruang Rapat A',
        deskripsi: 'Tampilan proyektor bergaris dan warna pudar.',
        urgensi: 'Sedang',
      },
      booking_ruangan: {
        objek: 'Aula Utama',
        tanggal: '2025-12-16',
        jam_mulai: '09:00',
        jam_selesai: '12:00',
        keperluan: 'Rapat persiapan acara Peringatan Hari Kemerdekaan oleh OSIS.',
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

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(:::DATA_JSON:::(?:.|\n)*)/);
    return parts.map((part, index) => {
      if (part.startsWith(':::DATA_JSON:::')) {
        const jsonString = part.replace(':::DATA_JSON:::', '');
        return <div key={index}>{renderDataWidget(jsonString)}</div>;
      } else {
        const formattedText = part
          .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br />');
        return <p key={index} dangerouslySetInnerHTML={{ __html: formattedText }} />;
      }
    });
  };

  const renderValueRecursively = (val: any, key: string, level = 0): React.ReactNode => {
    if (val === null || val === undefined) return <span className="text-slate-400">N/A</span>;
    if (typeof val === 'boolean') return val ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-rose-500" />;
    if (val instanceof Date) return val.toLocaleString('id-ID');
    if (Array.isArray(val)) {
        return (
            <div className="pl-4 border-l-2 border-slate-200 mt-1 space-y-2">
                {val.map((item, index) => (
                    <div key={index} className="p-2 bg-slate-100 rounded-md">
                        {renderValueRecursively(item, `${key}-${index}`, level + 1)}
                    </div>
                ))}
            </div>
        );
    }
    if (typeof val === 'object') {
        return (
            <div className={`space-y-1 ${level > 0 ? '' : ''}`}>
                {Object.entries(val).map(([subKey, subVal]) => (
                    <div key={subKey} className="grid grid-cols-2 gap-2 text-xs">
                        <span className="font-semibold text-slate-500 capitalize">{subKey.replace(/_/g, ' ')}:</span>
                        <div className="text-slate-700">{renderValueRecursively(subVal, subKey, level + 1)}</div>
                    </div>
                ))}
            </div>
        );
    }
     return String(val);
  };
  
  const renderDataWidget = (jsonString: string) => {
     try {
        let textToParse = jsonString.trim();

        if (textToParse.startsWith('```json')) {
            textToParse = textToParse.substring(7).trim();
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
            throw new Error("String does not contain a valid JSON object or array.");
        }
        
        textToParse = textToParse.substring(start);
        const firstChar = textToParse.charAt(0);

        const openChar = firstChar;
        const closeChar = openChar === '{' ? '}' : ']';
        let balance = 0;
        let endIndex = -1;

        for (let i = 0; i < textToParse.length; i++) {
            const char = textToParse.charAt(i);
            if (char === openChar) {
                balance++;
            } else if (char === closeChar) {
                balance--;
            }

            if (balance === 0) {
                endIndex = i;
                break;
            }
        }

        if (endIndex === -1) {
            throw new Error("Could not find a complete JSON structure.");
        }

        const finalJsonString = textToParse.substring(0, endIndex + 1);
        const data = JSON.parse(finalJsonString);
        
        if (data.type === 'troubleshooting_guide') {
            const guide = data as TroubleshootingGuide;
            return (
                <div className="p-4 my-2 bg-white rounded-lg shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-600"/> Panduan Penanganan: {guide.judul}</h3>
                    <p className="text-xs text-slate-500 mb-4 pl-7">Gejala: <em>{guide.gejala}</em></p>
                    <div className="mb-4"><h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-slate-700"><ListChecks className="w-4 h-4 text-slate-500"/> LANGKAH PENANGANAN</h4><ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">{guide.langkah_penanganan.map(step => (<li key={step.urutan}><span className="font-semibold">{step.tindakan}:</span> {step.detail}</li>))}</ol></div>
                    <div className="mb-4 p-3 bg-amber-50 rounded-lg"><h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-amber-800"><Lightbulb className="w-4 h-4"/> TIPS TERBAIK</h4><ul className="list-disc list-inside space-y-1 text-sm text-amber-900">{guide.tips_terbaik.map((tip, i) => <li key={i}>{tip.teks}</li>)}</ul></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div className="p-3 bg-emerald-50 rounded-lg"><h4 className="font-semibold mb-2 flex items-center gap-2 text-emerald-800"><ThumbsUp className="w-4 h-4"/> KELEBIHAN</h4><ul className="list-disc list-inside space-y-1 text-emerald-900">{guide.analisis_solusi.kelebihan.map((pro, i) => <li key={i}>{pro}</li>)}</ul></div><div className="p-3 bg-rose-50 rounded-lg"><h4 className="font-semibold mb-2 flex items-center gap-2 text-rose-800"><ThumbsDown className="w-4 h-4"/> KEKURANGAN</h4><ul className="list-disc list-inside space-y-1 text-rose-900">{guide.analisis_solusi.kekurangan.map((con, i) => <li key={i}>{con}</li>)}</ul></div></div>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-end gap-2"><button onClick={() => handleSend(`Buat laporan kerja untuk tiket ${guide.id_tiket}`)} className="text-sm font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md flex items-center gap-1.5"><FileText className="w-4 h-4"/> Buat Laporan Kerja</button><button onClick={() => handleSend(`Eskalasi tiket ${guide.id_tiket} ke teknisi eksternal`)} className="text-sm font-semibold text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-md flex items-center gap-1.5"><Share2 className="w-4 h-4"/> Eskalasi</button></div>
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
        
        // --- RENDER DETAILED ITEM REPORT ---
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
            <div className="space-y-3">
            {items.map((item, index) => (
                <div key={index} className="p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                    {renderValueRecursively(item, `item-${index}`)}
                </div>
            ))}
            </div>
        );
     } catch (error) {
        console.error("JSON Parse Error:", error);
        console.error("Problematic JSON string:", jsonString);
        return <div className="text-red-500 text-sm p-2 bg-red-50 rounded-md">⚠️ Error menampilkan data.</div>;
    }
  };


  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
         <div className="flex items-center gap-3">
             <div className="relative">
                 <Sparkles className="w-10 h-10 text-white fill-current p-2 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full" />
                 <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white"></span>
             </div>
             <div><h2 className="font-bold text-slate-800">SIKILAT Assistant</h2><p className="text-xs text-slate-500">{roleConfig.label} &bull; Online</p></div>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"><ChevronDown className="w-5 h-5"/></button>
            <button className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"><MoreVertical className="w-5 h-5"/></button>
         </div>
      </div>
      
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[80vh]' : 'max-h-0'}`}>
        <div className="flex flex-col h-[calc(100vh-18rem)]">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-slate-50/50">
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`w-full max-w-lg p-3 rounded-2xl ${msg.sender === 'user' ? `bg-emerald-100 text-emerald-900 rounded-br-none` : 'bg-white text-slate-800 rounded-bl-none shadow-sm'}`}>
                    {msg.imageUrl && <img src={msg.imageUrl} alt="upload preview" className="rounded-lg mb-2 max-h-60" />}
                    {renderMessageContent(msg.text)}
                    <div className="text-right text-xs text-slate-400 mt-2 flex items-center justify-end gap-1">
                      <span>{msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.sender === 'user' && <CheckCheck className="w-4 h-4 text-blue-500" />}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (<div className="flex items-end gap-3 justify-start"><div className="w-fit max-w-lg p-3 rounded-2xl bg-white text-slate-800 rounded-bl-none shadow-sm"><div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span><span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span></div></div></div>)}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
             {roleConfig.actions.map((action, index) => {
                const Icon = action.icon;
                const labelContent = typeof action.label === 'function' ? action.label(stats) : action.label;
                return (
                    <button key={index} onClick={() => handleQuickAction(action)} className={`flex-shrink-0 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors bg-white border border-slate-200 hover:bg-${roleConfig.color}-50 hover:border-${roleConfig.color}-200 text-slate-700 hover:text-${roleConfig.color}-700`}>
                        <Icon className={`w-4 h-4 text-${roleConfig.color}-500`} />
                        {labelContent}
                    </button>
                );
             })}
          </div>
          <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
            <div className="relative">
              <textarea ref={textareaRef} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ketik pesan Anda... (Shift+Enter untuk baris baru)" className="w-full pl-4 pr-24 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-none" rows={1}/>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                 <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                 <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-colors"><Paperclip className="w-5 h-5" /></button>
                 <button onClick={() => handleSend(inputText)} disabled={!inputText.trim() && !imageFile} className="p-2.5 bg-blue-600 text-white rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"><Send className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeForm && (
         <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4" role="dialog">
                <form onSubmit={handleFormSubmit}>
                    <div className="p-6 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">{activeForm.title}</h3></div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {activeForm.fields.map(field => (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}{field.required && '*'}</label>
                                {field.type === 'textarea' ? (<textarea name={field.name} required={field.required} placeholder={field.placeholder} value={formData[field.name] || ''} onChange={e => setFormData({...formData, [field.name]: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" rows={4}/>) 
                                : field.type === 'select' || field.type === 'dropdown' ? (
                                    <select name={field.name} required={field.required} value={formData[field.name] || ''} onChange={e => setFormData({...formData, [field.name]: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-white">
                                        <option value="" disabled>Pilih salah satu...</option>
                                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : (<input type={field.type} name={field.name} required={field.required} placeholder={field.placeholder} value={formData[field.name] || ''} onChange={e => setFormData({...formData, [field.name]: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"/>)}
                            </div>
                        ))}
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                        <button type="button" onClick={handleAutoFill} className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"><Zap className="w-4 h-4"/> Isi Otomatis (Demo)</button>
                        <div className="flex gap-2">
                            <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-100">Batal</button>
                            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">{activeForm.submitLabel}</button>
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