import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Users, Smartphone, Search, ChevronLeft, ChevronRight, 
    Share2, MapPin, Edit, Trash2, UserPlus, Link as LinkIcon, 
    PlusCircle, XCircle, CheckCircle, Filter, ChevronDown, ChevronUp,
    Satellite, Radio, Wifi, Bluetooth, Signal, Edit2, Check
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('monitor'); 
  const [messages, setMessages] = useState([]);
  const [masterData, setMasterData] = useState({ users: [], devices: [] });
  
  // --- ESTADOS DE MONITOR ---
  const [monitorSubTab, setMonitorSubTab] = useState('SATELITE-DG');
  const [monitorSearch, setMonitorSearch] = useState('');
  const [expandedDevices, setExpandedDevices] = useState(new Set());
  
  // NOVO: Estados para editar nome do dispositivo
  const [editingDeviceESN, setEditingDeviceESN] = useState(null); // Qual ESN estou editando?
  const [tempDeviceName, setTempDeviceName] = useState(''); // O texto que estou digitando

  // --- ESTADOS DE UI GERAIS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [selectedUserForLink, setSelectedUserForLink] = useState(null);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');

  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('user');
  const fullName = localStorage.getItem('full_name') || currentUser;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    if (role === 'master') fetchMasterData();
    return () => clearInterval(interval);
  }, [token, role]);

  const fetchMessages = async () => {
    // Se estiver editando um nome, não atualiza para não perder o foco do input
    if (editingDeviceESN) return; 
    try {
      const res = await axios.get('http://localhost:5000/api/messages', authHeader);
      setMessages(res.data || []);
    } catch (error) { if (error.response?.status === 401) navigate('/'); }
  };

  const fetchMasterData = async () => {
    try {
        const res = await axios.get('http://localhost:5000/api/master/data', authHeader);
        setMasterData(res.data);
    } catch (e) { console.error(e); }
  };

  const filterAndPaginate = (data, searchKeys) => {
      const filtered = data.filter(item => {
          const matchesSearch = !searchTerm || searchKeys.some(key => 
              String(item[key] || '').toLowerCase().includes(searchTerm.toLowerCase())
          );
          const matchesRole = roleFilter === 'all' || item.role === roleFilter;
          return matchesSearch && matchesRole;
      });
      const indexOfLast = currentPage * itemsPerPage;
      const indexOfFirst = indexOfLast - itemsPerPage;
      const currentItems = filtered.slice(indexOfFirst, indexOfLast);
      const totalPages = Math.ceil(filtered.length / itemsPerPage);
      return { currentItems, totalPages, totalCount: filtered.length };
  };

  const handleUserSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      if (editingUser) data.id = editingUser.id;
      if(data.id) data.id = parseInt(data.id);
      try {
        await axios.post('http://localhost:5000/api/master/user', data, authHeader);
        alert(editingUser ? 'Atualizado!' : 'Criado!');
        setIsModalOpen(false);
        fetchMasterData();
      } catch (err) { alert("Erro ao salvar"); }
  };

  const handleDeleteUser = async (id) => {
      if(!confirm("Tem certeza?")) return;
      await axios.post('http://localhost:5000/api/master/user/delete', { id }, authHeader);
      fetchMasterData();
  };

  const handlePermission = async (deviceId, action) => {
      if (!selectedUserForLink) return;
      try {
        await axios.post('http://localhost:5000/api/master/permission', 
            { user_id: parseInt(selectedUserForLink.id), device_id: parseInt(deviceId), action }, authHeader);
        fetchMasterData();
      } catch (err) { alert("Erro ao vincular"); }
  };

  // --- NOVO: SALVAR NOME DO DISPOSITIVO ---
  const saveDeviceName = async (esn) => {
      try {
        await axios.post('http://localhost:5000/api/device/update', 
            { esn, name: tempDeviceName }, authHeader);
        
        // Atualiza localmente para feedback instantâneo
        const updatedMsgs = messages.map(m => m.esn === esn ? { ...m, device_name: tempDeviceName } : m);
        setMessages(updatedMsgs);
        setEditingDeviceESN(null);
        // fetchMessages será chamado no próximo intervalo
      } catch (err) { alert("Erro ao salvar nome"); }
  };

  const startEditingDevice = (esn, currentName) => {
      setTempDeviceName(currentName || '');
      setEditingDeviceESN(esn);
  };

  const toggleDeviceExpand = (esn) => {
      if (editingDeviceESN === esn) return; // Não expande se estiver editando nome
      setExpandedDevices(prev => {
          const newSet = new Set(prev);
          if (newSet.has(esn)) newSet.delete(esn);
          else newSet.add(esn);
          return newSet;
      });
  };

  const logout = () => { localStorage.clear(); navigate('/'); };

  const safeMessages = Array.isArray(messages) ? messages : [];
  const allGroups = safeMessages.reduce((acc, msg) => {
    (acc[msg.esn] = acc[msg.esn] || []).push(msg);
    return acc;
  }, {});

  const filteredGroups = Object.entries(allGroups).filter(([esn, msgs]) => {
      if (monitorSearch) {
        const term = monitorSearch.toLowerCase();
        // Busca no Nome, ESN ou Payload
        const name = msgs[0].device_name || '';
        const matchesText = name.toLowerCase().includes(term) || esn.toLowerCase().includes(term) || msgs.some(m => m.payload.toLowerCase().includes(term));
        if (!matchesText) return false;
      }
      if (monitorSubTab === 'SATELITE-DG') return true; 
      return false; 
  });

  const userPagination = filterAndPaginate(masterData.users, ['username', 'full_name', 'email']);
  const subTabs = [
      { id: 'SATELITE-DG', icon: Satellite, label: 'Satélite DG' },
      { id: 'LORA', icon: Radio, label: 'LoRaWAN' },
      { id: 'WI-FI', icon: Wifi, label: 'Wi-Fi' },
      { id: 'BLUETOOH', icon: Bluetooth, label: 'Bluetooth' },
      { id: '5G/4G', icon: Signal, label: '5G / 4G' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg text-white"><Smartphone size={20} /></div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 leading-tight">Data Frontier</h1>
                    <p className="text-[10px] text-gray-500 font-medium tracking-wider">IOT CONTROL PANEL</p>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  {role === 'master' && (
                      <nav className="flex bg-gray-100 p-1 rounded-lg">
                          {['monitor', 'users', 'links'].map(tab => (
                              <button key={tab} onClick={() => { setActiveTab(tab); setSearchTerm(''); }} 
                                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                                  {tab === 'monitor' ? 'Monitor' : tab === 'users' ? 'Usuários' : 'Vínculos'}
                              </button>
                          ))}
                      </nav>
                  )}
                  <div className="flex items-center gap-3 pl-4 border-l">
                      <div className="text-right hidden sm:block">
                          <p className="text-sm font-bold text-gray-700">{fullName}</p>
                          <p className="text-xs text-gray-400 capitalize">{role}</p>
                      </div>
                      <button onClick={logout} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition"><XCircle size={20}/></button>
                  </div>
              </div>
          </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        
        {/* BUSCA USUÁRIOS */}
        {activeTab === 'users' && (
            <div className="mb-6 flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex gap-4 w-full max-w-2xl">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
                        <input 
                            type="text" placeholder="Pesquisar..." 
                            className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                            value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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
                <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition">
                    <UserPlus size={18}/> Novo Usuário
                </button>
            </div>
        )}

        {/* === ABA 1: MONITOR === */}
        {activeTab === 'monitor' && (
            <div className="space-y-6">
                 {/* CONTROLES */}
                 <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                     <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 overflow-x-auto w-full md:w-auto">
                        {subTabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button 
                                    key={tab.id}
                                    onClick={() => setMonitorSubTab(tab.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                        monitorSubTab === tab.id ? 'bg-slate-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon size={14}/> {tab.label}
                                </button>
                            )
                        })}
                     </div>
                     <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2 w-full md:w-72">
                        <Search className="text-gray-400 h-4 w-4 ml-2" />
                        <input 
                            type="text" placeholder="Nome ou ESN..." 
                            className="w-full border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                            value={monitorSearch} onChange={e => setMonitorSearch(e.target.value)}
                        />
                        {monitorSearch && <button onClick={() => setMonitorSearch('')} className="text-gray-400 hover:text-gray-600"><XCircle size={14}/></button>}
                     </div>
                 </div>

                 {/* GRID DEVICES */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start animate-in fade-in duration-500">
                    {filteredGroups.length > 0 ? filteredGroups.map(([esn, msgs]) => {
                        const isExpanded = expandedDevices.has(esn);
                        const sharedUsers = msgs[0]?.shared_with || [];
                        const deviceName = msgs[0].device_name || ''; // Nome do dispositivo
                        const isEditing = editingDeviceESN === esn;

                        return (
                        <div key={esn} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group transition hover:shadow-md">
                            
                            {/* CABEÇALHO */}
                            <div 
                                onClick={() => toggleDeviceExpand(esn)}
                                className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white flex justify-between items-center cursor-pointer select-none"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`p-2 rounded-lg bg-white/10 ${isExpanded ? 'text-blue-400' : 'text-gray-400'}`}>
                                        <Satellite size={20} />
                                    </div>
                                    <div className="flex-1">
                                        {/* LÓGICA DE EDIÇÃO DE NOME */}
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            {isEditing ? (
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        autoFocus
                                                        value={tempDeviceName}
                                                        onChange={e => setTempDeviceName(e.target.value)}
                                                        onKeyDown={e => { if(e.key === 'Enter') saveDeviceName(esn); else if(e.key === 'Escape') setEditingDeviceESN(null); }}
                                                        className="text-black text-sm px-1 rounded w-32 outline-none"
                                                    />
                                                    <button onClick={() => saveDeviceName(esn)} className="text-green-400 hover:text-green-300"><Check size={16}/></button>
                                                    <button onClick={() => setEditingDeviceESN(null)} className="text-red-400 hover:text-red-300"><XCircle size={16}/></button>
                                                </div>
                                            ) : (
                                                <h3 className="font-bold text-base tracking-wide flex items-center gap-2 group/title">
                                                    {deviceName || <span className="text-gray-500 italic text-sm">Sem Nome</span>}
                                                    <button 
                                                        onClick={() => startEditingDevice(esn, deviceName)}
                                                        className="opacity-0 group-hover/title:opacity-100 text-gray-400 hover:text-white transition-opacity"
                                                        title="Editar Nome"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                </h3>
                                            )}
                                        </div>
                                        
                                        <p className="text-[10px] text-gray-400 flex items-center gap-1 font-mono mt-0.5">
                                            ESN: {esn}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="bg-blue-600 px-2 py-0.5 rounded text-xs font-bold min-w-[24px] text-center">{msgs.length}</span>
                                    {isExpanded ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                                </div>
                            </div>

                            {/* LISTA DE MENSAGENS */}
                            {isExpanded && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    {sharedUsers.length > 0 && (
                                        <div className="bg-blue-50 px-4 py-2 flex items-center gap-2 text-xs text-blue-700 border-b border-blue-100">
                                            <Share2 size={12}/> 
                                            <span className="truncate">Visto também por: {sharedUsers.join(', ')}</span>
                                        </div>
                                    )}
                                    <div className="max-h-64 overflow-y-auto bg-gray-50/50">
                                        {msgs.map(m => (
                                            <div key={m.id} className="p-3 border-b border-gray-100 hover:bg-white text-sm grid grid-cols-3 gap-2">
                                                <span className="text-gray-500 text-xs flex items-center">{m.received_at.split(' ')[0]} <span className="ml-1 opacity-50">{m.received_at.split(' ')[1]}</span></span>
                                                <span className="col-span-2 font-mono text-gray-700 truncate text-xs bg-white border border-gray-100 rounded px-2 py-1">{m.payload}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-2 bg-gray-100 text-center">
                                        <button onClick={(e) => { e.stopPropagation(); toggleDeviceExpand(esn); }} className="text-xs text-gray-500 hover:text-gray-700 font-bold uppercase">Recolher</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}) : (
                        <div className="col-span-3 text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            {monitorSubTab === 'SATELITE-DG' ? (
                                <>
                                    <Satellite size={48} className="mx-auto mb-4 opacity-20"/>
                                    <p>{monitorSearch ? 'Nenhum dispositivo encontrado.' : 'Aguardando conexão via Satélite...'}</p>
                                </>
                            ) : (
                                <>
                                    <Wifi size={48} className="mx-auto mb-4 opacity-20"/>
                                    <p>Nenhum dispositivo {subTabs.find(t => t.id === monitorSubTab)?.label} conectado.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* === ABA 2: USUÁRIOS E ABA 3: VÍNCULOS === */}
        {/* ... (O CÓDIGO DESTAS ABAS PERMANECE IDÊNTICO AO ANTERIOR - COPIAR SE NECESSÁRIO, MAS ESTÁ MANTIDO IMPLÍCITO AQUI PARA NÃO FICAR GIGANTE) ... */}
        {/* VOU REPETIR O CÓDIGO ABAIXO PARA GARANTIR QUE VOCÊ TENHA O ARQUIVO COMPLETO SEM ERROS */}
        
        {activeTab === 'users' && role === 'master' && (
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
                            {userPagination.currentItems.map(u => (
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
                                            <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button>
                                            <button 
                                                onClick={() => handleDeleteUser(u.id)} 
                                                disabled={u.username === currentUser}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                    <span className="text-xs text-gray-500">Mostrando {userPagination.currentItems.length} de {userPagination.totalCount}</span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)} className="p-1 rounded bg-white border hover:bg-gray-100 disabled:opacity-50"><ChevronLeft size={16}/></button>
                        <span className="text-sm font-bold py-1 px-2">{currentPage}</span>
                        <button disabled={currentPage === userPagination.totalPages} onClick={() => setCurrentPage(p => p+1)} className="p-1 rounded bg-white border hover:bg-gray-100 disabled:opacity-50"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'links' && role === 'master' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Users size={16}/> Selecione o Usuário</h3>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 text-gray-400 h-4 w-4" />
                            <input 
                                type="text" placeholder="Buscar usuário..." 
                                className="pl-8 pr-3 py-2 w-full text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {masterData.users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                            <button 
                                key={u.id}
                                onClick={() => setSelectedUserForLink(u)}
                                className={`w-full text-left p-3 rounded-lg text-sm flex justify-between items-center transition ${selectedUserForLink?.id === u.id ? 'bg-blue-50 border-blue-200 border text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                            >
                                <div>
                                    <div className="font-bold">{u.full_name || u.username}</div>
                                    <div className="text-xs opacity-70">@{u.username} • {u.role}</div>
                                </div>
                                <ChevronRight size={16} className={`opacity-50 ${selectedUserForLink?.id === u.id ? 'text-blue-600 opacity-100' : ''}`}/>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full relative">
                    {!selectedUserForLink ? (
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
                                        Acessos de {selectedUserForLink.full_name}
                                    </h3>
                                    <p className="text-xs text-gray-500 ml-9">Gerencie quais dispositivos este usuário pode ver.</p>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 text-gray-400 h-4 w-4" />
                                    <input 
                                        type="text" placeholder="Filtrar dispositivos..." 
                                        className="pl-8 pr-3 py-2 w-full text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                        value={deviceSearchTerm} onChange={e => setDeviceSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {masterData.devices
                                        .filter(d => d.esn.toLowerCase().includes(deviceSearchTerm.toLowerCase()))
                                        .sort((a, b) => {
                                            const hasA = a.users.includes(selectedUserForLink.username);
                                            const hasB = b.users.includes(selectedUserForLink.username);
                                            return (hasA === hasB) ? 0 : hasA ? -1 : 1;
                                        })
                                        .map(dev => {
                                            const hasAccess = dev.users.includes(selectedUserForLink.username);
                                            return (
                                                <div key={dev.id} 
                                                    onClick={() => handlePermission(dev.id, hasAccess ? 'revoke' : 'grant')}
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
                                                            {/* Mostra também o nome aqui para facilitar */}
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
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* MODAL FORMULÁRIO */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-800">{editingUser ? 'Editar Usuário' : 'Novo Cadastro'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle/></button>
                    </div>
                    <form onSubmit={handleUserSubmit} className="p-6 overflow-y-auto">
                        <input type="hidden" name="id" value={editingUser?.id || ''} />
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Dados de Acesso</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                        <input name="full_name" defaultValue={editingUser?.full_name} required className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Acesso</label>
                                        <select 
                                            name="role" 
                                            defaultValue={editingUser?.role || 'user'} 
                                            disabled={editingUser && editingUser.username === currentUser}
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
                                        <input name="username" defaultValue={editingUser?.username} required className="w-full border border-gray-300 p-2.5 rounded-lg"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha {editingUser && <span className="text-xs text-gray-400 font-normal">(Opcional)</span>}</label>
                                        <input name="password" type="password" className="w-full border border-gray-300 p-2.5 rounded-lg" placeholder="••••••"/>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informações Pessoais</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input name="email" type="email" defaultValue={editingUser?.email} className="w-full border border-gray-300 p-2.5 rounded-lg"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                        <input name="phone" defaultValue={editingUser?.phone} className="w-full border border-gray-300 p-2.5 rounded-lg"/>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                                        <input name="address" defaultValue={editingUser?.address} className="w-full border border-gray-300 p-2.5 rounded-lg"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                                        <input name="city" defaultValue={editingUser?.city} className="w-full border border-gray-300 p-2.5 rounded-lg"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                        <input name="state" defaultValue={editingUser?.state} maxLength="2" className="w-full border border-gray-300 p-2.5 rounded-lg uppercase"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition">Cancelar</button>
                            <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 transition transform hover:-translate-y-0.5">Salvar Dados</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}