import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import MyOrders from './pages/MyOrders';
import AdminOrders from './pages/AdminOrders';
import OrderBoard from './pages/OrderBoard';
import SupplierCategories from './pages/SupplierCategories';
import OrderSummary from './pages/OrderSummary';
import Navbar from './components/Navbar';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/orders" />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/orders'} />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <div className="app">
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/orders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />
        <Route path="/new-order" element={<PrivateRoute><NewOrder /></PrivateRoute>} />
        <Route path="/board" element={<PrivateRoute><OrderBoard /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute adminOnly><AdminOrders /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute adminOnly><Dashboard /></PrivateRoute>} />
        <Route path="/supplier-categories" element={<PrivateRoute adminOnly><SupplierCategories /></PrivateRoute>} />
        <Route path="/order-summary" element={<PrivateRoute adminOnly><OrderSummary /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'DM Sans, sans-serif', borderRadius: '10px' }
        }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
