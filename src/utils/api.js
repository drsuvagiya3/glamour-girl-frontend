import axios from 'axios';

const API = axios.create({ baseURL: 'https://glamour-girl-backend.onrender.com/api' });

API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('gg_user') || '{}');
  if (user.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

export default API;
