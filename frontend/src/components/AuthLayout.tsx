import type { ReactNode } from 'react'
import { CalendarCheck, HeartPulse, ShieldCheck } from 'lucide-react'

// Optional: put a photo at frontend/public/auth-bg.jpg and set this to '/auth-bg.jpg'
const AUTH_IMAGE = ''

const POINTS = [
  { icon: CalendarCheck, text: 'Book free slots in seconds' },
  { icon: ShieldCheck, text: 'Every slot can be booked by only one patient' },
  { icon: HeartPulse, text: 'Doctors across 7 cities and 10 specialties' },
]

type Props = { title: string; subtitle: string; children: ReactNode }

export default function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <main className="relative isolate overflow-hidden bg-linear-to-br from-teal-800 via-teal-700 to-cyan-600">
      {AUTH_IMAGE && (
        <img
          src={AUTH_IMAGE}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20 mix-blend-overlay"
        />
      )}
      <div aria-hidden="true" className="pattern-plus absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-16 -z-10 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="mx-auto grid min-h-[34rem] max-w-5xl items-center gap-10 px-4 py-12 md:grid-cols-2">
        <div className="hidden text-white md:block">
          <h2 className="text-3xl font-bold tracking-tight">Your health, scheduled.</h2>
          <p className="mt-3 text-teal-50">Find the right doctor and book a time that suits you.</p>
          <ul className="mt-6 space-y-3">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                  <p.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  )
}