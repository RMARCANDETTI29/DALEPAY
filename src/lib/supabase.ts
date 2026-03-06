import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zzimrfepvoqidwhkgtsk.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aW1yZmVwdm9xaWR3aGtndHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDI4MDIsImV4cCI6MjA1Mjk3ODgwMn0.XcbsoPPZEgaRoRCMLCHFMVhwCoGGe7rHXDmHmLFe2EE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
