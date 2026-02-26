import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import api from './services/api';

export default function ForgotPassword() {
    const [username, setUsername] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            // Endpoint criado no Go para enviar o token de recuperacao para o usuario
            await api.post('/forgot-password', { username });

            // Sempre retornamos sucesso, mesmo que o email nao exista (segurança: não revelar se alguem esta cadastrado)
            setStatus('success');
            setMessage('Se o usuário existir, enviamos um link de recuperação para o e-mail cadastrado. Por favor, verifique sua caixa de entrada e spam.');
        } catch (err) {
            setStatus('error');
            setMessage('Ocorreu um erro ao tentar processar a solicitação. Tente novamente mais tarde.');
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
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Recuperar Senha</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Insira seu usuário ou e-mail. Enviaremos as instruções de recuperação.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="relative z-10 text-center space-y-6">
                        <div className="bg-green-50 text-green-700 text-sm font-medium p-4 rounded-xl border border-green-200 shadow-sm leading-relaxed">
                            {message}
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all duration-200"
                        >
                            <ArrowLeft className="mr-2 w-4 h-4" />
                            Voltar ao Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        {status === 'error' && (
                            <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-lg border border-red-100 text-center">
                                {message}
                            </div>
                        )}

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                placeholder="Usuário ou e-mail"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-70"
                        >
                            {status === 'loading' ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Enviar Link de Recuperação'
                            )}
                        </button>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-sm border-none bg-transparent text-gray-400 hover:text-blue-600 font-medium inline-flex items-center transition-colors"
                            >
                                <ArrowLeft className="mr-1 w-3 h-3" /> Voltar
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
