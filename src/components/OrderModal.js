import React, { useState } from 'react';
import { X, Package, MapPin, Plus, Trash2, Edit2, Check } from 'lucide-react';

const COLOURS = [
  'Black', 'White', 'Cream', 'Beige', 'Nude', 'Blush Pink', 'Hot Pink', 'Red',
  'Burgundy', 'Navy', 'Royal Blue', 'Sky Blue', 'Mint Green', 'Olive', 'Khaki',
  'Camel', 'Brown', 'Grey', 'Charcoal', 'Mocha', 'Baby Pink', 'Light Yellow',
  'Gold', 'Silver', 'Multi-colour', 'Other'
];

export default function OrderModal({ order, onClose, onStatusUpdate, onFranchiseEdit, isAdmin }) {
  if (!order) return null;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const canFranchiseEdit = !isAdmin && order.status === 'pending';

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

          {/* Grand Total banner */}
          {order.grandTotal > 0 && (
            <div style={{ background: 'var(--charcoal)', color: 'var(--white)', borderRadius: 10, padding: '14px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Total Amount to Pay</span>
              <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.6rem', fontWeight: 700 }}>
                £{order.grandTotal.toFixed(2)}
              </span>
            </div>
          )}

          {/* Franchise edit notice */}
          {canFranchiseEdit && (
            <div style={{ background: '#f0f8f4', borderRadius: 10, padding: '12px 16px', marginBottom: 16, borderLeft: '3px solid var(--success)', fontSize: '0.85rem', color: 'var(--gray)' }}>
              ✏️ Your order is still <strong>pending</strong> — you can edit quantities before admin confirms it.
            </div>
          )}

          {/* Items */}
          <h4 style={{ marginBottom: 12, fontSize: '1rem', fontFamily: 'Cormorant Garamond', fontWeight: 600 }}>
            Items ({order.items.length})
          </h4>

          {order.items.map((item, i) => (
            <div key={i} style={{ marginBottom: 20, border: '1.5px solid var(--light-gray)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--cream)', alignItems: 'flex-start' }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.styleNumber} style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--light-gray)', flexShrink: 0 }} />
                  : <div style={{ width: 72, height: 72, borderRadius: 8, background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={24} color="var(--rose-dark)" />
                    </div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.05rem', fontWeight: 600 }}>Style: {item.styleNumber}</div>
                  {item.description && <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: 2 }}>{item.description}</div>}
                  {(item.price > 0 || item.retailPrice > 0) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {item.price > 0 && <span style={{ background: 'var(--charcoal)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>Wholesale: £{item.price}</span>}
                      {item.retailPrice > 0 && <span style={{ background: 'var(--success)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>Retail: £{item.retailPrice}</span>}
                      {item.totalAmount > 0 && <span style={{ background: 'var(--rose-dark)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>Total: £{item.totalAmount}</span>}
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
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</div>
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

          {/* Franchise Edit Form */}
          {canFranchiseEdit && onFranchiseEdit && (
            <div style={{ marginTop: 24 }}>
              <div className="divider" />
              <FranchiseEditForm order={order} onSave={onFranchiseEdit} onClose={onClose} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Admin Update Form ──
function AdminUpdateForm({ order, onUpdate, onClose }) {
  const [status, setStatus] = useState(order.status);
  const [adminNotes, setAdminNotes] = useState(order.adminNotes || '');
  const [items, setItems] = useState(order.items.map(item => ({
    ...item,
    price: item.price || 0,
    retailPrice: item.retailPrice || 0,
    totalAmount: item.totalAmount || 0,
    colourSizes: item.colourSizes ? item.colourSizes.map(r => ({ ...r })) : [],
  })));
  const [loading, setLoading] = useState(false);

  const updateItemPrice = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: parseFloat(value) || 0 };
      if (field === 'price') {
        const totalQty = item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0;
        updated.totalAmount = updated.price * totalQty;
      }
      return updated;
    }));
  };

  const updateColourQty = (itemIdx, rowIdx, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      const newRows = item.colourSizes.map((row, j) =>
        j === rowIdx ? { ...row, quantity: parseInt(value) || 0 } : row
      );
      return { ...item, colourSizes: newRows };
    }));
  };

  const addColourRow = (itemIdx) => {
    setItems(prev => prev.map((item, i) =>
      i === itemIdx ? { ...item, colourSizes: [...item.colourSizes, { colour: '', quantity: 0 }] } : item
    ));
  };

  const removeColourRow = (itemIdx, rowIdx) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      return { ...item, colourSizes: item.colourSizes.filter((_, j) => j !== rowIdx) };
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

      {/* Edit items quantities + pricing */}
      {items.map((item, idx) => {
        const totalQty = item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0;
        return (
          <div key={idx} style={{ background: 'var(--cream)', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10 }}>Style {item.styleNumber} — {totalQty} units</div>

            {/* Colour qty edit */}
            <div style={{ marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--blush)' }}>
                    <th style={th}>Colour</th>
                    <th style={th}>Qty</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {item.colourSizes?.map((row, rowIdx) => (
                    <tr key={rowIdx} style={{ borderBottom: '1px solid var(--light-gray)' }}>
                      <td style={td}>
                        <select value={row.colour} onChange={e => setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, colourSizes: it.colourSizes.map((r, j) => j !== rowIdx ? r : { ...r, colour: e.target.value }) }))}
                          style={{ border: 'none', background: 'transparent', fontFamily: 'DM Sans', fontSize: '0.85rem', outline: 'none', width: '100%' }}>
                          <option value="">Select...</option>
                          {COLOURS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={td}>
                        <input type="number" min="0" value={row.quantity}
                          onChange={e => updateColourQty(idx, rowIdx, e.target.value)}
                          style={{ width: 60, textAlign: 'center', border: '1px solid var(--light-gray)', borderRadius: 6, padding: '4px', fontFamily: 'DM Sans', fontSize: '0.85rem' }} />
                      </td>
                      <td style={td}>
                        <button type="button" onClick={() => removeColourRow(idx, rowIdx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => addColourRow(idx)}
                className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>
                <Plus size={12} /> Add Colour
              </button>
            </div>

            {/* Pricing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={smallLabel}>Wholesale (£)</label>
                <input type="number" min="0" step="0.01" value={item.price}
                  onChange={e => updateItemPrice(idx, 'price', e.target.value)} style={priceInput} />
              </div>
              <div>
                <label style={smallLabel}>Retail (£)</label>
                <input type="number" min="0" step="0.01" value={item.retailPrice}
                  onChange={e => updateItemPrice(idx, 'retailPrice', e.target.value)} style={priceInput} />
              </div>
              <div>
                <label style={smallLabel}>Item Total (£)</label>
                <input type="number" min="0" step="0.01" value={item.totalAmount}
                  onChange={e => updateItemPrice(idx, 'totalAmount', e.target.value)}
                  style={{ ...priceInput, background: 'var(--blush)', fontWeight: 700, color: 'var(--rose-dark)' }} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Grand total */}
      <div style={{ background: 'var(--charcoal)', color: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Grand Total</span>
        <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.5rem', fontWeight: 700 }}>£{grandTotal.toFixed(2)}</span>
      </div>

      {/* Status */}
      <div className="form-group">
        <label>Order Status</label>
        <select className="status-select" style={{ width: '100%' }} value={status} onChange={e => setStatus(e.target.value)}>
          {['pending','confirmed','processing','shipped','delivered','cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Admin Notes</label>
        <textarea rows={2} style={{ width: '100%', padding: '10px', border: '1.5px solid var(--light-gray)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.9rem', resize: 'vertical' }}
          placeholder="Notes for the franchise..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
      </div>

      <button className="btn btn-primary" onClick={handleUpdate} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Updating...' : `Update Order · Send £${grandTotal.toFixed(2)} to Franchise`}
      </button>
    </div>
  );
}

// ── Franchise Edit Form (only when pending) ──
function FranchiseEditForm({ order, onSave, onClose }) {
  const [items, setItems] = useState(order.items.map(item => ({
    ...item,
    colourSizes: item.colourSizes ? item.colourSizes.map(r => ({ ...r })) : [],
  })));
  const [notes, setNotes] = useState(order.notes || '');
  const [loading, setLoading] = useState(false);

  const updateQty = (itemIdx, rowIdx, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      return { ...item, colourSizes: item.colourSizes.map((row, j) => j === rowIdx ? { ...row, quantity: parseInt(value) || 0 } : row) };
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    await onSave(order._id, items, notes);
    setLoading(false);
    onClose();
  };

  return (
    <div>
      <h4 style={{ marginBottom: 12, fontSize: '0.9rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        ✏️ Edit Your Order
      </h4>
      {items.map((item, itemIdx) => (
        <div key={itemIdx} style={{ background: 'var(--cream)', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Style {item.styleNumber}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--blush)' }}>
                <th style={th}>Colour</th>
                <th style={th}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {item.colourSizes?.map((row, rowIdx) => (
                <tr key={rowIdx} style={{ borderBottom: '1px solid var(--light-gray)' }}>
                  <td style={td}>{row.colour}</td>
                  <td style={td}>
                    <input type="number" min="0" value={row.quantity}
                      onChange={e => updateQty(itemIdx, rowIdx, e.target.value)}
                      style={{ width: 70, textAlign: 'center', border: '1px solid var(--light-gray)', borderRadius: 6, padding: '4px', fontFamily: 'DM Sans', fontSize: '0.88rem' }} />
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#f5f0eb', fontWeight: 700 }}>
                <td style={{ ...td, color: 'var(--gray)', fontSize: '0.8rem' }}>Total</td>
                <td style={{ ...td, color: 'var(--rose-dark)' }}>
                  {item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <div className="form-group">
        <label>Order Notes</label>
        <textarea rows={2} style={{ width: '100%', padding: '10px', border: '1.5px solid var(--light-gray)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.9rem', resize: 'vertical' }}
          value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <button className="btn btn-rose" onClick={handleSave} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

const th = { padding: '9px 12px', textAlign: 'center', fontWeight: 600, fontSize: '0.78rem', color: 'var(--rose-dark)' };
const td = { padding: '7px 10px', textAlign: 'center' };
const smallLabel = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 };
const priceInput = { width: '100%', padding: '8px 10px', border: '1.5px solid var(--light-gray)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.9rem', outline: 'none', background: 'white' };
