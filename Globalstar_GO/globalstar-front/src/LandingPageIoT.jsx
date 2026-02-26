import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Satellite, Factory, Tractor, Wifi, ShieldCheck,
    Activity, Globe, Radio, Bluetooth, Signal,
    ArrowRight, CheckCircle2, Menu, X
} from 'lucide-react';
import Footer from './components/Footer';

export default function LandingPageIoT() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-600 selection:text-white">

            {/* --- NAVBAR --- */}
            <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="flex items-center gap-3 cursor-pointer">
                            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-600/20">
                                <Satellite size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight">IoTData Cloud</h1>
                                <p className="text-[10px] text-blue-600 font-bold tracking-widest uppercase">by Data Frontier</p>
                            </div>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#solucoes" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">Soluções</a>
                            <a href="#agro" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">Agro</a>
                            <a href="#industria" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">Indústria</a>
                            <a href="#modulos" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">Módulos IoT</a>
                            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-200">
                                <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-700 hover:text-blue-600 transition">
                                    Login
                                </button>
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition shadow-md shadow-blue-600/20 flex items-center gap-2 transform hover:-translate-y-0.5">
                                    Falar com Consultor
                                </button>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-600">
                                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-4 shadow-xl">
                        <a href="#solucoes" onClick={() => setIsMenuOpen(false)} className="block text-base font-semibold text-slate-700">Soluções</a>
                        <a href="#agro" onClick={() => setIsMenuOpen(false)} className="block text-base font-semibold text-slate-700">Agro</a>
                        <a href="#industria" onClick={() => setIsMenuOpen(false)} className="block text-base font-semibold text-slate-700">Indústria</a>
                        <a href="#modulos" onClick={() => setIsMenuOpen(false)} className="block text-base font-semibold text-slate-700">Módulos IoT</a>
                        <div className="pt-4 flex flex-col gap-3">
                            <button onClick={() => navigate('/login')} className="w-full text-center text-slate-700 font-bold py-3 border border-slate-200 rounded-lg">Acessar Painel</button>
                            <button className="w-full text-center text-white bg-blue-600 font-bold py-3 rounded-lg">Falar com Consultor</button>
                        </div>
                    </div>
                )}
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-20 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full blur-[100px] mix-blend-multiply"></div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-8">
                        <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                        Conectividade 100% Global com Integração Globalstar
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-[1.1]">
                        Onde o celular não chega, <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            nós conectamos seus ativos.
                        </span>
                    </h1>

                    <p className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto font-medium leading-relaxed mb-10">
                        Plataforma unificada de IoT Satelital e Multi-Rede. Monitoramento em tempo real para o agronegócio e telemetria avançada para a Indústria 4.0.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transform hover:-translate-y-1">
                            Agendar Demonstração <ArrowRight size={20} />
                        </button>
                        <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold text-lg transition-all shadow-sm flex items-center justify-center gap-2">
                            Acessar Plataforma
                        </button>
                    </div>
                </div>
            </section>

            {/* --- LOGOS / PROTOCOLS --- */}
            <section className="py-10 border-y border-slate-200 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Redes Suportadas pela Plataforma</p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60">
                        <div className="flex items-center gap-2 font-bold text-xl text-slate-800"><Satellite size={28} /> SATÉLITE DG</div>
                        <div className="flex items-center gap-2 font-bold text-xl text-slate-800"><Radio size={28} /> LoRaWAN</div>
                        <div className="flex items-center gap-2 font-bold text-xl text-slate-800"><Signal size={28} /> 5G / 4G</div>
                        <div className="flex items-center gap-2 font-bold text-xl text-slate-800"><Wifi size={28} /> Wi-Fi</div>
                        <div className="flex items-center gap-2 font-bold text-xl text-slate-800"><Bluetooth size={28} /> Bluetooth</div>
                    </div>
                </div>
            </section>

            {/* --- FEATURES / SOLUÇÕES --- */}
            <section id="solucoes" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Tudo sob controle, em uma única tela.</h2>
                        <p className="text-lg text-slate-600">Nossa plataforma de software gerencia milhares de dispositivos IoT independentemente da rede de transmissão, garantindo que os dados cheguem a quem importa.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                                <Globe size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Cobertura Global</h3>
                            <p className="text-slate-600 leading-relaxed">Integração nativa com redes de satélite (Globalstar) permitindo o monitoramento de ativos em áreas rurais remotas ou oceanos.</p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="bg-indigo-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
                                <Activity size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Tempo Real via WebSocket</h3>
                            <p className="text-slate-600 leading-relaxed">Os dados chegam ao seu dashboard no instante em que o dispositivo transmite. Monitoramento de telemetria sem atrasos.</p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
                                <ShieldCheck size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Auditoria e Permissões</h3>
                            <p className="text-slate-600 leading-relaxed">Controle granular de acesso. Defina quais usuários podem ver quais dispositivos, com trilha de auditoria completa de cada ação.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- AGRO SECTION --- */}
            <section id="agro" className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 font-bold text-sm mb-6 border border-green-200">
                                <Tractor size={16} /> Agronegócio
                            </div>
                            <h2 className="text-4xl font-black text-slate-900 mb-6 leading-tight">Telemetria avançada no campo, sem zonas cegas.</h2>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                As propriedades rurais sofrem com a falta de cobertura 4G. Com os Módulos IoT Satelitais da IoTData Cloud by Data Frontier, seus tratores, colheitadeiras e estações meteorológicas enviam dados de qualquer coordenada do planeta.
                            </p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="text-green-500 mt-1 shrink-0" size={20} />
                                    <span className="text-slate-700 font-medium">Localização e horímetro de maquinário pesado via satélite.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="text-green-500 mt-1 shrink-0" size={20} />
                                    <span className="text-slate-700 font-medium">Monitoramento de silos e nível de reservatórios.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="text-green-500 mt-1 shrink-0" size={20} />
                                    <span className="text-slate-700 font-medium">Integração mista: sensores em LoRaWAN na fazenda comunicando com um Gateway Satelital.</span>
                                </li>
                            </ul>
                            <button className="text-green-600 font-bold hover:text-green-700 flex items-center gap-2 group">
                                Conheça as soluções para o Agro <ArrowRight size={18} className="transform group-hover:translate-x-1 transition" />
                            </button>
                        </div>
                        <div className="lg:w-1/2 relative">
                            <div className="absolute inset-0 bg-green-600 rounded-[2.5rem] transform rotate-3 opacity-10"></div>
                            <img
                                src="https://images.unsplash.com/photo-1592982537447-6f2a6a0a5913?auto=format&fit=crop&w=800&q=80"
                                alt=""
                                className="rounded-[2.5rem] shadow-2xl relative z-10 object-cover h-[500px] w-full"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='24' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EImagem de Trator no Campo%3C/text%3E%3C/svg%3E"
                                }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- INDUSTRIA SECTION --- */}
            <section id="industria" className="py-24 bg-slate-900 text-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="lg:w-1/2">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-sm mb-6 border border-blue-500/30">
                                <Factory size={16} /> Indústria 4.0
                            </div>
                            <h2 className="text-4xl font-black text-white mb-6 leading-tight">Sua fábrica conectada. Previsibilidade e eficiência.</h2>
                            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                                Utilizando conectividade Wi-Fi, Bluetooth e LoRaWAN de nível industrial, capturamos dados vitais das suas máquinas operacionais, enviando-os para um dashboard centralizado.
                            </p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="text-blue-400 mt-1 shrink-0" size={20} />
                                    <span className="text-slate-200 font-medium">Monitoramento de vibração e temperatura (Manutenção Preditiva).</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="text-blue-400 mt-1 shrink-0" size={20} />
                                    <span className="text-slate-200 font-medium">Controle de utilidades: água, energia e gases em tempo real.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="text-blue-400 mt-1 shrink-0" size={20} />
                                    <span className="text-slate-200 font-medium">Redes privadas 5G para chão de fábrica com baixa latência.</span>
                                </li>
                            </ul>
                            <button className="text-blue-400 font-bold hover:text-blue-300 flex items-center gap-2 group">
                                Conheça as soluções Industriais <ArrowRight size={18} className="transform group-hover:translate-x-1 transition" />
                            </button>
                        </div>
                        <div className="lg:w-1/2 relative">
                            <div className="absolute inset-0 bg-blue-600 rounded-[2.5rem] transform -rotate-3 opacity-20"></div>
                            <img
                                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80"
                                alt=""
                                className="rounded-[2.5rem] shadow-2xl relative z-10 object-cover h-[500px] w-full border border-slate-700"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%231e293b'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='24' fill='%2364748b' text-anchor='middle' dy='.3em'%3EImagem de Chão de Fábrica%3C/text%3E%3C/svg%3E"
                                }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PRODUTOS / MÓDULOS --- */}
            <section id="modulos" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Módulos IoT & Plataforma SaaS</h2>
                        <p className="text-lg text-slate-600">Fornecemos o ecossistema completo: do hardware robusto projetado para o campo até a plataforma em nuvem para análise de dados.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* Produto 1: Hardware Satelital */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col h-full relative overflow-hidden group hover:border-blue-400 transition-colors">
                            <div className="absolute top-0 right-0 p-6 opacity-5 text-blue-600 group-hover:opacity-10 transition-opacity">
                                <Satellite size={120} />
                            </div>
                            <div className="mb-6 relative z-10">
                                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Hardware</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4 relative z-10">Módulo IoT Satelital Edge</h3>
                            <p className="text-slate-600 mb-6 flex-1 relative z-10">
                                Transmissor robusto (IP67) integrado à rede Globalstar. Ideal para instalação em veículos agrícolas e ativos sem alimentação elétrica constante.
                            </p>
                            <ul className="space-y-3 mb-8 relative z-10">
                                <li className="flex items-center gap-2 text-sm text-slate-700 font-medium"><CheckCircle2 size={16} className="text-blue-500" /> Bateria com duração de até 5 anos</li>
                                <li className="flex items-center gap-2 text-sm text-slate-700 font-medium"><CheckCircle2 size={16} className="text-blue-500" /> Cobertura Global Simplex</li>
                                <li className="flex items-center gap-2 text-sm text-slate-700 font-medium"><CheckCircle2 size={16} className="text-blue-500" /> Sensores BLE integrados</li>
                            </ul>
                            <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition relative z-10">Solicitar Orçamento</button>
                        </div>

                        {/* Produto 2: Plataforma SaaS */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 border border-blue-500 shadow-xl shadow-blue-600/20 flex flex-col h-full relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 text-white group-hover:opacity-20 transition-opacity transform rotate-12">
                                <Globe size={120} />
                            </div>
                            <div className="mb-6 relative z-10">
                                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Software</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4 relative z-10">IoTData Cloud Control Panel</h3>
                            <p className="text-blue-100 mb-6 flex-1 relative z-10">
                                O coração da sua operação. Um painel web unificado para gerenciar permissões, visualizar mensagens em tempo real (WebSocket) e extrair relatórios.
                            </p>
                            <ul className="space-y-3 mb-8 relative z-10">
                                <li className="flex items-center gap-2 text-sm text-white font-medium"><CheckCircle2 size={16} className="text-blue-300" /> Auditoria completa de ações</li>
                                <li className="flex items-center gap-2 text-sm text-white font-medium"><CheckCircle2 size={16} className="text-blue-300" /> Dashboard Multi-protocolo (Satélite/LoRa)</li>
                                <li className="flex items-center gap-2 text-sm text-white font-medium"><CheckCircle2 size={16} className="text-blue-300" /> API Rest para integração com ERP</li>
                            </ul>
                            <button onClick={() => navigate('/login')} className="w-full py-3 bg-white hover:bg-slate-50 text-blue-700 rounded-xl font-bold transition relative z-10">Acessar Plataforma</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CTA SECTION --- */}
            <section className="py-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-slate-900"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Pronto para digitalizar sua operação?</h2>
                    <p className="text-xl text-slate-300 mb-10">Fale com nossos engenheiros de IoT. Desenhamos a arquitetura ideal de comunicação para o seu projeto, seja na fazenda ou na fábrica.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2">
                            Solicitar Contato Comercial
                        </button>
                        <button onClick={() => navigate('/login')} className="px-8 py-4 bg-transparent border border-slate-600 hover:border-slate-400 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2">
                            Acessar Painel de Controle
                        </button>
                    </div>
                </div>
            </section>

            <Footer />

        </div>
    );
}
