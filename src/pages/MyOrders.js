import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Package, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import OrderModal from '../components/OrderModal';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const fetchOrders = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await API.get('/orders', { params });
      setOrders(data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>My Orders</h2>
          <p>{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/new-order" className="btn btn-rose">
          <PlusCircle size={16} /> New Order
        </Link>
      </div>

      {/* Filters */}
      <div className="filters-row">
        {STATUS_FILTERS.map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <Package size={64} color="var(--rose)" style={{ opacity: 0.3, marginBottom: 16 }} />
          <h3>No orders yet</h3>
          <p style={{ marginBottom: 24 }}>Place your first order to get started</p>
          <Link to="/new-order" className="btn btn-rose">
            <PlusCircle size={16} /> Place First Order
          </Link>
        </div>
      ) : (
        <div className="card-grid">
          {orders.map(order => (
            <div key={order._id} className="order-card" onClick={() => setSelected(order)}>
              <div className="order-card-header">
                <div>
                  <div className="order-number">{order.orderNumber}</div>
                  <div className="order-meta">{formatDate(order.createdAt)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`status-badge status-${order.status}`}>{order.status}</span>
                  <ChevronRight size={16} color="var(--gray)" />
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: 12 }}>
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </div>

              <div className="order-items-preview">
                {order.items.slice(0, 4).map((item, i) => (
                  item.imageUrl
                    ? <img key={i} src={item.imageUrl} alt={item.styleNumber} className="item-thumb" />
                    : <div key={i} className="item-thumb-placeholder">
                        <div>{item.styleNumber}</div>
                      </div>
                ))}
                {order.items.length > 4 && (
                  <div className="item-thumb-placeholder" style={{ background: 'var(--light-gray)', color: 'var(--gray)' }}>
                    +{order.items.length - 4}
                  </div>
                )}
              </div>

              {order.adminNotes && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#f0f8f4', borderRadius: 8, fontSize: '0.8rem', color: 'var(--gray)', borderLeft: '3px solid var(--success)' }}>
                  💬 {order.adminNotes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <OrderModal order={selected} onClose={() => setSelected(null)} isAdmin={false} />
      )}
    </div>
  );
}
