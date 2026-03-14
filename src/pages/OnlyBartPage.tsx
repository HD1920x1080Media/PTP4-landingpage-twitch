import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './OnlyBartPage.css'

export default function OnlyBartPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/onlybart/posts'), 1000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="ob-splash-center">
      <img id="ob-logo" src="/img/logos/OnlyBart.png" alt="OnlyBart Logo" className="ob-splash-logo" />
    </div>
  )
}
