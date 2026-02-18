import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, XCircle } from 'lucide-react';

// Importação do serviço de API configurado
import api from './services/api';

// Importação dos Componentes Refatorados
import MonitorTab from './components/Dashboard/MonitorTab';
import UsersTab from './components/Dashboard/UsersTab';
import LinksTab from './components/Dashboard/LinksTab';
import AuditTab from './components/Dashboard/AuditTab'; // Componente de Auditoria
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

  // --- EFEITOS (Data Fetching & WebSocket) ---
  useEffect(() => {
    if (!token) { navigate('/'); return; }
    
    // Carga inicial
    fetchMessages();
    if (role === 'master') fetchMasterData();

    // --- CONFIGURAÇÃO WEBSOCKET (TEMPO REAL) ---
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Em produção, a porta pode variar ou ser a mesma do frontend via proxy
    const wsHost = window.location.host; // Pega o IP e porta atual do navegador automaticamente
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("WebSocket Conectado ao servidor Go!");
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // 1. Atualização de Nome de Dispositivo
            if (data.type === 'DEVICE_UPDATE') {
                setMessages(prev => prev.map(m => 
                    m.esn === data.esn ? { ...m, device_name: data.name } : m
                ));
                if (role === 'master') {
                    setMasterData(prev => ({
                        ...prev,
                        devices: prev.devices.map(d => 
                            d.esn === data.esn ? { ...d, name: data.name } : d
                        )
                    }));
                }
            } 
            // 2. Nova Mensagem de Satélite (Exemplo)
            else if (data.esn && data.payload) { 
                // Adiciona nova mensagem no topo
                setMessages(prev => [data, ...prev]);
            }
        } catch (err) {
            console.error("Erro ao processar mensagem WS:", err);
        }
    };

    socket.onclose = () => console.log("WebSocket Desconectado");

    // Cleanup: Fecha conexão ao sair da página
    return () => {
        socket.close();
    };
  }, [token, role, navigate]);

  // --- FUNÇÕES DE API ---
  const fetchMessages = async () => {
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
        setEditingDeviceESN(null);
      } catch (err) { alert("Erro ao salvar nome do dispositivo"); }
  };

  const startEditingDevice = (esn, currentName) => {
      setTempDeviceName(currentName || '');
      setEditingDeviceESN(esn);
  };

  const toggleDeviceExpand = (esn) => {
      if (editingDeviceESN === esn) return;
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
  const allGroups = safeMessages.reduce((acc, msg) => {
    (acc[msg.esn] = acc[msg.esn] || []).push(msg);
    return acc;
  }, {});

  const filteredGroups = Object.entries(allGroups).filter(([esn, msgs]) => {
      if (monitorSearch) {
        const term = monitorSearch.toLowerCase();
        const name = msgs[0].device_name || '';
        const matchesText = name.toLowerCase().includes(term) || 
                            esn.toLowerCase().includes(term) || 
                            msgs.some(m => m.payload.toLowerCase().includes(term));
        if (!matchesText) return false;
      }
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
                  {(role === 'master' || role === 'support') && (
                      <nav className="flex bg-gray-100 p-1 rounded-lg">
                          <button onClick={() => setActiveTab('monitor')} 
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'monitor' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                              Monitor
                          </button>
                          
                          {role === 'master' && (
                              <>
                                  <button onClick={() => setActiveTab('users')} 
                                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                                      Usuários
                                  </button>
                                  <button onClick={() => setActiveTab('links')} 
                                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'links' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                                      Vínculos
                                  </button>
                              </>
                          )}

                          <button onClick={() => setActiveTab('audit')} 
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'audit' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-900'}`}>
                              Auditoria
                          </button>
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

        {activeTab === 'audit' && (role === 'master' || role === 'support') && (
            <AuditTab />
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