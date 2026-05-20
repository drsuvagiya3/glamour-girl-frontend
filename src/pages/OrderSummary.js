import React, { useState, useEffect } from 'react';
import { Package, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import API from '../utils/api';

export default function OrderSummary() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shopFilter, setShopFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shops, setShops] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    setLoading(true);
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

  // Build summary map
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
      const itemQty = item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0;
      summaryMap[key].totalQty += itemQty;
      item.colourSizes?.forEach(row => {
        if (!row.colour) return;
        if (!summaryMap[key].colours[row.colour]) summaryMap[key].colours[row.colour] = 0;
        summaryMap[key].colours[row.colour] += row.quantity || 0;
      });
      if (order.franchiseName) summaryMap[key].shops.add(order.franchiseName);
      if (order.supplierName) summaryMap[key].suppliers.add(order.supplierName);
    });
  });

  const summary = Object.values(summaryMap).sort((a, b) => b.totalQty - a.totalQty);
  const grandTotal = summary.reduce((a, s) => a + s.totalQty, 0);

  // ── EXCEL DOWNLOAD ──
  const downloadExcel = () => {
    if (summary.length === 0) return toast.error('No data to download');

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Summary by Style Number ──
    const summaryRows = [
      ['GLAMOUR GIRL — ORDER SUMMARY'],
      [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
      [`Filters: Shop=${shopFilter}, Supplier=${supplierFilter}, Status=${statusFilter}`],
      [],
      ['Style No.', 'Description', 'Supplier(s)', 'Shops', 'Colours & Quantities', 'Total Qty'],
    ];

    summary.forEach(item => {
      const coloursStr = Object.entries(item.colours)
        .sort((a, b) => b[1] - a[1])
        .map(([c, q]) => `${c}: ${q}`)
        .join(' | ');
      summaryRows.push([
        item.styleNumber,
        item.description,
        [...item.suppliers].join(', '),
        [...item.shops].join(', '),
        coloursStr,
        item.totalQty,
      ]);
    });

    // Grand total row
    summaryRows.push([]);
    summaryRows.push(['', '', '', '', 'GRAND TOTAL', grandTotal]);

    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);

    // Column widths
    ws1['!cols'] = [
      { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 30 }, { wch: 50 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws1, 'Summary by Style');

    // ── Sheet 2: Breakdown by Supplier ──
    const supplierMap = {};
    filtered.forEach(order => {
      const sup = order.supplierName || 'Unknown';
      if (!supplierMap[sup]) supplierMap[sup] = {};
      order.items.forEach(item => {
        if (!supplierMap[sup][item.styleNumber]) {
          supplierMap[sup][item.styleNumber] = {
            description: item.description || '',
            totalQty: 0,
            colours: {},
            shops: new Set(),
          };
        }
        const qty = item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0;
        supplierMap[sup][item.styleNumber].totalQty += qty;
        item.colourSizes?.forEach(row => {
          if (!row.colour) return;
          if (!supplierMap[sup][item.styleNumber].colours[row.colour])
            supplierMap[sup][item.styleNumber].colours[row.colour] = 0;
          supplierMap[sup][item.styleNumber].colours[row.colour] += row.quantity || 0;
        });
        if (order.franchiseName) supplierMap[sup][item.styleNumber].shops.add(order.franchiseName);
      });
    });

    const supplierRows = [
      ['GLAMOUR GIRL — ORDERS BY SUPPLIER'],
      [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
      [],
    ];

    Object.entries(supplierMap).forEach(([supplier, styles]) => {
      supplierRows.push([`SUPPLIER: ${supplier}`]);
      supplierRows.push(['Style No.', 'Description', 'Shops', 'Colours & Quantities', 'Total Qty']);
      let supplierTotal = 0;
      Object.entries(styles)
        .sort((a, b) => b[1].totalQty - a[1].totalQty)
        .forEach(([styleNo, data]) => {
          const coloursStr = Object.entries(data.colours)
            .sort((a, b) => b[1] - a[1])
            .map(([c, q]) => `${c}: ${q}`)
            .join(' | ');
          supplierRows.push([
            styleNo,
            data.description,
            [...data.shops].join(', '),
            coloursStr,
            data.totalQty,
          ]);
          supplierTotal += data.totalQty;
        });
      supplierRows.push(['', '', '', `${supplier} TOTAL`, supplierTotal]);
      supplierRows.push([]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(supplierRows);
    ws2['!cols'] = [
      { wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 50 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'By Supplier');

    // ── Sheet 3: Breakdown by Shop ──
    const shopMap = {};
    filtered.forEach(order => {
      const shop = order.franchiseName || 'Unknown';
      if (!shopMap[shop]) shopMap[shop] = {};
      order.items.forEach(item => {
        if (!shopMap[shop][item.styleNumber]) {
          shopMap[shop][item.styleNumber] = {
            description: item.description || '',
            supplierName: order.supplierName || '',
            totalQty: 0,
            colours: {},
          };
        }
        const qty = item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0;
        shopMap[shop][item.styleNumber].totalQty += qty;
        item.colourSizes?.forEach(row => {
          if (!row.colour) return;
          if (!shopMap[shop][item.styleNumber].colours[row.colour])
            shopMap[shop][item.styleNumber].colours[row.colour] = 0;
          shopMap[shop][item.styleNumber].colours[row.colour] += row.quantity || 0;
        });
      });
    });

    const shopRows = [
      ['GLAMOUR GIRL — ORDERS BY SHOP'],
      [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
      [],
    ];

    Object.entries(shopMap).forEach(([shop, styles]) => {
      shopRows.push([`SHOP: ${shop}`]);
      shopRows.push(['Style No.', 'Description', 'Supplier', 'Colours & Quantities', 'Total Qty']);
      let shopTotal = 0;
      Object.entries(styles)
        .sort((a, b) => b[1].totalQty - a[1].totalQty)
        .forEach(([styleNo, data]) => {
          const coloursStr = Object.entries(data.colours)
            .sort((a, b) => b[1] - a[1])
            .map(([c, q]) => `${c}: ${q}`)
            .join(' | ');
          shopRows.push([
            styleNo,
            data.description,
            data.supplierName,
            coloursStr,
            data.totalQty,
          ]);
          shopTotal += data.totalQty;
        });
      shopRows.push(['', '', '', `${shop} TOTAL`, shopTotal]);
      shopRows.push([]);
    });

    const ws3 = XLSX.utils.aoa_to_sheet(shopRows);
    ws3['!cols'] = [
      { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 50 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'By Shop');

    // Download
    const fileName = `GlamourGirl_Orders_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Excel downloaded!');
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Order Summary</h2>
          <p>{summary.length} styles · {grandTotal} total units</p>
        </div>
        <button className="btn btn-rose" onClick={downloadExcel} disabled={summary.length === 0}>
          <Download size={15} /> Download Excel
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>Shop</label>
            <select value={shopFilter} onChange={e => setShopFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Shops</option>
              {shops.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>Supplier</label>
            <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Suppliers</option>
              {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
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

        {/* Download hint */}
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--blush)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--rose-dark)' }}>
          💡 Use filters to narrow down, then click <strong>Download Excel</strong> to export. The file includes 3 sheets: Summary by Style, By Supplier, and By Shop.
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
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.5rem', fontWeight: 700 }}>{summary.length}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.6 }}>Styles</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.5rem', fontWeight: 700 }}>{filtered.length}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.6 }}>Orders</div>
              </div>
              <button onClick={downloadExcel}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '10px 18px', color: 'white', fontFamily: 'DM Sans', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} /> Download Excel
              </button>
            </div>
          </div>

          {/* Summary table */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 2fr 1fr 1fr', gap: 0, background: 'var(--blush)', padding: '12px 20px' }}>
              <div style={thStyle}>Image</div>
              <div style={thStyle}>Style No.</div>
              <div style={thStyle}>Colours & Qty</div>
              <div style={thStyle}>Shops</div>
              <div style={{ ...thStyle, textAlign: 'right' }}>Total Qty</div>
            </div>

            {summary.map((item, idx) => (
              <div key={item.styleNumber}
                style={{ display: 'grid', gridTemplateColumns: '80px 1fr 2fr 1fr 1fr', gap: 0, padding: '16px 20px', alignItems: 'center', borderBottom: idx < summary.length - 1 ? '1px solid var(--light-gray)' : 'none', background: idx % 2 === 0 ? 'var(--white)' : 'var(--cream)' }}>

                <div>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.styleNumber} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--light-gray)' }} />
                    : <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={20} color="var(--rose-dark)" />
                      </div>
                  }
                </div>

                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.05rem', fontWeight: 700 }}>{item.styleNumber}</div>
                  {item.description && <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>{item.description}</div>}
                  {item.suppliers.size > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--info)', marginTop: 4 }}>📦 {[...item.suppliers].join(', ')}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(item.colours).sort((a, b) => b[1] - a[1]).map(([colour, qty]) => (
                    <span key={colour} style={{ background: 'var(--blush)', color: 'var(--charcoal)', padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {colour} <span style={{ fontWeight: 700, color: 'var(--rose-dark)' }}>{qty}</span>
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[...item.shops].map(shop => (
                    <span key={shop} style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', color: 'var(--gray)' }}>
                      {shop}
                    </span>
                  ))}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.5rem', fontWeight: 700, color: 'var(--rose-dark)' }}>{item.totalQty}</span>
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
