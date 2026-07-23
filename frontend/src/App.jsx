import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }   from './context/AuthContext.jsx'
import ProtectedRoute     from './components/ProtectedRoute.jsx'
import Dashboard          from './pages/Dashboard.jsx'
import Login              from './pages/Login.jsx'
import Register           from './pages/Register.jsx'
import ExpenseList        from './pages/ExpenseList.jsx'
import Portfolio          from './pages/Portfolio.jsx'
import Forecast           from './pages/Forecast.jsx'
import FraudDetection from "./pages/FraudDetection.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route path="/"          element={<ProtectedRoute><Dashboard      /></ProtectedRoute>} />
          <Route path="/expenses"  element={<ProtectedRoute><ExpenseList    /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><Portfolio       /></ProtectedRoute>} />
          <Route path="/forecast"  element={<ProtectedRoute><Forecast        /></ProtectedRoute>} />
          <Route path="/fraud"     element={<ProtectedRoute><FraudDetection  /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}