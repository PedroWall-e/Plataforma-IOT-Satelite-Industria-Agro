import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const navigate = useNavigate();
  
  // Pega dados do LocalStorage
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  // Configuração do Header com Token
  const authHeader = { 
    headers: { Authorization: `Bearer ${token}` } 
  };

  useEffect(() => {
    // Se não tiver token, chuta para o login
    if (!token) {
        navigate('/');
        return;
    }

    fetchMessages();
    
    // Se for admin, busca lista de usuários para o painel
    if (role === 'admin') fetchAdminData();

    // Loop de atualização (5s)
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [token, role, navigate]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/messages', authHeader);
      // Backend agora garante retornar [] se vazio, mas mantemos a segurança aqui
      setMessages(res.data || []);
    } catch (error) {
      if (error.response?.status === 401) {
          localStorage.clear();
          navigate('/');
      }
    }
  };

  const fetchAdminData = async () => {
    try {
        const res = await axios.get('http://localhost:5000/api/admin/data', authHeader);
        setAdminData(res.data);
    } catch (e) { console.error(e); }
  };

  const handleCreateUser = async (e) => {
      e.preventDefault();
      const user = e.target.user.value;
      const pass = e.target.pass.value;
      if(!user || !pass) return alert("Preencha tudo");

      try {
        await axios.post('http://localhost:5000/api/admin/create-user', 
            { username: user, password: pass, role: 'viewer' }, authHeader);
        alert('Usuário criado com sucesso!');
        e.target.reset();
        fetchAdminData();
      } catch (err) { alert("Erro ao criar usuário"); }
  };

  const handleGrant = async () => {
      const userSelect = document.getElementById('selUser');
      const devSelect = document.getElementById('selDev');
      
      try {
        await axios.post('http://localhost:5000/api/admin/grant', 
            { user_id: parseInt(userSelect.value), device_id: parseInt(devSelect.value) }, 
            authHeader);
        alert('Permissão concedida!');
      } catch (err) { alert("Erro ao dar permissão"); }
  };

  const logout = () => { localStorage.clear(); navigate('/'); };

  // --- AGRUPAMENTO (Lógica Segura) ---
  // Garante que messages é um array antes de rodar o reduce
  const safeMessages = Array.isArray(messages) ? messages : [];
  
  const grouped = safeMessages.reduce((acc, msg) => {
    (acc[msg.esn] = acc[msg.esn] || []).push(msg);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800">
            Monitor {role === 'admin' ? <span className="text-blue-600 text-lg">(Admin)</span> : ''}
        </h1>
        <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition">Sair</button>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* PAINEL DE ADMINISTRAÇÃO */}
        {role === 'admin' && adminData && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-blue-500">
                <h3 className="font-bold text-xl mb-4 text-gray-700">Gerenciamento de Acesso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Criar Usuário */}
                    <div className="bg-gray-50 p-4 rounded">
                        <h4 className="font-bold text-sm mb-2 uppercase text-gray-500">Novo Usuário</h4>
                        <form onSubmit={handleCreateUser} className="flex gap-2">
                            <input name="user" placeholder="Nome" className="border p-2 rounded w-full" />
                            <input name="pass" type="password" placeholder="Senha" className="border p-2 rounded w-full" />
                            <button className="bg-green-500 text-white px-4 rounded hover:bg-green-600">Criar</button>
                        </form>
                    </div>
                    {/* Vincular Permissão */}
                    <div className="bg-gray-50 p-4 rounded">
                        <h4 className="font-bold text-sm mb-2 uppercase text-gray-500">Vincular Dispositivo</h4>
                        <div className="flex gap-2">
                            <select id="selUser" className="border p-2 rounded w-full bg-white">
                                {adminData.users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                            </select>
                            <select id="selDev" className="border p-2 rounded w-full bg-white">
                                {adminData.devices.map(d => <option key={d.id} value={d.id}>{d.esn}</option>)}
                            </select>
                            <button onClick={handleGrant} className="bg-blue-500 text-white px-4 rounded hover:bg-blue-600">Vincular</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* FEEDBACK SE ESTIVER VAZIO */}
        {safeMessages.length === 0 && (
            <div className="text-center py-20 bg-white rounded shadow-sm">
                <p className="text-2xl text-gray-400 font-light">Nenhuma mensagem encontrada.</p>
                <p className="text-sm text-gray-400 mt-2">Aguardando dados dos satélites...</p>
            </div>
        )}

        {/* LISTA DE MENSAGENS (CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(grouped).map(([esn, msgs]) => (
            <div key={esn} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                    <span className="font-bold text-lg tracking-wide">{esn}</span>
                    <span className="text-xs font-bold bg-white text-blue-600 px-3 py-1 rounded-full">{msgs.length} msgs</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-600 sticky top-0 shadow-sm">
                        <tr>
                            <th className="p-3">Horário</th>
                            <th className="p-3">Dados (Payload)</th>
                        </tr>
                    </thead>
                    <tbody>
                    {msgs.map(m => (
                        <tr key={m.id} className="border-b last:border-0 hover:bg-blue-50 transition-colors">
                            <td className="p-3 text-gray-600 whitespace-nowrap">{m.received_at.split(' ')[1]}</td>
                            <td className="p-3 font-mono text-xs text-gray-800 break-all">{m.payload}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
}