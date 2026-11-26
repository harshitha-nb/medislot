import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { MyAppointment } from '../api'
import { dateOf, formatDay, formatTime } from '../lib/format'

type Result = {
  key: number
  upcoming?: MyAppointment[]
  past?: MyAppointment[]
  error?: string
}
type Notice = { kind: 'success' | 'error'; text: string }
type Tab = 'upcoming' | 'past'

export default function MyAppointments() {
  const [tab, setTab] = useState<Tab>('upcoming')
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loading = result?.key !== reload

  useEffect(() => {
    const controller = new AbortController()
    api<{ appointments: MyAppointment[] }>('/appointments/mine', { signal: controller.signal })
      .then(({ appointments }) => {
        const now = Date.now()
        const isUpcoming = (a: MyAppointment) =>
          a.status === 'confirmed' && new Date(a.start_time).getTime() > now
        setResult({
          key: reload,
          // the API sends newest first, so upcoming is reversed to show the soonest first
          upcoming: appointments.filter(isUpcoming).reverse(),
          past: appointments.filter((a) => !isUpcoming(a)),
        })
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setResult({ key: reload, error: err.message })
      })
    return () => controller.abort()
  }, [reload])

  async function cancel(id: string) {
    setCancellingId(id)
    setNotice(null)
    try {
      await api(`/appointments/${id}`, { method: 'DELETE' })
      setNotice({ kind: 'success', text: 'Your appointment was cancelled.' })
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setCancellingId(null)
      setConfirmingId(null)
      setReload((n) => n + 1)
    }
  }

  const upcoming = loading ? undefined : result?.upcoming
  const past = loading ? undefined : result?.past
  const error = loading ? undefined : result?.error
  const list = tab === 'upcoming' ? upcoming : past

  const tabClass = (active: boolean) =>
    `rounded-md px-4 py-2 text-sm font-medium ${
      active ? 'bg-teal-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
    }`

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">My appointments</h1>

      <div className="mt-4 flex gap-2" role="group" aria-label="Appointment type">
        <button onClick={() => setTab('upcoming')} aria-pressed={tab === 'upcoming'} className={tabClass(tab === 'upcoming')}>
          Upcoming{upcoming ? ` (${upcoming.length})` : ''}
        </button>
        <button onClick={() => setTab('past')} aria-pressed={tab === 'past'} className={tabClass(tab === 'past')}>
          Past and cancelled{past ? ` (${past.length})` : ''}
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className={`mt-4 rounded-md p-3 text-sm ${
            notice.kind === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      <section className="mt-4 space-y-3" aria-live="polite">
        {loading && (
          <>
            <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p>Could not load your appointments: {error}</p>
            <button
              onClick={() => setReload((n) => n + 1)}
              className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {list && list.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="font-medium text-slate-800">
              {tab === 'upcoming' ? 'You have no upcoming appointments.' : 'Nothing here yet.'}
            </p>
            {tab === 'upcoming' && (
              <Link to="/doctors" className="mt-3 inline-block font-medium text-teal-700 hover:underline">
                Find a doctor
              </Link>
            )}
          </div>
        )}

        {list?.map((a) => {
          const isFuture = tab === 'upcoming'
          const statusText = a.status === 'cancelled' ? 'Cancelled' : isFuture ? 'Confirmed' : 'Completed'
          const statusClass =
            a.status === 'cancelled'
              ? 'bg-slate-100 text-slate-600'
              : isFuture
                ? 'bg-green-100 text-green-800'
                : 'bg-teal-100 text-teal-800'
          return (
            <article key={a.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{a.doctor}</h2>
                  <p className="text-sm text-teal-700">{a.specialty}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
                  {statusText}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">
                {formatDay(dateOf(a.start_time), { weekday: 'long', day: 'numeric', month: 'long' })} at{' '}
                {formatTime(a.start_time)}
              </p>
              <p className="text-sm text-slate-500">
                {a.clinic}, {a.city}
              </p>

              {isFuture && (
                <div className="mt-3">
                  {confirmingId === a.id ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-slate-700">Cancel this appointment?</span>
                      <button
                        onClick={() => cancel(a.id)}
                        disabled={cancellingId === a.id}
                        className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {cancellingId === a.id ? 'Cancelling…' : 'Yes, cancel'}
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={cancellingId === a.id}
                        className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(a.id)}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Cancel appointment
                    </button>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </section>
    </main>
  )
}