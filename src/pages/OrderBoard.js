import React, { useState, useEffect } from 'react';
import { Package, MapPin, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function OrderBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [supplierFilter, setSupplierFilter] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const { data } = await API.get('/orders/public/board');
        setOrders(data);
      } catch {
        toast.error('Failed to load order board');
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, []);

  const suppliers = [...new Set(orders.map(o => o.supplierName).filter(Boolean))];
  const filtered = supplierFilter === 'all' ? orders : orders.filter(o => o.supplierName === supplierFilter);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Order Board</h2>
          <p>See what all franchises have ordered — {orders.length} orders total</p>
        </div>
      </div>

      {/* Supplier filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <button className={`filter-btn ${supplierFilter === 'all' ? 'active' : ''}`} onClick={() => setSupplierFilter('all')}>
          All Suppliers
        </button>
        {suppliers.map(s => (
          <button key={s} className={`filter-btn ${supplierFilter === s ? 'active' : ''}`}
            onClick={() => setSupplierFilter(s)}>
            📦 {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={64} color="var(--rose)" />
          <h3>No orders yet</h3>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map(order => {
            const isOwn = order.franchiseName === (user?.franchiseName || user?.name);
            return (
              <div key={order._id} className="order-card"
                style={{ border: isOwn ? '2px solid var(--rose-dark)' : '2px solid transparent', cursor: 'pointer' }}
                onClick={() => setSelected(selected?._id === order._id ? null : order)}>
                <div className="order-card-header">
                  <div>
                    <div className="order-number" style={{ fontSize: '0.95rem' }}>{order.orderNumber}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: isOwn ? 'var(--rose-dark)' : 'var(--charcoal)' }}>
                        {order.franchiseName} {isOwn && '(You)'}
                      </span>
                    </div>
                    {order.franchiseLocation && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>
                        <MapPin size={11} /> {order.franchiseLocation}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`status-badge status-${order.status}`}>{order.status}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 4 }}>{formatDate(order.createdAt)}</div>
                  </div>
                </div>

                {order.supplierName && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--info)', fontWeight: 500, marginBottom: 10 }}>
                    📦 {order.supplierName}
                  </div>
                )}

                {/* Item thumbnails */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {order.items.slice(0, 4).map((item, i) => (
                    item.imageUrl
                      ? <img key={i} src={item.imageUrl} alt={item.styleNumber} className="item-thumb" />
                      : <div key={i} className="item-thumb-placeholder" style={{ fontSize: '0.65rem' }}>{item.styleNumber}</div>
                  ))}
                  {order.items.length > 4 && (
                    <div className="item-thumb-placeholder" style={{ background: 'var(--light-gray)', color: 'var(--gray)' }}>
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--gray)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{order.items.length} style{order.items.length !== 1 ? 's' : ''}</span>
                  <span style={{ color: 'var(--rose-dark)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={13} /> View details
                  </span>
                </div>

                {/* Expanded details */}
                {selected?._id === order._id && (
                  <div style={{ marginTop: 14, borderTop: '1px solid var(--light-gray)', paddingTop: 14 }}>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}>Style: {item.styleNumber}</div>
                        {item.description && <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 6 }}>{item.description}</div>}
                        {item.colourSizes && item.colourSizes.length > 0 && (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                              <thead>
                                <tr style={{ background: 'var(--blush)' }}>
                                  {['Colour','Quantity'].map(h => (
                                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--rose-dark)', fontWeight: 700 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {item.colourSizes.map((row, j) => (
                                  <tr key={j} style={{ borderBottom: '1px solid var(--light-gray)' }}>
                                    <td style={{ padding: '5px 10px' }}>{row.colour}</td>
                                    <td style={{ padding: '5px 10px', fontWeight: 600 }}>{row.quantity || 0}</td>
                                  </tr>
                                ))}
                                <tr style={{ background: '#f5f0eb', fontWeight: 700 }}>
                                  <td style={{ padding: '5px 10px', fontSize: '0.75rem', color: 'var(--gray)' }}>Total</td>
                                  <td style={{ padding: '5px 10px', color: 'var(--rose-dark)' }}>
                                    {item.colourSizes.reduce((a, r) => a + (r.quantity || 0), 0)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}