import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, KeyRound, AlertCircle } from 'lucide-react';
import api from './services/api';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const navigate = useNavigate();
    const location = useLocation();

    // Extrair o token da URL (ex: /reset-password?token=XYZ)
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Link de redefinição inválido ou ausente. Por favor, solicite a recuperação de senha novamente.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('As senhas não coincidem. Tente novamente.');
            return;
        }

        if (password.length < 6) {
            setStatus('error');
            setMessage('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            await api.post('/reset-password', { token, new_password: password });
            setStatus('success');
            setMessage('Senha redefinida com sucesso! Você já pode fazer o login.');
        } catch (err) {
            setStatus('error');
            if (err.response?.status === 400 || err.response?.status === 401) {
                setMessage('O link de recuperação expirou ou é inválido. Por favor, solicite outro recarregando a página de login.');
            } else {
                setMessage('Ocorreu um erro ao tentar redefinir a senha. Tente novamente.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 font-sans">
            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-200 relative overflow-hidden">

                {/* Decoracao */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50"></div>

                <div className="text-center mb-8 relative z-10">
                    <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <KeyRound className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Crie sua nova senha</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Insira a nova senha para sua conta e confirme para validar.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="relative z-10 text-center space-y-6">
                        <div className="bg-green-50 text-green-700 text-sm font-medium p-4 rounded-xl border border-green-200 shadow-sm leading-relaxed">
                            {message}
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                        >
                            Ir para o Login <ArrowRight className="ml-2 w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        {status === 'error' && (
                            <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-lg border border-red-100 flex items-start gap-2 text-left">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{message}</span>
                            </div>
                        )}

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                placeholder="Nova senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={!token}
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                placeholder="Confirme a nova senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={!token}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading' || !token}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Salvar Nova Senha'
                            )}
                        </button>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-sm border-none bg-transparent text-gray-400 hover:text-blue-600 font-medium transition-colors"
                            >
                                Cancelar e voltar ao início
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
