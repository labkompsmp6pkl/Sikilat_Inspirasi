
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import MyStatusDashboard from './components/MyStatusDashboard';
import DamageReportChart from './components/DamageReportChart';
import PendingTicketTable from './components/PendingTicketTable'; // Import new component
import { ROLE_CONFIGS } from './constants';
import { User, UserRole, SavedData, PengaduanKerusakan, PeminjamanAntrian, Pengguna, Lokasi, Inventaris } from './types';
import db from './services/dbService'; // Import the database service
import { LogOut, ShieldCheck, Database, User as UserIcon, Lock, ChevronDown, Download, FileSpreadsheet } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  // NEW: State for messages triggered by charts/dashboards
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // --- Real-time State Management from DB ---
  const [bookings, setBookings] = useState<PeminjamanAntrian[]>([]);
  const [reports, setReports] = useState<PengaduanKerusakan[]>([]);
  const [inventaris, setInventaris] = useState<Inventaris[]>([]);
  const [allUsers, setAllUsers] = useState<Pengguna[]>([]);
  const [locations, setLocations] = useState<Lokasi[]>([]);
  
  // Load data from DB on startup
  useEffect(() => {
      setBookings(db.getTable('peminjaman_antrian'));
      setReports(db.getTable('pengaduan_kerusakan'));
      setInventaris(db.getTable('inventaris'));
      setAllUsers(db.getTable('pengguna'));
      setLocations(db.getTable('lokasi'));
  }, []);


  const handleLogin = (role: UserRole) => {
    // In a real app, you'd fetch the specific user. Here we find the first user with that role.
    const user = db.getTable('pengguna').find(u => u.peran === role);
    setCurrentUser(user || null);
  };
  
  const handleToggleChat = () => setIsChatOpen(prev => !prev);

  const handleRegister = (data: { nama: string; email: string; hp: string; peran: UserRole }) => {
    const newUser: User = {
      id_pengguna: `u_custom_${Date.now()}`,
      nama_lengkap: data.nama,
      email: data.email,
      no_hp: data.hp,
      peran: data.peran,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nama)}&background=random&color=fff`
    };
    db.addRecord('pengguna', newUser);
    setAllUsers(db.getTable('pengguna'));
    setCurrentUser(newUser);
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    setCurrentUser(null);
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
            setIsProfileMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  const handleDataSaved = (data: SavedData) => {
      db.addRecord(data.table, data.payload);

      if (data.table === 'peminjaman_antrian') {
          setBookings(db.getTable('peminjaman_antrian'));
      }
      if (data.table === 'pengaduan_kerusakan') {
          setReports(db.getTable('pengaduan_kerusakan'));
      }
      if (data.table === 'pengguna') {
          setAllUsers(db.getTable('pengguna'));
      }
      
      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);
  };
  
  // NEW: Callback passed to child components to trigger chat
  const handleTriggerChatAction = (prompt: string) => {
      setExternalMessage(prompt);
      setIsChatOpen(true); // Open chat if closed
  };


  const filteredReportsForChart = useMemo(() => {
    if (!currentUser) return [];
    switch (currentUser.peran) {
        case 'pengawas_it':
            return reports.filter(r => r.kategori_aset === 'IT');
        case 'pengawas_sarpras':
            return reports.filter(r => r.kategori_aset === 'Sarpras' || r.kategori_aset === 'General');
        default:
            return reports;
    }
  }, [currentUser, reports]);

  const handleExportCSV = () => {
    if (filteredReportsForChart.length === 0) {
        alert("Tidak ada data laporan untuk diekspor.");
        return;
    }

    const headers = ['ID', 'Tanggal', 'Barang', 'Kategori', 'Lokasi', 'Pelapor', 'Masalah', 'Status'];
    const csvContent = [
        headers.join(','),
        ...filteredReportsForChart.map(r => {
            const row = [
                r.id,
                new Date(r.tanggal_lapor).toISOString().split('T')[0],
                `"${r.nama_barang.replace(/"/g, '""')}"`,
                r.kategori_aset,
                `"${r.lokasi_kerusakan.replace(/"/g, '""')}"`,
                `"${r.nama_pengadu.replace(/"/g, '""')}"`,
                `"${r.deskripsi_masalah.replace(/"/g, '""')}"`,
                r.status
            ];
            return row.join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SIKILAT_Laporan_Kerusakan_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const roleConfig = ROLE_CONFIGS[currentUser.peran];
  const themeBg = `bg-${roleConfig.color}-600`;

  // DEFINISI HAK AKSES DASHBOARD
  
  // 1. Logic Read-Only:
  // Role 'penanggung_jawab' dan 'admin' adalah EKSEKUTOR (bisa klik tombol).
  // Role 'pengawas_*' adalah MONITORING (hanya lihat data).
  const isReadOnly = !['penanggung_jawab', 'admin'].includes(currentUser.peran);

  // 2. Chart (Analisis):
  // Dulu hanya PJ & Admin. Sekarang semua Pengawas juga boleh lihat untuk analisis, tapi tanpa tombol aksi.
  const chartAccessRoles: UserRole[] = ['penanggung_jawab', 'admin', 'pengawas_it', 'pengawas_sarpras', 'pengawas_admin'];
  
  // 3. Table (Eksekusi/Monitoring):
  // Semua Pengawas boleh lihat antrian tiket untuk monitoring, tapi tidak bisa eksekusi.
  const ticketAccessRoles: UserRole[] = ['penanggung_jawab', 'admin', 'pengawas_it', 'pengawas_sarpras'];
  
  // 4. Export CSV: Penanggung Jawab, Admin, dan Pengawas Admin
  const exportAccessRoles: UserRole[] = ['penanggung_jawab', 'pengawas_admin', 'admin'];


  const getTableStats = () => ({
    tables: [
      { name: 'agenda_kegiatan', label: 'Agenda Kegiatan', count: 0 },
      { name: 'inventaris', label: 'Inventaris Aset', count: inventaris.length },
      { name: 'pengguna', label: 'Data Pengguna', count: allUsers.length },
      { name: 'pengaduan_kerusakan', label: 'Pengaduan Kerusakan', count: reports.length },
      { name: 'peminjaman_antrian', label: 'Peminjaman & Antrian', count: bookings.length },
      { name: 'lokasi', label: 'Lokasi Fisik', count: locations.length },
      { name: 'kelas', label: 'Data Kelas', count: 32 },
    ]
  });
  
  const tableStats = getTableStats();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm"> S </div>
             <div>
                <span className="hidden sm:inline font-bold text-slate-800 tracking-tight text-lg">SIKILAT SMP 6 Pekalongan</span>
                <span className="sm:hidden font-bold text-slate-800 tracking-tight text-lg">SIKILAT</span>
             </div>
          </div>
          <div className="flex items-center gap-2" ref={profileMenuRef}>
             <div className="relative">
                <button onClick={() => setIsProfileMenuOpen(prev => !prev)} className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors">
                  <img src={currentUser.avatar} alt="Profile" className="w-10 h-10 rounded-full"/>
                   <div className="hidden md:flex flex-col items-end">
                       <span className="text-sm font-semibold text-slate-700">{currentUser.nama_lengkap}</span>
                       <span className={`text-xs px-2 py-0.5 rounded-full text-white ${themeBg}`}>{roleConfig.label}</span>
                   </div>
                   <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden animate-fade-in-down">
                     <div className="p-2">
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md"><UserIcon className="w-4 h-4 text-slate-500"/> Info Profil</a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md"><Lock className="w-4 h-4 text-slate-500"/> Ganti Password</a>
                     </div>
                     <div className="p-2 border-t border-slate-100">
                        <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md"><LogOut className="w-4 h-4"/> Keluar</button>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-screen-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Dashboard Section */}
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full bg-${roleConfig.color}-100 text-${roleConfig.color}-600`}>
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Dashboard: {currentUser.nama_lengkap}</h2>
                        <p className="text-slate-600 text-sm">Role: {roleConfig.label}</p>
                    </div>
                </div>
                {exportAccessRoles.includes(currentUser.peran) && (
                   <button 
                     onClick={handleExportCSV}
                     className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                   >
                     <FileSpreadsheet className="w-4 h-4" />
                     Ekspor Laporan CSV
                   </button>
                )}
            </div>
            
            {/* Live Schema Monitor (Khusus Admin & Pengawas Admin) */}
            {(currentUser.peran === 'admin' || currentUser.peran === 'pengawas_admin') && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="p-4 border-b">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Database className="w-4 h-4 text-blue-600" /> Live Schema Monitor</h3>
                  </div>
                  <div className="p-2">
                      <table className="w-full text-sm">
                           <tbody>
                              {tableStats.tables.map((table) => (
                                  <tr key={table.name} className={`transition-colors`}>
                                      <td className="px-3 py-2.5 font-mono text-xs">{table.name}</td>
                                      <td className="px-3 py-2.5 text-right font-mono">{table.count.toLocaleString()}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
            )}

            {/* Damage Report Chart - UNTUK PENANGGUNG JAWAB, ADMIN, & PENGAWAS (View Only) */}
            {chartAccessRoles.includes(currentUser.peran) && (
                <DamageReportChart 
                    reports={filteredReportsForChart} 
                    onProcessAction={handleTriggerChatAction} 
                    isReadOnly={isReadOnly}
                />
            )}
            
            {/* Pending Ticket Table - UNTUK PJ, ADMIN (Execute) & PENGAWAS IT/SARPRAS (View Only) */}
            {ticketAccessRoles.includes(currentUser.peran) && (
                <PendingTicketTable 
                    reports={filteredReportsForChart}
                    onProcessAction={handleTriggerChatAction}
                    isReadOnly={isReadOnly}
                />
            )}

            {/* My Status Dashboard - Available for ALL users to track their own items */}
            <MyStatusDashboard
                currentUser={currentUser}
                reports={reports}
                bookings={bookings}
            />
        </div>

        {/* AI Assistant Section */}
        <div className="w-full">
            <ChatInterface 
                user={currentUser} 
                roleConfig={roleConfig} 
                onDataSaved={handleDataSaved} 
                stats={reports.filter(r => r.status === 'Pending').length}
                isOpen={isChatOpen}
                onToggle={handleToggleChat}
                externalMessage={externalMessage}
                onClearExternalMessage={() => setExternalMessage(null)}
            />
        </div>

      </main>

      {showSavedNotification && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-lg shadow-2xl animate-fade-in-up z-50">
            <p className="text-sm font-bold">Database Updated</p>
        </div>
      )}
    </div>
  );
};

export default App;
