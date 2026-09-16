// Per-crop storefront art (emoji + gradient). Used for product tiles when a
// listing has no uploaded photo. Kept in lib/ (not components/) because it is a
// plain data/helper module, not a component (avoids fast-refresh export warnings).

const ART = [
  { key: 'tomato', emoji: '🍅', from: '#f7c6a0', to: '#e97f63' },
  { key: 'pepper', emoji: '🌶️', from: '#f2b9a3', to: '#c94f3d' },
  { key: 'maize', emoji: '🌽', from: '#f7e2a8', to: '#eab65e' },
  { key: 'plantain', emoji: '🍌', from: '#efe4a8', to: '#c6d13f' },
  { key: 'yam', emoji: '🍠', from: '#ecd9b5', to: '#b98d5a' },
  { key: 'cassava', emoji: '🥔', from: '#e9ddc6', to: '#bfa97e' },
  { key: 'mango', emoji: '🥭', from: '#f7d98a', to: '#eda63b' },
  { key: 'banana', emoji: '🍌', from: '#f2e59a', to: '#dbc23f' },
  { key: 'cocoa', emoji: '🍫', from: '#d9c09b', to: '#8a6a45' },
  { key: 'onion', emoji: '🧅', from: '#f4e6cf', to: '#d9b98c' },
  { key: 'cabbage', emoji: '🥬', from: '#d3ecb0', to: '#8fbf4f' },
  { key: 'rice', emoji: '🍚', from: '#f4efe0', to: '#d9cfae' },
  { key: 'groundnut', emoji: '🥜', from: '#ecd9b5', to: '#b98d5a' },
  { key: 'pineapple', emoji: '🍍', from: '#f5e2a0', to: '#e0b23e' },
  { key: 'garden eggs', emoji: '🍆', from: '#e6d0c8', to: '#9d6b8c' },
  { key: 'cocoyam', emoji: '🍠', from: '#e9ddc6', to: '#ad9170' },
]

export function productArt(cropType) {
  const c = String(cropType || '').toLowerCase()
  for (const a of ART) {
    if (c.includes(a.key)) return a
  }
  return { key: 'produce', emoji: '🥦', from: '#d3ecb0', to: '#8fbf4f' }
}

export function productGradient(cropType) {
  const a = productArt(cropType)
  return `linear-gradient(135deg, ${a.from}, ${a.to})`
}
