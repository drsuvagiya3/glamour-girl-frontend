import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, ArrowRight, ShoppingBag, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import OrderModal from '../components/OrderModal';

const COLOURS = ['#E8B4B8','#C9848A','#7A9EC9','#6BAE8E','#E8A87C','#9A7AC9','#C9C97A','#7AC9C9','#C97A9A','#8E8E8E'];

export default function SupplierCategories() {
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', colour: '#E8B4B8' });
  const [movingOrder, setMovingOrder] = useState(null);
  const [expandedCats, setExpandedCats] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [bulkStatus, setBulkStatus] = useState({}); // catId -> selected status
  const [bulkLoading, setBulkLoading] = useState({}); // catId -> bool

  useEffect(() => { fetchAll(); }, []);

  // Bulk update all orders in a category
  const bulkUpdateCategory = async (catName, newStatus) => {
    const catOrders = getOrdersForCategory(catName);
    if (catOrders.length === 0) return toast.error('No orders in this category');
    const catId = catName;
    setBulkLoading(prev => ({ ...prev, [catId]: true }));
    try {
      await Promise.all(catOrders.map(order =>
        API.put(`/orders/${order._id}/status`, { status: newStatus })
      ));
      setOrders(prev => prev.map(o =>
        catOrders.find(co => co._id === o._id)
          ? { ...o, status: newStatus }
          : o
      ));
      toast.success(`${catOrders.length} orders marked as ${newStatus}!`);
      setBulkStatus(prev => ({ ...prev, [catId]: '' }));
    } catch {
      toast.error('Failed to update some orders');
    } finally {
      setBulkLoading(prev => ({ ...prev, [catId]: false }));
    }
  };

  const fetchAll = async () => {
    try {
      const [catRes, ordersRes] = await Promise.allSettled([
        API.get('/supplier-categories'),
        API.get('/orders')
      ]);
      const catsData = catRes.status === 'fulfilled' ? catRes.value.data : [];
      const ordersData = ordersRes.status === 'fulfilled' ? ordersRes.value.data : [];
      setCategories(catsData);
      setOrders(ordersData);
      // expand all by default
      const exp = {};
      catsData.forEach(c => exp[c._id] = true);
      exp['__none__'] = true;
      setExpandedCats(exp);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // Get category of an order
  const getOrderCategory = (order) =>
    order.adminCategory || order.supplierName || '';

  // Get category id from name
  const getCatByName = (name) => categories.find(c => c.name === name);

  // Move order to category
  const moveOrderToCategory = async (orderId, categoryName) => {
    try {
      const order = orders.find(o => o._id === orderId);
      await API.put(`/orders/${orderId}/status`, {
        status: order.status,
        adminCategory: categoryName
      });
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, adminCategory: categoryName } : o
      ));
      toast.success(`Order moved to ${categoryName || 'Uncategorised'}!`);
      setMovingOrder(null);
    } catch {
      toast.error('Failed to move order');
    }
  };

  // Group orders by adminCategory OR orders that have items with itemCategory === catName
  const getOrdersForCategory = (catName) =>
    orders.filter(o =>
      (o.adminCategory || o.supplierName || '') === catName ||
      o.items.some(item => item.itemCategory === catName)
    );

  // Uncategorised = no adminCategory, no supplierName, and no items with itemCategory
  const uncategorisedOrders = orders.filter(o =>
    !o.adminCategory && !o.supplierName &&
    !o.items.some(item => item.itemCategory)
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Category name required');
    try {
      if (editingId) {
        const cat = categories.find(c => c._id === editingId);
        const { data } = await API.put(`/supplier-categories/${editingId}`, { ...cat, name: form.name, colour: form.colour });
        setCategories(prev => prev.map(c => c._id === editingId ? data : c));
        toast.success('Updated!');
      } else {
        const { data } = await API.post('/supplier-categories', { ...form, suppliers: [] });
        setCategories(prev => [...prev, data]);
        setExpandedCats(prev => ({ ...prev, [data._id]: true }));
        toast.success('Category created!');
      }
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await API.delete(`/supplier-categories/${id}`);
      setCategories(prev => prev.filter(c => c._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name, colour: cat.colour });
    setEditingId(cat._id);
    setShowForm(true);
  };

  const resetForm = () => { setForm({ name: '', colour: '#E8B4B8' }); setEditingId(null); setShowForm(false); };
  const toggleCat = (id) => setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleStatusUpdate = async (orderId, status, adminNotes, items, grandTotal) => {
    try {
      const { data } = await API.put(`/orders/${orderId}/status`, { status, adminNotes, items, grandTotal });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...data } : o));
      toast.success('Order updated!');
    } catch { toast.error('Failed to update order'); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  // All category names for move modal
  const allCatNames = categories.map(c => c.name);
  const supplierNames = [...new Set(orders.map(o => o.supplierName).filter(Boolean))];
  const allMoveOptions = [...new Set([...allCatNames, ...supplierNames])];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Supplier Categories</h2>
          <p>Organise and move orders between categories</p>
        </div>
        <button className="btn btn-rose" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={15} /> New Category
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, border: '2px solid var(--rose)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem' }}>{editingId ? 'Edit Category' : 'New Category'}</h3>
            <button className="close-btn" onClick={resetForm}><X size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Category Name *</label>
              <input type="text" placeholder="e.g. JO, CY, Miss Lady..." value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Colour</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLOURS.map(colour => (
                  <div key={colour} onClick={() => setForm({ ...form, colour })}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: colour, cursor: 'pointer', border: form.colour === colour ? '3px solid var(--charcoal)' : '3px solid transparent' }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSubmit}>{editingId ? 'Update' : 'Create Category'}</button>
            <button className="btn btn-outline" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Move Order Modal */}
      {movingOrder && (
        <div className="modal-overlay" onClick={() => setMovingOrder(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Move Order {movingOrder.orderNumber}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: 4 }}>
                  From: <strong>{movingOrder.adminCategory || movingOrder.supplierName || 'Uncategorised'}</strong>
                </p>
              </div>
              <button className="close-btn" onClick={() => setMovingOrder(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Uncategorised */}
                <button onClick={() => moveOrderToCategory(movingOrder._id, '')}
                  style={moveBtnStyle('var(--light-gray)', !movingOrder.adminCategory && !movingOrder.supplierName)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--light-gray)' }} />
                    <span>Uncategorised</span>
                  </div>
                  {!movingOrder.adminCategory && !movingOrder.supplierName && <span style={{ fontSize: '0.75rem', color: 'var(--gray)', fontWeight: 600 }}>Current</span>}
                </button>

                {/* All categories */}
                {categories.map(cat => {
                  const isCurrent = (movingOrder.adminCategory || movingOrder.supplierName) === cat.name;
                  return (
                    <button key={cat._id} onClick={() => !isCurrent && moveOrderToCategory(movingOrder._id, cat.name)}
                      style={moveBtnStyle(cat.colour, isCurrent)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.colour }} />
                        <span style={{ fontWeight: 500 }}>{cat.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                          ({getOrdersForCategory(cat.name).length} orders)
                        </span>
                      </div>
                      {isCurrent
                        ? <span style={{ fontSize: '0.75rem', color: cat.colour, fontWeight: 600 }}>Current</span>
                        : <ArrowRight size={14} color="var(--gray)" />}
                    </button>
                  );
                })}

                {/* Supplier names not yet in categories */}
                {supplierNames.filter(s => !categories.find(c => c.name === s)).map(sup => {
                  const isCurrent = (movingOrder.adminCategory || movingOrder.supplierName) === sup;
                  return (
                    <button key={sup} onClick={() => !isCurrent && moveOrderToCategory(movingOrder._id, sup)}
                      style={moveBtnStyle('var(--rose-dark)', isCurrent)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.9rem' }}>📦</span>
                        <span style={{ fontWeight: 500 }}>{sup}</span>
                      </div>
                      {isCurrent
                        ? <span style={{ fontSize: '0.75rem', color: 'var(--rose-dark)', fontWeight: 600 }}>Current</span>
                        : <ArrowRight size={14} color="var(--gray)" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories with orders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {categories.map(cat => {
          const catOrders = getOrdersForCategory(cat.name);
          const isExpanded = expandedCats[cat._id];
          return (
            <div key={cat._id} style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden', borderLeft: `4px solid ${cat.colour}` }}>
              {/* Category header */}
              <div onClick={() => toggleCat(cat._id)}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isExpanded ? cat.colour + '22' : 'var(--white)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.colour, flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{cat.name}</h3>
                      <span style={{ background: cat.colour + '33', color: cat.colour, padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>
                        {catOrders.length} order{catOrders.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="close-btn" onClick={e => { e.stopPropagation(); handleEdit(cat); }}
                    style={{ background: 'var(--blush)', color: 'var(--rose-dark)' }}>
                    <Edit2 size={13} />
                  </button>
                  <button className="close-btn" onClick={e => { e.stopPropagation(); handleDelete(cat._id); }}
                    style={{ background: '#fde8e8', color: 'var(--danger)' }}>
                    <Trash2 size={13} />
                  </button>
                  {isExpanded ? <ChevronDown size={16} color="var(--gray)" /> : <ChevronRight size={16} color="var(--gray)" />}
                </div>
              </div>

              {/* Bulk action bar — shown when expanded and has orders */}
              {isExpanded && catOrders.length > 0 && (
                <div style={{ padding: '12px 20px', background: cat.colour + '11', borderTop: `1px solid ${cat.colour}33`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray)' }}>
                    Bulk Action ({catOrders.length} orders):
                  </span>
                  <select
                    value={bulkStatus[cat.name] || ''}
                    onChange={e => setBulkStatus(prev => ({ ...prev, [cat.name]: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                    style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${cat.colour}`, fontFamily: 'DM Sans', fontSize: '0.85rem', outline: 'none', background: 'white', cursor: 'pointer' }}>
                    <option value="">Select status...</option>
                    {['confirmed','processing','shipped','delivered','cancelled'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    onClick={e => { e.stopPropagation(); bulkStatus[cat.name] && bulkUpdateCategory(cat.name, bulkStatus[cat.name]); }}
                    disabled={!bulkStatus[cat.name] || bulkLoading[cat.name]}
                    style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: bulkStatus[cat.name] ? cat.colour : 'var(--light-gray)', color: bulkStatus[cat.name] ? 'white' : 'var(--gray)', fontFamily: 'DM Sans', fontSize: '0.85rem', fontWeight: 600, cursor: bulkStatus[cat.name] ? 'pointer' : 'default', transition: 'all 0.2s' }}>
                    {bulkLoading[cat.name] ? 'Updating...' : `Apply to All`}
                  </button>
                  {/* Status summary */}
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
                    {['pending','confirmed','processing','shipped','delivered'].map(s => {
                      const count = catOrders.filter(o => o.status === s).length;
                      if (!count) return null;
                      return <span key={s} className={`status-badge status-${s}`} style={{ fontSize: '0.7rem' }}>{count} {s}</span>;
                    })}
                  </div>
                </div>
              )}

              {/* Orders in this category */}
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${cat.colour}33` }}>
                  {catOrders.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      No orders yet — move orders here using the 📂 Move button on any order
                    </div>
                  ) : catOrders.map((order, idx) => (
                    <div key={order._id}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: idx < catOrders.length - 1 ? '1px solid var(--light-gray)' : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                      {/* Thumbnails — only show items belonging to this category */}
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} onClick={() => setSelectedOrder(order)}>
                        {(() => {
                          const orderBelongs = (order.adminCategory || order.supplierName || '') === cat.name;
                          const visibleItems = orderBelongs
                            ? order.items.slice(0, 2)
                            : order.items.filter(item => item.itemCategory === cat.name).slice(0, 2);
                          return visibleItems.map((item, i) => (
                            item.imageUrl
                              ? <img key={i} src={item.imageUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--light-gray)' }} />
                              : <div key={i} style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--rose-dark)', fontWeight: 600 }}>{item.styleNumber}</div>
                          ));
                        })()}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }} onClick={() => setSelectedOrder(order)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '1rem', fontWeight: 700 }}>{order.orderNumber}</span>
                          <span className={`status-badge status-${order.status}`}>{order.status}</span>
                          {order.grandTotal > 0 && (
                            <span style={{ background: 'var(--charcoal)', color: 'white', padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>£{order.grandTotal.toFixed(2)}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginTop: 3 }}>
                          {(() => {
                            const orderBelongs = (order.adminCategory || order.supplierName || '') === cat.name;
                            const count = orderBelongs
                              ? order.items.length
                              : order.items.filter(item => item.itemCategory === cat.name).length;
                            return `${order.franchiseName} · ${count} item${count !== 1 ? 's' : ''} · ${formatDate(order.createdAt)}`;
                          })()}
                        </div>
                        <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                          {order.items.map((item, i) => {
                            // Check if this item belongs to this category
                            const itemBelongs = item.itemCategory === cat.name;
                            const orderBelongs = (order.adminCategory || order.supplierName || '') === cat.name;
                            // Show all items if whole order belongs, or only matching items
                            if (!orderBelongs && !itemBelongs) return null;
                            return (
                              <span key={i} style={{
                                background: itemBelongs && !orderBelongs ? cat.colour + '44' : cat.colour + '22',
                                color: cat.colour,
                                padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600,
                                border: itemBelongs && !orderBelongs ? `1px solid ${cat.colour}` : 'none'
                              }}>
                                {item.styleNumber}
                                {itemBelongs && !orderBelongs && <span style={{ marginLeft: 3, fontSize: '0.6rem' }}>★</span>}
                              </span>
                            );
                          })}
                        </div>
                        {/* Show note if only some items belong here */}
                        {order.items.some(item => item.itemCategory === cat.name) && (order.adminCategory || order.supplierName || '') !== cat.name && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 2, fontStyle: 'italic' }}>
                            ★ individual items moved to this category
                          </div>
                        )}
                      </div>

                      <button onClick={() => setMovingOrder(order)}
                        style={{ background: 'var(--blush)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--rose-dark)', fontWeight: 600, fontFamily: 'DM Sans', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        📂 Move
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorised orders */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden', borderLeft: '4px solid var(--light-gray)' }}>
          <div onClick={() => toggleCat('__none__')}
            style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--light-gray)', flexShrink: 0 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray)' }}>Uncategorised</h3>
              <span style={{ background: 'var(--light-gray)', color: 'var(--gray)', padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>
                {uncategorisedOrders.length} orders
              </span>
            </div>
            {expandedCats['__none__'] ? <ChevronDown size={16} color="var(--gray)" /> : <ChevronRight size={16} color="var(--gray)" />}
          </div>

          {expandedCats['__none__'] && (
            <div style={{ borderTop: '1px solid var(--light-gray)' }}>
              {uncategorisedOrders.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  All orders are categorised ✅
                </div>
              ) : uncategorisedOrders.map((order, idx) => (
                <div key={order._id}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: idx < uncategorisedOrders.length - 1 ? '1px solid var(--light-gray)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} onClick={() => setSelectedOrder(order)}>
                    {order.items.slice(0, 2).map((item, i) => (
                      item.imageUrl
                        ? <img key={i} src={item.imageUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--light-gray)' }} />
                        : <div key={i} style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--rose-dark)', fontWeight: 600 }}>{item.styleNumber}</div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => setSelectedOrder(order)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '1rem', fontWeight: 700 }}>{order.orderNumber}</span>
                      <span className={`status-badge status-${order.status}`}>{order.status}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginTop: 3 }}>
                      {order.franchiseName} · {order.supplierName && `📦 ${order.supplierName} · `}{order.items.length} item{order.items.length !== 1 ? 's' : ''} · {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <button onClick={() => setMovingOrder(order)}
                    style={{ background: 'var(--blush)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--rose-dark)', fontWeight: 600, fontFamily: 'DM Sans', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    📂 Move
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
          isAdmin={true}
        />
      )}
    </div>
  );
}

const moveBtnStyle = (colour, isCurrent) => ({
  padding: '12px 16px', borderRadius: 10,
  border: `1.5px solid ${isCurrent ? colour : 'var(--light-gray)'}`,
  background: isCurrent ? colour + '22' : 'var(--white)',
  fontFamily: 'DM Sans', fontSize: '0.9rem',
  cursor: isCurrent ? 'default' : 'pointer',
  textAlign: 'left', display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', width: '100%',
  opacity: isCurrent ? 0.8 : 1, transition: 'all 0.2s'
});
