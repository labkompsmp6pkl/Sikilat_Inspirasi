import {
  MOCK_PENGADUAN_KERUSAKAN,
  MOCK_PEMINJAMAN_ANTRIAN,
  MOCK_INVENTARIS,
  MOCK_LOKASI,
  MOCK_USERS
} from '../constants';
import {
  PengaduanKerusakan,
  PeminjamanAntrian,
  Inventaris,
  Lokasi,
  Pengguna,
  TableName
} from '../types';

const DB_PREFIX = 'SIKILAT_DB_';

// Fix: Define a mapped type to associate table names with their data types for better type inference.
type TableMap = {
  pengaduan_kerusakan: PengaduanKerusakan;
  peminjaman_antrian: PeminjamanAntrian;
  inventaris: Inventaris;
  lokasi: Lokasi;
  pengguna: Pengguna;
};

const initialData = {
  pengaduan_kerusakan: MOCK_PENGADUAN_KERUSAKAN,
  peminjaman_antrian: MOCK_PEMINJAMAN_ANTRIAN,
  inventaris: MOCK_INVENTARIS,
  lokasi: MOCK_LOKASI,
  pengguna: Object.values(MOCK_USERS),
};

const db = {
  initialize: () => {
    (Object.keys(initialData) as Array<keyof typeof initialData>).forEach(tableName => {
      const key = `${DB_PREFIX}${tableName}`;
      if (!localStorage.getItem(key)) {
        console.log(`Initializing table: ${tableName}`);
        localStorage.setItem(key, JSON.stringify(initialData[tableName]));
      }
    });
  },

  // Fix: Update getTable signature for strong typing based on tableName.
  // This will ensure functions calling getTable receive a correctly typed array, fixing downstream type errors.
  getTable: <K extends TableName>(tableName: K): TableMap[K][] => {
    const key = `${DB_PREFIX}${tableName}`;
    const data = localStorage.getItem(key);
    if (data) {
      // Dates are stored as strings, so we need to parse them back
      return JSON.parse(data, (key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
          return new Date(value);
        }
        return value;
      });
    }
    return [];
  },

  // Fix: Update saveTable signature for strong typing based on tableName.
  saveTable: <K extends TableName>(tableName: K, data: TableMap[K][]) => {
    const key = `${DB_PREFIX}${tableName}`;
    localStorage.setItem(key, JSON.stringify(data));
  },

  addRecord: (tableName: TableName, record: any) => {
    const tableData = db.getTable(tableName);
    
    const recordKey = 'id' in record 
        ? 'id' 
        : 'id_peminjaman' in record 
        ? 'id_peminjaman' 
        : 'id_barang' in record 
        ? 'id_barang' 
        : 'id_pengguna' in record 
        ? 'id_pengguna' 
        : null;

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
  }
};

// Initialize the database on first load
db.initialize();

export default db;
