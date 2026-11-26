import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import ComingSoon from './pages/ComingSoon'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import Doctors from './pages/Doctors'
import DoctorDetail from './pages/DoctorDetail'
import MyAppointments from './pages/MyAppointments'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <div className="flex-1">
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
            <Route path="/dashboard" element={<ComingSoon title="Doctor dashboard" />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<ComingSoon title="Admin panel" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-sm text-slate-500">
        MediSlot is a demo project. Please do not enter real personal or medical information.
      </footer>
    </div>
  )
}