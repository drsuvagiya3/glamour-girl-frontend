import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Clock, Truck, CheckCircle, BarChart2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [franchises, setFranchises] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, ordersRes, franchisesRes] = await Promise.all([
          API.get('/orders/stats/dashboard'),
          API.get('/orders'),
          API.get('/franchises'),
        ]);
        setStats(statsRes.data);
        setRecentOrders(ordersRes.data.slice(0, 5));
        setFranchises(franchisesRes.data);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short'
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of all franchise orders</p>
        </div>
        <Link to="/admin" className="btn btn-primary">View All Orders</Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon rose"><ShoppingBag size={22} /></div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total Orders</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><Clock size={22} /></div>
            <div className="stat-info">
              <h3>{stats.pending}</h3>
              <p>Pending</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><Truck size={22} /></div>
            <div className="stat-info">
              <h3>{stats.processing}</h3>
              <p>Processing</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle size={22} /></div>
            <div className="stat-info">
              <h3>{stats.delivered}</h3>
              <p>Delivered</p>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Orders */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.2rem' }}>Recent Orders</h3>
            <Link to="/admin" style={{ fontSize: '0.82rem', color: 'var(--rose-dark)', textDecoration: 'none', fontWeight: 600 }}>
              View all →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>No orders yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentOrders.map(order => (
                <div key={order._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--light-gray)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{order.orderNumber}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                      {order.franchiseName} · {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <span className={`status-badge status-${order.status}`} style={{ fontSize: '0.7rem' }}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders by Franchise */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <BarChart2 size={18} color="var(--rose-dark)" />
            <h3 style={{ fontSize: '1.2rem' }}>Orders by Franchise</h3>
          </div>
          {stats?.byFranchise?.length === 0 ? (
            <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats?.byFranchise?.map(f => {
                const max = stats.byFranchise[0]?.count || 1;
                const pct = (f.count / max) * 100;
                return (
                  <div key={f._id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{f._id || 'Unknown'}</span>
                      <span style={{ color: 'var(--gray)' }}>{f.count} orders</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--light-gray)', borderRadius: 10 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--rose-dark)', borderRadius: 10, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Registered Franchises */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Package size={18} color="var(--rose-dark)" />
          <h3 style={{ fontSize: '1.2rem' }}>Registered Franchises ({franchises.length})</h3>
        </div>
        {franchises.length === 0 ? (
          <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>No franchises registered yet</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {franchises.map(f => (
              <div key={f._id} style={{ background: 'var(--cream)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.franchiseName || f.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{f.franchiseLocation}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 4 }}>{f.email}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .card { grid-column: span 1 !important; }
          div[style*='grid-template-columns: 1fr 1fr'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
