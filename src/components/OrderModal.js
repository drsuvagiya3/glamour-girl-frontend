import React, { useState } from 'react';
import { X, Package, MapPin } from 'lucide-react';

export default function OrderModal({ order, onClose, onStatusUpdate, isAdmin }) {
  if (!order) return null;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h3>Order {order.orderNumber}</h3>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`status-badge status-${order.status}`}>{order.status}</span>
              {order.supplierName && (
                <span style={{ background: '#f0f0f0', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                  📦 {order.supplierName}
                </span>
              )}
              <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{formatDate(order.createdAt)}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Franchise Info */}
          {isAdmin && (
            <div style={{ background: 'var(--blush)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Package size={15} color="var(--rose-dark)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{order.franchiseName}</span>
                </div>
                {order.franchiseLocation && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--gray)', fontSize: '0.85rem' }}>
                    <MapPin size={13} />{order.franchiseLocation}
                  </div>
                )}
                {order.franchise?.email && (
                  <span style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>{order.franchise.email}</span>
                )}
              </div>
            </div>
          )}

          {/* Grand Total banner (shown to franchise if set) */}
          {order.grandTotal > 0 && (
            <div style={{ background: 'var(--charcoal)', color: 'var(--white)', borderRadius: 10, padding: '14px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Total Amount to Pay</span>
              <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.6rem', fontWeight: 700 }}>
                £ {order.grandTotal.toFixed(2)}
              </span>
            </div>
          )}

          {/* Items */}
          <h4 style={{ marginBottom: 12, fontSize: '1rem', fontFamily: 'Cormorant Garamond', fontWeight: 600 }}>
            Items ({order.items.length})
          </h4>

          {order.items.map((item, i) => (
            <div key={i} style={{ marginBottom: 20, border: '1.5px solid var(--light-gray)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Item header */}
              <div style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--cream)', alignItems: 'flex-start' }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.styleNumber} style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--light-gray)', flexShrink: 0 }} />
                  : <div style={{ width: 72, height: 72, borderRadius: 8, background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={24} color="var(--rose-dark)" />
                    </div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.05rem', fontWeight: 600 }}>
                    Style: {item.styleNumber}
                  </div>
                  {item.description && <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: 2 }}>{item.description}</div>}
                  {(item.price > 0 || item.retailPrice > 0) && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      {item.price > 0 && (
                        <span style={{ background: 'var(--charcoal)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                          Price/Pcs: £{item.price}
                        </span>
                      )}
                      {item.retailPrice > 0 && (
                        <span style={{ background: 'var(--success)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                          Retail: £{item.retailPrice}
                        </span>
                      )}
                      {item.totalAmount > 0 && (
                        <span style={{ background: 'var(--rose-dark)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                          Total to pay: £{item.totalAmount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Colour/Size table */}
              {item.colourSizes && item.colourSizes.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--blush)' }}>
                        <th style={th}>Colour</th>
                        <th style={th}>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.colourSizes.map((row, j) => (
                        <tr key={j} style={{ borderBottom: '1px solid var(--light-gray)' }}>
                          <td style={td}>{row.colour}</td>
                          <td style={{ ...td, fontWeight: 600 }}>{row.quantity || 0}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f5f0eb', fontWeight: 700, fontSize: '0.82rem' }}>
                        <td style={{ ...td, color: 'var(--gray)' }}>Total Qty</td>
                        <td style={{ ...td, color: 'var(--rose-dark)' }}>
                          {item.colourSizes.reduce((a, r) => a + (r.quantity || 0), 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {/* Notes */}
          {order.notes && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#f9f7f5', borderRadius: 10, borderLeft: '3px solid var(--rose)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Franchise Notes</div>
              <p style={{ fontSize: '0.9rem' }}>{order.notes}</p>
            </div>
          )}
          {order.adminNotes && (
            <div style={{ marginTop: 10, padding: '12px 16px', background: '#f0f8f4', borderRadius: 10, borderLeft: '3px solid var(--success)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Notes</div>
              <p style={{ fontSize: '0.9rem' }}>{order.adminNotes}</p>
            </div>
          )}

          {/* Admin Update Form */}
          {isAdmin && onStatusUpdate && (
            <div style={{ marginTop: 24 }}>
              <div className="divider" />
              <AdminUpdateForm order={order} onUpdate={onStatusUpdate} onClose={onClose} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminUpdateForm({ order, onUpdate, onClose }) {
  const [status, setStatus] = useState(order.status);
  const [adminNotes, setAdminNotes] = useState(order.adminNotes || '');
  const [items, setItems] = useState(order.items.map(item => ({
    ...item,
    price: item.price || 0,
    retailPrice: item.retailPrice || 0,
    totalAmount: item.totalAmount || 0,
  })));
  const [loading, setLoading] = useState(false);

  const updateItemPrice = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: parseFloat(value) || 0 };
      // Auto-calc total = price * total qty
      if (field === 'price') {
        const totalQty = item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0;
        updated.totalAmount = updated.price * totalQty;
      }
      return updated;
    }));
  };

  const grandTotal = items.reduce((a, item) => a + (item.totalAmount || 0), 0);

  const handleUpdate = async () => {
    setLoading(true);
    await onUpdate(order._id, status, adminNotes, items, grandTotal);
    setLoading(false);
    onClose();
  };

  return (
    <div>
      <h4 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Update Order
      </h4>

      {/* Pricing per item */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10, color: 'var(--charcoal)' }}>
          Set Prices
        </div>
        {items.map((item, idx) => {
          const totalQty = item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0;
          return (
            <div key={idx} style={{ background: 'var(--cream)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10 }}>
                Style {item.styleNumber} — {totalQty} units
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Wholesale (R)</label>
                  <input type="number" min="0" step="0.01" value={item.price}
                    onChange={e => updateItemPrice(idx, 'price', e.target.value)}
                    style={priceInput} />
                </div>
                <div>
                  <label style={labelStyle}>Retail (R)</label>
                  <input type="number" min="0" step="0.01" value={item.retailPrice}
                    onChange={e => updateItemPrice(idx, 'retailPrice', e.target.value)}
                    style={priceInput} />
                </div>
                <div>
                  <label style={labelStyle}>Item Total (R)</label>
                  <input type="number" min="0" step="0.01" value={item.totalAmount}
                    onChange={e => updateItemPrice(idx, 'totalAmount', e.target.value)}
                    style={{ ...priceInput, background: 'var(--blush)', fontWeight: 700, color: 'var(--rose-dark)' }} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Grand total */}
        <div style={{ background: 'var(--charcoal)', color: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Grand Total to Send</span>
          <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.5rem', fontWeight: 700 }}>
            £ {grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="form-group">
        <label>Order Status</label>
        <select className="status-select" style={{ width: '100%' }} value={status} onChange={e => setStatus(e.target.value)}>
          {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Admin Notes</label>
        <textarea rows={2} style={{ width: '100%', padding: '10px', border: '1.5px solid var(--light-gray)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.9rem', resize: 'vertical' }}
          placeholder="Notes for the franchise..." value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)} />
      </div>

      <button className="btn btn-primary" onClick={handleUpdate} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Updating...' : `Update Order · Send £${grandTotal.toFixed(2)} to Franchise`}
      </button>
    </div>
  );
}

const th = { padding: '9px 12px', textAlign: 'center', fontWeight: 600, fontSize: '0.78rem', color: 'var(--rose-dark)' };
const td = { padding: '7px 10px', textAlign: 'center' };
const labelStyle = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 };
const priceInput = { width: '100%', padding: '8px 10px', border: '1.5px solid var(--light-gray)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.9rem', outline: 'none', background: 'white' };