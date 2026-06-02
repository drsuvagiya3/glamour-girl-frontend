import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusCircle, Trash2, Image, Plus, X, Clock } from 'lucide-react';
import API from '../utils/api';

const COLOURS = [
  'Black', 'White', 'Cream', 'Beige', 'Pink', 'Light Pink', 'Red',
  'Wine', 'Navy blue', 'Royal Blue', 'Sky Blue', 'Mint Green', 'Olive', 'Khaki',
  'Camel', 'Brown', 'Grey', 'Light grey', 'Charcoal', 'Mocha', 'Leapord', 'Baby Pink', 'Light Yellow',
  'Gold', 'Silver', 'Multi-colour', 'Other'
];

const SUPPLIERS = [
  'Joliko', 'L8', 'LEA MODE', 'New Collection',
  'cherry-coco', 'Portebello', 'Venessa', 'mochhi',
  'Tendense', 'Fashion', 'Other'
];

const blankColourRow = () => ({ colour: '', quantity: 0 });
const blankItem = () => ({
  styleNumber: '', description: '', imageUrl: '', imagePreview: '',
  colourSizes: [blankColourRow()],
});

// Style number autocomplete input component
function StyleNumberInput({ value, onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [allStyles, setAllStyles] = useState([]);
  const wrapRef = useRef(null);

  // Load all saved styles once
  useEffect(() => {
    API.get('/styles').then(({ data }) => setAllStyles(data)).catch(() => {});
  }, []);

  // Filter locally as user types
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions(allStyles.slice(0, 10));
    } else {
      const q = value.toLowerCase();
      setSuggestions(allStyles.filter(s => s.styleNumber.toLowerCase().includes(q)).slice(0, 10));
    }
  }, [value, allStyles]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (style) => {
    onSelect(style);
    setShowDrop(false);
  };

  // Check if typed value exactly matches an existing style
  const exactMatch = value.trim()
    ? allStyles.find(s => s.styleNumber.toLowerCase() === value.toLowerCase())
    : null;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="e.g. 1878"
        value={value}
        onChange={e => { onChange(e.target.value); setShowDrop(true); }}
        onFocus={() => setShowDrop(true)}
        required
        style={{ borderColor: exactMatch ? 'var(--warning)' : undefined }}
      />
      {/* Warning banner when exact match found */}
      {exactMatch && (
        <div style={{
          marginTop: 6, padding: '10px 12px', background: '#FDF0E8',
          borderRadius: 8, border: '1.5px solid var(--warning)',
          fontSize: '0.82rem', color: '#8B5E00'
        }}>
          ⚠️ Style <strong>{exactMatch.styleNumber}</strong> already exists.
          <div style={{ marginTop: 4 }}>
            Use the same style number to keep all orders linked together.{' '}
            <button type="button"
              onClick={() => handleSelect(exactMatch)}
              style={{ background: 'none', border: 'none', color: 'var(--rose-dark)', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans', fontSize: '0.82rem', padding: 0, textDecoration: 'underline' }}>
              Click here to use existing style
            </button>
          </div>
        </div>
      )}
      {showDrop && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--white)', border: '1.5px solid var(--light-gray)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 220, overflowY: 'auto', marginTop: 4
        }}>
          {value.trim() && !exactMatch && (
            <div style={dropNewItem} onClick={() => { onChange(value); setShowDrop(false); }}>
              <span style={{ color: 'var(--rose-dark)', fontWeight: 600 }}>+ Use "{value}"</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>New style number</span>
            </div>
          )}
          {suggestions.map(style => (
            <div key={style._id} style={dropItem} onClick={() => handleSelect(style)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--blush)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {style.imageUrl
                  ? <img src={style.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                  : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={14} color="var(--rose-dark)" />
                    </div>
                }
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{style.styleNumber}</div>
                  {style.description && <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{style.description}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const dropItem = { padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid var(--light-gray)' };
const dropNewItem = { padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, borderBottom: '1px solid var(--light-gray)', background: 'var(--cream)' };

export default function NewOrder() {
  // Check if coming from Order Board copy
  const getCopiedOrder = () => {
    try {
      const copied = sessionStorage.getItem('gg_copy_order');
      if (copied) { sessionStorage.removeItem('gg_copy_order'); return JSON.parse(copied); }
    } catch {}
    return null;
  };
  const copied = getCopiedOrder();

  const getInitialSupplier = () => {
    if (!copied?.supplierName) return '';
    if (SUPPLIERS.includes(copied.supplierName)) return copied.supplierName;
    return 'Other';
  };
  const [supplierName, setSupplierName] = useState(getInitialSupplier());
  
  const [customSupplier, setCustomSupplier] = useState(!SUPPLIERS.includes(copied?.supplierName || '') ? (copied?.supplierName || '') : '');
  const [items, setItems] = useState(copied?.items?.length ? copied.items : [blankItem()]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({});
  const fileRefs = useRef([]);
  const navigate = useNavigate();

  const finalSupplier = supplierName === 'Other' ? customSupplier : supplierName;

  const updateItem = (idx, field, value) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  // When user selects from dropdown — auto-fill description and image
  const handleStyleSelect = (idx, style) => {
    setItems(prev => prev.map((item, i) => i !== idx ? item : {
      ...item,
      styleNumber: style.styleNumber,
      description: style.description || item.description,
      imageUrl: style.imageUrl || item.imageUrl,
      imagePreview: style.imageUrl || item.imagePreview,
    }));
  };

  const updateRow = (itemIdx, rowIdx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      const newRows = item.colourSizes.map((row, j) => {
        if (j !== rowIdx) return row;
        return { ...row, [field]: field === 'colour' ? value : (parseInt(value) || 0) };
      });
      return { ...item, colourSizes: newRows };
    }));
  };

  const addColourRow = (itemIdx) =>
    setItems(prev => prev.map((item, i) =>
      i === itemIdx ? { ...item, colourSizes: [...item.colourSizes, blankColourRow()] } : item
    ));

  const removeColourRow = (itemIdx, rowIdx) =>
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIdx) return item;
      if (item.colourSizes.length === 1) return item;
      return { ...item, colourSizes: item.colourSizes.filter((_, j) => j !== rowIdx) };
    }));

  const addItem = () => setItems(prev => [...prev, blankItem()]);
  const removeItem = (idx) => {
    if (items.length === 1) return toast.error('At least one item required');
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleImageUpload = async (index, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB');
    setUploading(prev => ({ ...prev, [index]: true }));
    updateItem(index, 'imagePreview', URL.createObjectURL(file));
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await API.post('/orders/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateItem(index, 'imageUrl', data.imageUrl);
      toast.success('Image uploaded!');
    } catch {
      toast.error('Image upload failed');
      updateItem(index, 'imagePreview', '');
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
    }
  };

  // Save all style numbers after successful order
  const saveStyleNumbers = async (items) => {
    for (const item of items) {
      if (!item.styleNumber) continue;
      try {
        await API.post('/styles', {
          styleNumber: item.styleNumber,
          description: item.description,
          imageUrl: item.imageUrl,
        });
      } catch {}
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!finalSupplier.trim()) return toast.error('Please select a supplier');
    if (items.find(i => !i.styleNumber)) return toast.error('Style number required for all items');
    if (Object.values(uploading).some(Boolean)) return toast.error('Wait for images to finish uploading');

    setLoading(true);
    try {
      const cleanItems = items.map(({ imagePreview, ...rest }) => rest);
      const { data } = await API.post('/orders', { items: cleanItems, notes, supplierName: finalSupplier });
      // Save style numbers for future autocomplete
      await saveStyleNumbers(cleanItems);
      toast.success(`Order ${data.orderNumber} placed!`);
      navigate('/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const itemTotal = (item) => item.colourSizes.reduce((a, r) => a + (r.quantity || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h2>New Order</h2><p>Fill in supplier and item details</p></div>
      </div>

      {copied && (
        <div style={{ background: 'var(--blush)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, borderLeft: '3px solid var(--rose-dark)', fontSize: '0.88rem', color: 'var(--rose-dark)', fontWeight: 500 }}>
          📋 Items copied from another order — supplier and styles are pre-filled. Set your quantities and place your order.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Supplier */}
        <div className="order-form-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Supplier Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: supplierName === 'Other' ? '1fr 1fr' : '1fr', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Supplier Name *</label>
              <select value={supplierName} onChange={e => setSupplierName(e.target.value)} required>
                <option value="">Select supplier...</option>
                {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {supplierName === 'Other' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Enter Supplier Name</label>
                <input type="text" placeholder="Supplier name" value={customSupplier}
                  onChange={e => setCustomSupplier(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {items.map((item, itemIdx) => (
          <div key={itemIdx} className="order-form-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--gray)' }}>ITEM {itemIdx + 1}</h3>
              <button type="button" className="close-btn" onClick={() => removeItem(itemIdx)}>
                <Trash2 size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 16, marginBottom: 16 }}>
              {/* Image upload */}
              <div>
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  ref={el => fileRefs.current[itemIdx] = el}
                  onChange={e => handleImageUpload(itemIdx, e.target.files[0])} />
                <div className="image-upload-zone" style={{ padding: 10, minHeight: 100 }}
                  onClick={() => fileRefs.current[itemIdx]?.click()}>
                  {item.imagePreview
                    ? <img src={item.imagePreview} alt="preview"
                        style={{ width: '100%', height: 86, objectFit: 'cover', borderRadius: 6 }} />
                    : <div style={{ textAlign: 'center' }}>
                        <Image size={22} color="var(--rose-dark)" style={{ opacity: 0.5 }} />
                        <p style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: 4 }}>
                          {uploading[itemIdx] ? 'Uploading...' : 'Tap to upload'}
                        </p>
                      </div>
                  }
                </div>
              </div>

              <div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Style Number *
                    <span style={{ fontSize: '0.72rem', color: 'var(--rose-dark)', fontWeight: 400 }}>
                      — type or pick a previous one
                    </span>
                  </label>
                  <StyleNumberInput
                    value={item.styleNumber}
                    onChange={(val) => updateItem(itemIdx, 'styleNumber', val)}
                    onSelect={(style) => handleStyleSelect(itemIdx, style)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Description</label>
                  <input type="text" placeholder="e.g. Floral summer dress" value={item.description}
                    onChange={e => updateItem(itemIdx, 'description', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Colour + Quantity table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--blush)' }}>
                    <th style={th}>Colour</th>
                    <th style={th}>Quantity</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {item.colourSizes.map((row, rowIdx) => (
                    <tr key={rowIdx} style={{ borderBottom: '1px solid var(--light-gray)' }}>
                      <td style={td}>
                        <select value={row.colour}
                          onChange={e => updateRow(itemIdx, rowIdx, 'colour', e.target.value)}
                          style={{ border: 'none', background: 'transparent', fontFamily: 'DM Sans', fontSize: '0.88rem', width: '100%', outline: 'none' }}>
                          <option value="">Select colour...</option>
                          {COLOURS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={td}>
                        <input type="number" min="0" value={row.quantity}
                          onChange={e => updateRow(itemIdx, rowIdx, 'quantity', e.target.value)}
                          style={numInput} />
                      </td>
                      <td style={td}>
                        <button type="button" onClick={() => removeColourRow(itemIdx, rowIdx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f5f0eb', fontWeight: 700 }}>
                    <td style={{ ...td, color: 'var(--gray)', fontSize: '0.8rem' }}>Total Qty</td>
                    <td style={{ ...td, color: 'var(--rose-dark)' }}>{itemTotal(item)}</td>
                    <td style={td}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button type="button" onClick={() => addColourRow(itemIdx)}
              className="btn btn-outline btn-sm" style={{ marginTop: 10 }}>
              <Plus size={13} /> Add Colour
            </button>
          </div>
        ))}

        <button type="button" className="btn btn-outline" onClick={addItem}
          style={{ marginBottom: 16, width: '100%' }}>
          <PlusCircle size={15} /> Add Another Item
        </button>

        {/* Notes + Submit */}
        <div className="order-form-card">
          <div className="form-group">
            <label>Order Notes (optional)</label>
            <textarea placeholder="Any special instructions..." value={notes}
              onChange={e => setNotes(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/orders')}>Cancel</button>
            <button type="submit" className="btn btn-rose" disabled={loading}>
              {loading ? 'Placing Order...' : `Place Order (${items.length} item${items.length > 1 ? 's' : ''})`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const th = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', color: 'var(--rose-dark)', letterSpacing: '0.5px' };
const td = { padding: '8px 12px', verticalAlign: 'middle' };
const numInput = { width: 80, textAlign: 'center', border: '1px solid var(--light-gray)', borderRadius: 6, padding: '6px 8px', fontFamily: 'DM Sans', fontSize: '0.88rem', background: 'var(--white)', outline: 'none' };
