import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const LOCATIONS = [
  'Eastbourne(H3)', 'Croydon(H9)', 'Hastings(H6)', 'Portsmouth(H8)',
  'Maidstone(H1)', 'Fareham(H4)', 'Boscomb(H5)', 'Bristol' ];

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    franchiseName: '', franchiseLocation: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        franchiseName: form.franchiseName,
        franchiseLocation: form.franchiseLocation,
      });
      login(data);
      toast.success('Account created! Welcome to Glamour Girl.');
      navigate('/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Glamour<span>Girl</span></h1>
          <p>Create Franchise Account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Full Name</label>
            <input type="text" placeholder="Jane Smith" value={form.name}
              onChange={set('name')} required />
          </div>

          <div className="form-group">
            <label>Franchise / Store Name</label>
            <input type="text" placeholder="e.g. Glamour Girl Sandton" value={form.franchiseName}
              onChange={set('franchiseName')} required />
          </div>

          <div className="form-group">
            <label>Franchise Location</label>
            <select value={form.franchiseLocation} onChange={set('franchiseLocation')} required>
              <option value="">Select location...</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="you@franchise.com" value={form.email}
              onChange={set('email')} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Min 6 characters" value={form.password}
              onChange={set('password')} minLength={6} required />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" placeholder="Repeat password" value={form.confirmPassword}
              onChange={set('confirmPassword')} required />
          </div>

          <button type="submit" className="btn btn-rose btn-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
