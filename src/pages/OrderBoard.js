import React, { useState, useEffect } from 'react';
import { Package, MapPin, Eye, Copy, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const COLOURS = [
  'Black', 'White', 'Cream', 'Beige', 'Pink', 'Light Pink', 'Red',
  'Wine', 'Navy blue', 'Royal Blue', 'Sky Blue', 'Mint Green', 'Olive', 'Khaki',
  'Camel', 'Brown', 'Grey', 'Light grey', 'Charcoal', 'Mocha', 'Baby Pink',
  'Light Yellow', 'Gold', 'Silver', 'Multi-colour', 'Other'
];

const PAGE_SIZE = 100;

export default function OrderBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [copyModal, setCopyModal] = useState(null);
  const [copyItems, setCopyItems] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    API.get('/orders/public/board')
      .then(({ data }) => setOrders(data))
      .catch(() => toast.error('Failed to load order board'))
      .finally(() => setLoading(false));
  }, []);

  const suppliers = [...new Set(orders.map(o => o.supplierName).filter(Boolean))];

  const filtered = supplierFilter === 'all'
    ? orders
    : orders.filter(o => o.supplierName === supplierFilter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSupplierFilter = (val) => {
    setSupplierFilter(val);
    setPage(1);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const openCopyModal = (order, e) => {
    e.stopPropagation();
    const items = order.items.map(item => ({
      styleNumber: item.styleNumber,
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      imagePreview: item.imageUrl || '',
      colourSizes: item.colourSizes?.length
        ? item.colourSizes.map(r => ({ colour: r.colour, quantity: 0 }))
        : [{ colour: '', quantity: 0 }]
    }));
    setCopyItems(items);
    setCopyModal(order);
  };

  const updateCopyRow = (itemIdx, rowIdx, field, value) => {
    setCopyItems(prev => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      return {
        ...item,
        colourSizes: item.colourSizes.map((row, j) =>
          j !== rowIdx ? row : { ...row, [field]: field === 'quantity' ? (parseInt(value) || 0) : value }
        )
      };
    }));
  };

  const addCopyColour = (itemIdx) => {
    setCopyItems(prev => prev.map((item, i) =>
      i !== itemIdx ? item : { ...item, colourSizes: [...item.colourSizes, { colour: '', quantity: 0 }] }
    ));
  };

  const removeCopyColour = (itemIdx, rowIdx) => {
    setCopyItems(prev => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      if (item.colourSizes.length === 1) return item;
      return { ...item, colourSizes: item.colourSizes.filter((_, j) => j !== rowIdx) };
    }));
  };

  const placeCopiedOrder = async () => {
    const hasQty = copyItems.some(item => item.colourSizes.some(r => r.quantity > 0));
    if (!hasQty) return toast.error('Please enter at least one quantity');
    setPlacing(true);
    try {
      const { data } = await API.post('/orders', {
        items: copyItems,
        supplierName: copyModal.supplierName || '',
        notes: `Copied from order ${copyModal.orderNumber} (${copyModal.franchiseName})`
      });
      toast.success(`Order ${data.orderNumber} placed!`);
      setCopyModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

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
        <button className={`filter-btn ${supplierFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleSupplierFilter('all')}>
          All Suppliers
        </button>
        {suppliers.map(s => (
          <button key={s} className={`filter-btn ${supplierFilter === s ? 'active' : ''}`}
            onClick={() => handleSupplierFilter(s)}>
            📦 {s}
          </button>
        ))}
      </div>

      {/* Results count */}
      {filtered.length > 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: 16 }}>
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} orders
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={64} color="var(--rose)" />
          <h3>No orders yet</h3>
        </div>
      ) : (
        <>
          <div className="card-grid">
            {paginated.map(order => {
              const isOwn = order.franchiseName === (user?.franchiseName || user?.name);
              const isExpanded = expanded === order._id;
              return (
                <div key={order._id} className="order-card"
                  style={{ border: isOwn ? '2px solid var(--rose-dark)' : '2px solid transparent' }}>

                  <div onClick={() => setExpanded(isExpanded ? null : order._id)} style={{ cursor: 'pointer' }}>
                    <div className="order-card-header">
                      <div>
                        <div className="order-number" style={{ fontSize: '0.95rem' }}>{order.orderNumber}</div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isOwn ? 'var(--rose-dark)' : 'var(--charcoal)', marginTop: 4 }}>
                          {order.franchiseName}{isOwn && ' (You)'}
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

                    <div style={{ fontSize: '0.8rem', color: 'var(--gray)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{order.items.length} style{order.items.length !== 1 ? 's' : ''}</span>
                      <span style={{ color: 'var(--rose-dark)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={13} /> {isExpanded ? 'Hide' : 'View details'}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 14, borderTop: '1px solid var(--light-gray)', paddingTop: 14 }}>
                      {order.items.map((item, i) => (
                        <div key={i} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                            {item.imageUrl && <img src={item.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Style: {item.styleNumber}</div>
                              {item.description && <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{item.description}</div>}
                            </div>
                          </div>
                          {item.colourSizes && item.colourSizes.length > 0 && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                              <thead>
                                <tr style={{ background: 'var(--blush)' }}>
                                  <th style={{ padding: '5px 10px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--rose-dark)', fontWeight: 700 }}>Colour</th>
                                  <th style={{ padding: '5px 10px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--rose-dark)', fontWeight: 700 }}>Qty</th>
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
                          )}
                        </div>
                      ))}

                      {!isOwn && (
                        <button onClick={(e) => openCopyModal(order, e)}
                          className="btn btn-rose"
                          style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>
                          <Copy size={15} /> Order Same Items
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={pageBtn(page === 1)}>
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} style={pageNumBtn(p === page)}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={pageBtn(page === totalPages)}>
                Next →
              </button>
              <span style={{ fontSize: '0.82rem', color: 'var(--gray)', marginLeft: 8 }}>
                Page {page} of {totalPages} · {filtered.length} orders
              </span>
            </div>
          )}
        </>
      )}

      {/* Copy Order Modal */}
      {copyModal && (
        <div className="modal-overlay" onClick={() => setCopyModal(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Order Same Items</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: 4 }}>
                  From {copyModal.franchiseName} · {copyModal.supplierName && `📦 ${copyModal.supplierName}`}
                </p>
              </div>
              <button className="close-btn" onClick={() => setCopyModal(null)}><X size={16} /></button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'var(--blush)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--rose-dark)', fontWeight: 500 }}>
                ✏️ Set your own quantities. You can add or remove colours before placing.
              </div>

              {copyItems.map((item, itemIdx) => (
                <div key={itemIdx} style={{ marginBottom: 20, border: '1.5px solid var(--light-gray)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--cream)', alignItems: 'center' }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--light-gray)', flexShrink: 0 }} />
                      : <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package size={20} color="var(--rose-dark)" />
                        </div>
                    }
                    <div>
                      <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1rem', fontWeight: 700 }}>Style: {item.styleNumber}</div>
                      {item.description && <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{item.description}</div>}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginBottom: 10 }}>
                      <thead>
                        <tr style={{ background: 'var(--blush)' }}>
                          <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', color: 'var(--rose-dark)' }}>Colour</th>
                          <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', color: 'var(--rose-dark)' }}>Your Quantity</th>
                          <th style={{ padding: '9px 12px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.colourSizes.map((row, rowIdx) => (
                          <tr key={rowIdx} style={{ borderBottom: '1px solid var(--light-gray)' }}>
                            <td style={{ padding: '8px 12px' }}>
                              <select value={row.colour}
                                onChange={e => updateCopyRow(itemIdx, rowIdx, 'colour', e.target.value)}
                                style={{ border: 'none', background: 'transparent', fontFamily: 'DM Sans', fontSize: '0.88rem', width: '100%', outline: 'none' }}>
                                <option value="">Select colour...</option>
                                {COLOURS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <input type="number" min="0" value={row.quantity}
                                onChange={e => updateCopyRow(itemIdx, rowIdx, 'quantity', e.target.value)}
                                style={{ width: 80, textAlign: 'center', border: '1.5px solid var(--light-gray)', borderRadius: 6, padding: '6px 8px', fontFamily: 'DM Sans', fontSize: '0.9rem', outline: 'none' }} />
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <button type="button" onClick={() => removeCopyColour(itemIdx, rowIdx)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f5f0eb', fontWeight: 700 }}>
                          <td style={{ padding: '7px 12px', color: 'var(--gray)', fontSize: '0.8rem' }}>Total Qty</td>
                          <td style={{ padding: '7px 12px', color: 'var(--rose-dark)' }}>
                            {item.colourSizes.reduce((a, r) => a + (r.quantity || 0), 0)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                    <button type="button" onClick={() => addCopyColour(itemIdx)} className="btn btn-outline btn-sm">
                      <Plus size={13} /> Add Colour
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setCopyModal(null)}>Cancel</button>
              <button className="btn btn-rose" onClick={placeCopiedOrder} disabled={placing}>
                <Copy size={14} /> {placing ? 'Placing Order...' : 'Place Order Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const pageBtn = (disabled) => ({
  padding: '8px 16px', borderRadius: 8,
  border: '1.5px solid var(--light-gray)',
  background: disabled ? 'var(--light-gray)' : 'var(--white)',
  cursor: disabled ? 'default' : 'pointer',
  fontFamily: 'DM Sans', fontSize: '0.85rem',
  color: disabled ? 'var(--gray)' : 'var(--charcoal)'
});

const pageNumBtn = (active) => ({
  padding: '8px 14px', borderRadius: 8,
  border: '1.5px solid',
  borderColor: active ? 'var(--rose-dark)' : 'var(--light-gray)',
  background: active ? 'var(--rose-dark)' : 'var(--white)',
  color: active ? 'white' : 'var(--charcoal)',
  cursor: 'pointer', fontFamily: 'DM Sans',
  fontSize: '0.85rem', fontWeight: active ? 700 : 400
});
