import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Admin from './pages/Admin'
import Dashboard from './pages/Dashboard'
import DoctorDetail from './pages/DoctorDetail'
import Doctors from './pages/Doctors'
import Home from './pages/Home'
import Login from './pages/Login'
import MyAppointments from './pages/MyAppointments'
import NotFound from './pages/NotFound'
import Register from './pages/Register'

const TITLES: Record<string, string> = {
  '/login': 'Log in',
  '/register': 'Sign up',
  '/doctors': 'Find a doctor',
  '/appointments': 'My appointments',
  '/dashboard': 'Doctor dashboard',
  '/admin': 'Admin panel',
}

export default function App() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    const title =
      path === '/'
        ? ''
        : (TITLES[path] ?? (path.startsWith('/doctors/') ? 'Doctor' : 'Page not found'))
    document.title = title ? `${title} | MediSlot` : 'MediSlot - book doctor appointments'
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-teal-50 via-slate-50 to-slate-50 text-slate-900">
      <Navbar />
      <div key={location.pathname} className="flex-1 animate-fade-up">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctors/:id" element={<DoctorDetail />} />

          <Route element={<ProtectedRoute roles={['patient']} />}>
            <Route path="/appointments" element={<MyAppointments />} />
          </Route>
          <Route element={<ProtectedRoute roles={['doctor']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        <p className="font-medium text-slate-700">MediSlot</p>
        <p className="mt-1">
          A demo project. Please do not enter real personal or medical information.
        </p>
      </footer>
    </div>
  )
}