import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

const NAV_LINKS = [
  { to: '/',          label: 'Dashboard' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/expenses',  label: 'Expenses'  },
  { to: '/forecast',  label: 'Forecast'  },
  { to: '/fraud',     label: 'Fraud'     },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <span className="logo-mark">◈</span>
          <span className="logo-text">PORTFOLIO</span>
        </Link>
        <div className="navbar-links">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className={pathname === to ? 'active' : ''}>
              {label}
            </Link>
          ))}
        </div>
        <div className="navbar-right">
          {user && <span className="navbar-user">{user.name?.split(' ')[0]}</span>}
          {user
            ? <button className="navbar-cta" onClick={logout}>Sign out</button>
            : <Link to="/login"><button className="navbar-cta">Sign in</button></Link>
          }
        </div>
      </div>
    </nav>
  )
}