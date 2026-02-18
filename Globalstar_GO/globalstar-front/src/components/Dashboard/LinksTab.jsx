import React, { useState } from 'react';
import { 
    Users, Search, ChevronRight, Link as LinkIcon, 
    Smartphone, CheckCircle, PlusCircle 
} from 'lucide-react';

export default function LinksTab({ users, devices, onPermissionChange }) {
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSearch, setUserSearch] = useState('');
    const [deviceSearch, setDeviceSearch] = useState('');

    // Filtra usuários localmente
    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
    );

    // Filtra e ordena dispositivos
    const getSortedDevices = () => {
        if (!selectedUser) return [];
        
        return devices
            .filter(d => d.esn.toLowerCase().includes(deviceSearch.toLowerCase()) || 
                         (d.name && d.name.toLowerCase().includes(deviceSearch.toLowerCase())))
            .sort((a, b) => {
                // Verifica se o usuário tem acesso (para colocar os marcados no topo)
                // Garante que users seja um array para evitar erro se vier null do backend
                const usersA = Array.isArray(a.users) ? a.users : [];
                const usersB = Array.isArray(b.users) ? b.users : [];

                const hasA = usersA.includes(selectedUser.username);
                const hasB = usersB.includes(selectedUser.username);
                
                // Ordenação: Quem tem acesso vem primeiro (-1), quem não tem vem depois (1)
                return (hasA === hasB) ? 0 : hasA ? -1 : 1;
            });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            {/* COLUNA DA ESQUERDA: LISTA DE USUÁRIOS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <Users size={16}/> Selecione o Usuário
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 text-gray-400 h-4 w-4" />
                        <input 
                            type="text" placeholder="Buscar usuário..." 
                            className="pl-8 pr-3 py-2 w-full text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                            value={userSearch} onChange={e => setUserSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredUsers.map(u => (
                        <button 
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            className={`w-full text-left p-3 rounded-lg text-sm flex justify-between items-center transition ${selectedUser?.id === u.id ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                            <div>
                                <div className="font-bold">{u.full_name || u.username}</div>
                                <div className="text-xs opacity-70">@{u.username} • {u.role}</div>
                            </div>
                            <ChevronRight size={16} className={`opacity-50 ${selectedUser?.id === u.id ? 'text-blue-600 opacity-100' : ''}`}/>
                        </button>
                    ))}
                </div>
            </div>

            {/* COLUNA DA DIREITA: LISTA DE DISPOSITIVOS */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full relative">
                {!selectedUser ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <LinkIcon size={48} className="mb-4 opacity-20"/>
                        <p>Selecione um usuário ao lado para gerenciar acessos.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <div className="bg-blue-100 text-blue-700 p-1.5 rounded-lg"><LinkIcon size={16}/></div>
                                    Acessos de {selectedUser.full_name}
                                </h3>
                                <p className="text-xs text-gray-500 ml-9">Gerencie quais dispositivos este usuário pode ver.</p>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 text-gray-400 h-4 w-4" />
                                <input 
                                    type="text" placeholder="Filtrar dispositivos..." 
                                    className="pl-8 pr-3 py-2 w-full text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                    value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {getSortedDevices().map(dev => {
                                    // Verificação de segurança para array de users
                                    const devUsers = Array.isArray(dev.users) ? dev.users : [];
                                    const hasAccess = devUsers.includes(selectedUser.username);
                                    
                                    return (
                                        <div key={dev.id} 
                                            onClick={() => onPermissionChange(selectedUser.id, dev.id, hasAccess ? 'revoke' : 'grant')}
                                            className={`
                                                cursor-pointer p-3 rounded-xl border flex justify-between items-center transition group
                                                ${hasAccess 
                                                    ? 'bg-green-50 border-green-200 hover:border-green-300' 
                                                    : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md'}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${hasAccess ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Smartphone size={18} />
                                                </div>
                                                <div>
                                                    <div className={`font-mono font-bold text-sm ${hasAccess ? 'text-green-800' : 'text-gray-700'}`}>{dev.esn}</div>
                                                    <div className="text-[10px] text-gray-400 truncate w-32">{dev.name}</div>
                                                </div>
                                            </div>
                                            <div className="text-gray-400">
                                                {hasAccess 
                                                    ? <CheckCircle size={20} className="text-green-500" />
                                                    : <PlusCircle size={20} className="group-hover:text-blue-500 transition"/>
                                                }
                                            </div>
                                        </div>
                                    )
                                })}
                                {getSortedDevices().length === 0 && (
                                    <div className="col-span-2 text-center py-10 text-gray-400">
                                        Nenhum dispositivo encontrado.
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}