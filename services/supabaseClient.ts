
import { createClient } from '@supabase/supabase-js';

// Kredensial terbaru berdasarkan screenshot konfigurasi Supabase Anda
const supabaseUrl = 'https://olafeazxxrxitfxksxoy.supabase.co';
const supabaseAnonKey = 'sb_publishable_800CRl-N2Rdn8FlQHZI6-g_LUXh600v';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
