
import React, { useState, useEffect, useRef } from 'react';
import { ROLE_CONFIGS, MOCK_USERS } from '../constants';
import { UserRole, Pengguna } from '../types';
import { 
  LogIn, 
  Loader2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  UserPlus, 
  ChevronRight, 
  Mail, 
  Lock,
  ArrowLeft,
  Users,
  Wrench,
  Monitor,
  Building2,
  ShieldCheck,
  Settings,
  Sparkles,
  Circle,
  UserCircle,
  Phone,
  RefreshCw,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import db from '../services/dbService';

interface LoginProps {
  onLoginSuccess: (user: Pengguna) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'demo' | 'login' | 'register'>('demo');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const loginTimeoutRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    hp: '',
    password: '',
    peran: 'guru' as UserRole
  });

  useEffect(() => {
    setErrorMsg(null);
    return () => {
        if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
    };
  }, [authMode, formData.email]);

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (authMode === 'register') {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        const newProfile: Pengguna = {
          id_pengguna: authData.user!.id,
          nama_lengkap: formData.nama,
          email: formData.email,
          no_hp: formData.hp,
          peran: formData.peran,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authData.user!.id}`
        };

        await db.createUserProfile(newProfile);
        onLoginSuccess(newProfile);
        
      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const profile = await db.getUserProfile(authData.user.id);
          if (profile) {
            onLoginSuccess(profile);
          } else {
            const tempUser: Pengguna = {
              id_pengguna: authData.user.id,
              nama_lengkap: authData.user.email?.split('@')[0] || 'User',
              email: authData.user.email || '',
              no_hp: '-',
              peran: 'tamu',
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authData.user.id}`
            };
            onLoginSuccess(tempUser);
          }
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Gagal masuk. Periksa kembali email dan password Anda.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setIsLoading(true);
    const mockUser = MOCK_USERS[role] as Pengguna;
    
    // Alur Non-Blocking: Kita langsung login-kan user ke UI
    // Sambil di background mencoba sinkronisasi ke cloud jika memungkinkan
    try {
        // Jangan 'await' proses ini agar user tidak stuck jika database lambat
        db.createUserProfile(mockUser).catch(err => console.warn("Background sync failed, staying offline"));
        
        // Beri delay sedikit untuk efek visual loading yang mulus
        setTimeout(() => {
          onLoginSuccess(mockUser);
          setIsLoading(false);
        }, 600);
    } catch (e) {
        // Jika ada error fatal di logika, tetap arahkan ke dashboard
        onLoginSuccess(mockUser);
        setIsLoading(false);
    }
  };

  const RoleIcon = ({ role, color }: { role: string, color: string }) => {
    const icons: Record<string, any> = {
      guru: Users,
      penanggung_jawab: Wrench,
      pengawas_it: Monitor,
      pengawas_sarpras: Building2,
      pengawas_admin: ShieldCheck,
      admin: Settings,
      tamu: UserCircle
    };
    const IconComponent = icons[role] || Users;
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-500',
      emerald: 'bg-emerald-50 text-emerald-500',
      violet: 'bg-violet-50 text-violet-500',
      amber: 'bg-amber-50 text-amber-500',
      indigo: 'bg-indigo-50 text-indigo-500',
      rose: 'bg-rose-50 text-rose-500',
      cyan: 'bg-cyan-50 text-cyan-500'
    };
    return (
      <div className={`p-3 rounded-2xl ${colors[color] || 'bg-slate-50 text-slate-400'}`}>
        <IconComponent className="w-6 h-6" />
      </div>
    );
  };

  const rolesToDisplay: UserRole[] = ['guru', 'penanggung_jawab', 'pengawas_it', 'pengawas_sarpras', 'pengawas_admin', 'admin', 'tamu'];

  return (
    <div className="min-h-screen bg-[#e2e8f0] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl bg-white shadow-4xl rounded-[3rem] overflow-hidden flex flex-col md:flex-row min-h-[780px]">
        {/* Left Side: Branding */}
        <div className="md:w-[42%] bg-[#0f172a] p-12 md:p-16 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-slate-800/30 rounded-full blur-[100px]"></div>
          <div className="relative z-10">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 italic leading-none">SIKILAT</h1>
            <p className="text-slate-400 text-xl font-medium max-w-[280px] leading-tight opacity-80 mt-4">Sistem Informasi Kilat & Manajemen Aset</p>
          </div>
          <div className="relative z-10 space-y-12">
            <p className="text-slate-300 text-lg leading-relaxed font-medium">Digitalisasi sarana prasarana sekolah masa depan.</p>
            <div className="flex items-center gap-3">
              <Circle className="w-3 h-3 fill-emerald-500 text-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">Node Online</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="flex-1 p-10 md:p-16 flex flex-col bg-white overflow-y-auto max-h-[90vh] md:max-h-none scrollbar-hide">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight leading-none">
                {authMode === 'demo' ? 'Uji Coba Cepat' : authMode === 'login' ? 'Masuk' : 'Registrasi'}
              </h2>
              <p className="text-slate-500 font-medium text-lg mt-2">
                {authMode === 'demo' ? 'Pilih peran untuk akses instan.' : 'Gunakan akun terdaftar Anda.'}
              </p>
            </div>
            {authMode === 'demo' ? (
              <button onClick={() => setAuthMode('login')} className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-sm hover:bg-blue-100 transition-all border border-blue-100/50">
                <LogIn className="w-4 h-4" /> Login Manual
              </button>
            ) : (
              <button onClick={() => setAuthMode('demo')} className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:text-slate-700 font-black text-sm transition-all">
                <ArrowLeft className="w-5 h-5" /> Kembali ke Demo
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="mb-8 p-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex flex-col gap-3 text-rose-700 animate-slide-up">
              <div className="flex items-center gap-4">
                 <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                 <span className="text-sm font-black uppercase tracking-tight">Terjadi Masalah</span>
              </div>
              <p className="text-xs font-medium ml-10 opacity-80">{errorMsg}</p>
            </div>
          )}

          {authMode === 'demo' ? (
            <div className="grid grid-cols-1 gap-4 pb-10">
              {rolesToDisplay.map((role) => {
                const config = ROLE_CONFIGS[role];
                return (
                  <button key={role} onClick={() => handleDemoLogin(role)} disabled={isLoading} className="w-full group flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all text-left disabled:opacity-50">
                    <div className="flex items-center gap-6">
                      <RoleIcon role={role} color={config.color} />
                      <div>
                        <h4 className="font-black text-slate-900 text-xl group-hover:text-blue-600 transition-colors">{config.label}</h4>
                        <p className="text-slate-400 text-sm font-medium">{config.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </button>
                );
              })}
              <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                <button onClick={() => setAuthMode('register')} className="text-xs font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">Belum punya akun? <span className="text-blue-600">Buat Akun Baru</span></button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualAuth} className="space-y-6 max-w-lg w-full">
              {authMode === 'register' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                      <div className="relative">
                        <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input type="text" required placeholder="Budi Santoso" className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-800 bg-slate-50/50" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. WhatsApp</label>
                      <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input type="text" required placeholder="0812..." className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-800 bg-slate-50/50" value={formData.hp} onChange={e => setFormData({...formData, hp: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daftar Sebagai (Peran)</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <select required className="w-full pl-14 pr-12 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-800 bg-slate-50/50 appearance-none cursor-pointer" value={formData.peran} onChange={e => setFormData({...formData, peran: e.target.value as UserRole})}>
                        {rolesToDisplay.map(role => <option key={role} value={role}>{ROLE_CONFIGS[role].label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input type="email" required placeholder="email@contoh.com" className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-800 bg-slate-50/50" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input type={showPassword ? "text" : "password"} required placeholder="••••••••" className="w-full pl-14 pr-14 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-800 bg-slate-50/50" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] hover:bg-black transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3">{isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><LogIn className="w-5 h-5" />{authMode === 'login' ? 'Masuk ke Dashboard' : 'Selesaikan Registrasi'}</>}</button>
            </form>
          )}

          {isLoading && (
            <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
                <div className="relative mb-6">
                    <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-500 animate-pulse" />
                </div>
                <p className="font-black text-slate-900 text-xl tracking-tighter italic uppercase">Sinkronisasi Cloud...</p>
                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">Akses Instan Mode Demo Aktif</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
