
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
  Settings,
  Circle
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

  // Map icons for cards matching the reference image
  const RoleIcon = ({ role, color }: { role: string, color: string }) => {
    const icons: Record<string, any> = {
      guru: Users,
      penanggung_jawab: Wrench,
      pengawas_it: Monitor,
      pengawas_sarpras: Building2,
      pengawas_admin: ShieldCheck,
      admin: Settings,
      tamu: Users
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
      <div className={`p-3 rounded-xl ${colors[color] || 'bg-slate-50 text-slate-500'}`}>
        <IconComponent className="w-6 h-6" />
      </div>
    );
  };

  // Order roles as per the reference image
  const orderedRoles: UserRole[] = ['guru', 'penanggung_jawab', 'pengawas_it', 'pengawas_sarpras', 'pengawas_admin'];

  return (
    <div className="min-h-screen bg-[#e2e8f0] flex items-center justify-center p-0 md:p-4 lg:p-8">
      <div className="w-full max-w-6xl bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden flex flex-col md:flex-row min-h-[750px]">
        
        {/* SIDEBAR (LEFT) - Matches the reference image's dark theme and abstract shapes */}
        <div className="md:w-[40%] bg-[#0f172a] p-12 md:p-16 flex flex-col justify-between text-white relative overflow-hidden shrink-0">
          {/* Decorative Elements like the reference image */}
          <div className="absolute top-[20%] right-[-20%] w-[350px] h-[350px] bg-slate-800/30 rounded-full blur-[60px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-indigo-900/20 rounded-full blur-[80px]"></div>

          <div className="relative z-10">
            <h1 className="text-6xl font-black tracking-tighter mb-4">SIKILAT</h1>
            <p className="text-slate-400 text-lg font-medium leading-tight max-w-[300px]">
              Sistem Informasi Kilat & Manajemen Aset
            </p>
          </div>

          <div className="relative z-10 space-y-10">
            <p className="text-slate-300 text-lg leading-relaxed font-medium">
              Transformasi manajemen aset dari reaktif ke proaktif. Gunakan AI Chat untuk pelaporan instan tanpa formulir manual.
            </p>

            <div className="flex items-center gap-2">
              <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-slate-400 tracking-wide">System Operational</span>
            </div>
          </div>
        </div>

        {/* CONTENT (RIGHT) - Clean layout with role selection cards */}
        <div className="flex-1 p-10 md:p-16 flex flex-col bg-white overflow-y-auto max-h-screen scrollbar-hide">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-[2.5rem] font-bold text-slate-900 leading-tight mb-2">Selamat Datang</h2>
              <p className="text-slate-400 font-medium text-lg">
                {authMode === 'demo' ? 'Pilih peran akun demo untuk masuk.' : 
                 authMode === 'login' ? 'Masuk ke akun SIKILAT Anda.' : 'Buat akun SIKILAT baru.'}
              </p>
            </div>
            
            {authMode === 'demo' ? (
              <button 
                onClick={() => setAuthMode('register')}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#eff6ff] text-[#3b82f6] rounded-xl font-bold text-sm hover:bg-blue-100 transition-all border border-transparent"
              >
                <UserPlus className="w-5 h-5" /> Buat Akun
              </button>
            ) : (
              <button 
                onClick={() => setAuthMode('demo')}
                className="flex items-center gap-2 px-5 py-2.5 text-slate-400 hover:text-slate-700 font-bold text-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Demo
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-600 text-sm font-bold">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {authMode === 'demo' ? (
            <div className="grid grid-cols-1 gap-4">
              {orderedRoles.map((id) => {
                const config = ROLE_CONFIGS[id];
                return (
                  <button
                    key={id}
                    onClick={() => handleDemoLogin(id as UserRole)}
                    disabled={isLoading}
                    className="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[1.25rem] hover:border-blue-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all text-left disabled:opacity-50"
                  >
                    <div className="flex items-center gap-6">
                      <RoleIcon role={id} color={config.color} />
                      <div>
                        <h4 className="font-bold text-slate-900 text-xl mb-0.5">{config.label}</h4>
                        <p className="text-slate-400 text-sm font-medium">{config.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </button>
                );
              })}
              
              <div className="mt-6 pt-6 border-t border-slate-50 text-center">
                <button 
                  onClick={() => setAuthMode('login')}
                  className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
                >
                  Sudah memiliki akun? <span className="text-blue-600">Masuk Manual</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualAuth} className="space-y-6 max-w-md">
              {authMode === 'register' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nama Lengkap</label>
                  <div className="relative">
                    <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama Anda"
                      className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800 bg-slate-50/30"
                      value={formData.nama} 
                      onChange={e => setFormData({...formData, nama: e.target.value})} 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Sekolah / Institusi</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    placeholder="email@sekolah.sch.id"
                    className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800 bg-slate-50/30"
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="••••••••"
                    className="w-full pl-14 pr-14 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800 bg-slate-50/30"
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Pilih Peran</label>
                  <select 
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 bg-slate-50/30 appearance-none"
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
                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <LogIn className="w-5 h-5" />
                    {authMode === 'login' ? 'Masuk ke Dashboard' : 'Daftar Sekarang'}
                  </>
                )}
              </button>
            </form>
          )}

          {isLoading && authMode === 'demo' && (
            <div className="fixed inset-0 z-[200] bg-white/40 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="font-black text-slate-900 tracking-tighter italic animate-pulse">Menghubungkan ke Node SIKILAT...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
