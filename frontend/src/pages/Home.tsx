import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarCheck, MapPin, Search, ShieldCheck, Stethoscope } from 'lucide-react'
import { api } from '../api'
import type { Meta } from '../api'
import SpecialtyIcon from '../components/SpecialtyIcon'
import { specialtyStyle } from '../lib/specialties'

// Optional: put a photo at frontend/public/hero.jpg and set this to '/hero.jpg'
const HERO_IMAGE = ''

const STEPS = [
  { icon: Search, title: 'Search', text: 'Filter doctors by specialty and city.' },
  { icon: CalendarCheck, title: 'Pick a time', text: 'See live free slots for the next 7 days and choose one.' },
  { icon: ShieldCheck, title: 'Confirm safely', text: 'Every slot can be booked by only one patient, even when many try at once.' },
]

const selectClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40'

export default function Home() {
  const navigate = useNavigate()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [specialty, setSpecialty] = useState('')
  const [city, setCity] = useState('')

  useEffect(() => {
    api<Meta>('/meta').then(setMeta).catch(() => setMeta(null))
  }, [])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const query = new URLSearchParams()
    if (specialty) query.set('specialty', specialty)
    if (city) query.set('city', city)
    const qs = query.toString()
    navigate(qs ? `/doctors?${qs}` : '/doctors')
  }

  return (
    <main>
      <section className="relative overflow-hidden bg-linear-to-br from-teal-800 via-teal-700 to-cyan-600 text-white">
        {HERO_IMAGE && (
          <img
            src={HERO_IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <h1 className="max-w-2xl animate-fade-up text-4xl font-bold tracking-tight sm:text-5xl">
            Book a doctor in a few clicks
          </h1>
          <p className="mt-4 max-w-xl text-lg text-teal-50">
            Search by specialty and city, pick a free time slot, and confirm. Your slot is
            guaranteed: it can never be double-booked.
          </p>

          <form
            onSubmit={onSearch}
            className="mt-8 grid gap-3 rounded-xl bg-white p-3 text-slate-900 shadow-xl sm:grid-cols-[1fr_1fr_auto]"
          >
            <label className="relative block">
              <span className="sr-only">Specialty</span>
              <Stethoscope className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
              <select className={`${selectClass} pl-10`} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                <option value="">All specialties</option>
                {meta?.specialties.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="relative block">
              <span className="sr-only">City</span>
              <MapPin className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
              <select className={`${selectClass} pl-10`} value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">All cities</option>
                {meta?.cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-md bg-teal-700 px-6 py-3 font-medium text-white hover:bg-teal-800"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <step.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                {i + 1}. {step.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

            {meta && meta.specialties.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-14">
          <h2 className="text-2xl font-bold text-slate-900">Browse by specialty</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {meta.specialties.map((s) => (
              <li key={s}>
                <Link
                  to={`/doctors?specialty=${encodeURIComponent(s)}`}
                  className="flex h-full flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-md"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br ${specialtyStyle(s).gradient} text-white`}
                  >
                    <SpecialtyIcon name={s} className="h-7 w-7" />
                  </span>
                  <span className="text-sm font-medium text-slate-800">{s}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-teal-700 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-10">
          <div>
            <h2 className="text-xl font-bold">Ready to book your appointment?</h2>
            <p className="text-teal-50">It takes less than a minute.</p>
          </div>
          <Link
            to="/doctors"
            className="rounded-md bg-white px-5 py-3 font-medium text-teal-800 hover:bg-teal-50"
          >
            Find a doctor
          </Link>
        </div>
      </section>
    </main>
  )
}