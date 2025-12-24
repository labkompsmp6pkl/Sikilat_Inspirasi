
import React, { useState } from 'react';
import { ROLE_CONFIGS } from '../constants';
import { UserRole, Pengguna } from '../types';
import { ArrowRight, UserPlus, LogIn, ChevronLeft, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import db from '../services/dbService';

interface LoginProps {
  onLoginSuccess: (user: Pengguna) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
        if (isRegistering) {
            // 1. Sign Up to Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Registrasi gagal.");

            // 2. Create Profile in Public Table
            const newProfile: Pengguna = {
                id_pengguna: authData.user.id,
                nama_lengkap: formData.nama,
                email: formData.email,
                no_hp: formData.hp,
                peran: formData.peran,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.nama}`
            };

            const success = await db.createUserProfile(newProfile);
            if (!success) throw new Error("Gagal menyimpan profil pengguna.");

            onLoginSuccess(newProfile);
        } else {
            // Sign In
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Login gagal.");

            // Fetch Profile
            const profile = await db.getUserProfile(authData.user.id);
            if (!profile) throw new Error("Profil tidak ditemukan.");

            onLoginSuccess(profile);
        }
    } catch (e: any) {
        setErrorMsg(e.message || "Terjadi kesalahan sistem.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side: Branding */}
        <div className="md:w-2/5 bg-slate-900 p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#FFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.3,82.2,22.9,71.1,34.3C60,45.7,49.1,54.8,37.2,62.6C25.3,70.4,12.5,76.9,-0.6,77.9C-13.7,78.9,-27.7,74.4,-39.9,66.5C-52.1,58.6,-62.5,47.3,-70.6,34.4C-78.7,21.5,-84.5,7,-82.9,-6.8C-81.3,-20.6,-72.3,-33.7,-61.8,-43.3C-51.3,-52.9,-39.3,-59,-27.1,-67.2C-14.9,-75.4,-2.5,-85.7,11,-87.5C24.5,-89.3,30.5,-73.6,44.7,-76.4Z" transform="translate(100 100)" />
                </svg>
            </div>
          <div className="relative z-10">
            <h1 className="text-4xl font-black mb-2 tracking-tight">SIKILAT</h1>
            <p className="text-slate-400 text-sm font-black uppercase tracking-widest opacity-80">Sync Integration Hub</p>
          </div>
          <div className="relative z-10">
             <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-6">
                 <p className="text-blue-100/80 text-sm font-medium leading-relaxed italic">
                    "Manajemen aset kini lebih aman dengan Supabase Auth & Real-time Database Sync."
                 </p>
             </div>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Secure Cloud Active
             </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="md:w-3/5 p-10 bg-white overflow-y-auto relative">
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                    {isRegistering ? 'Daftar Akun' : 'Masuk Sistem'}
                </h2>
                <button 
                  onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(null); }}
                  className="text-blue-600 text-xs font-black uppercase tracking-widest hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-all"
                >
                  {isRegistering ? 'Sudah Ada Akun?' : 'Buat Akun Baru'}
                </button>
            </div>
            <p className="text-slate-500 text-sm font-medium">
                {isRegistering ? 'Lengkapi data profil untuk akses penuh.' : 'Gunakan email sekolah Anda untuk masuk.'}
            </p>
          </div>

          {errorMsg && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex items-center gap-3 animate-shake">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {errorMsg}
              </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
                <div className="animate-fade-in space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                        <input 
                            type="text" required
                            className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-medium"
                            placeholder="Andi Pratama"
                            value={formData.nama}
                            onChange={e => setFormData({...formData, nama: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">No HP / WhatsApp</label>
                        <input 
                            type="tel" required
                            className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-medium"
                            placeholder="0812345678"
                            value={formData.hp}
                            onChange={e => setFormData({...formData, hp: e.target.value})}
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Sekolah</label>
                <input 
                    type="email" required
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-medium"
                    placeholder="email@sekolah.id"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>

            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kata Sandi</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        required minLength={6}
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-medium"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {isRegistering && (
                <div className="animate-fade-in">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Peran / Jabatan</label>
                    <select 
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-white font-bold text-slate-700"
                        value={formData.peran}
                        onChange={e => setFormData({...formData, peran: e.target.value as UserRole})}
                    >
                        {Object.values(ROLE_CONFIGS).map((config) => (
                            <option key={config.id} value={config.id}>{config.label}</option>
                        ))}
                    </select>
                </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 mt-4 shadow-xl shadow-slate-200 disabled:opacity-70 active:scale-[0.98]"
            >
              {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    {isRegistering ? 'Daftar Sekarang' : 'Masuk Ke Sistem'}
                  </>
              )}
            </button>
            
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-6">
                &copy; 2024 SIKILAT &bull; SMP N 6 PEKALONGAN
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
