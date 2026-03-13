interface BeardProps {
  bartLength: number;
  clickCount?: number;
}

export function BeardSVG({ bartLength, clickCount = 0 }: BeardProps) {
  // Bartgröße basierend auf Rebirths (bartLength von 50 bis 100)
  // Normalisiere bartLength auf eine Prozentquote (50-100 → 0-1)
  const bartGrowth = (bartLength - 50) / 50; // 0 bis 1
  
  // Dynamische Bart-Höhe: VIEL KÜRZER
  // - Basis: 20px
  // - Rebirths: +100px max (statt 250)
  // - Klicks: +50px max (statt 200)
  // - Total max: 170px (statt 470px)
  const rebirthHeight = bartGrowth * 100;
  const clickHeight = Math.min(50, clickCount * 0.3);
  const beardHeight = 20 + rebirthHeight + clickHeight;
  
  // viewBox Height - simplified für bessere Performance
  const viewBoxHeight = Math.min(450, 350 + beardHeight);

  return (
    <svg 
      id="avatar-svg" 
      viewBox={`0 0 200 ${viewBoxHeight * 2}`}
      xmlns="http://www.w3.org/2000/svg"
      className="beard-svg"
      style={{ 
        transition: 'all 0.2s ease'
      }}
    >
      {/* Kopf - mit Offset nach unten */}
      <rect x="40" y="64" width="120" height="100" rx="16" fill="#d4a373"/>

      {/* CAP (SNAPBACK) - mit Offset nach unten */}
      <g id="cap">
        {/* Schirm */}
        <rect x="30" y="68" width="140" height="14" rx="6" fill="#7C4DFF"/>
        {/* Amulett */}
        <path d="M40 68 L160 68 L160 48 Q 100 24 40 48 Z" fill="#7C4DFF"/>
        {/* Kleiner Knopf oben - höchster Punkt sitzt jetzt auf y=24 */}
        <circle cx="100" cy="24" r="6" fill="#5c38cc"/>
        {/* Rebirth Badge (hidden by default) */}
        <g id="rebirth-badge" style={{ display: 'none' }}>
          <circle cx="150" cy="48" r="16" fill="#FFD700" stroke="#FFA500" strokeWidth="3"/>
          <text x="150" y="56" fontSize="20" fontWeight="bold" fill="#000" textAnchor="middle" fontFamily="Arial">
            ♻
          </text>
        </g>
      </g>

      {/* Brille - mit Offset nach unten */}
      <g stroke="#111" strokeWidth="3" fill="none">
        <rect x="56" y="100" width="30" height="20" rx="4"/>
        <rect x="114" y="100" width="30" height="20" rx="4"/>
        <path d="M86 110 h28"/>
      </g>

      {/* Augen - mit Offset nach unten */}
      <circle cx="70" cy="110" r="3" fill="#000"/>
      <circle cx="130" cy="110" r="3" fill="#000"/>

      {/* DYNAMISCHER BART - WÄCHST NUR IN TIEFE */}
      <g 
        id="beard-group" 
        style={{ 
          transition: 'all 0.2s ease'
        }}
      >
        {/* Basis-Beard: 
            - Oben: M40 164 L160 164 (gerade Linie, gleich breit wie Gesicht)
            - Seiten: L160 dann L40 (gerade Linien nach unten)
            - Unten: gerundete Kurve (nur unten)
            - Überlagert Gesicht oben
        */}
        <path 
          id="beard-path" 
          d={`M40 164 L160 164 L160 ${164 + beardHeight * 2} Q 100 ${164 + beardHeight * 2 + 10} 40 ${164 + beardHeight * 2} Z`}
          fill="#3d2b1f"
          fillRule="evenodd"
          style={{ transition: 'all 0.2s ease' }}
        />

        {/* Haarstruktur: stroke-only Kopie des Pfades */}
        <path 
          id="beard-hair" 
          d={`M40 164 L160 164 L160 ${164 + beardHeight * 2} Q 100 ${164 + beardHeight * 2 + 10} 40 ${164 + beardHeight * 2} Z`}
          fill="none" 
          stroke="#22160f"
          strokeWidth="1.8" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeDasharray="4 8"
          opacity="0.85" 
          pointerEvents="none"
          style={{ transition: 'all 0.2s ease' }}
        />

        {/* Subtiler Outline für Tiefe */}
        <path 
          id="beard-outline" 
          d={`M40 164 L160 164 L160 ${164 + beardHeight * 2} Q 100 ${164 + beardHeight * 2 + 10} 40 ${164 + beardHeight * 2} Z`}
          fill="none" 
          stroke="#000"
          strokeWidth="1.2" 
          opacity="0.12" 
          pointerEvents="none"
          style={{ transition: 'all 0.2s ease' }}
        />
      </g>

      {/* Event decorations (hidden by default) */}
      <g id="beard-clover" style={{ display: 'none' }}>
        <text x="100" y="140" fontSize="24" fill="#00FF00" textAnchor="middle" fontFamily="Arial">🍀</text>
      </g>
    </svg>
  );
}

