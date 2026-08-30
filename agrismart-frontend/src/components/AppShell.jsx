import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getUser } from '../lib/auth'
import { getProduce } from '../lib/api'
import { useCart } from '../lib/cart'
import Sidebar from './Sidebar'
import HorizontalNav from './HorizontalNav'
import { CartIcon } from './icons'
import CartDrawer from './CartDrawer'
import { navLinks } from '../lib/nav'

const AppShellContext = createContext(null)

export function useAppShell() {
  return useContext(AppShellContext)
}

// Shared authenticated layout: role-aware sidebar navigation, a server-backed
// cart + drawer, toast notifications, and the shared market feed. Individual
// pages render inside <main> and read shared state via useAppShell().
export default function AppShell({ activeId, children, hideCartFloating = false }) {
  const user = getUser()
  const isFarmer = user?.role === 'farmer'
  const isAdmin = user?.role === 'admin'
  const isBuyer = user?.role === 'buyer'
  const isMarketSeller = user?.role === 'market_seller'
  const canHoldCart = (isBuyer || isMarketSeller) && Boolean(user?.verified)
  const isBuyerAccount = isBuyer || isMarketSeller

  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [market, setMarket] = useState(null)
  const cart = useCart(canHoldCart)

  const refreshMarket = useCallback(() => {
    getProduce(
      typeof user?.lat === 'number' ? user.lat : undefined,
      typeof user?.lng === 'number' ? user.lng : undefined,
    )
      .then(setMarket)
      .catch(() => {
        setMarket([])
        setToast('Could not refresh the market feed.')
      })
  }, [user?.lat, user?.lng])

  useEffect(() => {
    refreshMarket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flashToast = useCallback((msg) => {
    setToast('')
    requestAnimationFrame(() => setToast(msg))
  }, [])

  const links = navLinks({ isBuyerAccount, isFarmer, isAdmin })

  const value = {
    user,
    isFarmer,
    isAdmin,
    isBuyer,
    canHoldCart,
    cart,
    market,
    refreshMarket,
    flashToast,
    setCartOpen,
  }

  return (
    <AppShellContext.Provider value={value}>
      <div className={isBuyerAccount ? 'min-h-screen bg-paper' : 'flex min-h-screen flex-col bg-paper md:flex-row'}>

        {isBuyerAccount ? (
          <HorizontalNav links={links} activeId={activeId} />
        ) : (
          <Sidebar
            user={user}
            links={links}
            activeId={activeId}
            onNavigate={() => {}}
          />
        )}

        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 md:px-8 md:py-7">
          {children}
        </main>

        {canHoldCart && !hideCartFloating && (
          <CartDrawer
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            items={cart.items}
            onSetQty={cart.setQty}
            onRemove={cart.remove}
            onClear={cart.clear}
            subtotal={cart.subtotal}
            count={cart.count}
            verified={user?.verified}
            onVerifyPrompt={() => {
              setCartOpen(false)
              flashToast('Verify your buyer profile to place an order')
            }}
            onSuccess={() => flashToast('Order placed — growers have been notified')}
          />
        )}

        {isBuyerAccount && !hideCartFloating && (
          <button
            type="button"
            onClick={() => {
              if (!user?.verified) {
                flashToast('Verify your buyer profile to use the cart')
                return
              }
              setCartOpen(true)
            }}
            aria-label="Open shopping cart"
            className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-leaf text-white shadow-xl transition hover:scale-105 hover:bg-leaf-dark"
          >
            <CartIcon />
            {cart.count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-amber-500 px-1 font-sans text-[10px] font-bold text-white">
                {cart.count}
              </span>
            )}
          </button>
        )}

        {toast && (
          <div className="fixed bottom-24 right-6 z-50 max-w-xs rounded-[10px] bg-leaf-dark px-4 py-3.5 font-sans text-xs text-white shadow">
            {toast}
          </div>
        )}
      </div>
    </AppShellContext.Provider>
  )
}
