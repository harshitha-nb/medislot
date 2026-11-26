import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import DoctorAppointments from './DoctorAppointments'
import DoctorSchedule from './DoctorSchedule'

type Tab = 'schedule' | 'appointments'

export default function Dashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('schedule')

  const tabClass = (active: boolean) =>
    `rounded-md px-4 py-2 text-sm font-medium ${
      active ? 'bg-teal-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
    }`

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Doctor dashboard</h1>
      <p className="text-sm text-slate-500">Signed in as {user?.name}</p>

      <div className="mt-4 flex gap-2" role="group" aria-label="Dashboard sections">
        <button onClick={() => setTab('schedule')} aria-pressed={tab === 'schedule'} className={tabClass(tab === 'schedule')}>
          Schedule
        </button>
        <button onClick={() => setTab('appointments')} aria-pressed={tab === 'appointments'} className={tabClass(tab === 'appointments')}>
          Appointments
        </button>
      </div>

      <div className="mt-4">
        {tab === 'schedule' ? <DoctorSchedule /> : <DoctorAppointments />}
      </div>
    </main>
  )
}