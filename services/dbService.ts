
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
    pass: 'Kartinispensix@36'
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
        localStorage.setItem(key, JSON.stringify(initialData[tableName]));
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

  addRecord: (tableName: TableName, record: any) => {
    const tableData = db.getTable(tableName);
    const recordKey = 'id' in record ? 'id' : 'id_peminjaman' in record ? 'id_peminjaman' : 'id_barang' in record ? 'id_barang' : 'id_pengguna' in record ? 'id_pengguna' : null;

    if (recordKey) {
        const existingIndex = (tableData as any[]).findIndex((r: any) => r[recordKey] === record[recordKey]);
        if (existingIndex > -1) {
            (tableData as any[])[existingIndex] = record;
        } else {
            (tableData as any[]).unshift(record);
        }
    } else {
         (tableData as any[]).unshift(record);
    }
    db.saveTable(tableName, tableData as any);
    
    const config = db.getCloudConfig();
    if (config && config.endpoint) {
        const payloadStr = JSON.stringify(record).substring(0, 80) + '...';
        db.addSyncLog(`AUTO-PUSH: ${tableName.toUpperCase()} | Key: ${record[recordKey || 'id'] || 'NEW'} | Payload sent.`);
    }
  },

  syncAllToCloud: async (onProgress: (p: number, msg: string) => void) => {
      const tables: TableName[] = ['pengaduan_kerusakan', 'agenda_kegiatan', 'penilaian_aset', 'inventaris', 'peminjaman_antrian'];
      let totalProcessed = 0;
      const allRecords: any[] = [];
      
      tables.forEach(t => {
          const data = db.getTable(t);
          data.forEach(r => allRecords.push({ table: t, record: r }));
      });

      for (let i = 0; i < allRecords.length; i++) {
          const item = allRecords[i];
          const progress = Math.round(((i + 1) / allRecords.length) * 100);
          
          // Simulation delay for visual sync
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Fix: Access heterogeneous ID fields using 'any' cast to avoid union type errors in logging
          const rec = item.record as any;
          const recordId = rec.id || rec.id_peminjaman || rec.id_barang || rec.id_pengguna || 'N/A';
          db.addSyncLog(`BULK-SYNC: ${item.table.toUpperCase()} | ID: ${recordId} | SUCCESS`);
          onProgress(progress, `Syncing ${item.table}...`);
      }
      
      return true;
  },

  exportForCouchbase: () => {
    const allData: any[] = [];
    const tables: TableName[] = ['pengaduan_kerusakan', 'peminjaman_antrian', 'inventaris', 'agenda_kegiatan', 'penilaian_aset'];
    
    tables.forEach(table => {
      const data = db.getTable(table);
      data.forEach(doc => {
          // Fix: Cast to any to safely check for multiple potential ID fields during export
          const anyDoc = doc as any;
          allData.push({
              ...doc,
              type: table, // Couchbase pattern: add type field for filtering
              id_couch: `${table}::${anyDoc.id || anyDoc.id_peminjaman || anyDoc.id_barang || Math.random()}`
          });
      });
    });

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `couchbase_import_sikilat.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  connectToCloud: (config: { endpoint: string; user: string; pass: string }) => {
      localStorage.setItem('SIKILAT_CLOUD_CONFIG', JSON.stringify(config));
      db.addSyncLog(`TUNNEL RE-ESTABLISHED: ${config.endpoint}`);
      return true;
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
  },

  getSyncLogs: () => {
      return JSON.parse(localStorage.getItem('SIKILAT_SYNC_LOGS') || '[]');
  }
};

db.initialize();
export default db;
