import { useLocation } from 'react-router-dom'

export default function PageTransition({ children, className = '' }) {
  const { pathname } = useLocation()
  return (
    <div className={`page-enter ${className}`} key={pathname}>
      {children}
    </div>
  )
}