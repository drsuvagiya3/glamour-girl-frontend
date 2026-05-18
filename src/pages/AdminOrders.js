import React, { useState, useEffect } from 'react';
import { Package, ChevronRight, MapPin, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import OrderModal from '../components/OrderModal';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [shops, setShops] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/orders');
      setOrders(data);
      setShops([...new Set(data.map(o => o.franchiseName).filter(Boolean))]);
      setSuppliers([...new Set(data.map(o => o.supplierName).filter(Boolean))]);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // Apply all filters client-side
  useEffect(() => {
    let result = [...orders];
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
    if (shopFilter !== 'all') result = result.filter(o => o.franchiseName === shopFilter);
    if (supplierFilter !== 'all') result = result.filter(o => o.supplierName === supplierFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.franchiseName?.toLowerCase().includes(q) ||
        o.supplierName?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [orders, statusFilter, shopFilter, supplierFilter, search]);

  const handleStatusUpdate = async (orderId, status, adminNotes, items, grandTotal) => {
    try {
      const { data } = await API.put(`/orders/${orderId}/status`, { status, adminNotes, items, grandTotal });
      setOrders(prev => prev.map(o => o._id === orderId ? data : o));
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

  const clearFilters = () => { setStatusFilter('all'); setShopFilter('all'); setSupplierFilter('all'); setSearch(''); };
  const isFiltered = statusFilter !== 'all' || shopFilter !== 'all' || supplierFilter !== 'all' || search.trim();

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
            <button key={shop}
              className={`filter-btn ${shopFilter === shop ? 'active' : ''}`}
              onClick={() => setShopFilter(shop)}
              style={shopFilter === shop ? { background: 'var(--rose-dark)', borderColor: 'var(--rose-dark)' } : {}}>
              {shop} ({orders.filter(o => o.franchiseName === shop).length})
            </button>
          ))}
        </div>
      </div>

      {/* Supplier Filter */}
      {suppliers.length > 0 && (
        <div style={filterBox}>
          <div style={filterBoxHeader}>
            <span style={filterLabel}>Filter by Supplier</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={`filter-btn ${supplierFilter === 'all' ? 'active' : ''}`} onClick={() => setSupplierFilter('all')}>
              All Suppliers
            </button>
            {suppliers.map(s => (
              <button key={s}
                className={`filter-btn ${supplierFilter === s ? 'active' : ''}`}
                onClick={() => setSupplierFilter(s)}
                style={supplierFilter === s ? { background: '#5a7ec9', borderColor: '#5a7ec9', color: 'white' } : {}}>
                📦 {s} ({orders.filter(o => o.supplierName === s).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status + Search row */}
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

      {/* Active filter summary */}
      {isFiltered && (
        <div style={{ marginBottom: 14, padding: '10px 16px', background: 'var(--blush)', borderRadius: 10, fontSize: '0.85rem', color: 'var(--rose-dark)', fontWeight: 500 }}>
          Showing {filtered.length} order{filtered.length !== 1 ? 's' : ''}
          {shopFilter !== 'all' && ` · Shop: ${shopFilter}`}
          {supplierFilter !== 'all' && ` · Supplier: ${supplierFilter}`}
          {statusFilter !== 'all' && ` · Status: ${statusFilter}`}
          {search && ` · Search: "${search}"`}
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={64} color="var(--rose)" />
          <h3>No orders found</h3>
          <p>Try changing your filters</p>
          {isFiltered && <button className="btn btn-outline" onClick={clearFilters} style={{ marginTop: 16 }}>Clear Filters</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(order => (
            <div key={order._id} className="order-card" onClick={() => setSelected(order)}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>

              {/* Thumbnails */}
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                {order.items.slice(0, 2).map((item, i) => (
                  item.imageUrl
                    ? <img key={i} src={item.imageUrl} alt="" className="item-thumb" />
                    : <div key={i} className="item-thumb-placeholder" style={{ fontSize: '0.6rem' }}>{item.styleNumber}</div>
                ))}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="order-number" style={{ fontSize: '1rem' }}>{order.orderNumber}</span>
                  <span className={`status-badge status-${order.status}`}>{order.status}</span>
                  {order.grandTotal > 0 && (
                    <span style={{ background: 'var(--charcoal)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                    £ {order.grandTotal.toFixed(2)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 5, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 600 }}>
                    <Package size={13} /> {order.franchiseName}
                  </span>
                  {order.supplierName && (
                    <span style={{ fontSize: '0.82rem', color: 'var(--info)' }}>📦 {order.supplierName}</span>
                  )}
                  {order.franchiseLocation && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', color: 'var(--gray)' }}>
                      <MapPin size={12} /> {order.franchiseLocation}
                    </span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button className="close-btn" onClick={(e) => handleDelete(order._id, e)}
                  style={{ background: '#fde8e8', color: 'var(--danger)' }}>
                  <Trash2 size={13} />
                </button>
                <ChevronRight size={18} color="var(--gray)" />
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