import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { Lookups } from '../api'
import Field from '../components/Field'
import Notice from '../components/Notice'
import type { NoticeData } from '../components/Notice'

const selectClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'

type Props = { lookups: Lookups; onChanged: () => void }

export default function AddDoctor({ lookups, onChanged }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [clinicId, setClinicId] = useState('')
  const [years, setYears] = useState('')
  const [fee, setFee] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<NoticeData | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      await api('/admin/doctors', {
        method: 'POST',
        body: {
          name,
          email,
          password,
          specialtyId: Number(specialtyId),
          clinicId: Number(clinicId),
          experienceYears: Number(years),
          consultationFee: Number(fee),
        },
      })
      setNotice({
        kind: 'success',
        text: `Added ${name.trim()}. They can now log in with ${email.trim().toLowerCase()}.`,
      })
      setName('')
      setEmail('')
      setPassword('')
      setYears('')
      setFee('')
      onChanged()
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-slate-900">Add a doctor</h2>
      <p className="text-sm text-slate-500">
        This also creates the doctor&apos;s login account. Share the password with them securely.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label="Full name (for example Dr. Asha Rao)" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="off" />
        <Field
          label="Temporary password (at least 8 characters)"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
        />
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Specialty</span>
          <select className={selectClass} value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)} required>
            <option value="">Choose a specialty</option>
            {lookups.specialties.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Clinic</span>
          <select className={selectClass} value={clinicId} onChange={(e) => setClinicId(e.target.value)} required>
            <option value="">Choose a clinic</option>
            {lookups.clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
            ))}
          </select>
        </label>
        <Field label="Years of experience" type="number" min={0} value={years} onChange={setYears} />
        <Field label="Consultation fee (₹)" type="number" min={0} value={fee} onChange={setFee} />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-md bg-teal-700 px-5 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {busy ? 'Adding…' : 'Add doctor'}
      </button>
      <Notice notice={notice} />
    </form>
  )
}