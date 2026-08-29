const GLYPHS = {
  tomato: { glyph: '◉', bg: '#e97f63', fg: '#5c2416' },
  pepper: { glyph: '✦', bg: '#e97f63', fg: '#5c2416' },
  maize: { glyph: '▰', bg: '#eab65e', fg: '#6b4a12' },
  plantain: { glyph: '▮', bg: '#c6dc58', fg: '#374d09' },
  yam: { glyph: '⬤', bg: '#d9c9a8', fg: '#7a5d2e' },
  cassava: { glyph: '▯', bg: '#d9c9a8', fg: '#7a5d2e' },
  mango: { glyph: '●', bg: '#eab65e', fg: '#7a5212' },
  banana: { glyph: '▬', bg: '#eab65e', fg: '#6b4a12' },
  cocoa: { glyph: '◆', bg: '#b7a089', fg: '#5a4126' },
  onion: { glyph: '◍', bg: '#f1e3cd', fg: '#7a5d2e' },
  cabbage: { glyph: '◉', bg: '#c6dc58', fg: '#374d09' },
}

function cropGlyph(cropType) {
  const c = String(cropType || '').toLowerCase()
  for (const key of Object.keys(GLYPHS)) {
    if (c.includes(key)) return GLYPHS[key]
  }
  return { glyph: '🌿', bg: '#e8f0c5', fg: '#124636' }
}

export default function CropGlyph({ cropType, size = 'h-[58px] w-[58px] text-[25px]', className = '' }) {
  const { glyph, bg, fg } = cropGlyph(cropType)
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[13px] font-sans font-bold ${size} ${className}`}
      style={{ background: bg, color: fg }}
      aria-hidden="true"
    >
      {glyph}
    </span>
  )
}
