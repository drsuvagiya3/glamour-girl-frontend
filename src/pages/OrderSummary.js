import React, { useState, useEffect } from 'react';
import { Package, Download, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import API from '../utils/api';

// Edit style number modal
function EditStyleModal({ styleNumber, onSave, onClose }) {
  const [newStyle, setNewStyle] = React.useState(styleNumber);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Style Number</h3>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: 14 }}>
            Changing <strong>{styleNumber}</strong> to a style that already exists will <strong>merge</strong> the quantities together.
          </p>
          <div className="form-group">
            <label>New Style Number</label>
            <input type="text" value={newStyle} onChange={e => setNewStyle(e.target.value.trim())}
              onKeyDown={e => e.key === 'Enter' && newStyle && onSave(newStyle)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1 }}
              onClick={() => newStyle && newStyle !== styleNumber && onSave(newStyle)}
              disabled={!newStyle || newStyle === styleNumber}>
              Save & Merge if needed
            </button>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSummary() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shopFilter, setShopFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shops, setShops] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingStyle, setEditingStyle] = useState(null);

  // Save edited style number — merges if target already exists
  const saveStyleNumber = async (oldStyle, newStyle) => {
    try {
      // Find all orders that have this style number
      const affectedOrders = orders.filter(o =>
        o.items.some(item => item.styleNumber === oldStyle)
      );
      // Update each order
      for (const order of affectedOrders) {
        const updatedItems = order.items.map(item => {
          if (item.styleNumber !== oldStyle) return item;
          return { ...item, styleNumber: newStyle };
        });
        await API.put(`/orders/${order._id}/status`, {
          status: order.status,
          items: updatedItems
        });
      }
      // Update local state
      setOrders(prev => prev.map(order => ({
        ...order,
        items: order.items.map(item =>
          item.styleNumber === oldStyle ? { ...item, styleNumber: newStyle } : item
        )
      })));
      toast.success(`Style ${oldStyle} renamed to ${newStyle}${affectedOrders.length > 1 ? ' — merged across ' + affectedOrders.length + ' orders' : ''}!`);
      setEditingStyle(null);
    } catch {
      toast.error('Failed to update style number');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([API.get('/orders'), API.get('/supplier-categories')])
      .then(([ordersRes, catRes]) => {
        const ordersData = ordersRes.status === 'fulfilled' ? ordersRes.value.data : [];
        const catsData = catRes.status === 'fulfilled' ? catRes.value.data : [];
        setOrders(ordersData);
        setShops([...new Set(ordersData.map(o => o.franchiseName).filter(Boolean))]);
        setSuppliers([...new Set(ordersData.map(o => o.supplierName).filter(Boolean))]);
        setCategories(catsData);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const selectedCatName = categoryFilter !== 'all'
    ? categories.find(c => c._id === categoryFilter)?.name || '' : '';

  const filtered = orders.filter(o => {
    if (shopFilter !== 'all' && o.franchiseName !== shopFilter) return false;
    if (supplierFilter !== 'all' && o.supplierName !== supplierFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (categoryFilter !== 'all') {
      const orderCat = o.adminCategory || o.supplierName || '';
      if (orderCat !== selectedCatName) return false;
    }
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
          orders: [],
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
      summaryMap[key].orders.push({
        orderNumber: order.orderNumber,
        franchiseName: order.franchiseName,
        franchiseLocation: order.franchiseLocation,
        supplierName: order.supplierName,
        status: order.status,
        grandTotal: order.grandTotal,
        colourSizes: item.colourSizes,
        price: item.price,
        retailPrice: item.retailPrice,
        totalAmount: item.totalAmount,
      });
    });
  });

  const summary = Object.values(summaryMap).sort((a, b) => b.totalQty - a.totalQty);
  const grandTotal = summary.reduce((a, s) => a + s.totalQty, 0);

  // ── EXCEL DOWNLOAD ──
  const downloadExcel = () => {
    if (summary.length === 0) return toast.error('No data to download');
    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toLocaleDateString('en-GB');

    // ── Sheet 1: Summary by Style (one row per colour per shop) ──
    const s1Rows = [
      ['GLAMOUR GIRL — ORDER SUMMARY BY STYLE'],
      ['Date: ' + dateStr],
      ['Supplier: ' + (supplierFilter === 'all' ? 'All' : supplierFilter) + '  |  Shop: ' + (shopFilter === 'all' ? 'All' : shopFilter) + '  |  Status: ' + (statusFilter === 'all' ? 'All' : statusFilter)],
      [],
      ['Style No.', 'Description', 'Supplier', 'Shop', 'Location', 'Colour', 'Qty', 'Total Style Qty', 'Wholesale (£)', 'Retail (£)'],
    ];

    summary.forEach(item => {
      let firstRow = true;
      item.orders.forEach(order => {
        order.colourSizes?.forEach((row, rowIdx) => {
          if (!row.colour || !row.quantity) return;
          s1Rows.push([
            firstRow && rowIdx === 0 ? item.styleNumber : '',
            firstRow && rowIdx === 0 ? item.description : '',
            firstRow && rowIdx === 0 ? [...item.suppliers].join(', ') : '',
            rowIdx === 0 ? order.franchiseName : '',
            rowIdx === 0 ? order.franchiseLocation : '',
            row.colour,
            row.quantity,
            firstRow && rowIdx === 0 ? item.totalQty : '',
            firstRow && rowIdx === 0 && order.price ? order.price : '',
            firstRow && rowIdx === 0 && order.retailPrice ? order.retailPrice : '',
          ]);
          if (rowIdx === 0) firstRow = false;
        });
      });
      s1Rows.push([]);
    });

    s1Rows.push(['', '', '', '', '', '', '', 'GRAND TOTAL: ' + grandTotal, '', '']);
    const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
    ws1['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary by Style');

    // ── Sheet 2: Style × Shop (grid — each shop is a column) ──
    const s2Rows = [
      ['GLAMOUR GIRL — STYLE × SHOP (COLOUR BREAKDOWN)'],
      ['Date: ' + dateStr],
      [],
    ];

    const allShops = [...new Set(filtered.map(o => o.franchiseName).filter(Boolean))].sort();

    summary.forEach(item => {
      // Build shopColourMap: shop -> colour -> qty
      const shopColourMap = {};
      item.orders.forEach(order => {
        const shop = order.franchiseName || 'Unknown';
        if (!shopColourMap[shop]) shopColourMap[shop] = {};
        order.colourSizes?.forEach(row => {
          if (!row.colour || !row.quantity) return;
          if (!shopColourMap[shop][row.colour]) shopColourMap[shop][row.colour] = 0;
          shopColourMap[shop][row.colour] += row.quantity;
        });
      });

      const itemShops = Object.keys(shopColourMap).sort();
      if (itemShops.length === 0) return;

      // Style header
      s2Rows.push(['Style: ' + item.styleNumber, item.description, 'Supplier: ' + [...item.suppliers].join(', '), 'Total: ' + item.totalQty + ' units']);
      s2Rows.push(['Colour', ...itemShops, 'TOTAL']);

      const allColours = Object.keys(item.colours).sort((a, b) => item.colours[b] - item.colours[a]);
      allColours.forEach(colour => {
        const row = [colour];
        let rowTotal = 0;
        itemShops.forEach(shop => {
          const qty = shopColourMap[shop]?.[colour] || 0;
          row.push(qty);
          rowTotal += qty;
        });
        row.push(rowTotal);
        s2Rows.push(row);
      });

      // Totals row
      const totRow = ['TOTAL'];
      let styleTotal = 0;
      itemShops.forEach(shop => {
        const t = Object.values(shopColourMap[shop] || {}).reduce((a, v) => a + v, 0);
        totRow.push(t);
        styleTotal += t;
      });
      totRow.push(styleTotal);
      s2Rows.push(totRow);
      s2Rows.push([]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(s2Rows);
    ws2['!cols'] = [{ wch: 16 }, ...Array(allShops.length + 2).fill({ wch: 14 })];
    XLSX.utils.book_append_sheet(wb, ws2, 'Style x Shop');

    // ── Sheet 3: By Supplier ──
    const supMap = {};
    filtered.forEach(order => {
      const sup = order.supplierName || 'Unknown';
      if (!supMap[sup]) supMap[sup] = {};
      order.items.forEach(item => {
        if (!supMap[sup][item.styleNumber]) {
          supMap[sup][item.styleNumber] = { description: item.description || '', qty: 0, colours: {}, shops: new Set() };
        }
        const qty = item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0;
        supMap[sup][item.styleNumber].qty += qty;
        item.colourSizes?.forEach(row => {
          if (!row.colour) return;
          if (!supMap[sup][item.styleNumber].colours[row.colour]) supMap[sup][item.styleNumber].colours[row.colour] = 0;
          supMap[sup][item.styleNumber].colours[row.colour] += row.quantity || 0;
        });
        if (order.franchiseName) supMap[sup][item.styleNumber].shops.add(order.franchiseName);
      });
    });

    const s3Rows = [['GLAMOUR GIRL — BY SUPPLIER'], ['Date: ' + dateStr], []];
    Object.entries(supMap).forEach(([sup, styles]) => {
      s3Rows.push(['SUPPLIER: ' + sup]);
      s3Rows.push(['Style No.', 'Description', 'Colour', 'Qty', 'Total Qty', 'Shops']);
      let supTotal = 0;
      Object.entries(styles).sort((a, b) => b[1].qty - a[1].qty).forEach(([style, data]) => {
        const colours = Object.entries(data.colours).sort((a, b) => b[1] - a[1]);
        colours.forEach(([colour, qty], idx) => {
          s3Rows.push([idx === 0 ? style : '', idx === 0 ? data.description : '', colour, qty, idx === 0 ? data.qty : '', idx === 0 ? [...data.shops].join(', ') : '']);
        });
        supTotal += data.qty;
        s3Rows.push([]);
      });
      s3Rows.push(['', '', '', '', 'TOTAL: ' + supTotal, '']);
      s3Rows.push([]);
    });
    const ws3 = XLSX.utils.aoa_to_sheet(s3Rows);
    ws3['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'By Supplier');

    // ── Sheet 4: By Shop ──
    const shopMap = {};
    filtered.forEach(order => {
      const shop = order.franchiseName || 'Unknown';
      if (!shopMap[shop]) shopMap[shop] = {};
      order.items.forEach(item => {
        if (!shopMap[shop][item.styleNumber]) {
          shopMap[shop][item.styleNumber] = { description: item.description || '', supplierName: order.supplierName || '', qty: 0, colours: {} };
        }
        const qty = item.colourSizes?.reduce((a, r) => a + (r.quantity || 0), 0) || 0;
        shopMap[shop][item.styleNumber].qty += qty;
        item.colourSizes?.forEach(row => {
          if (!row.colour) return;
          if (!shopMap[shop][item.styleNumber].colours[row.colour]) shopMap[shop][item.styleNumber].colours[row.colour] = 0;
          shopMap[shop][item.styleNumber].colours[row.colour] += row.quantity || 0;
        });
      });
    });

    const s4Rows = [['GLAMOUR GIRL — BY SHOP'], ['Date: ' + dateStr], []];
    Object.entries(shopMap).forEach(([shop, styles]) => {
      s4Rows.push(['SHOP: ' + shop]);
      s4Rows.push(['Style No.', 'Description', 'Supplier', 'Colour', 'Qty', 'Total Qty']);
      let shopTotal = 0;
      Object.entries(styles).sort((a, b) => b[1].qty - a[1].qty).forEach(([style, data]) => {
        const colours = Object.entries(data.colours).sort((a, b) => b[1] - a[1]);
        colours.forEach(([colour, qty], idx) => {
          s4Rows.push([idx === 0 ? style : '', idx === 0 ? data.description : '', idx === 0 ? data.supplierName : '', colour, qty, idx === 0 ? data.qty : '']);
        });
        shopTotal += data.qty;
        s4Rows.push([]);
      });
      s4Rows.push(['', '', '', '', 'TOTAL: ' + shopTotal, '']);
      s4Rows.push([]);
    });
    const ws4 = XLSX.utils.aoa_to_sheet(s4Rows);
    ws4['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'By Shop');

    const fileName = 'GlamourGirl_' + dateStr.replace(/\//g, '-') + '.xlsx';
    XLSX.writeFile(wb, fileName);
    toast.success('Excel downloaded — 4 sheets!');
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
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {categories.length > 0 && (
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={labelStyle}>Category</label>
              <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setSupplierFilter('all'); }} style={selectStyle}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={labelStyle}>Supplier</label>
            <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Suppliers</option>
              {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={labelStyle}>Shop</label>
            <select value={shopFilter} onChange={e => setShopFilter(e.target.value)} style={selectStyle}>
              <option value="all">All Shops</option>
              {shops.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
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
              onClick={() => { setShopFilter('all'); setSupplierFilter('all'); setStatusFilter('all'); setCategoryFilter('all'); }}>
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
              <button onClick={downloadExcel} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '10px 18px', color: 'white', fontFamily: 'DM Sans', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} /> Download Excel
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 2fr 1fr 1fr', background: 'var(--blush)', padding: '12px 20px' }}>
              <div style={thStyle}>Image</div>
              <div style={thStyle}>Style No.</div>
              <div style={thStyle}>Colours & Qty</div>
              <div style={thStyle}>Shops</div>
              <div style={{ ...thStyle, textAlign: 'right' }}>Total Qty</div>
            </div>
            {summary.map((item, idx) => (
              <div key={item.styleNumber} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 2fr 1fr 1fr', padding: '16px 20px', alignItems: 'center', borderBottom: idx < summary.length - 1 ? '1px solid var(--light-gray)' : 'none', background: idx % 2 === 0 ? 'var(--white)' : 'var(--cream)' }}>
                <div>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.styleNumber} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--light-gray)' }} />
                    : <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20} color="var(--rose-dark)" /></div>
                  }
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.05rem', fontWeight: 700 }}>{item.styleNumber}</div>
                    <button onClick={() => setEditingStyle(item.styleNumber)}
                      title="Edit style number"
                      style={{ background: 'var(--light-gray)', border: 'none', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', color: 'var(--gray)', display: 'flex', alignItems: 'center' }}>
                      <Edit2 size={11} />
                    </button>
                  </div>
                  {item.description && <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 2 }}>{item.description}</div>}
                  {item.suppliers.size > 0 && <div style={{ fontSize: '0.72rem', color: 'var(--info)', marginTop: 4 }}>📦 {[...item.suppliers].join(', ')}</div>}
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
                    <span key={shop} style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', color: 'var(--gray)' }}>{shop}</span>
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
    {editingStyle && (
        <EditStyleModal
          styleNumber={editingStyle}
          onSave={(newStyle) => saveStyleNumber(editingStyle, newStyle)}
          onClose={() => setEditingStyle(null)}
        />
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 };
const selectStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid var(--light-gray)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.88rem', outline: 'none', background: 'var(--white)', cursor: 'pointer' };
const thStyle = { fontSize: '0.78rem', fontWeight: 700, color: 'var(--rose-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' };
