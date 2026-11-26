import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { PortalSlot } from '../api'
import { formatDay, formatTime, istDate } from '../lib/format'

type Result = { key: string; slots?: PortalSlot[]; error?: string }
type Notice = { kind: 'success' | 'error'; text: string }

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'

export default function DoctorSchedule() {
  const [date, setDate] = useState(istDate(1))
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('13:00')
  const [duration, setDuration] = useState('30')
  const [busy, setBusy] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  const key = `${date}|${reload}`
  const loading = result?.key !== key

  useEffect(() => {
    if (!date) return
    const controller = new AbortController()
    api<{ slots: PortalSlot[] }>(`/portal/slots?date=${date}`, { signal: controller.signal })
      .then((data) => setResult({ key, slots: data.slots }))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setResult({ key, error: err.message })
      })
    return () => controller.abort()
  }, [key, date])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setNotice(null)
    if (!date) {
      setNotice({ kind: 'error', text: 'Please choose a date.' })
      return
    }
    if (end <= start) {
      setNotice({ kind: 'error', text: 'The end time must be after the start time.' })
      return
    }
    setBusy(true)
    try {
      const res = await api<{ created: number }>('/portal/slots', {
        method: 'POST',
        body: { date, startTime: start, endTime: end, durationMinutes: Number(duration) },
      })
      setNotice({
        kind: 'success',
        text:
          res.created === 0
            ? 'No new slots were added. They may already exist, or those times are in the past.'
            : `Added ${res.created} slot${res.created === 1 ? '' : 's'}.`,
      })
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setBusy(false)
      setReload((n) => n + 1)
    }
  }

  async function remove(id: string) {
    setRemovingId(id)
    setNotice(null)
    try {
      await api(`/portal/slots/${id}`, { method: 'DELETE' })
      setNotice({ kind: 'success', text: 'Slot removed.' })
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setRemovingId(null)
      setReload((n) => n + 1)
    }
  }

  const slots = loading ? undefined : result?.slots
  const error = loading ? undefined : result?.error
  const bookedCount = slots?.filter((s) => s.booked).length ?? 0

  return (
    <div>
      <form onSubmit={onSubmit} className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Add slots</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          <label className="block sm:col-span-1">
            <span className="text-sm font-medium text-slate-700">Date</span>
            <input
              type="date"
              className={inputClass}
              value={date}
              min={istDate(0)}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">From</span>
            <input type="time" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Until</span>
            <input type="time" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Slot length</span>
            <select className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value)}>
              {[15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-md bg-teal-700 px-5 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? 'Adding…' : 'Add slots'}
        </button>
      </form>

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

      <section className="mt-6 rounded-lg bg-white p-4 shadow-sm" aria-live="polite">
        <h2 className="font-semibold text-slate-900">
          {date ? formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Slots'}
        </h2>

        {loading && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-slate-200" />
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>Could not load slots: {error}</p>
            <button
              onClick={() => setReload((n) => n + 1)}
              className="mt-2 rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {slots && slots.length === 0 && (
          <p className="mt-3 rounded-md bg-slate-50 p-4 text-center text-sm text-slate-600">
            No slots on this day yet. Use the form above to add some.
          </p>
        )}

        {slots && slots.length > 0 && (
          <>
            <p className="mt-1 text-sm text-slate-500">
              {slots.length} slot{slots.length === 1 ? '' : 's'}: {bookedCount} booked,{' '}
              {slots.length - bookedCount} free
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-md border p-2 text-center ${
                    s.booked ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-900">{formatTime(s.start_time)}</p>
                  {s.booked ? (
                    <p className="mt-1 text-xs font-medium text-amber-700">Booked</p>
                  ) : (
                    <button
                      onClick={() => remove(s.id)}
                      disabled={removingId === s.id}
                      className="mt-1 text-xs font-medium text-red-700 hover:underline disabled:opacity-60"
                    >
                      {removingId === s.id ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}