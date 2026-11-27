import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import Field from '../components/Field'
import Notice from '../components/Notice'
import type { NoticeData } from '../components/Notice'

export default function AddSpecialty({ onChanged }: { onChanged: () => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<NoticeData | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      await api('/admin/specialties', { method: 'POST', body: { name } })
      setNotice({ kind: 'success', text: `Added the specialty "${name.trim()}".` })
      setName('')
      onChanged()
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-slate-900">Add a specialty</h2>
      <div className="mt-3">
        <Field label="Specialty name" value={name} onChange={setName} />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-md bg-teal-700 px-5 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {busy ? 'Adding…' : 'Add specialty'}
      </button>
      <Notice notice={notice} />
    </form>
  )
}