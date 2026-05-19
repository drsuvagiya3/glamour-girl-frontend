import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShoppingBag, LayoutDashboard, PlusCircle, Tag, BarChart2 } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  const navLinks = user?.role === 'admin'
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { to: '/admin', label: 'Orders', icon: <ShoppingBag size={16} /> },
        { to: '/order-summary', label: 'Summary', icon: <BarChart2 size={16} /> },
        { to: '/supplier-categories', label: 'Categories', icon: <Tag size={16} /> },
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

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {navLinks.map(link => (
          <Link key={link.to} to={link.to} className="btn btn-sm"
            style={{
              background: isActive(link.to) ? 'var(--charcoal)' : 'transparent',
              color: isActive(link.to) ? 'var(--white)' : 'var(--gray)',
              border: 'none',
            }}>
            {link.icon} <span className="hide-mobile">{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="navbar-right">
        <span className={`user-badge ${user?.role === 'admin' ? 'admin' : ''}`}>
          {user?.role === 'admin' ? '⚙ Admin' : user?.franchiseName || user?.name}
        </span>
        <button className="btn btn-sm btn-outline" onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <LogOut size={14} /> <span className="hide-mobile">Logout</span>
        </button>
      </div>

      <style>{`
        @media (max-width: 640px) { .hide-mobile { display: none; } }
      `}</style>
    </nav>
  );
}
