import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './CurrentGame.css'

// --- Typdefinitionen ---
interface GameInfo {
  gameId: string
  gameName: string
  boxArtUrl: string
  streamTitle: string
}

interface CurrentGameProps {
  isLive: boolean
}

export interface StoreLink {
  id: string
  labelKey: string
  url: string
  className: string
}

// --- Unterkomponente: Zeigt die Store-Buttons an ---
function CurrentGameStores({ gameName, t }: { gameName: string; t: (key: string) => string }) {
  // Wir ersetzen 'any' durch das korrekte StoreLink-Interface
  const [visibleStores, setVisibleStores] = useState<StoreLink[]>([])
  const [checkingStores, setCheckingStores] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchStores() {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        const res = await fetch(`${supabaseUrl}/functions/v1/check-stores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({ gameName })
        })

        if (!res.ok) throw new Error('API Fehler bei der Store-Abfrage')

        const data = await res.json()
        if (!cancelled) {
          setVisibleStores(data.visibleStores || [])
        }
      } catch (err) {
        console.error('[CurrentGameStores] Fehler beim Laden der Stores:', err)
      } finally {
        if (!cancelled) setCheckingStores(false)
      }
    }

    void fetchStores()

    return () => { cancelled = true }
  }, [gameName])

  if (checkingStores) return null

  // Hier ist der korrekte Return-Block für die Store-Buttons
  return (
      <div className="current-game__stores" aria-label={t('currentGame.storesLabel')}>
        {visibleStores.map((s) => (
            <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={s.className}
                aria-label={`${t(s.labelKey)} (${t('currentGame.opensInNewTab')})`}
            >
              {t(s.labelKey)}
            </a>
        ))}
      </div>
  )
}

// --- Hauptkomponente: Zeigt das Spiel und ruft die Store-Buttons auf ---
export default function CurrentGame({ isLive }: CurrentGameProps) {
  const { t } = useTranslation()
  const [game, setGame] = useState<GameInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isLive) return

    let cancelled = false

    async function fetchGame() {
      setLoading(true)
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        const headers = new Headers()
        headers.set('Content-Type', 'application/json')
        headers.set('apikey', supabaseAnonKey)
        headers.set('Authorization', `Bearer ${supabaseAnonKey}`)

        const res = await fetch(`${supabaseUrl}/functions/v1/twitch-game`, {
          method: 'POST',
          headers,
        })
        if (cancelled) return
        if (!res.ok) {
          setGame(null)
          return
        }
        const data = await res.json()
        if (!data?.isLive) {
          setGame(null)
        } else {
          setGame({
            gameId: data.gameId,
            gameName: data.gameName,
            boxArtUrl: data.boxArtUrl,
            streamTitle: data.streamTitle,
          })
        }
      } catch (err) {
        if (!cancelled) setGame(null)
        console.error('[CurrentGame] Fehler beim API-Call:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchGame()

    const interval = setInterval(() => void fetchGame(), 5 * 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isLive])

  if (!isLive || loading || !game || !game.gameName) return null

  // Hier ist der korrekte Return-Block für die Hauptanzeige
  return (
      <div className="current-game" aria-label={t('currentGame.label')}>
        {game.boxArtUrl && (
            <img
                className="current-game__art"
                src={game.boxArtUrl}
                alt={game.gameName}
                width={69}
                height={95}
                loading="lazy"
            />
        )}
        <div className="current-game__info">
          <div className="current-game__label">{t('currentGame.nowPlaying')}</div>
          <div className="current-game__name">{game.gameName}</div>
          {/* Hier rufen wir nun die reparierte Unterkomponente auf */}
          <CurrentGameStores key={game.gameId} gameName={game.gameName} t={t} />
        </div>
      </div>
  )
}