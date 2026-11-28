import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  minLength?: number
  min?: number
}

export default function Field({ label, value, onChange, type = 'text', autoComplete, minLength, min }: Props) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          className={`w-full rounded-md border border-slate-300 py-2 pl-3 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 ${
            isPassword ? 'pr-11' : 'pr-3'
          }`}
          type={isPassword && visible ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          min={min}
          required
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-3 text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  )
}