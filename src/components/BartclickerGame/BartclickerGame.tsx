import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBartclickerGame } from '../../hooks/useBartclickerGame';
import { useBartclickerLeaderboard } from '../../hooks/useBartclickerLeaderboard';
import './BartclickerGame.css';

interface BartclickerGameProps {
  compact?: boolean;
}

export default function BartclickerGame({ compact = false }: BartclickerGameProps) {
  const { t } = useTranslation();
  const { gameState, isLoading, cps, handleClick, buyItem, buyMaxItems, activateBuff, performRebirth, buyAutobuyer, unlockRelic } =
    useBartclickerGame();
  const { entries: leaderboardEntries, isLoading: leaderboardLoading } = useBartclickerLeaderboard();

  const [activeTab, setActiveTab] = useState<'shop' | 'leaderboard' | 'stats'>('shop');
  const [shopTab, setShopTab] = useState<'passive' | 'click' | 'booster' | 'relics' | 'autobuyer'>('passive');
  const [clickPulse, setClickPulse] = useState(false);

  if (isLoading) {
    return (
      <div className="bartclicker-loading">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'b';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'm';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'k';
    return Math.floor(num).toString();
  };

  const handleBartClick = () => {
    handleClick();
    setClickPulse(true);
    setTimeout(() => setClickPulse(false), 300);
  };

  // Berechne Bart-Länge basierend auf Rebirth-Count
  const bartLength = Math.min(100, 50 + gameState.rebirth_count * 5);

  const passiveItems = gameState.shop_items.filter((item) => item.type === 'passive');
  const clickItems = gameState.shop_items.filter((item) => item.type === 'click');

  // Berechne Cost-Multiplikator basierend auf Rebirths
  const costMultiplier = Math.pow(1.1, gameState.rebirth_count);
  
  // Hilfsfunktion für skalierte Kosten
  const getScaledCost = (baseCost: number) => Math.floor(baseCost * costMultiplier);

  // Boosters (Temporary buffs)
  const BOOSTERS = [
    { id: 0, name: 'Turbo-Boost', icon: '⚡', effect: '2x CPS für 1 Min', baseCost: 1000 },
    { id: 1, name: 'Klick-Wahnsinn', icon: '💪', effect: '3x Klicks für 45s', baseCost: 1500 },
    { id: 2, name: 'Glücksbonus', icon: '🍀', effect: '+50% für 30s', baseCost: 2000 },
  ];

  // Relics (Permanent bonuses)
  const RELICS = [
    { id: 0, name: 'Antiker Kamm', icon: '🏺', effect: '+10% CPS', baseCost: 25000000 },
    { id: 1, name: 'Magisches Bartöl', icon: '🧪', effect: '+15% Klicks', baseCost: 50000000 },
    { id: 2, name: 'Goldener Bart', icon: '✨', effect: '+25% alles', baseCost: 100000000 },
    { id: 3, name: 'Zeitreisendes Bartöl', icon: '⏳', effect: '+50% Offline', baseCost: 200000000 },
  ];

  return (
    <div className={`bartclicker-game ${compact ? 'compact' : ''}`}>
      {/* Header Stats */}
      <div className="bartclicker-header">
        <div className="stat-box">
          <h2 className="stat-value">{formatNumber(gameState.energy)}</h2>
          <p className="stat-label">Barthaare</p>
        </div>

        <div className="stat-box">
          <h3 className="stat-cps">{formatNumber(cps)}/s</h3>
          <p className="stat-label">Pro Sekunde</p>
        </div>

        <div className="stat-box">
          <h3 className="stat-rebirth">Rebirth: {gameState.rebirth_count}</h3>
          <p className="stat-label">×{gameState.rebirth_multiplier.toFixed(0)}</p>
        </div>
      </div>

      {/* Main Click Area with Animated Bart */}
      <div className="click-area">
        <button
          className={`click-button ${clickPulse ? 'pulse' : ''}`}
          onClick={handleBartClick}
          disabled={isLoading}
          title={`+Barthaare`}
        >
          <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" className="beard-svg">
            {/* Hauptbart - wächst mit Rebirths */}
            <defs>
              <linearGradient id="beardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#2a1f15', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#3d2b1f', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#1a0f0a', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            
            {/* Oberteil des Barts */}
            <path
              d={`M 20 30 Q 50 35 80 30 Q 85 40 80 ${50 + bartLength * 0.15} Q 50 ${55 + bartLength * 0.15} 20 ${50 + bartLength * 0.15} Q 15 40 20 30 Z`}
              fill="url(#beardGrad)"
              style={{ transition: 'all 0.2s ease' }}
            />
            
            {/* Bart-Feinstruktur - einzelne Haare */}
            <g stroke="#2a1f15" strokeWidth="1.2" opacity="0.5" strokeLinecap="round">
              <path d={`M 30 35 Q 28 ${55 + bartLength * 0.1} 32 ${65 + bartLength * 0.12}`} />
              <path d={`M 45 32 Q 44 ${60 + bartLength * 0.12} 46 ${72 + bartLength * 0.15}`} />
              <path d={`M 50 30 Q 50 ${62 + bartLength * 0.15} 50 ${76 + bartLength * 0.18}`} />
              <path d={`M 55 32 Q 56 ${60 + bartLength * 0.12} 54 ${72 + bartLength * 0.15}`} />
              <path d={`M 70 35 Q 72 ${55 + bartLength * 0.1} 68 ${65 + bartLength * 0.12}`} />
            </g>
            
            {/* Ganz unten - wirkt lockig/buschig */}
            <ellipse
              cx="50"
              cy={`${75 + bartLength * 0.18}`}
              rx={`${25 + bartLength * 0.05}`}
              ry={`${10 + bartLength * 0.08}`}
              fill="#2a1f15"
              opacity="0.7"
            />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          🛒 Shop
        </button>
        <button
          className={`tab-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
        <button
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Stats
        </button>
      </div>

      {/* Shop Tab with Sub-Tabs */}
      {activeTab === 'shop' && (
        <div className="shop-content">
          <div className="shop-subtabs">
            <button
              className={`shop-subtab ${shopTab === 'passive' ? 'active' : ''}`}
              onClick={() => setShopTab('passive')}
            >
              💧 Passive
            </button>
            <button
              className={`shop-subtab ${shopTab === 'click' ? 'active' : ''}`}
              onClick={() => setShopTab('click')}
            >
              💪 Click
            </button>
            <button
              className={`shop-subtab ${shopTab === 'booster' ? 'active' : ''}`}
              onClick={() => setShopTab('booster')}
            >
              ⚡ Booster
            </button>
            <button
              className={`shop-subtab ${shopTab === 'relics' ? 'active' : ''}`}
              onClick={() => setShopTab('relics')}
            >
              💎 Relics
            </button>
            <button
              className={`shop-subtab ${shopTab === 'autobuyer' ? 'active' : ''}`}
              onClick={() => setShopTab('autobuyer')}
            >
              🤖 Auto
            </button>
          </div>

          {shopTab === 'passive' && (
            <div className="item-list">
              {passiveItems.map((item) => {
                const scaledCost = getScaledCost(item.cost / costMultiplier);
                return (
                  <div key={item.id} className="shop-item">
                    <div className="item-header">
                      <span className="item-icon">{item.icon}</span>
                      <div className="item-info">
                        <h4>{item.name}</h4>
                        <p className="item-cps">{item.cps?.toFixed(1)}/s</p>
                      </div>
                      <span className="item-count">×{item.count}</span>
                    </div>
                    <div className="button-group">
                      <button
                        className="buy-button"
                        onClick={() => buyItem(item.id)}
                        disabled={gameState.energy < scaledCost}
                        title={`Kosten: ${formatNumber(scaledCost)}`}
                      >
                        {formatNumber(scaledCost)}
                      </button>
                      <button
                        className="max-button"
                        onClick={() => buyMaxItems(item.id)}
                        disabled={gameState.energy < scaledCost}
                        title="Max kaufen"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {shopTab === 'click' && (
            <div className="item-list">
              {clickItems.map((item) => {
                const scaledCost = getScaledCost(item.cost / costMultiplier);
                return (
                  <div key={item.id} className="shop-item">
                    <div className="item-header">
                      <span className="item-icon">{item.icon}</span>
                      <div className="item-info">
                        <h4>{item.name}</h4>
                        <p className="item-power">+{item.clickPower}</p>
                      </div>
                      <span className="item-count">×{item.count}</span>
                    </div>
                    <div className="button-group">
                      <button
                        className="buy-button"
                        onClick={() => buyItem(item.id)}
                        disabled={gameState.energy < scaledCost}
                        title={`Kosten: ${formatNumber(scaledCost)}`}
                      >
                        {formatNumber(scaledCost)}
                      </button>
                      <button
                        className="max-button"
                        onClick={() => buyMaxItems(item.id)}
                        disabled={gameState.energy < scaledCost}
                        title="Max kaufen"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {gameState.total_ever >= 1000000 && (
            <div className="rebirth-section">
              <button className="rebirth-button" onClick={performRebirth}>
                🔄 Rebirth ({gameState.rebirth_count})
              </button>
              <p className="rebirth-info">
                Verdopple deinen Multiplikator (×{(gameState.rebirth_multiplier * 2).toFixed(0)}) und starte von vorne! Dein Bart wird länger!
              </p>
            </div>
          )}

          {shopTab === 'booster' && (
            <div className="booster-grid">
              {BOOSTERS.map((booster) => {
                const scaledCost = getScaledCost(booster.baseCost);
                return (
                  <div key={booster.id} className="booster-card">
                    <div className="booster-icon">{booster.icon}</div>
                    <h3>{booster.name}</h3>
                    <p className="booster-effect">{booster.effect}</p>
                    <button
                      className="buy-button"
                      onClick={() => activateBuff(booster.id)}
                      disabled={gameState.energy < scaledCost}
                    >
                      {formatNumber(scaledCost)}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {shopTab === 'relics' && (
            <div className="relics-grid">
              {RELICS.map((relic) => {
                const isUnlocked = gameState.relics.some((r) => r.id === relic.id);
                const scaledCost = getScaledCost(relic.baseCost);
                return (
                  <div key={relic.id} className={`relic-card ${isUnlocked ? 'unlocked' : ''}`}>
                    <div className="relic-icon">{relic.icon}</div>
                    <h3>{relic.name}</h3>
                    <p className="relic-effect">{relic.effect}</p>
                    {isUnlocked ? (
                      <div className="relic-unlocked">✅ Freigeschaltet</div>
                    ) : (
                      <button
                        className="buy-button"
                        onClick={() => unlockRelic(relic.id)}
                        disabled={gameState.energy < scaledCost}
                        title={`Kosten: ${formatNumber(scaledCost)}`}
                      >
                        {formatNumber(scaledCost)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {shopTab === 'autobuyer' && (
            <div className="autobuyer-content">
              <div className="autobuyer-card">
                <h3>🤖 Auto-Klicker</h3>
                <p>Kostet: 10 Rebirths</p>
                <p style={{ fontSize: '0.9rem', color: '#999' }}>Du hast: {gameState.rebirth_count} Rebirths</p>
                <button
                  className="buy-button"
                  onClick={() => buyAutobuyer()}
                  disabled={gameState.rebirth_count < 10}
                  style={{ marginTop: '10px' }}
                >
                  {gameState.auto_click_buyer_enabled ? '❌ Deaktivieren' : '✅ Aktivieren'}
                </button>
              </div>
              <div className="autobuyer-card">
                <h3>📈 Auto-Upgrade Käufer (Coming Soon)</h3>
                <p>Kostet: 15 Rebirths</p>
                <p style={{ fontSize: '0.9rem', color: '#999' }}>Automatische Kauf von Upgrades</p>
                <button
                  className="buy-button"
                  disabled
                  style={{ marginTop: '10px' }}
                >
                  Bald verfügbar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="leaderboard-content">
          <div className="leaderboard-header">
            <h3>🏆 Top Players</h3>
            <p className="leaderboard-subtitle">Best Bartclicker Players (All Time)</p>
          </div>
          <div className="leaderboard-list">
            <div className="leaderboard-item-header">
              <span className="rank-col">Rank</span>
              <span className="name-col">Player</span>
              <span className="score-col">Total Ever</span>
              <span className="rebirth-col">Rebirths</span>
            </div>
            {leaderboardLoading ? (
              <div className="leaderboard-placeholder">
                <p>📊 Leaderboard wird geladen...</p>
              </div>
            ) : leaderboardEntries.length === 0 ? (
              <div className="leaderboard-placeholder">
                <p>📊 Noch keine Spieler auf der Rangliste</p>
              </div>
            ) : (
              leaderboardEntries.map((entry) => (
                <div key={entry.user_id} className="leaderboard-item">
                  <span className="rank-col">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </span>
                  <span className="name-col">{entry.display_name}</span>
                  <span className="score-col">{formatNumber(entry.total_ever)}</span>
                  <span className="rebirth-col">×{entry.rebirth_count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="stats-content">
          <div className="stat-row">
            <label>Total Ever:</label>
            <span>{formatNumber(gameState.total_ever)}</span>
          </div>
          <div className="stat-row">
            <label>Current Energy:</label>
            <span>{formatNumber(gameState.energy)}</span>
          </div>
          <div className="stat-row">
            <label>CPS:</label>
            <span>{formatNumber(cps)}</span>
          </div>
          <div className="stat-row">
            <label>Active Buffs:</label>
            <span>{gameState.active_buffs.length}</span>
          </div>
          <div className="stat-row">
            <label>Relics Unlocked:</label>
            <span>{gameState.relics.length}</span>
          </div>
          <div className="stat-row">
            <label>Rebirth Multiplier:</label>
            <span>×{gameState.rebirth_multiplier.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}



