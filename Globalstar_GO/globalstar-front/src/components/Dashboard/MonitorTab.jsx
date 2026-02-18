import React from 'react';
import { 
    Satellite, Radio, Wifi, Bluetooth, Signal, 
    Search, XCircle, Share2, ChevronUp, ChevronDown, Check, Edit2 
} from 'lucide-react';

export default function MonitorTab({
    filteredGroups,
    monitorSubTab,
    setMonitorSubTab,
    monitorSearch,
    setMonitorSearch,
    expandedDevices,
    toggleDeviceExpand,
    editingDeviceESN,
    setEditingDeviceESN,
    tempDeviceName,
    setTempDeviceName,
    saveDeviceName,
    startEditingDevice
}) {

    const subTabs = [
        { id: 'SATELITE-DG', icon: Satellite, label: 'Satélite DG' },
        { id: 'LORA', icon: Radio, label: 'LoRaWAN' },
        { id: 'WI-FI', icon: Wifi, label: 'Wi-Fi' },
        { id: 'BLUETOOH', icon: Bluetooth, label: 'Bluetooth' },
        { id: '5G/4G', icon: Signal, label: '5G / 4G' },
    ];

    return (
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
                                <Icon size={14} /> {tab.label}
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
                    {monitorSearch && <button onClick={() => setMonitorSearch('')} className="text-gray-400 hover:text-gray-600"><XCircle size={14} /></button>}
                </div>
            </div>

            {/* GRID DEVICES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start animate-in fade-in duration-500">
                {filteredGroups.length > 0 ? filteredGroups.map(([esn, msgs]) => {
                    const isExpanded = expandedDevices.has(esn);
                    const sharedUsers = msgs[0]?.shared_with || [];
                    const deviceName = msgs[0].device_name || '';
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
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            {isEditing ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        autoFocus
                                                        value={tempDeviceName}
                                                        onChange={e => setTempDeviceName(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') saveDeviceName(esn); else if (e.key === 'Escape') setEditingDeviceESN(null); }}
                                                        className="text-black text-sm px-1 rounded w-32 outline-none"
                                                    />
                                                    <button onClick={() => saveDeviceName(esn)} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                                                    <button onClick={() => setEditingDeviceESN(null)} className="text-red-400 hover:text-red-300"><XCircle size={16} /></button>
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
                                    {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                </div>
                            </div>

                            {/* LISTA DE MENSAGENS */}
                            {isExpanded && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    {sharedUsers.length > 0 && (
                                        <div className="bg-blue-50 px-4 py-2 flex items-center gap-2 text-xs text-blue-700 border-b border-blue-100">
                                            <Share2 size={12} />
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
                    )
                }) : (
                    <div className="col-span-3 text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        {monitorSubTab === 'SATELITE-DG' ? (
                            <>
                                <Satellite size={48} className="mx-auto mb-4 opacity-20" />
                                <p>{monitorSearch ? 'Nenhum dispositivo encontrado.' : 'Aguardando conexão via Satélite...'}</p>
                            </>
                        ) : (
                            <>
                                <Wifi size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Nenhum dispositivo {subTabs.find(t => t.id === monitorSubTab)?.label} conectado.</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}