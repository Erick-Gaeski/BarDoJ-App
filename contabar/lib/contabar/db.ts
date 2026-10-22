import { createClient } from '@supabase/supabase-js'

// Supabase client (URL+anon key from env). Called from the app initialization.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage, // use localStorage via browser for auth session
  },
})

// Type‑safe wrappers around tables. All use current user auth and bar id via RLS.
// Example: fetch orders
export async function fetchOrders(barId: string) {
  const { data, error } = await supabase.from('orders').select('*').eq('bar_id', barId)
  if (error) throw error
  return data
}

export async function insertOrder(order: Partial<any>) {
  const { data, error } = await supabase.from('orders').insert(order).select()
  if (error) throw error
  return data
}

export async function updateOrder(id: string, changes: Partial<any>) {
  const { data, error } = await supabase.from('orders').update(changes).eq('id', id)
  if (error) throw error
  return data
}

// ... similar for other tables (products, customers, etc.)
