import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <Link to="/" className="mt-3 inline-block font-medium text-teal-700 hover:underline">
        Go home
      </Link>
    </main>
  )
}