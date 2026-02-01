import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciais inválidas');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-600">Globalstar Monitor</h2>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="mb-4">
            <label className="block text-sm font-bold mb-1">Usuário</label>
            <input className="w-full border p-2 rounded" type="text" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="mb-6">
            <label className="block text-sm font-bold mb-1">Senha</label>
            <input className="w-full border p-2 rounded" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Entrar</button>
      </form>
    </div>
  );
}