import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SettingsBar from './components/SettingsBar'
import CookieBanner from './components/CookieBanner/CookieBanner'
import HomePage from './pages/HomePage'
import ImpressumPage from './pages/ImpressumPage'
import DatenschutzPage from './pages/DatenschutzPage'
import StreamplanPage from './pages/StreamplanPage'
import StreamelementsPage from './pages/StreamelementsPage'
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
      </Routes>
      <CookieBanner />
    </BrowserRouter>
  )
}

export default App
