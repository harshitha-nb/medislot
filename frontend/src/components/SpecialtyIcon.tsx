import {
  Baby,
  Bone,
  Brain,
  Ear,
  Flower2,
  HeartHandshake,
  HeartPulse,
  Smile,
  Sparkles,
  Stethoscope,
} from 'lucide-react'

type Props = { name: string; className?: string }

export default function SpecialtyIcon({ name, className }: Props) {
  switch (name) {
    case 'Cardiology':
      return <HeartPulse className={className} aria-hidden="true" />
    case 'Dermatology':
      return <Sparkles className={className} aria-hidden="true" />
    case 'Pediatrics':
      return <Baby className={className} aria-hidden="true" />
    case 'Orthopedics':
      return <Bone className={className} aria-hidden="true" />
    case 'Gynecology':
      return <Flower2 className={className} aria-hidden="true" />
    case 'Neurology':
      return <Brain className={className} aria-hidden="true" />
    case 'ENT':
      return <Ear className={className} aria-hidden="true" />
    case 'Psychiatry':
      return <HeartHandshake className={className} aria-hidden="true" />
    case 'Dentistry':
      return <Smile className={className} aria-hidden="true" />
    default:
      return <Stethoscope className={className} aria-hidden="true" />
  }
}