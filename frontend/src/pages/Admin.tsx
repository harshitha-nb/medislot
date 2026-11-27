import { useEffect, useState } from 'react'
import { api } from '../api'
import type { AdminStats, Lookups } from '../api'
import AddClinic from '../admin/AddClinic'
import AddDoctor from '../admin/AddDoctor'
import AddSpecialty from '../admin/AddSpecialty'

type Data = { stats: AdminStats; lookups: Lookups }

const number = new Intl.NumberFormat('en-IN')

export default function Admin() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api<AdminStats>('/admin/stats', { signal: controller.signal }),
      api<Lookups>('/admin/lookups', { signal: controller.signal }),
    ])
      .then(([stats, lookups]) => {
        setData({ stats, lookups })
        setError('')
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => controller.abort()
  }, [reload])

  const refresh = () => setReload((n) => n + 1)

  const cards = data
    ? [
        { label: 'Doctors', value: data.stats.doctors },
        { label: 'Patients', value: data.stats.patients },
        { label: 'Clinics', value: data.stats.clinics },
        { label: 'Confirmed bookings', value: data.stats.confirmed_appointments },
        { label: 'Cancelled bookings', value: data.stats.cancelled_appointments },
      ]
    : []

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Admin panel</h1>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p>Could not load admin data: {error}</p>
          <button
            onClick={refresh}
            className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {!data && !error && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {data && (
        <>
          <section className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Statistics">
            {cards.map((c) => (
              <div key={c.label} className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-2xl font-bold text-teal-700">{number.format(c.value)}</p>
                <p className="text-sm text-slate-600">{c.label}</p>
              </div>
            ))}
          </section>

          <div className="mt-6 space-y-6">
            <AddSpecialty onChanged={refresh} />
            <AddClinic onChanged={refresh} />
            <AddDoctor lookups={data.lookups} onChanged={refresh} />
          </div>
        </>
      )}
    </main>
  )
}