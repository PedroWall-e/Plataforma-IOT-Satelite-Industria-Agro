import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, XCircle } from 'lucide-react';

import api from './services/api';
import MonitorTab from './components/Dashboard/MonitorTab';
import UsersTab from './components/Dashboard/UsersTab';
import LinksTab from './components/Dashboard/LinksTab';
import AuditTab from './components/Dashboard/AuditTab';
import UserModal from './components/Dashboard/UserModal';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('monitor'); 
  const [messages, setMessages] = useState([]);
  const [masterData, setMasterData] = useState({ users: [], devices: [] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [monitorSubTab, setMonitorSubTab] = useState('SATELITE-DG');
  const [monitorSearch, setMonitorSearch] = useState('');
  const [expandedDevices, setExpandedDevices] = useState(new Set());
  const [editingDeviceESN, setEditingDeviceESN] = useState(null);
  const [tempDeviceName, setTempDeviceName] = useState('');

  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('user');
  const fullName = localStorage.getItem('full_name') || currentUser;

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    
    fetchMessages();
    if (role === 'master') fetchMasterData();

    // --- WEBSOCKET AGNOSTICO (Lê da URL do Navegador) ---
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host; // Pega o IP/Porta automaticamente
    const wsUrl = `${wsProtocol}//${wsHost}/ws`; 
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("WebSocket Conectado!");

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'DEVICE_UPDATE') {
                setMessages(prev => prev.map(m => m.esn === data.esn ? { ...m, device_name: data.name } : m));
                if (role === 'master') {
                    setMasterData(prev => ({
                        ...prev,
                        devices: prev.devices.map(d => d.esn === data.esn ? { ...d, name: data.name } : d)
                    }));
                }
            } else if (data.esn && data.payload) { 
                setMessages(prev => [data, ...prev]);
            }
        } catch (err) {
            console.error("Erro ao processar mensagem WS:", err);
        }
    };

    socket.onclose = () => console.log("WebSocket Desconectado");
    return () => socket.close();
  }, [token, role, navigate]);

  const fetchMessages = async () => {
    if (editingDeviceESN) return; 
    try {
      const res = await api.get('/api/messages');
      // Trava de Segurança: Garante que é um Array
      if (Array.isArray(res.data)) setMessages(res.data);
    } catch (error) { 
      if (error.response?.status === 401) navigate('/'); 
    }
  };

  const fetchMasterData = async () => {
    try {
        const res = await api.get('/api/master/data');
        // Trava de Segurança contra a Tela Branca: Garante que recebeu o objeto JSON esperado
        if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
            setMasterData({
                users: Array.isArray(res.data.users) ? res.data.users : [],
                devices: Array.isArray(res.data.devices) ? res.data.devices : []
            });
        }
    } catch (e) { console.error(e); }
  };

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
      } catch (err) { alert("Erro ao salvar usuário"); }
  };

  const handleDeleteUser = async (id) => {
      if(!confirm("Tem certeza que deseja excluir este usuário?")) return;
      try {
        await api.post('/api/master/user/delete', { id });
        fetchMasterData();
      } catch (err) { alert("Erro ao excluir"); }
  };

  const handlePermission = async (userId, deviceId, action) => {
      try {
        await api.post('/api/master/permission', { user_id: parseInt(userId), device_id: parseInt(deviceId), action });
        fetchMasterData();
      } catch (err) { alert("Erro ao atualizar permissão"); }
  };

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

  const safeMessages = Array.isArray(messages) ? messages : [];
  const allGroups = safeMessages.reduce((acc, msg) => {
    (acc[msg.esn] = acc[msg.esn] || []).push(msg);
    return acc;
  }, {});

  const filteredGroups = Object.entries(allGroups).filter(([esn, msgs]) => {
      if (monitorSearch) {
        const term = monitorSearch.toLowerCase();
        const name = msgs[0].device_name || '';
        const matchesText = name.toLowerCase().includes(term) || esn.toLowerCase().includes(term) || msgs.some(m => m.payload.toLowerCase().includes(term));
        if (!matchesText) return false;
      }
      return monitorSubTab === 'SATELITE-DG'; 
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
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
                          <button onClick={() => setActiveTab('monitor')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'monitor' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Monitor</button>
                          {role === 'master' && (
                              <>
                                  <button onClick={() => setActiveTab('users')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Usuários</button>
                                  <button onClick={() => setActiveTab('links')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'links' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Vínculos</button>
                              </>
                          )}
                          <button onClick={() => setActiveTab('audit')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'audit' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-900'}`}>Auditoria</button>
                      </nav>
                  )}
                  <div className="flex items-center gap-3 pl-4 border-l">
                      <div className="text-right hidden sm:block">
                          <p className="text-sm font-bold text-gray-700">{fullName}</p>
                          <p className="text-xs text-gray-400 capitalize">{role}</p>
                      </div>
                      <button onClick={logout} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Sair"><XCircle size={20}/></button>
                  </div>
              </div>
          </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        {activeTab === 'monitor' && <MonitorTab filteredGroups={filteredGroups} monitorSubTab={monitorSubTab} setMonitorSubTab={setMonitorSubTab} monitorSearch={monitorSearch} setMonitorSearch={setMonitorSearch} expandedDevices={expandedDevices} toggleDeviceExpand={toggleDeviceExpand} editingDeviceESN={editingDeviceESN} setEditingDeviceESN={setEditingDeviceESN} tempDeviceName={tempDeviceName} setTempDeviceName={setTempDeviceName} saveDeviceName={saveDeviceName} startEditingDevice={startEditingDevice} />}
        {activeTab === 'users' && role === 'master' && <UsersTab users={masterData.users} currentUser={currentUser} onEdit={(u) => { setEditingUser(u); setIsModalOpen(true); }} onDelete={handleDeleteUser} onAdd={() => { setEditingUser(null); setIsModalOpen(true); }} />}
        {activeTab === 'links' && role === 'master' && <LinksTab users={masterData.users} devices={masterData.devices} onPermissionChange={handlePermission} />}
        {activeTab === 'audit' && (role === 'master' || role === 'support') && <AuditTab />}
      </div>

      {isModalOpen && <UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={editingUser} onSubmit={handleUserSubmit} currentUser={currentUser} />}
    </div>
  );
}