import { useRef, useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import './ProfileButton.css'

export default function ProfileButton() {
  const { user, session, signInWithTwitch, signOut, loading } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Schließe Menu wenn außerhalb geklickt wird
  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setShowMenu(false)
    }
  }

  useEffect(() => {
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  if (loading) {
    return (
      <div className="profile-button">
        <button className="profile-btn" disabled>
          ⏳
        </button>
      </div>
    )
  }

  // Benutzer ist abgemeldet
  if (!user || !session) {
    return (
      <div className="profile-button">
        <button 
          className="profile-btn login-btn" 
          onClick={signInWithTwitch}
          title="Mit Twitch anmelden"
        >
          👤 Login
        </button>
      </div>
    )
  }

  // Benutzer ist angemeldet
  const twitchProfilePicture = user.user_metadata?.avatar_url
  const twitchUsername = user.user_metadata?.user_login || user.user_metadata?.full_name || user.email || 'User'

  return (
    <div className="profile-button" ref={menuRef}>
      <button 
        className="profile-btn logged-in"
        onClick={() => setShowMenu(!showMenu)}
        title={twitchUsername}
      >
        {twitchProfilePicture ? (
          <img src={twitchProfilePicture} alt={twitchUsername} className="profile-avatar" />
        ) : (
          <span>👤</span>
        )}
        <span className="profile-name">{twitchUsername}</span>
      </button>

      {showMenu && (
        <div className="profile-menu">
          <button className="menu-item logout-btn" onClick={() => {
            signOut()
            setShowMenu(false)
          }}>
            Logout
          </button>
        </div>
      )}
    </div>
  )
}


