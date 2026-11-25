export default function ComingSoon({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">This page is coming in the next step.</p>
    </main>
  )
}