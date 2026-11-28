import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import type { Booking, DoctorDetail as DoctorInfo, Slot, SlotList } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatDay, formatTime, initials, istDate, rupees } from '../lib/format'
import SpecialtyIcon from '../components/SpecialtyIcon'
import { specialtyStyle } from '../lib/specialties'

type DoctorResult = { id: string; doctor?: DoctorInfo; error?: string }
type SlotResult = { key: string; slots?: Slot[]; error?: string }
type Notice = { kind: 'success' | 'error'; text: string }

export default function DoctorDetail() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const location = useLocation()

  const [days] = useState<string[]>(() => Array.from({ length: 7 }, (_, i) => istDate(i)))
  const [date, setDate] = useState<string>(days[0])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [reloadCount, setReloadCount] = useState(0)
  const [booking, setBooking] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [doctorResult, setDoctorResult] = useState<DoctorResult | null>(null)
  const [slotResult, setSlotResult] = useState<SlotResult | null>(null)

  const slotKey = `${id}|${date}|${reloadCount}`

  useEffect(() => {
    const controller = new AbortController()
    api<DoctorInfo>(`/doctors/${id}`, { signal: controller.signal })
      .then((doctor) => setDoctorResult({ id, doctor }))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setDoctorResult({ id, error: err.message })
      })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    api<SlotList>(`/doctors/${id}/slots?date=${date}`, { signal: controller.signal })
      .then((data) => {
        const now = Date.now()
        // hide slots that have already started
        const upcoming = data.slots.filter((s) => new Date(s.start_time).getTime() > now)
        setSlotResult({ key: slotKey, slots: upcoming })
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setSlotResult({ key: slotKey, error: err.message })
      })
    return () => controller.abort()
  }, [id, date, slotKey])

  const doctorLoading = doctorResult?.id !== id
  const doctor = doctorLoading ? undefined : doctorResult?.doctor
  const doctorError = doctorLoading ? undefined : doctorResult?.error
  const slotsLoading = slotResult?.key !== slotKey
  const slots = slotsLoading ? undefined : slotResult?.slots
  const slotsError = slotsLoading ? undefined : slotResult?.error

  function chooseDate(d: string) {
    setDate(d)
    setSelected(null)
    setNotice(null)
  }

  async function confirm() {
    if (!selected) return
    setBooking(true)
    setNotice(null)
    try {
      await api<Booking>('/appointments', { method: 'POST', body: { slotId: selected.id } })
      setNotice({
        kind: 'success',
        text: `Booked for ${formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' })} at ${formatTime(selected.start_time)}.`,
      })
    } catch (err) {
      let text = err instanceof Error ? err.message : 'Something went wrong'
      if (err instanceof ApiError) {
        if (err.status === 409) text = 'Sorry, someone just booked that slot. Please pick another time.'
        else if (err.status === 404) text = 'That slot is no longer available. Please pick another time.'
        else if (err.status === 401) text = 'Your session has expired. Please log in again.'
      }
      setNotice({ kind: 'error', text })
    } finally {
      setSelected(null)
      setBooking(false)
      setReloadCount((n) => n + 1) // reload the slots so the list is accurate
    }
  }

  if (doctorLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
      </main>
    )
  }

  if (doctorError || !doctor) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p>Could not load this doctor: {doctorError ?? 'Not found'}</p>
          <Link to="/doctors" className="mt-2 inline-block font-medium underline">
            Back to all doctors
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/doctors" className="text-sm font-medium text-teal-700 hover:underline">
        ← All doctors
      </Link>

            <section className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm">
        <div className={`relative h-28 bg-linear-to-br ${specialtyStyle(doctor.specialty).gradient}`}>
          <div aria-hidden="true" className="pattern-plus absolute inset-0" />
          <SpecialtyIcon name={doctor.specialty} className="absolute right-5 top-5 h-16 w-16 text-white/80" />
        </div>
        <div className="px-6 pb-6">
          <div className="relative -mt-10 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-teal-100 text-2xl font-semibold text-teal-800">
            {initials(doctor.name)}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">{doctor.name}</h1>
          <p className="font-medium text-teal-700">{doctor.specialty}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Clinic</dt>
              <dd className="font-medium text-slate-900">{doctor.clinic}</dd>
              <dd className="text-slate-600">
                {doctor.address}, {doctor.city}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Experience</dt>
              <dd className="font-medium text-slate-900">{doctor.experience_years} years</dd>
            </div>
            <div>
              <dt className="text-slate-500">Consultation fee</dt>
              <dd className="font-medium text-slate-900">
                {rupees.format(Number(doctor.consultation_fee))}
              </dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Book an appointment</h2>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Choose a date">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => chooseDate(d)}
              aria-pressed={d === date}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                d === date
                  ? 'border-teal-700 bg-teal-700 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-teal-600'
              }`}
            >
              {formatDay(d, { weekday: 'short', day: 'numeric', month: 'short' })}
            </button>
          ))}
        </div>

        {notice && (
          <div
            role="status"
            className={`mt-4 rounded-md p-3 text-sm ${
              notice.kind === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {notice.text}
            {notice.kind === 'success' && user?.role === 'patient' && (
              <Link to="/appointments" className="ml-2 font-medium underline">
                View my appointments
              </Link>
            )}
          </div>
        )}

        <div className="mt-4" aria-live="polite">
          {slotsLoading && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-slate-200" />
              ))}
            </div>
          )}

          {slotsError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p>Could not load slots: {slotsError}</p>
              <button
                onClick={() => setReloadCount((n) => n + 1)}
                className="mt-2 rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
              >
                Try again
              </button>
            </div>
          )}

          {slots && slots.length === 0 && (
            <p className="rounded-md bg-slate-50 p-4 text-center text-sm text-slate-600">
              No free slots on this day. Try another date.
            </p>
          )}

          {slots && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelected(s)
                    setNotice(null)
                  }}
                  aria-pressed={selected?.id === s.id}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    selected?.id === s.id
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-teal-600'
                  }`}
                >
                  {formatTime(s.start_time)}
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="mt-6 rounded-md border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm text-slate-700">
              You selected{' '}
              <strong>
                {formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' })} at{' '}
                {formatTime(selected.start_time)}
              </strong>{' '}
              with {doctor.name}.
            </p>

            {!user && (
              <p className="mt-3 text-sm">
                <Link
                  to="/login"
                  state={{ from: location.pathname }}
                  className="font-medium text-teal-700 underline"
                >
                  Log in
                </Link>{' '}
                or{' '}
                <Link to="/register" className="font-medium text-teal-700 underline">
                  sign up
                </Link>{' '}
                to confirm this appointment.
              </p>
            )}

            {user && user.role !== 'patient' && (
              <p className="mt-3 text-sm text-slate-600">
                Only patient accounts can book appointments.
              </p>
            )}

            {user?.role === 'patient' && (
              <button
                onClick={confirm}
                disabled={booking}
                className="mt-3 rounded-md bg-teal-700 px-5 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {booking ? 'Booking…' : 'Confirm appointment'}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  )
}