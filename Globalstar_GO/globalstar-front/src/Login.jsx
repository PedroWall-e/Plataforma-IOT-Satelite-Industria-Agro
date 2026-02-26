import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Wifi, ArrowRight, Loader2 } from 'lucide-react';
import api from './services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Usamos api.post em vez de axios.post
      // Não precisamos passar a URL completa, apenas o endpoint '/login'
      const res = await api.post('/login', { username, password });

      // Salva os dados de sessão
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('user', res.data.username);
      if (res.data.full_name) {
        localStorage.setItem('full_name', res.data.full_name);
      }

      navigate('/dashboard');
    } catch (err) {
      // O tratamento de erro permanece similar, mas agora usamos o objeto de erro do axios
      if (err.code === "ERR_NETWORK") {
        setError('Erro de conexão com o servidor.');
      } else if (err.response?.status === 401) {
        setError('Usuário ou senha incorretos.');
      } else {
        setError('Ocorreu um erro inesperado. Tente novamente.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 font-sans">

      {/* Container Principal (Card) */}
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-200 relative overflow-hidden">

        {/* Elemento decorativo de fundo (Círculo sutil) */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50"></div>

        {/* Cabeçalho */}
        <div className="text-center mb-8 relative z-10">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform rotate-3 hover:rotate-0 transition-all duration-300">
            <Wifi className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">IoTData Cloud</h1>
          <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-widest mt-1">by Data Frontier</h2>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-5 relative z-10">

          {/* Mensagem de Erro */}
          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-lg border border-red-100 animate-pulse text-center">
              {error}
            </div>
          )}

          {/* Input Usuário */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 sm:text-sm"
              placeholder="Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Input Senha */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="password"
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 sm:text-sm"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Botão de Login */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Entrar
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé: Esqueci minha senha */}
        <div className="mt-8 text-center relative z-10">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate("/forgot-password"); }}
            className="text-sm text-gray-400 hover:text-blue-600 transition-colors duration-200 font-medium"
          >
            Esqueci minha senha
          </a>
        </div>

        {/* Rodapé da Empresa */}
        <div className="mt-6 border-t border-gray-100 pt-4 text-center">
          <p className="text-xs text-gray-300">© 2026 IoTData Cloud by Data Frontier Systems</p>
        </div>

      </div>
    </div>
  );
}