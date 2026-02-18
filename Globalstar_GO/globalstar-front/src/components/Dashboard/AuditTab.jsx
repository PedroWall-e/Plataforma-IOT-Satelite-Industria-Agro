import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, RefreshCw } from 'lucide-react';
import api from '../../services/api'; // Ajuste o caminho se necessário

export default function AuditTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/audit');
            setLogs(res.data || []);
        } catch (error) {
            console.error("Erro ao buscar logs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(l => 
        l.username.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.details.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-purple-600"/> Auditoria do Sistema
                </h3>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 text-gray-400 h-4 w-4" />
                        <input 
                            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-purple-500"
                            placeholder="Buscar logs..."
                            value={search} onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button onClick={fetchLogs} className="p-2 text-gray-500 hover:text-purple-600 transition">
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-500 font-semibold sticky top-0">
                        <tr>
                            <th className="p-3">Data/Hora</th>
                            <th className="p-3">Usuário</th>
                            <th className="p-3">Ação</th>
                            <th className="p-3">Detalhes</th>
                            <th className="p-3">IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="p-3 text-gray-500 whitespace-nowrap">{log.created_at}</td>
                                <td className="p-3 font-bold text-gray-700">{log.username}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                        log.action === 'LOGIN' ? 'bg-green-100 text-green-700' : 
                                        log.action === 'UPDATE_DEVICE' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="p-3 text-gray-600">{log.details}</td>
                                <td className="p-3 text-gray-400 text-xs font-mono">{log.ip_address}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}