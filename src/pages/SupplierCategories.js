import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';

const COLOURS = [
  '#E8B4B8', '#C9848A', '#7A9EC9', '#6BAE8E', '#E8A87C',
  '#9A7AC9', '#C9C97A', '#7AC9C9', '#C97A9A', '#8E8E8E'
];

export default function SupplierCategories() {
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', colour: '#E8B4B8' });
  const [movingSupplier, setMovingSupplier] = useState(null); // supplier being moved

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [catRes, ordersRes] = await Promise.all([
        API.get('/supplier-categories'),
        API.get('/orders')
      ]);
      setCategories(catRes.data);
      const unique = [...new Set(ordersRes.data.map(o => o.supplierName).filter(Boolean))];
      setSuppliers(unique);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Find which category a supplier belongs to
  const getSupplierCategory = (supplier) =>
    categories.find(c => c.suppliers.includes(supplier));

  // Move supplier to a different category
  const moveSupplier = async (supplier, toCategoryId) => {
    try {
      // Remove from current category
      const fromCat = getSupplierCategory(supplier);
      if (fromCat) {
        await API.put(`/supplier-categories/${fromCat._id}`, {
          ...fromCat,
          suppliers: fromCat.suppliers.filter(s => s !== supplier)
        });
      }

      // Add to new category
      if (toCategoryId !== 'none') {
        const toCat = categories.find(c => c._id === toCategoryId);
        await API.put(`/supplier-categories/${toCategoryId}`, {
          ...toCat,
          suppliers: [...(toCat.suppliers || []), supplier]
        });
      }

      toast.success(`${supplier} moved successfully!`);
      setMovingSupplier(null);
      fetchAll();
    } catch {
      toast.error('Failed to move supplier');
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Category name required');
    try {
      if (editingId) {
        const cat = categories.find(c => c._id === editingId);
        const { data } = await API.put(`/supplier-categories/${editingId}`, {
          ...cat, name: form.name, colour: form.colour
        });
        setCategories(prev => prev.map(c => c._id === editingId ? data : c));
        toast.success('Category updated!');
      } else {
        const { data } = await API.post('/supplier-categories', { ...form, suppliers: [] });
        setCategories(prev => [...prev, data]);
        toast.success('Category created!');
      }
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? Suppliers will become uncategorised.')) return;
    try {
      await API.delete(`/supplier-categories/${id}`);
      setCategories(prev => prev.filter(c => c._id !== id));
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name, colour: cat.colour });
    setEditingId(cat._id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ name: '', colour: '#E8B4B8' });
    setEditingId(null);
    setShowForm(false);
  };

  const categorisedSuppliers = categories.flatMap(c => c.suppliers);
  const uncategorised = suppliers.filter(s => !categorisedSuppliers.includes(s));

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Supplier Categories</h2>
          <p>Organise suppliers into groups — drag any supplier to move it</p>
        </div>
        <button className="btn btn-rose" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={15} /> New Category
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, border: '2px solid var(--rose)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem' }}>{editingId ? 'Edit Category' : 'New Category'}</h3>
            <button className="close-btn" onClick={resetForm}><X size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Category Name *</label>
              <input type="text" placeholder="e.g. Premium, Budget, Local..."
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Colour</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLOURS.map(colour => (
                  <div key={colour} onClick={() => setForm({ ...form, colour })}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', background: colour,
                      cursor: 'pointer',
                      border: form.colour === colour ? '3px solid var(--charcoal)' : '3px solid transparent'
                    }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingId ? 'Update' : 'Create Category'}
            </button>
            <button className="btn btn-outline" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Move supplier modal */}
      {movingSupplier && (
        <div className="modal-overlay" onClick={() => setMovingSupplier(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Move "{movingSupplier}"</h3>
              <button className="close-btn" onClick={() => setMovingSupplier(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray)', fontSize: '0.9rem', marginBottom: 16 }}>
                Select which category to move this supplier to:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Uncategorised option */}
                <button onClick={() => moveSupplier(movingSupplier, 'none')}
                  style={{
                    padding: '12px 16px', borderRadius: 10, border: '1.5px solid var(--light-gray)',
                    background: 'var(--white)', fontFamily: 'DM Sans', fontSize: '0.9rem',
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    color: 'var(--gray)'
                  }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--light-gray)' }} />
                  Uncategorised
                </button>
                {categories.map(cat => {
                  const isCurrent = cat.suppliers.includes(movingSupplier);
                  return (
                    <button key={cat._id}
                      onClick={() => !isCurrent && moveSupplier(movingSupplier, cat._id)}
                      style={{
                        padding: '12px 16px', borderRadius: 10,
                        border: `1.5px solid ${isCurrent ? cat.colour : 'var(--light-gray)'}`,
                        background: isCurrent ? cat.colour + '22' : 'var(--white)',
                        fontFamily: 'DM Sans', fontSize: '0.9rem',
                        cursor: isCurrent ? 'default' : 'pointer',
                        textAlign: 'left', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                        opacity: isCurrent ? 0.7 : 1
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.colour }} />
                        <span style={{ fontWeight: 500 }}>{cat.name}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>
                          {cat.suppliers.length} suppliers
                        </span>
                      </div>
                      {isCurrent
                        ? <span style={{ fontSize: '0.75rem', color: cat.colour, fontWeight: 600 }}>Current</span>
                        : <ArrowRight size={14} color="var(--gray)" />
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories with their suppliers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {categories.map(cat => (
          <div key={cat._id} className="card" style={{ borderLeft: `4px solid ${cat.colour}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.colour }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{cat.name}</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>
                  {cat.suppliers.length} supplier{cat.suppliers.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="close-btn" onClick={() => handleEdit(cat)}
                  style={{ background: 'var(--blush)', color: 'var(--rose-dark)' }}>
                  <Edit2 size={13} />
                </button>
                <button className="close-btn" onClick={() => handleDelete(cat._id)}
                  style={{ background: '#fde8e8', color: 'var(--danger)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {cat.suppliers.length === 0 ? (
                <span style={{ fontSize: '0.82rem', color: 'var(--gray)', fontStyle: 'italic' }}>
                  No suppliers yet — move suppliers here from below
                </span>
              ) : cat.suppliers.map(supplier => (
                <div key={supplier}
                  onClick={() => setMovingSupplier(supplier)}
                  style={{
                    background: cat.colour + '33', color: cat.colour,
                    padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600,
                    border: `1px solid ${cat.colour}66`, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  title="Click to move to another category">
                  {supplier}
                  <ArrowRight size={12} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Uncategorised */}
        {uncategorised.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid var(--light-gray)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--light-gray)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--gray)' }}>Uncategorised</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{uncategorised.length} suppliers</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {uncategorised.map(supplier => (
                <div key={supplier}
                  onClick={() => setMovingSupplier(supplier)}
                  style={{
                    background: 'var(--cream)', color: 'var(--charcoal)',
                    padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem',
                    border: '1px solid var(--light-gray)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--blush)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}
                  title="Click to assign to a category">
                  {supplier}
                  <ArrowRight size={12} color="var(--gray)" />
                </div>
              ))}
            </div>
          </div>
        )}

        {categories.length === 0 && suppliers.length === 0 && (
          <div className="empty-state">
            <h3>No suppliers yet</h3>
            <p>Suppliers will appear here once franchises place orders</p>
          </div>
        )}
      </div>
    </div>
  );
}
