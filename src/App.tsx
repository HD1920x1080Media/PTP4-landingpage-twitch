import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SettingsBar from './components/SettingsBar'
import CookieBanner from './components/CookieBanner/CookieBanner'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import HomePage from './pages/HomePage'
import ImpressumPage from './pages/ImpressumPage'
import DatenschutzPage from './pages/DatenschutzPage'
import StreamplanPage from './pages/StreamplanPage'
import StreamelementsPage from './pages/StreamelementsPage'
import BartclickerPage from './pages/BartclickerPage'
import ActuatorPage from './pages/ActuatorPage'
import ClipVotingPage from './pages/ClipVotingPage'
import NotFoundPage from './pages/NotFoundPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <SettingsBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/datenschutz" element={<DatenschutzPage />} />
        <Route path="/streamplan" element={<StreamplanPage />} />
        <Route path="/streamelements" element={<StreamelementsPage />} />

        {/* ── Login zum Aufrufen nötig ── */}
        <Route path="/bartclicker" element={<ProtectedRoute><BartclickerPage /></ProtectedRoute>} />
        <Route path="/actuator/data" element={<ProtectedRoute><ActuatorPage /></ProtectedRoute>} />

        {/* ── Seite öffentlich, Voting braucht Login ── */}
        <Route path="/clipdesmonats" element={<ClipVotingPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <CookieBanner />
    </BrowserRouter>
  )
}

export default App
