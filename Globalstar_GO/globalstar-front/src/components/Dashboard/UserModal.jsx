import React from 'react';
import { XCircle } from 'lucide-react';

export default function UserModal({ isOpen, onClose, user, onSubmit, currentUser }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">{user ? 'Editar Usuário' : 'Novo Cadastro'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
                </div>
                <form onSubmit={onSubmit} className="p-6 overflow-y-auto">
                    <input type="hidden" name="id" value={user?.id || ''} />
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Dados de Acesso</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                    <input name="full_name" defaultValue={user?.full_name} required className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Acesso</label>
                                    <select
                                        name="role"
                                        defaultValue={user?.role || 'user'}
                                        disabled={user && user.username === currentUser}
                                        className="w-full border border-gray-300 p-2.5 rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        <option value="user">Usuário (Visualizador)</option>
                                        <option value="support">Suporte</option>
                                        <option value="admin">Admin</option>
                                        <option value="master">Master Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuário (Login)</label>
                                    <input name="username" defaultValue={user?.username} required className="w-full border border-gray-300 p-2.5 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha {user && <span className="text-xs text-gray-400 font-normal">(Opcional)</span>}</label>
                                    <input name="password" type="password" className="w-full border border-gray-300 p-2.5 rounded-lg" placeholder="••••••" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informações Pessoais</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input name="email" type="email" defaultValue={user?.email} className="w-full border border-gray-300 p-2.5 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                    <input name="phone" defaultValue={user?.phone} className="w-full border border-gray-300 p-2.5 rounded-lg" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                                    <input name="address" defaultValue={user?.address} className="w-full border border-gray-300 p-2.5 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                                    <input name="city" defaultValue={user?.city} className="w-full border border-gray-300 p-2.5 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                    <input name="state" defaultValue={user?.state} maxLength="2" className="w-full border border-gray-300 p-2.5 rounded-lg uppercase" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition">Cancelar</button>
                        <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 transition transform hover:-translate-y-0.5">Salvar Dados</button>
                    </div>
                </form>
            </div>
        </div>
    );
}