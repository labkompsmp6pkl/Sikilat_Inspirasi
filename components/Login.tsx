import React, { useState } from 'react';
import { ROLE_CONFIGS } from '../constants';
import { UserRole } from '../types';
import { ArrowRight, UserPlus, LogIn, ChevronLeft } from 'lucide-react';

interface LoginProps {
  onLogin: (role: UserRole) => void;
  onRegister: (data: { nama: string; email: string; hp: string; peran: UserRole }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    hp: '',
    peran: 'guru' as UserRole
  });

  const handleSubmitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.nama && formData.email && formData.peran) {
      onRegister(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Branding */}
        <div className="md:w-2/5 bg-slate-900 p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#FFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.3,82.2,22.9,71.1,34.3C60,45.7,49.1,54.8,37.2,62.6C25.3,70.4,12.5,76.9,-0.6,77.9C-13.7,78.9,-27.7,74.4,-39.9,66.5C-52.1,58.6,-62.5,47.3,-70.6,34.4C-78.7,21.5,-84.5,7,-82.9,-6.8C-81.3,-20.6,-72.3,-33.7,-61.8,-43.3C-51.3,-52.9,-39.3,-59,-27.1,-67.2C-14.9,-75.4,-2.5,-85.7,11,-87.5C24.5,-89.3,30.5,-73.6,44.7,-76.4Z" transform="translate(100 100)" />
                </svg>
            </div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2 tracking-tight">SIKILAT</h1>
            <p className="text-slate-400 text-sm font-medium">Sistem Informasi Kilat & Manajemen Aset</p>
          </div>
          <div className="relative z-10">
             <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Transformasi manajemen aset dari reaktif ke proaktif. Gunakan AI Chat untuk pelaporan instan tanpa formulir manual.
             </p>
             <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                System Operational
             </div>
          </div>
        </div>

        {/* Right Side: Role Selection or Registration */}
        <div className="md:w-3/5 p-10 bg-white overflow-y-auto max-h-[80vh] md:max-h-auto relative">
          
          {!isRegistering ? (
            // MODE LOGIN DEMO
            <div className="animate-fade-in">
              <div className="mb-6 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Selamat Datang</h2>
                  <p className="text-slate-500 text-sm">Pilih peran akun demo untuk masuk.</p>
                </div>
                <button 
                  onClick={() => setIsRegistering(true)}
                  className="text-blue-600 text-sm font-semibold hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Buat Akun
                </button>
              </div>

              <div className="grid gap-3">
                {Object.values(ROLE_CONFIGS).map((config) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={config.id}
                      onClick={() => onLogin(config.id)}
                      className="group flex items-center justify-between w-full p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg bg-${config.color}-100 text-${config.color}-600 group-hover:bg-${config.color}-200 transition-colors`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-slate-700 group-hover:text-blue-700">{config.label}</h3>
                          <p className="text-xs text-slate-400">{config.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // MODE REGISTRASI
            <div className="animate-fade-in">
              <button 
                onClick={() => setIsRegistering(false)}
                className="mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Kembali ke Akun Demo
              </button>
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Registrasi Pengguna</h2>
                <p className="text-slate-500 text-sm">Input data diri untuk membuat sesi baru.</p>
              </div>

              <form onSubmit={handleSubmitRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    placeholder="Contoh: Andi Pratama"
                    value={formData.nama}
                    onChange={e => setFormData({...formData, nama: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      required
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      placeholder="email@sekolah.id"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">No HP</label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      placeholder="0812..."
                      value={formData.hp}
                      onChange={e => setFormData({...formData, hp: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Peran / Jabatan</label>
                  <select 
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-white"
                    value={formData.peran}
                    onChange={e => setFormData({...formData, peran: e.target.value as UserRole})}
                  >
                    {Object.values(ROLE_CONFIGS).map((config) => (
                      <option key={config.id} value={config.id}>{config.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    *Peran menentukan akses database dan fitur dashboard.
                  </p>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-200"
                >
                  <LogIn className="w-5 h-5" />
                  Daftar & Masuk
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;