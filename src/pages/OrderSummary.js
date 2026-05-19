import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function OrderSummary() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopFilter, setShopFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shops, setShops] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    API.get('/orders')
      .then(({ data }) => {
        setOrders(data);
        setShops([...new Set(data.map(o => o.franchiseName).filter(Boolean))]);
        setSuppliers([...new Set(data.map(o => o.supplierName).filter(Boolean))]);
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  // Apply filters
  const filtered = orders.filter(o => {
    if (shopFilter !== 'all' && o.franchiseName !== shopFilter) return false;
    if (supplierFilter !== 'all' && o.supplierName !== supplierFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

  // Combine all items across filtered orders by styleNumber
  const summaryMap = {};
  filtered.forEach(order => {
    order.items.forEach(item => {
      const key = item.styleNumber;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          styleNumber: key,
          description: item.description || '',
          imageUrl: item.imageUrl || '',
          totalQty: 0,
          colours: {},
          shops: new Set(),
          suppliers: new Set(),
        };
      }
      // Add total qty
      const itemQty = item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0;
      summaryMap[key].totalQty += itemQty;

      // Add per-colour quantities
      item.colourSizes?.forEach(row => {
        if (!row.colour) return;
        if (!summaryMap[key].colours[row.colour]) summaryMap[key].colours[row.colour] = 0;
        summaryMap[key].colours[row.colour] += row.quantity || 0;
      });

      // Track which shops ordered this style
      if (order.franchiseName) summaryMap[key].shops.add(order.franchiseName);
      if (order.supplierName) summaryMap[key].suppliers.add(order.supplierName);
    });
  });

  const summary = Object.values(summaryMap).sort((a, b) => b.totalQty - a.totalQty);
  const grandTotal = summary.reduce((a, s) => a + s.totalQty, 0);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Order Summary</h2>
          <p>{summary.length} styles · {grandTotal} total units</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {/* Shop */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>Shop</label>
            <select value={shopFilter} onChange={e => setShopFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Shops</option>
              {shops.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Supplier */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>Supplier</label>
            <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Suppliers</option>
              {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Status */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Statuses</option>
              {['pending','confirmed','processing','shipped','delivered','cancelled'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-outline btn-sm"
              onClick={() => { setShopFilter('all'); setSupplierFilter('all'); setStatusFilter('all'); }}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {summary.length === 0 ? (
        <div className="empty-state">
          <Package size={64} color="var(--rose)" style={{ opacity: 0.3 }} />
          <h3>No orders found</h3>
        </div>
      ) : (
        <>
          {/* Grand total banner */}
          <div style={{ background: 'var(--charcoal)', color: 'white', borderRadius: 'var(--radius)', padding: '16px 24px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grand Total Units</div>
              <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '2rem', fontWeight: 700 }}>{grandTotal}</div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.5rem', fontWeight: 700 }}>{summary.length}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.6 }}>Styles</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.5rem', fontWeight: 700 }}>{filtered.length}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.6 }}>Orders</div>
              </div>
            </div>
          </div>

          {/* Summary table */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 2fr 1fr 1fr', gap: 0, background: 'var(--blush)', padding: '12px 20px' }}>
              <div style={thStyle}>Image</div>
              <div style={thStyle}>Style No.</div>
              <div style={thStyle}>Colours & Qty</div>
              <div style={thStyle}>Shops</div>
              <div style={{ ...thStyle, textAlign: 'right' }}>Total Qty</div>
            </div>

            {summary.map((item, idx) => (
              <div key={item.styleNumber}
                style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 2fr 1fr 1fr',
                  gap: 0, padding: '16px 20px', alignItems: 'center',
                  borderBottom: idx < summary.length - 1 ? '1px solid var(--light-gray)' : 'none',
                  background: idx % 2 === 0 ? 'var(--white)' : 'var(--cream)'
                }}>

                {/* Image */}
                <div>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.styleNumber}
                        style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--light-gray)' }} />
                    : <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={20} color="var(--rose-dark)" />
                      </div>
                  }
                </div>

                {/* Style number + description */}
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.05rem', fontWeight: 700 }}>
                    {item.styleNumber}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>{item.description}</div>
                  )}
                  {item.suppliers.size > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--info)', marginTop: 4 }}>
                      📦 {[...item.suppliers].join(', ')}
                    </div>
                  )}
                </div>

                {/* Colours breakdown */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(item.colours)
                    .sort((a, b) => b[1] - a[1])
                    .map(([colour, qty]) => (
                      <span key={colour} style={{
                        background: 'var(--blush)', color: 'var(--charcoal)',
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: '0.78rem', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 5
                      }}>
                        {colour}
                        <span style={{ fontWeight: 700, color: 'var(--rose-dark)' }}>{qty}</span>
                      </span>
                    ))
                  }
                </div>

                {/* Shops */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[...item.shops].map(shop => (
                    <span key={shop} style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', color: 'var(--gray)' }}>
                      {shop}
                    </span>
                  ))}
                </div>

                {/* Total qty */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.5rem', fontWeight: 700, color: 'var(--rose-dark)' }}>
                    {item.totalQty}
                  </span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>units</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 };
const selectStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid var(--light-gray)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.88rem', outline: 'none', background: 'var(--white)', cursor: 'pointer' };
const thStyle = { fontSize: '0.78rem', fontWeight: 700, color: 'var(--rose-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' };
