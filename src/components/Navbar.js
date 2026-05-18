import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShoppingBag, LayoutDashboard, PlusCircle, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => location.pathname === path;

  const navLinks = user?.role === 'admin'
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { to: '/admin', label: 'All Orders', icon: <ShoppingBag size={16} /> },
      ]
    : [
        { to: '/orders', label: 'My Orders', icon: <ShoppingBag size={16} /> },
        { to: '/board', label: 'Order Board', icon: <LayoutDashboard size={16} /> },
        { to: '/new-order', label: 'New Order', icon: <PlusCircle size={16} /> },
      ];

  return (
    <nav className="navbar">
      <Link to={user?.role === 'admin' ? '/admin' : '/orders'} className="navbar-brand">
        Glamour<span>Girl</span>
      </Link>

      {/* Desktop Nav */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="desktop-nav">
        {navLinks.map(link => (
          <Link key={link.to} to={link.to} className="btn btn-sm"
            style={{
              background: isActive(link.to) ? 'var(--charcoal)' : 'transparent',
              color: isActive(link.to) ? 'var(--white)' : 'var(--gray)',
              border: 'none',
            }}>
            {link.icon} {link.label}
          </Link>
        ))}
      </div>

      <div className="navbar-right">
        <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`user-badge ${user?.role === 'admin' ? 'admin' : ''}`}>
            {user?.role === 'admin' ? '⚙ Admin' : user?.franchiseName || user?.name}
          </span>
          <button className="btn btn-sm btn-outline" onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <LogOut size={14} /> <span className="hide-mobile">Logout</span>
          </button>
        </div>
      </div>

      <style>{`
        .desktop-nav { display: flex; }
        @media (max-width: 640px) { .desktop-nav { display: none; } }
        .hide-mobile {}
        @media (max-width: 480px) { .hide-mobile { display: none; } }
      `}</style>
    </nav>
  );
}