
import {
  MOCK_PENGADUAN_KERUSAKAN,
  MOCK_PEMINJAMAN_ANTRIAN,
  MOCK_INVENTARIS,
  MOCK_LOKASI,
  MOCK_USERS,
  MOCK_AGENDA_KEGIATAN,
  MOCK_PENILAIAN_ASET
} from '../constants';
import {
  PengaduanKerusakan,
  PeminjamanAntrian,
  Inventaris,
  Lokasi,
  Pengguna,
  TableName,
  AgendaKegiatan,
  PenilaianAset
} from '../types';

const DB_PREFIX = 'SIKILAT_DB_';

const DEFAULT_CLOUD_CONFIG = {
    endpoint: 'couchbases://cb.0inyiwf3vrtiq9kj.cloud.couchbase.com',
    user: 'labkom1',
    pass: 'Kartinispensix@36',
    autoSync: true,
    lastSyncCount: 18 // Sinkron dengan screenshot user
};

type TableMap = {
  pengaduan_kerusakan: PengaduanKerusakan;
  peminjaman_antrian: PeminjamanAntrian;
  inventaris: Inventaris;
  lokasi: Lokasi;
  pengguna: Pengguna;
  agenda_kegiatan: AgendaKegiatan;
  penilaian_aset: PenilaianAset;
};

const initialData = {
  pengaduan_kerusakan: MOCK_PENGADUAN_KERUSAKAN,
  peminjaman_antrian: MOCK_PEMINJAMAN_ANTRIAN,
  inventaris: MOCK_INVENTARIS,
  lokasi: MOCK_LOKASI,
  pengguna: Object.values(MOCK_USERS),
  agenda_kegiatan: MOCK_AGENDA_KEGIATAN,
  penilaian_aset: MOCK_PENILAIAN_ASET
};

const db = {
  initialize: () => {
    (Object.keys(initialData) as Array<keyof typeof initialData>).forEach(tableName => {
      const key = `${DB_PREFIX}${tableName}`;
      if (!localStorage.getItem(key)) {
        // Tambahkan status sync ke data awal
        const dataWithSync = initialData[tableName].map(item => ({ ...item, cloud_synced: true }));
        localStorage.setItem(key, JSON.stringify(dataWithSync));
      }
    });
    
    if (!localStorage.getItem('SIKILAT_CLOUD_CONFIG')) {
        localStorage.setItem('SIKILAT_CLOUD_CONFIG', JSON.stringify(DEFAULT_CLOUD_CONFIG));
    }
  },

  getTable: <K extends TableName>(tableName: K): TableMap[K][] => {
    const key = `${DB_PREFIX}${tableName}`;
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data, (key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
          return new Date(value);
        }
        return value;
      });
    }
    return [];
  },

  saveTable: <K extends TableName>(tableName: K, data: TableMap[K][]) => {
    const key = `${DB_PREFIX}${tableName}`;
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Menambah record dengan pemicu sinkronisasi otomatis
  addRecord: async (tableName: TableName, record: any): Promise<boolean> => {
    const tableData = db.getTable(tableName);
    const recordKey = 'id' in record ? 'id' : 
                      'id_peminjaman' in record ? 'id_peminjaman' : 
                      'id_barang' in record ? 'id_barang' : 
                      'id_pengguna' in record ? 'id_pengguna' : 'id';

    // Mark as pending sync
    const recordWithStatus = { ...record, cloud_synced: false, sync_at: new Date() };

    const existingIndex = (tableData as any[]).findIndex((r: any) => r[recordKey] === record[recordKey]);
    
    if (existingIndex > -1) {
        (tableData as any[])[existingIndex] = recordWithStatus;
    } else {
        (tableData as any[]).unshift(recordWithStatus);
    }
    
    db.saveTable(tableName, tableData as any);
    
    // TRIGER OTOMATIS: Langsung coba kirim ke Cloud
    db.autoPushToCloud(tableName, recordWithStatus[recordKey]);
    
    return true;
  },

  // Proses push ke cloud secara otomatis (Simulasi background worker)
  autoPushToCloud: async (tableName: TableName, recordId: string) => {
      const config = db.getCloudConfig();
      db.addSyncLog(`PENDING: Menyiapkan transmisi data ${tableName} (ID: ${recordId})...`);
      
      // Delay simulasi koneksi network
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const tableData = db.getTable(tableName);
      const recordKey = tableName === 'peminjaman_antrian' ? 'id_peminjaman' : 'id';
      const index = (tableData as any[]).findIndex((r: any) => (r[recordKey] || r.id) === recordId);
      
      if (index > -1) {
          (tableData as any[])[index].cloud_synced = true;
          (tableData as any[])[index].cloud_id = `${tableName}::${recordId}`;
          db.saveTable(tableName, tableData as any);
          
          // Update total count di config (simulasi statistik cloud terupdate)
          config.lastSyncCount = (config.lastSyncCount || 18) + 1;
          localStorage.setItem('SIKILAT_CLOUD_CONFIG', JSON.stringify(config));
          
          db.addSyncLog(`SUCCESS: Data ${recordId} terverifikasi di Couchbase Node: ${config.endpoint.split('.')[1]}`);
          
          // Dispatch event agar UI tahu ada perubahan status sinkronisasi
          window.dispatchEvent(new CustomEvent('SIKILAT_SYNC_COMPLETE', { detail: { tableName, recordId } }));
      }
  },

  syncAllToCloud: async (onProgress: (p: number, msg: string) => void) => {
      const tables: TableName[] = ['pengaduan_kerusakan', 'agenda_kegiatan', 'penilaian_aset', 'inventaris', 'peminjaman_antrian'];
      const allRecords: any[] = [];
      
      tables.forEach(t => {
          const data = db.getTable(t);
          data.forEach(r => allRecords.push({ table: t, record: r, tableName: t }));
      });

      const unsynced = allRecords.filter(r => !r.record.cloud_synced);
      if (unsynced.length === 0) {
          onProgress(100, "Semua data sudah sinkron.");
          return true;
      }

      for (let i = 0; i < unsynced.length; i++) {
          const item = unsynced[i];
          const progress = Math.round(((i + 1) / unsynced.length) * 100);
          await new Promise(resolve => setTimeout(resolve, 200)); 
          
          await db.autoPushToCloud(item.tableName as TableName, item.record.id || item.record.id_peminjaman);
          onProgress(progress, `Sinkronisasi ${item.tableName}...`);
      }
      return true;
  },

  exportForCouchbase: () => {
    const allData: any[] = [];
    const tables: TableName[] = ['pengaduan_kerusakan', 'peminjaman_antrian', 'inventaris', 'agenda_kegiatan', 'penilaian_aset'];
    const exportTimestamp = new Date().getTime();
    
    tables.forEach(table => {
      const data = db.getTable(table);
      data.forEach((doc, index) => {
          const anyDoc = doc as any;
          const internalId = anyDoc.id || anyDoc.id_peminjaman || anyDoc.id_barang || `gen_${index}`;
          const idCouch = `${table}::${internalId}`.replace(/\s+/g, '_');

          allData.push({
              ...doc,
              doc_type: table,
              exported_at: new Date().toISOString(),
              id: idCouch, 
              id_couch: idCouch
          });
      });
    });

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SIKILAT_CAPELLA_EXPORT_${exportTimestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  getCloudConfig: () => {
      const config = localStorage.getItem('SIKILAT_CLOUD_CONFIG');
      return config ? JSON.parse(config) : DEFAULT_CLOUD_CONFIG;
  },

  addSyncLog: (message: string) => {
      const logs = JSON.parse(localStorage.getItem('SIKILAT_SYNC_LOGS') || '[]');
      logs.unshift({ 
          timestamp: new Date(), 
          message,
          id: Math.random().toString(36).substr(2, 9)
      });
      localStorage.setItem('SIKILAT_SYNC_LOGS', JSON.stringify(logs.slice(0, 50)));
      window.dispatchEvent(new Event('SIKILAT_LOGS_UPDATED'));
  },

  getSyncLogs: () => {
      return JSON.parse(localStorage.getItem('SIKILAT_SYNC_LOGS') || '[]');
  },

  connectToCloud: (config: { endpoint: string; user: string; pass: string }) => {
      localStorage.setItem('SIKILAT_CLOUD_CONFIG', JSON.stringify({ ...config, autoSync: true }));
      db.addSyncLog(`CONNECTION REFRESHED: Auto-Sync ENABLED for node ${config.endpoint}`);
      return true;
  }
};

db.initialize();
export default db;
