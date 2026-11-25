import { Link } from 'react-router-dom'
import type { Doctor } from '../api'

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, '').split(' ').filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <Link
      to={`/doctors/${doctor.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-600 hover:shadow"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-800">
          {initials(doctor.name)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{doctor.name}</h3>
          <p className="text-sm text-teal-700">{doctor.specialty}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        {doctor.clinic}, {doctor.city}
      </p>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-600">{doctor.experience_years} yrs experience</span>
        <span className="font-semibold text-slate-900">
          {rupees.format(Number(doctor.consultation_fee))}
        </span>
      </div>
    </Link>
  )
}