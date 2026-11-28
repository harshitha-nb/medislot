export type SpecialtyStyle = {
  gradient: string // Tailwind gradient colours, used after bg-linear-to-br
}

const STYLES: Record<string, SpecialtyStyle> = {
  Cardiology: { gradient: 'from-rose-500 to-red-600' },
  Dermatology: { gradient: 'from-amber-400 to-orange-500' },
  Pediatrics: { gradient: 'from-sky-400 to-blue-500' },
  Orthopedics: { gradient: 'from-slate-500 to-slate-700' },
  Gynecology: { gradient: 'from-pink-400 to-fuchsia-500' },
  Neurology: { gradient: 'from-violet-500 to-purple-600' },
  ENT: { gradient: 'from-emerald-400 to-green-600' },
  Psychiatry: { gradient: 'from-indigo-400 to-indigo-600' },
  'General Physician': { gradient: 'from-teal-500 to-cyan-600' },
  Dentistry: { gradient: 'from-cyan-400 to-sky-500' },
}

const FALLBACK: SpecialtyStyle = { gradient: 'from-teal-500 to-cyan-600' }

// A specialty that has no entry (for example one the admin adds later) gets the default teal
export function specialtyStyle(name: string): SpecialtyStyle {
  return STYLES[name] ?? FALLBACK
}