export type BillingType = 'invoice' | 'overtime'
export type EntryMethod = 'manual' | 'timer'

export interface Client {
  id: string
  name: string
  vat_number: string | null
  email: string | null
  created_at: string
}

export interface EventType {
  id: string
  name: string
  billing_type: BillingType
  hourly_rate: number | null
  color: string
  created_at: string
}

export interface Event {
  id: string
  title: string
  client_id: string | null
  event_type_id: string | null
  date: string
  notes: string | null
  is_invoiced: boolean
  created_at: string
  client?: Client | null
  event_type?: EventType | null
}

export interface TimeEntry {
  id: string
  event_id: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  entry_method: EntryMethod
  created_at: string
}

export interface OvertimeAdjustment {
  id: string
  hours: number
  reason: string | null
  date: string
  created_at: string
}
