import axios from 'axios';

// Cria a instância do axios com a URL base vazia.
// Na nuvem: O Nginx redireciona para o Backend.
// No PC local: O Vite (proxy) redirecionará para a porta 5000.
const api = axios.create({
  baseURL: '', 
});

// Interceptor: Adiciona o Token em toda requisição automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;