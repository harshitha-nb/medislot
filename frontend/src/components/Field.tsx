type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  minLength?: number
}

export default function Field({ label, value, onChange, type = 'text', autoComplete, minLength }: Props) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
      />
    </label>
  )
}
