
import React, { useState } from 'react';
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
  CheckCircle2,
  Users,
  Wrench,
  Monitor,
  Building2,
  ShieldCheck,
  Settings
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

  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    hp: '',
    password: '',
    peran: 'guru' as UserRole
  });

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (authMode === 'register') {
        const { data: authData, error: authError } = await (supabase.auth as any).signUp({
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
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.nama}`
        };

        await db.createUserProfile(newProfile);
        onLoginSuccess(newProfile);
      } else {
        const { data: authData, error: authError } = await (supabase.auth as any).signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        const profile = await db.getUserProfile(authData.user!.id);
        if (profile) {
          onLoginSuccess(profile);
        } else {
          // Fallback jika profil tidak ditemukan di tabel pengguna
          onLoginSuccess({
            id_pengguna: authData.user!.id,
            nama_lengkap: authData.user!.email?.split('@')[0] || 'User',
            email: authData.user!.email || '',
            no_hp: '-',
            peran: 'tamu',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authData.user!.id}`
          });
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Gagal melakukan autentikasi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    setIsLoading(true);
    setTimeout(() => {
      onLoginSuccess(MOCK_USERS[role] as Pengguna);
      setIsLoading(false);
    }, 800);
  };

  // Map icons for cards
  const RoleIcon = ({ role, color }: { role: string, color: string }) => {
    const icons: Record<string, any> = {
      guru: Users,
      penanggung_jawab: Wrench,
      pengawas_it: Monitor,
      pengawas_sarpras: Building2,
      pengawas_admin: ShieldCheck,
      admin: Settings
    };
    const IconComponent = icons[role] || Users;
    
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-500',
      emerald: 'bg-emerald-50 text-emerald-500',
      violet: 'bg-violet-50 text-violet-500',
      amber: 'bg-amber-50 text-amber-500',
      indigo: 'bg-indigo-50 text-indigo-500',
      rose: 'bg-rose-50 text-rose-500'
    };

    return (
      <div className={`p-3 rounded-xl ${colors[color] || 'bg-slate-50'}`}>
        <IconComponent className="w-6 h-6" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-0 md:p-6 lg:p-12">
      <div className="w-full max-w-6xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row min-h-[720px]">
        
        {/* SIDEBAR (KIRI) */}
        <div className="md:w-[42%] bg-[#0f172a] p-10 md:p-16 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Decorative Blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[50%] bg-indigo-500/10 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[20%] right-[-20%] w-[100px] h-[100px] bg-blue-500/20 rounded-full blur-[40px]"></div>

          <div className="relative z-10">
            <h1 className="text-6xl font-black tracking-tighter mb-4 italic">SIKILAT</h1>
            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-[280px]">
              Sistem Informasi Kilat & Manajemen Aset
            </p>
          </div>

          <div className="relative z-10 space-y-12">
            <p className="text-slate-300 text-lg leading-relaxed font-medium">
              Transformasi manajemen aset dari reaktif ke proaktif. Gunakan AI Chat untuk pelaporan instan tanpa formulir manual.
            </p>

            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold text-slate-400 tracking-wide">System Operational</span>
            </div>
          </div>
        </div>

        {/* CONTENT (KANAN) */}
        <div className="flex-1 p-10 md:p-16 flex flex-col bg-white overflow-y-auto max-h-screen scrollbar-hide">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Selamat Datang</h2>
              <p className="text-slate-500 font-medium">
                {authMode === 'demo' ? 'Pilih peran akun demo untuk masuk.' : 
                 authMode === 'login' ? 'Masuk ke akun SIKILAT Anda.' : 'Buat akun SIKILAT baru.'}
              </p>
            </div>
            {authMode === 'demo' ? (
              <button 
                onClick={() => setAuthMode('register')}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all"
              >
                <UserPlus className="w-4 h-4" /> Buat Akun
              </button>
            ) : (
              <button 
                onClick={() => setAuthMode('demo')}
                className="flex items-center gap-2 px-5 py-2.5 text-slate-500 hover:text-slate-900 font-bold text-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Demo
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-600 text-sm font-bold animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {authMode === 'demo' ? (
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(ROLE_CONFIGS).map(([id, config]) => (
                <button
                  key={id}
                  onClick={() => handleDemoLogin(id as UserRole)}
                  disabled={isLoading}
                  className="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-[0_10px_30px_rgba(59,130,246,0.08)] transition-all text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-5">
                    <RoleIcon role={id} color={config.color} />
                    <div>
                      <h4 className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{config.label}</h4>
                      <p className="text-slate-400 text-sm font-medium">{config.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
              
              <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                <button 
                  onClick={() => setAuthMode('login')}
                  className="text-xs font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
                >
                  Sudah memiliki akun? <span className="text-blue-600">Masuk Manual</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualAuth} className="space-y-6">
              {authMode === 'register' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nama Lengkap</label>
                  <div className="relative">
                    <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama Anda"
                      className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800 bg-slate-50/50"
                      value={formData.nama} 
                      onChange={e => setFormData({...formData, nama: e.target.value})} 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Sekolah / Institusi</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    placeholder="email@sekolah.sch.id"
                    className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800 bg-slate-50/50"
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="••••••••"
                    className="w-full pl-14 pr-14 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800 bg-slate-50/50"
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pilih Peran</label>
                  <select 
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 bg-slate-50/50 appearance-none"
                    value={formData.peran}
                    onChange={e => setFormData({...formData, peran: e.target.value as UserRole})}
                  >
                    {Object.entries(ROLE_CONFIGS).map(([id, config]) => (
                      <option key={id} value={id}>{config.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    {authMode === 'login' ? <LogIn className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    {authMode === 'login' ? 'Masuk ke Dashboard' : 'Konfirmasi Pendaftaran'}
                  </>
                )}
              </button>

              <div className="text-center pt-4">
                <button 
                  type="button" 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors"
                >
                  {authMode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
                </button>
              </div>
            </form>
          )}

          {isLoading && authMode === 'demo' && (
            <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="font-black text-slate-900 tracking-tighter italic animate-pulse">Menghubungkan ke Node...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
