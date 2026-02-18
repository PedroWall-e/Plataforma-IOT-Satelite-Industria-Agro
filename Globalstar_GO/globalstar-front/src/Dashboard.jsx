import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, XCircle } from 'lucide-react';

// Importação do serviço de API configurado
import api from './services/api';

// Importação dos Componentes Refatorados
import MonitorTab from './components/Dashboard/MonitorTab';
import UsersTab from './components/Dashboard/UsersTab';
import LinksTab from './components/Dashboard/LinksTab';
import UserModal from './components/Dashboard/UserModal';

export default function Dashboard() {
  // --- ESTADOS GLOBAIS ---
  const [activeTab, setActiveTab] = useState('monitor'); 
  const [messages, setMessages] = useState([]);
  const [masterData, setMasterData] = useState({ users: [], devices: [] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // --- ESTADOS DO MONITOR ---
  const [monitorSubTab, setMonitorSubTab] = useState('SATELITE-DG');
  const [monitorSearch, setMonitorSearch] = useState('');
  const [expandedDevices, setExpandedDevices] = useState(new Set());
  const [editingDeviceESN, setEditingDeviceESN] = useState(null);
  const [tempDeviceName, setTempDeviceName] = useState('');

  // --- DADOS DO USUÁRIO LOGADO ---
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('user');
  const fullName = localStorage.getItem('full_name') || currentUser;

  // --- EFEITOS (Data Fetching) ---
  useEffect(() => {
    if (!token) { navigate('/'); return; }
    
    fetchMessages();
    // Polling a cada 5 segundos para novas mensagens
    const interval = setInterval(fetchMessages, 5000);
    
    // Se for master, busca dados administrativos
    if (role === 'master') fetchMasterData();

    return () => clearInterval(interval);
  }, [token, role, navigate]);

  // --- FUNÇÕES DE API ---
  const fetchMessages = async () => {
    // Evita atualizar se o usuário estiver editando um nome (para não perder o foco/input)
    if (editingDeviceESN) return; 
    try {
      const res = await api.get('/api/messages');
      setMessages(res.data || []);
    } catch (error) { 
      if (error.response?.status === 401) navigate('/'); 
    }
  };

  const fetchMasterData = async () => {
    try {
        const res = await api.get('/api/master/data');
        setMasterData(res.data);
    } catch (e) { console.error(e); }
  };

  // --- AÇÕES DE USUÁRIO (CRUD) ---
  const handleUserSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      
      if (editingUser) data.id = editingUser.id;
      if (data.id) data.id = parseInt(data.id);
      
      try {
        await api.post('/api/master/user', data);
        alert(editingUser ? 'Usuário atualizado!' : 'Usuário criado!');
        setIsModalOpen(false);
        fetchMasterData();
      } catch (err) { 
        alert("Erro ao salvar usuário"); 
      }
  };

  const handleDeleteUser = async (id) => {
      if(!confirm("Tem certeza que deseja excluir este usuário?")) return;
      try {
        await api.post('/api/master/user/delete', { id });
        fetchMasterData();
      } catch (err) {
        alert("Erro ao excluir");
      }
  };

  // --- AÇÕES DE PERMISSÃO/VÍNCULO ---
  const handlePermission = async (userId, deviceId, action) => {
      try {
        await api.post('/api/master/permission', { 
            user_id: parseInt(userId), 
            device_id: parseInt(deviceId), 
            action 
        });
        fetchMasterData();
      } catch (err) { alert("Erro ao atualizar permissão"); }
  };

  // --- AÇÕES DE DISPOSITIVO (Renomear/Expandir) ---
  const saveDeviceName = async (esn) => {
      try {
        await api.post('/api/device/update', { esn, name: tempDeviceName });
        
        // Atualização otimista local
        const updatedMsgs = messages.map(m => m.esn === esn ? { ...m, device_name: tempDeviceName } : m);
        setMessages(updatedMsgs);
        setEditingDeviceESN(null);
      } catch (err) { alert("Erro ao salvar nome do dispositivo"); }
  };

  const startEditingDevice = (esn, currentName) => {
      setTempDeviceName(currentName || '');
      setEditingDeviceESN(esn);
  };

  const toggleDeviceExpand = (esn) => {
      if (editingDeviceESN === esn) return; // Não expande/contrai se estiver editando
      setExpandedDevices(prev => {
          const newSet = new Set(prev);
          if (newSet.has(esn)) newSet.delete(esn);
          else newSet.add(esn);
          return newSet;
      });
  };

  const logout = () => { 
      localStorage.clear(); 
      navigate('/'); 
  };

  // --- PROCESSAMENTO DE DADOS (MONITOR) ---
  const safeMessages = Array.isArray(messages) ? messages : [];
  // Agrupa mensagens por ESN
  const allGroups = safeMessages.reduce((acc, msg) => {
    (acc[msg.esn] = acc[msg.esn] || []).push(msg);
    return acc;
  }, {});

  // Filtra os grupos baseado na busca e na sub-aba selecionada
  const filteredGroups = Object.entries(allGroups).filter(([esn, msgs]) => {
      if (monitorSearch) {
        const term = monitorSearch.toLowerCase();
        const name = msgs[0].device_name || '';
        const matchesText = name.toLowerCase().includes(term) || 
                            esn.toLowerCase().includes(term) || 
                            msgs.some(m => m.payload.toLowerCase().includes(term));
        if (!matchesText) return false;
      }
      // Aqui você pode expandir a lógica para outras abas (LoRa, WiFi) futuramente
      if (monitorSubTab === 'SATELITE-DG') return true; 
      return false; 
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* --- HEADER --- */}
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
                              <button key={tab} onClick={() => { setActiveTab(tab); }} 
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
                      <button onClick={logout} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Sair">
                          <XCircle size={20}/>
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        
        {/* Renderiza a aba ativa */}
        
        {activeTab === 'monitor' && (
            <MonitorTab 
                filteredGroups={filteredGroups}
                monitorSubTab={monitorSubTab}
                setMonitorSubTab={setMonitorSubTab}
                monitorSearch={monitorSearch}
                setMonitorSearch={setMonitorSearch}
                expandedDevices={expandedDevices}
                toggleDeviceExpand={toggleDeviceExpand}
                editingDeviceESN={editingDeviceESN}
                setEditingDeviceESN={setEditingDeviceESN}
                tempDeviceName={tempDeviceName}
                setTempDeviceName={setTempDeviceName}
                saveDeviceName={saveDeviceName}
                startEditingDevice={startEditingDevice}
            />
        )}

        {activeTab === 'users' && role === 'master' && (
            <UsersTab 
                users={masterData.users}
                currentUser={currentUser}
                onEdit={(u) => { setEditingUser(u); setIsModalOpen(true); }}
                onDelete={handleDeleteUser}
                onAdd={() => { setEditingUser(null); setIsModalOpen(true); }}
            />
        )}

        {activeTab === 'links' && role === 'master' && (
            <LinksTab 
                users={masterData.users}
                devices={masterData.devices}
                onPermissionChange={handlePermission}
            />
        )}
      </div>

      {/* --- MODAL GLOBAL --- */}
      {isModalOpen && (
          <UserModal 
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)} 
              user={editingUser} 
              onSubmit={handleUserSubmit} 
              currentUser={currentUser}
          />
      )}
    </div>
  );
}