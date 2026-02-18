import React, { useState } from 'react';
import { 
    Search, Filter, UserPlus, MapPin, Edit, 
    Trash2, ChevronLeft, ChevronRight 
} from 'lucide-react';

export default function UsersTab({ users, currentUser, onEdit, onDelete, onAdd }) {
    // Estados locais de UI (busca e paginação pertencem à tabela)
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Lógica de filtro
    const filteredUsers = users.filter(item => {
        const matchesSearch = !searchTerm || 
            [item.username, item.full_name, item.email].some(field => 
                String(field || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        const matchesRole = roleFilter === 'all' || item.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Lógica de paginação
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentItems = filteredUsers.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    // Resetar página se buscar
    const handleSearch = (val) => {
        setSearchTerm(val);
        setCurrentPage(1);
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* BARRA DE CONTROLE / BUSCA */}
            <div className="mb-6 flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex gap-4 w-full max-w-2xl">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
                        <input 
                            type="text" placeholder="Pesquisar nome, email..." 
                            className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                            value={searchTerm} onChange={e => handleSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative min-w-[150px]">
                        <Filter className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
                        <select 
                            className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
                            value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="all">Todos Cargos</option>
                            <option value="user">Usuários</option>
                            <option value="support">Suporte</option>
                            <option value="admin">Admin</option>
                            <option value="master">Master</option>
                        </select>
                    </div>
                </div>
                <button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition">
                    <UserPlus size={18}/> Novo Usuário
                </button>
            </div>

            {/* TABELA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold tracking-wider border-b">
                            <tr>
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Função</th>
                                <th className="p-4">Contato</th>
                                <th className="p-4">Localização</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentItems.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{u.full_name}</div>
                                        <div className="text-xs text-gray-500 font-mono">@{u.username}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                            u.role === 'master' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            u.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            u.role === 'support' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                            'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}>{u.role}</span>
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        <div className="flex flex-col gap-0.5">
                                            <span>{u.email}</span>
                                            <span className="text-xs text-gray-400">{u.phone}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        {u.city && <div className="flex items-center gap-1 text-xs"><MapPin size={12}/> {u.city}-{u.state}</div>}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => onEdit(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button>
                                            <button 
                                                onClick={() => onDelete(u.id)} 
                                                disabled={u.username === currentUser}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {currentItems.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-400 italic">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINAÇÃO */}
                <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                    <span className="text-xs text-gray-500">Mostrando {currentItems.length} de {filteredUsers.length}</span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)} className="p-1 rounded bg-white border hover:bg-gray-100 disabled:opacity-50"><ChevronLeft size={16}/></button>
                        <span className="text-sm font-bold py-1 px-2">{currentPage}</span>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p+1)} className="p-1 rounded bg-white border hover:bg-gray-100 disabled:opacity-50"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>
        </div>
    );
}