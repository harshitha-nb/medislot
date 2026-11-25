import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import type { DoctorList, Meta } from '../api'
import DoctorCard from '../components/DoctorCard'

const PAGE_SIZE = 9

type Result = { key: string; data?: DoctorList; error?: string }

const selectClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'

export default function Doctors() {
  const [params, setParams] = useSearchParams()
  const specialty = params.get('specialty') ?? ''
  const city = params.get('city') ?? ''
  const page = Math.max(parseInt(params.get('page') ?? '1', 10) || 1, 1)

  const [meta, setMeta] = useState<Meta | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  // Identifies "which request is this screen waiting for?"
  const key = `${specialty}|${city}|${page}|${reloadCount}`
  const loading = result?.key !== key

  useEffect(() => {
    api<Meta>('/meta').then(setMeta).catch(() => setMeta(null))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    if (specialty) query.set('specialty', specialty)
    if (city) query.set('city', city)

    api<DoctorList>(`/doctors?${query}`, { signal: controller.signal })
      .then((data) => setResult({ key, data }))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setResult({ key, error: err.message })
      })

    return () => controller.abort()
  }, [key, specialty, city, page])

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (value) next.set(name, value)
      else next.delete(name)
    }
    setParams(next)
  }

  const hasFilters = specialty !== '' || city !== ''
  const data = loading ? undefined : result?.data
  const error = loading ? undefined : result?.error

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Find a doctor</h1>

      <div className="mt-4 grid gap-4 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Specialty</span>
          <select
            className={selectClass}
            value={specialty}
            onChange={(e) => update({ specialty: e.target.value, page: '' })}
          >
            <option value="">All specialties</option>
            {meta?.specialties.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">City</span>
          <select
            className={selectClass}
            value={city}
            onChange={(e) => update({ city: e.target.value, page: '' })}
          >
            <option value="">All cities</option>
            {meta?.cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          {hasFilters && (
            <button
              onClick={() => update({ specialty: '', city: '', page: '' })}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <section className="mt-6" aria-live="polite">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-lg bg-slate-200" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p>Could not load doctors: {error}</p>
            <button
              onClick={() => setReloadCount((n) => n + 1)}
              className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {data && data.doctors.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="font-medium text-slate-800">
              {page > 1 ? 'No more doctors on this page.' : 'No doctors match these filters.'}
            </p>
            <p className="mt-1 text-sm text-slate-500">Try a different specialty or city.</p>
          </div>
        )}

        {data && data.doctors.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.doctors.map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
        )}

        {data && (page > 1 || data.hasMore) && (
          <div className="mt-6 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => update({ page: page - 1 === 1 ? '' : String(page - 1) })}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">Page {page}</span>
            <button
              disabled={!data.hasMore}
              onClick={() => update({ page: String(page + 1) })}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  )
}