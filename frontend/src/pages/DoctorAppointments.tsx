import { useEffect, useState } from 'react'
import { api } from '../api'
import type { PortalAppointment } from '../api'
import { dateOf, formatDay, formatTime } from '../lib/format'

type Result = { key: number; upcoming?: PortalAppointment[]; past?: PortalAppointment[]; error?: string }

function Row({ a, label }: { a: PortalAppointment; label: string }) {
  const cancelled = a.status === 'cancelled'
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="font-medium text-slate-900">{a.patient}</p>
        <p className="text-sm text-slate-600">
          {formatDay(dateOf(a.start_time), { weekday: 'short', day: 'numeric', month: 'short' })} at{' '}
          {formatTime(a.start_time)}
        </p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          cancelled ? 'bg-slate-100 text-slate-600' : label === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-teal-100 text-teal-800'
        }`}
      >
        {cancelled ? 'Cancelled' : label}
      </span>
    </li>
  )
}

export default function DoctorAppointments() {
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const loading = result?.key !== reload

  useEffect(() => {
    const controller = new AbortController()
    api<{ appointments: PortalAppointment[] }>('/portal/appointments', { signal: controller.signal })
      .then(({ appointments }) => {
        const now = Date.now()
        const isUpcoming = (a: PortalAppointment) =>
          a.status === 'confirmed' && new Date(a.start_time).getTime() > now
        setResult({
          key: reload,
          upcoming: appointments.filter(isUpcoming).reverse(), // soonest first
          past: appointments.filter((a) => !isUpcoming(a)),
        })
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setResult({ key: reload, error: err.message })
      })
    return () => controller.abort()
  }, [reload])

  const upcoming = loading ? undefined : result?.upcoming
  const past = loading ? undefined : result?.past
  const error = loading ? undefined : result?.error

  return (
    <div aria-live="polite">
      {loading && (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-16 animate-pulse rounded-lg bg-slate-200" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p>Could not load appointments: {error}</p>
          <button
            onClick={() => setReload((n) => n + 1)}
            className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {upcoming && past && (
        <>
          <h2 className="font-semibold text-slate-900">Upcoming ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <p className="mt-2 rounded-lg bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
              No upcoming appointments yet.
            </p>
          ) : (
            <ul className="mt-2 space-y-3">
              {upcoming.map((a) => (
                <Row key={a.id} a={a} label="Confirmed" />
              ))}
            </ul>
          )}

          <h2 className="mt-8 font-semibold text-slate-900">Past and cancelled ({past.length})</h2>
          {past.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing here yet.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {past.slice(0, 20).map((a) => (
                <Row key={a.id} a={a} label="Completed" />
              ))}
            </ul>
          )}
          {past.length > 20 && (
            <p className="mt-2 text-sm text-slate-500">Showing the 20 most recent.</p>
          )}
        </>
      )}
    </div>
  )
}