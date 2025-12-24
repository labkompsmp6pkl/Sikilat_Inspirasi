
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://olafeazxxrxitfxksxoy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sYWZlYXp4eHJ4aXRmeGtzeG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NDk2MzcsImV4cCI6MjA4MjEyNTYzN30.ZfHvTiVgvIp9eupCAh0ELtMAHtiMj9p7tGGSQS1uuJk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
