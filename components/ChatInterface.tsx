
import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Database, X, CheckSquare, Zap, Check, CheckCheck, MoreVertical, Paperclip, Smile, Wrench, AlertTriangle, ListChecks, FileSearch, Lightbulb, ThumbsUp, ThumbsDown, ArrowRight, Share2, Calendar, Users, ChevronsRight, FileText, ClipboardList, Building2, Monitor, Phone, Mail, ChevronDown, ChevronUp, Info, Clock, Key, Reply } from 'lucide-react';
import { User, Message, RoleConfig, FormTemplate, QuickAction, DetailedItemReport, HistorySection, SavedData, PaginationInfo, ChatInterfaceProps, MaintenanceGuide, TroubleshootingGuide, WorkReportDraft, LaporanStatus, GeminiResponse } from '../types';
import { sendMessageToGemini, updateApiKey } from '../services/geminiService';
import { FORM_TEMPLATES } from '../constants';


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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null); // NEW: State for reply context
  
  const [activeForm, setActiveForm] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  // API Key Manual Input State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

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

  // NEW: Watch for external triggers (e.g. from Charts)
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

  const handleReplyClick = (msg: Message) => {
      setReplyingTo(msg);
      textareaRef.current?.focus();
  };

  const handleSend = async (text: string) => {
    if (!text.trim() && !imageFile) return;

    let imageBase64: string | null = null;
    if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
    }

    const currentReplyingTo = replyingTo; // Capture current ref

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date(),
      imageUrl: imagePreview || undefined,
      replyTo: currentReplyingTo || undefined // Attach reply context to the message
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setReplyingTo(null); // Clear reply state
    setIsTyping(true);

    // Pastikan chat terbuka saat pesan dikirim
    if (!isOpen && onToggle) {
        onToggle();
    }

    // --- CONTEXT INJECTION FOR AI ---
    // If replying, prefix the prompt with context so AI understands
    let promptToSend = text;
    if (currentReplyingTo) {
        const cleanReplyText = currentReplyingTo.text.replace(/:::DATA_JSON:::.*$/s, '').slice(0, 300); // Strip heavy JSON and limit length
        promptToSend = `[CONTEXT: User is replying to this previous message: "${cleanReplyText}"].\n\nUser's Reply: ${text}`;
    }

    const response: GeminiResponse = await sendMessageToGemini(promptToSend, user, imageBase64, imageFile?.type);

    // CHECK FOR API KEY ERROR
    if (response.text.includes("API_KEY_INVALID") || response.text.includes("API key not valid")) {
        setShowApiKeyModal(true);
    }

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: response.text,
      timestamp: new Date()
    };
    
    // If the AI response includes data to be saved, trigger the callback
    if (response.dataToSave) {
        // Enforce Pending status for new agenda items if missing
        if (response.dataToSave.table === 'agenda_kegiatan' && !response.dataToSave.payload.status) {
            response.dataToSave.payload.status = 'Pending';
        }
        onDataSaved(response.dataToSave);
    }

    setIsTyping(false);
    setMessages(prev => [...prev, aiMsg]);
  };

  const handleSaveApiKey = () => {
      if (tempApiKey.trim()) {
          updateApiKey(tempApiKey.trim());
          setShowApiKeyModal(false);
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              sender: 'ai',
              text: '✅ **API Key Diperbarui!**\n\nKunci API berhasil disimpan sementara. Silakan coba kirim pesan Anda lagi.',
              timestamp: new Date()
          }]);
      }
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

    // --- LOGIC PRESET KEGIATAN MANAJEMEN ASET (IT & SARPRAS) ---
    // Diperbarui: Objek Pengguna kini merujuk pada Manusia/Kelompok (Siswa, Guru, Staff)
    if (activeForm.id === 'agenda_kegiatan') {
        const maintenancePresets = [
            // --- IT PRESETS ---
            {
                posisi: "Lab Komputer 1",
                objek: "Siswa Kelas 9A",
                uraian: "Maintenance Rutin: Pengecekan software, update antivirus, dan pembersihan file sampah di 30 unit PC.",
                hasil: "28 PC Normal, 2 PC perlu install ulang Windows (dijadwalkan besok)."
            },
            {
                posisi: "Ruang Guru",
                objek: "Guru",
                uraian: "Perbaikan Jaringan: Menangani laporan WiFi 'limited access' dan printer sharing tidak terdeteksi.",
                hasil: "Access Point direstart, IP Conflict teratasi. Printer sharing sudah bisa diakses semua guru."
            },
            {
                posisi: "Ruang Server",
                objek: "Staff IT",
                uraian: "Backup Data & Cek Suhu: Backup database mingguan SIKILAT dan pengecekan suhu ruang server.",
                hasil: "Backup berhasil (Size: 4.5GB). Suhu ruang server stabil di 20°C."
            },
            {
                posisi: "Lab Bahasa",
                objek: "Siswa Kelas 8C",
                uraian: "Pengecekan Headset: Memeriksa fungsi audio dan microphone pada headset lab bahasa sebelum ujian.",
                hasil: "5 Headset kabel putus (diganti baru), sisanya berfungsi baik."
            },
            
            // --- SARPRAS PRESETS ---
            {
                posisi: "Ruang Kelas 7B",
                objek: "Siswa Kelas 7B",
                uraian: "Perbaikan Mebel: Memperbaiki 3 meja siswa yang goyah dan 1 kursi yang sandarannya lepas.",
                hasil: "Meja dan kursi telah diperkuat dengan paku tembak dan lem kayu. Aman digunakan."
            },
            {
                posisi: "Perpustakaan",
                objek: "Petugas Perpustakaan",
                uraian: "Service AC: Cuci AC Split dan cek tekanan freon karena laporan AC tidak dingin.",
                hasil: "Filter sangat kotor sudah dibersihkan. Tekanan freon normal. Suhu output sudah dingin (18°C)."
            },
            {
                posisi: "Koridor Utama",
                objek: "Staff Sarpras",
                uraian: "Pergantian Lampu: Mengganti 4 titik lampu LED downlight yang mati di area koridor menuju kantin.",
                hasil: "Lampu diganti dengan LED 12W baru. Area kembali terang."
            },
            {
                posisi: "Toilet Siswa Lt.1",
                objek: "Siswa",
                uraian: "Perbaikan Sanitasi: Memperbaiki kran air wastafel yang bocor dan flush toilet yang macet.",
                hasil: "Seal kran diganti, kebocoran berhenti. Mekanisme flush diperbaiki."
            }
        ];

        // Pilih satu preset secara acak
        const randomTask = maintenancePresets[Math.floor(Math.random() * maintenancePresets.length)];
        
        // Waktu sekarang
        const now = new Date();
        const startStr = now.toISOString().slice(0, 16); // format YYYY-MM-DDTHH:mm
        const endTime = new Date(now.getTime() + 60 * 60 * 1000); // +1 jam
        const endStr = endTime.toISOString().slice(0, 16);

        setFormData({
            waktu_mulai: startStr,
            waktu_selesai: endStr,
            posisi: randomTask.posisi,
            objek_pengguna: randomTask.objek,
            uraian_kegiatan: randomTask.uraian,
            hasil_kegiatan: randomTask.hasil,
        });
        return;
    }

    // --- LOGIC STANDAR UNTUK FORM LAIN ---
    const autoFillData: Record<string, Record<string, string>> = {
      lapor_kerusakan: {
        nama_barang: 'Proyektor Epson',
        lokasi: 'Ruang Rapat A',
        deskripsi: 'Tampilan proyektor bergaris dan warna pudar.',
        urgensi: 'Sedang',
      },
      booking_ruangan: {
        objek: 'Aula Utama',
        tanggal: new Date().toISOString().slice(0, 10),
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
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n/g, '<br />');
        return <p key={index} dangerouslySetInnerHTML={{ __html: formattedText }} />;
      }
    });
  };

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
                     // Status Badge Logic
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
    
    // String/Number
    return <span className="text-slate-700">{String(val)}</span>;
  };
  
  const renderDataWidget = (jsonString: string) => {
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
            // Handle case where no JSON structure is found
            return <div className="text-slate-500 text-sm p-3 bg-slate-50 rounded-lg italic border border-slate-200">{jsonString}</div>;
        }
        
        textToParse = textToParse.substring(start);
        
        // Basic balancing logic
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

        if (endIndex === -1) {
             throw new Error("Incomplete JSON");
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


  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 relative">
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
                  <div className={`w-full max-w-lg p-3 rounded-2xl relative group ${msg.sender === 'user' ? `bg-emerald-100 text-emerald-900 rounded-br-none` : 'bg-white text-slate-800 rounded-bl-none shadow-sm'}`}>
                    
                    {/* Reply Action Button (Visible on Hover) */}
                    <button 
                        onClick={() => handleReplyClick(msg)}
                        className={`absolute top-2 ${msg.sender === 'user' ? '-left-8' : '-right-8'} p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity`}
                        title="Balas Pesan Ini"
                    >
                        <Reply className="w-3.5 h-3.5" />
                    </button>

                    {/* Quoted Message Display */}
                    {msg.replyTo && (
                        <div className={`mb-2 p-2 rounded text-xs border-l-4 ${msg.sender === 'user' ? 'bg-emerald-200/50 border-emerald-500 text-emerald-800' : 'bg-slate-100 border-slate-400 text-slate-600'}`}>
                            <div className="font-bold mb-0.5">{msg.replyTo.sender === 'ai' ? 'SIKILAT Assistant' : 'Anda'}</div>
                            <div className="truncate opacity-80">{msg.replyTo.text.replace(/:::DATA_JSON:::.*$/s, '')}</div>
                        </div>
                    )}

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
          
          {/* Reply Preview Area */}
          {replyingTo && (
              <div className="px-4 pt-3 bg-slate-50 animate-slide-up">
                  <div className="bg-white border-l-4 border-blue-500 rounded-r-lg p-2 shadow-sm flex justify-between items-center">
                      <div className="overflow-hidden">
                          <div className="text-xs font-bold text-blue-600 mb-0.5">Membalas ke {replyingTo.sender === 'ai' ? 'SIKILAT Assistant' : 'Anda'}</div>
                          <div className="text-xs text-slate-500 truncate">{replyingTo.text.replace(/:::DATA_JSON:::.*$/s, '')}</div>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                          <X className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          )}

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

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm rounded-2xl animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-sm">
                <div className="flex flex-col items-center text-center mb-4">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                        <Key className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Masalah Konfigurasi API Key</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Sistem mendeteksi API Key tidak valid atau kadaluarsa. Masukkan kunci baru untuk melanjutkan.
                    </p>
                </div>
                
                <input 
                    type="password" 
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Paste Gemini API Key (AI Studio)"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none mb-3"
                />
                
                <button 
                    onClick={handleSaveApiKey}
                    disabled={!tempApiKey.trim()}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                >
                    Simpan & Lanjutkan
                </button>
                
                <div className="text-center">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                        Dapatkan API Key Gratis di sini
                    </a>
                </div>
           </div>
        </div>
      )}

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
                                ) : field.type === 'creatable-select' ? (
                                    <div className="relative">
                                        <input 
                                            list={`list-${field.name}`}
                                            name={field.name}
                                            required={field.required} 
                                            placeholder={field.placeholder} 
                                            value={formData[field.name] || ''} 
                                            onChange={e => setFormData({...formData, [field.name]: e.target.value})} 
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                            autoComplete="off"
                                        />
                                        <datalist id={`list-${field.name}`}>
                                            {field.options?.map(opt => <option key={opt} value={opt} />)}
                                        </datalist>
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">*Pilih dari daftar atau ketik manual jika tidak tersedia.</p>
                                    </div>
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
