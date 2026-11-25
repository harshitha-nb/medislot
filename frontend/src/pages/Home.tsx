import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Meta } from '../api'

export default function Home() {
  const [meta, setMeta] = useState<Meta | null>(null)

  useEffect(() => {
    api<Meta>('/meta').then(setMeta).catch(() => setMeta(null))
  }, [])

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">
        Book a doctor in a few clicks
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">
        Search by specialty and city, pick a free time slot, and confirm. Slots can never be
        double-booked.
      </p>
      <Link
        to="/doctors"
        className="mt-6 inline-block rounded-md bg-teal-700 px-5 py-3 font-medium text-white hover:bg-teal-800"
      >
        Find a doctor
      </Link>

      {meta && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-800">Browse by specialty</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {meta.specialties.map((s) => (
              <li key={s}>
                <Link
                  to={`/doctors?specialty=${encodeURIComponent(s)}`}
                  className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800 hover:bg-teal-100"
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
