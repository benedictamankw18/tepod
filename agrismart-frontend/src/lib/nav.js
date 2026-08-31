// Single source of truth for the authenticated navigation links. Both AppShell
// and page-level layouts (e.g. ProduceDetail) build their nav from this so the
// sidebar / horizontal nav never drift between pages.
export function navLinks({ isBuyerAccount, isFarmer, isAdmin }) {
  const links = isBuyerAccount
    ? [
        { id: 'marketplace', label: 'Market place', to: '/' },
        { id: 'precommitments', label: 'My pre-commitments', to: '/precommitments' },
        { id: 'notifications', label: 'Notifications', to: '/notifications' },
        { id: 'prices', label: 'Price guide', to: '/prices' },
        { id: 'reports', label: 'Reports', to: '/reports' },
        { id: 'services', label: 'Services', to: '/services' },
        { id: 'support', label: 'Support', to: '/support' },
        { id: 'about', label: 'About', to: '/about' },
        { id: 'settings', label: 'Settings', to: '/settings' },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', to: '/' },
        { id: 'marketplace', label: 'Market place', to: '/marketplace' },
...(isFarmer
              ? [
                  { id: 'requests', label: 'My activity', to: '/activity' },
                  { id: 'farms', label: 'My farms', to: '/farms' },
                  { id: 'weather', label: 'Weather guide', to: '/weather' },
                  { id: 'demand', label: 'Crop demand', to: '/demand' },
                ]
              : []),
        { id: 'notifications', label: 'Notifications', to: '/notifications' },
        { id: 'prices', label: 'Price guide', to: '/prices' },
        { id: 'reports', label: 'Reports', to: '/reports' },
        { id: 'services', label: 'Services', to: '/services' },
        { id: 'support', label: 'Support', to: '/support' },
        { id: 'about', label: 'About', to: '/about' },
        { id: 'settings', label: 'Settings', to: '/settings' },
      ]
  if (isAdmin) {
    links.push({ id: 'admin', label: 'Admin', to: '/admin' })
  }
  return links
}