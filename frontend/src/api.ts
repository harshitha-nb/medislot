const TOKEN_KEY = 'medislot_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export type Role = 'patient' | 'doctor' | 'admin'

// Note: the database's BIGINT ids arrive from the API as strings.
export type User = { id: string; name: string; email: string; role: Role }

export type Meta = { specialties: string[]; cities: string[] }
export type Doctor = {
  id: string
  name: string
  specialty: string
  clinic: string
  city: string
  experience_years: number
  consultation_fee: string // money arrives from the database as text, e.g. "500.00"
}

export type DoctorList = {
  page: number
  limit: number
  count: number
  hasMore: boolean
  doctors: Doctor[]
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal }

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

    const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`
    throw new ApiError(res.status, message)
  }
  return data as T
}