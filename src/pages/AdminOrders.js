import React, { useState, useEffect } from 'react';
import { Package, ChevronRight, ChevronDown, MapPin, Trash2, FolderOpen, X } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import OrderModal from '../components/OrderModal';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [shops, setShops] = useState([]);
  const [viewMode, setViewMode] = useState('grouped');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [categories, setCategories] = useState([]);
  const [movingOrder, setMovingOrder] = useState(null); // order being reassigned

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ordersRes, catRes] = await Promise.allSettled([
        API.get('/orders'),
        API.get('/supplier-categories')
      ]);
      const ordersData = ordersRes.status === 'fulfilled' ? ordersRes.value.data : [];
      const catsData = catRes.status === 'fulfilled' ? catRes.value.data : [];
      setOrders(ordersData);
      setShops([...new Set(ordersData.map(o => o.franchiseName).filter(Boolean))]);
      setCategories(catsData);
      const keys = [...new Set(ordersData.map(o => o.adminCategory || o.supplierName || '__none__'))];
      const exp = {};
      keys.forEach(k => exp[k] = true);
      setExpandedGroups(exp);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Assign order to a category (saves adminCategory on the order)
  const assignCategory = async (orderId, categoryName) => {
    try {
      await API.put(`/orders/${orderId}/status`, {
        adminCategory: categoryName,
        status: orders.find(o => o._id === orderId)?.status
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

  // Apply filters
  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (shopFilter !== 'all' && o.franchiseName !== shopFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return o.orderNumber?.toLowerCase().includes(q) ||
        o.franchiseName?.toLowerCase().includes(q) ||
        o.supplierName?.toLowerCase().includes(q) ||
        o.adminCategory?.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by adminCategory, fallback to supplierName, fallback to 'Uncategorised'
  const grouped = {};
  filtered.forEach(order => {
    const key = order.adminCategory || order.supplierName || '__none__';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(order);
  });

  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '__none__') return 1;
    if (b === '__none__') return -1;
    return a.localeCompare(b);
  });

  // All possible category names for the move modal
  const allCategoryNames = [
    ...categories.map(c => c.name),
    ...[ ...new Set(orders.map(o => o.supplierName).filter(Boolean)) ]
  ].filter((v, i, a) => a.indexOf(v) === i);

  const toggleGroup = (key) =>
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const handleStatusUpdate = async (orderId, status, adminNotes, items, grandTotal) => {
    try {
      const { data } = await API.put(`/orders/${orderId}/status`, { status, adminNotes, items, grandTotal });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...data } : o));
      toast.success('Order updated!');
    } catch {
      toast.error('Failed to update order');
    }
  };

  const handleDelete = async (orderId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this order permanently?')) return;
    try {
      await API.delete(`/orders/${orderId}`);
      setOrders(prev => prev.filter(o => o._id !== orderId));
      toast.success('Order deleted');
    } catch {
      toast.error('Failed to delete order');
    }
  };

  const clearFilters = () => { setStatusFilter('all'); setShopFilter('all'); setSearch(''); };
  const isFiltered = statusFilter !== 'all' || shopFilter !== 'all' || search.trim();
  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>All Orders</h2>
          <p>{filtered.length} of {orders.length} orders</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setViewMode('grouped')}
            className={`btn btn-sm ${viewMode === 'grouped' ? 'btn-primary' : 'btn-outline'}`}>
            📦 By Category
          </button>
          <button onClick={() => setViewMode('list')}
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}>
            📋 List
          </button>
        </div>
      </div>

      {/* Shop Filter */}
      <div style={filterBox}>
        <div style={filterBoxHeader}>
          <span style={filterLabel}>Filter by Shop</span>
          {isFiltered && <button onClick={clearFilters} style={clearBtn}>✕ Clear all</button>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`filter-btn ${shopFilter === 'all' ? 'active' : ''}`} onClick={() => setShopFilter('all')}>
            All Shops ({orders.length})
          </button>
          {shops.map(shop => (
            <button key={shop} className={`filter-btn ${shopFilter === shop ? 'active' : ''}`}
              onClick={() => setShopFilter(shop)}
              style={shopFilter === shop ? { background: 'var(--rose-dark)', borderColor: 'var(--rose-dark)' } : {}}>
              {shop} ({orders.filter(o => o.franchiseName === shop).length})
            </button>
          ))}
        </div>
      </div>

      {/* Status + Search */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', flex: 1 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} className={`filter-btn ${statusFilter === f ? 'active' : ''}`}
              onClick={() => setStatusFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span style={{ marginLeft: 5, background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '1px 6px', fontSize: '0.7rem' }}>
                  {orders.filter(o => o.status === f).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <input className="search-input" placeholder="Search order, shop, supplier..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }} />
      </div>

      {/* Move order to category modal */}
      {movingOrder && (
        <div className="modal-overlay" onClick={() => setMovingOrder(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Move Order {movingOrder.orderNumber}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: 4 }}>
                  Select which category to move this order to
                </p>
              </div>
              <button className="close-btn" onClick={() => setMovingOrder(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Uncategorised */}
                <button onClick={() => assignCategory(movingOrder._id, '')}
                  style={moveBtnStyle('var(--light-gray)', !movingOrder.adminCategory)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--light-gray)' }} />
                    <span>Uncategorised</span>
                  </div>
                  {!movingOrder.adminCategory && <span style={{ fontSize: '0.75rem', color: 'var(--gray)', fontWeight: 600 }}>Current</span>}
                </button>

                {/* Supplier names as categories */}
                {allCategoryNames.map(name => {
                  const isCurrent = movingOrder.adminCategory === name;
                  const cat = categories.find(c => c.name === name);
                  const colour = cat?.colour || 'var(--rose-dark)';
                  return (
                    <button key={name} onClick={() => !isCurrent && assignCategory(movingOrder._id, name)}
                      style={moveBtnStyle(colour, isCurrent)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: colour }} />
                        <span style={{ fontWeight: 500 }}>{name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                          ({filtered.filter(o => (o.adminCategory || o.supplierName) === name).length} orders)
                        </span>
                      </div>
                      {isCurrent
                        ? <span style={{ fontSize: '0.75rem', color: colour, fontWeight: 600 }}>Current</span>
                        : <ChevronRight size={14} color="var(--gray)" />
                      }
                    </button>
                  );
                })}

                {/* Custom category input */}
                <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--light-gray)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 8 }}>Or type a new category name:</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input id="custom-cat" type="text" placeholder="e.g. Premium, Local..."
                      style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--light-gray)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.88rem', outline: 'none' }} />
                    <button className="btn btn-primary btn-sm"
                      onClick={() => {
                        const val = document.getElementById('custom-cat').value.trim();
                        if (val) assignCategory(movingOrder._id, val);
                      }}>
                      Move
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={64} color="var(--rose)" />
          <h3>No orders found</h3>
          {isFiltered && <button className="btn btn-outline" onClick={clearFilters} style={{ marginTop: 16 }}>Clear Filters</button>}
        </div>
      ) : viewMode === 'grouped' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groupKeys.map(groupKey => {
            const groupOrders = grouped[groupKey];
            const isExpanded = expandedGroups[groupKey];
            const displayName = groupKey === '__none__' ? 'Uncategorised' : groupKey;
            const cat = categories.find(c => c.name === groupKey);
            const colour = cat?.colour || (groupKey === '__none__' ? 'var(--light-gray)' : 'var(--rose-dark)');
            const totalAmount = groupOrders.reduce((a, o) => a + (o.grandTotal || 0), 0);

            return (
              <div key={groupKey} style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden', borderLeft: `4px solid ${colour}` }}>
                {/* Group header */}
                <div onClick={() => toggleGroup(groupKey)}
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isExpanded ? 'var(--charcoal)' : 'var(--white)', transition: 'background 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FolderOpen size={20} color={isExpanded ? 'white' : colour} />
                    <div>
                      <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.2rem', fontWeight: 700, color: isExpanded ? 'var(--white)' : 'var(--charcoal)' }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: isExpanded ? 'rgba(255,255,255,0.6)' : 'var(--gray)', marginTop: 2 }}>
                        {groupOrders.length} order{groupOrders.length !== 1 ? 's' : ''}
                        {totalAmount > 0 && ` · Total: £${totalAmount.toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {['pending','confirmed','processing','shipped','delivered'].map(s => {
                      const count = groupOrders.filter(o => o.status === s).length;
                      if (!count) return null;
                      return <span key={s} className={`status-badge status-${s}`} style={{ fontSize: '0.7rem' }}>{count} {s}</span>;
                    })}
                    {isExpanded ? <ChevronDown size={18} color="white" /> : <ChevronRight size={18} color="var(--gray)" />}
                  </div>
                </div>

                {/* Orders in this group */}
                {isExpanded && (
                  <div>
                    {groupOrders.map((order, idx) => (
                      <div key={order._id}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: idx < groupOrders.length - 1 ? '1px solid var(--light-gray)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                        {/* Thumbnails */}
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} onClick={() => setSelected(order)}>
                          {order.items.slice(0, 2).map((item, i) => (
                            item.imageUrl
                              ? <img key={i} src={item.imageUrl} alt="" className="item-thumb" />
                              : <div key={i} className="item-thumb-placeholder" style={{ fontSize: '0.6rem' }}>{item.styleNumber}</div>
                          ))}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setSelected(order)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '1rem', fontWeight: 700 }}>{order.orderNumber}</span>
                            <span className={`status-badge status-${order.status}`}>{order.status}</span>
                            {order.grandTotal > 0 && (
                              <span style={{ background: 'var(--charcoal)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                                £{order.grandTotal.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 600 }}>
                              <Package size={12} /> {order.franchiseName}
                            </span>
                            {order.supplierName && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--info)' }}>📦 {order.supplierName}</span>
                            )}
                            {order.franchiseLocation && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--gray)' }}>
                                <MapPin size={11} /> {order.franchiseLocation}
                              </span>
                            )}
                            <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {formatDate(order.createdAt)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                            {order.items.map((item, i) => (
                              <span key={i} style={{ background: 'var(--blush)', color: 'var(--rose-dark)', padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600 }}>
                                {item.styleNumber}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {/* Move to category button */}
                          <button
                            onClick={e => { e.stopPropagation(); setMovingOrder(order); }}
                            title="Move to category"
                            style={{ background: 'var(--blush)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--rose-dark)', fontWeight: 600, fontFamily: 'DM Sans', whiteSpace: 'nowrap' }}>
                            📂 Move
                          </button>
                          <button className="close-btn" onClick={(e) => handleDelete(order._id, e)}
                            style={{ background: '#fde8e8', color: 'var(--danger)' }}>
                            <Trash2 size={13} />
                          </button>
                          <ChevronRight size={16} color="var(--gray)" onClick={() => setSelected(order)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // LIST VIEW
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(order => (
            <div key={order._id} className="order-card"
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} onClick={() => setSelected(order)}>
                {order.items.slice(0, 2).map((item, i) => (
                  item.imageUrl
                    ? <img key={i} src={item.imageUrl} alt="" className="item-thumb" />
                    : <div key={i} className="item-thumb-placeholder" style={{ fontSize: '0.6rem' }}>{item.styleNumber}</div>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }} onClick={() => setSelected(order)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="order-number" style={{ fontSize: '1rem' }}>{order.orderNumber}</span>
                  <span className={`status-badge status-${order.status}`}>{order.status}</span>
                  {order.adminCategory && (
                    <span style={{ background: 'var(--blush)', color: 'var(--rose-dark)', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>
                      📂 {order.adminCategory}
                    </span>
                  )}
                  {order.grandTotal > 0 && (
                    <span style={{ background: 'var(--charcoal)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                      £{order.grandTotal.toFixed(2)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 5, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 600 }}>
                    <Package size={13} /> {order.franchiseName}
                  </span>
                  {order.supplierName && <span style={{ fontSize: '0.82rem', color: 'var(--info)' }}>📦 {order.supplierName}</span>}
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={e => { e.stopPropagation(); setMovingOrder(order); }}
                  style={{ background: 'var(--blush)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--rose-dark)', fontWeight: 600, fontFamily: 'DM Sans' }}>
                  📂 Move
                </button>
                <button className="close-btn" onClick={(e) => handleDelete(order._id, e)}
                  style={{ background: '#fde8e8', color: 'var(--danger)' }}>
                  <Trash2 size={13} />
                </button>
                <ChevronRight size={18} color="var(--gray)" onClick={() => setSelected(order)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <OrderModal order={selected} onClose={() => setSelected(null)}
          onStatusUpdate={handleStatusUpdate} isAdmin={true} />
      )}
    </div>
  );
}

const filterBox = { background: 'var(--white)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 14, boxShadow: 'var(--shadow)' };
const filterBoxHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 };
const filterLabel = { fontWeight: 600, fontSize: '0.82rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const clearBtn = { fontSize: '0.8rem', color: 'var(--rose-dark)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 };
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
