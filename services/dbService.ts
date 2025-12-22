
import {
  MOCK_PENGADUAN_KERUSAKAN,
  MOCK_PEMINJAMAN_ANTRIAN,
  MOCK_INVENTARIS,
  MOCK_LOKASI,
  MOCK_USERS,
  MOCK_AGENDA_KEGIATAN
} from '../constants';
import {
  PengaduanKerusakan,
  PeminjamanAntrian,
  Inventaris,
  Lokasi,
  Pengguna,
  TableName,
  AgendaKegiatan
} from '../types';

const DB_PREFIX = 'SIKILAT_DB_';

type TableMap = {
  pengaduan_kerusakan: PengaduanKerusakan;
  peminjaman_antrian: PeminjamanAntrian;
  inventaris: Inventaris;
  lokasi: Lokasi;
  pengguna: Pengguna;
  agenda_kegiatan: AgendaKegiatan;
};

const initialData = {
  pengaduan_kerusakan: MOCK_PENGADUAN_KERUSAKAN,
  peminjaman_antrian: MOCK_PEMINJAMAN_ANTRIAN,
  inventaris: MOCK_INVENTARIS,
  lokasi: MOCK_LOKASI,
  pengguna: Object.values(MOCK_USERS),
  agenda_kegiatan: MOCK_AGENDA_KEGIATAN
};

const db = {
  initialize: () => {
    (Object.keys(initialData) as Array<keyof typeof initialData>).forEach(tableName => {
      const key = `${DB_PREFIX}${tableName}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(initialData[tableName]));
      }
    });
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
  },

  // FITUR: Export untuk Couchbase Capella
  exportForCouchbase: () => {
    const allData: Record<string, any[]> = {};
    (Object.keys(initialData) as TableName[]).forEach(table => {
      allData[table] = db.getTable(table);
    });

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sikilat_couchbase_import_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // SIMULASI KONEKSI LIVE KE CLUSTER
  connectToCloud: (config: { endpoint: string; user: string; pass: string }) => {
      // Dalam aplikasi nyata, di sini akan memanggil SDK Couchbase
      // atau REST API Capella menggunakan kredensial yang dibuat user.
      console.log("Connecting to Couchbase Capella Cluster...", config.endpoint);
      localStorage.setItem('SIKILAT_CLOUD_CONFIG', JSON.stringify(config));
      return true;
  },

  getCloudConfig: () => {
      const config = localStorage.getItem('SIKILAT_CLOUD_CONFIG');
      return config ? JSON.parse(config) : null;
  }
};

db.initialize();
export default db;
