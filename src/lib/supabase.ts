import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zzimrfepvoqidwhkgtsk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aW1yZmVwdm9xaWR3aGtndHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTAwOTcsImV4cCI6MjA4NDMyNjA5N30.rK5UpI4W95gz_QbX3sbxiqqj2dyNXsW-ylZpNCqr81Q'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
