import { useEffect, useState } from 'react'

type Meta = { specialties: string[]; cities: string[] }

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/meta')
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        return res.json() as Promise<Meta>
      })
      .then(setMeta)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold text-teal-700">MediSlot</h1>
      <p className="mt-2 text-slate-600">Frontend connected to the API.</p>
      {error && <p className="mt-4 text-red-600">Could not reach the API: {error}</p>}
      {meta && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {meta.specialties.map((s) => (
            <li key={s} className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800">
              {s}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}