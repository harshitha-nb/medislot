import { Link } from 'react-router-dom'
import type { Doctor } from '../api'
import { initials, rupees } from '../lib/format'
import { specialtyStyle } from '../lib/specialties'
import SpecialtyIcon from './SpecialtyIcon'

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  const style = specialtyStyle(doctor.specialty)
  return (
    <Link
      to={`/doctors/${doctor.id}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-md"
    >
      <div className={`relative h-20 bg-linear-to-br ${style.gradient}`}>
        <div aria-hidden="true" className="pattern-plus absolute inset-0" />
        <SpecialtyIcon name={doctor.specialty} className="absolute right-3 top-3 h-12 w-12 text-white/80" />
        <span className="absolute left-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
          {doctor.specialty}
        </span>
      </div>
      <div className="px-4 pb-4">
        <div className="relative -mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-teal-100 text-lg font-semibold text-teal-800">
          {initials(doctor.name)}
        </div>
        <h3 className="mt-2 truncate font-semibold text-slate-900">{doctor.name}</h3>
        <p className="text-sm text-slate-600">
          {doctor.clinic}, {doctor.city}
        </p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-slate-600">{doctor.experience_years} yrs experience</span>
          <span className="font-semibold text-slate-900">
            {rupees.format(Number(doctor.consultation_fee))}
          </span>
        </div>
      </div>
    </Link>
  )
}