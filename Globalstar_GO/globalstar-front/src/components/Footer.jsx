import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Satellite } from 'lucide-react';

export default function Footer() {
    const navigate = useNavigate();

    return (
        <footer className="bg-white border-t border-slate-200 py-12 flex-shrink-0 w-full mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                                <Satellite size={20} />
                            </div>
                            <span className="font-black text-slate-900 text-lg">IoTData Cloud</span>
                        </div>
                        <p className="text-slate-500 text-sm">Plataforma unificada para comunicação de dispositivos IoT. Foco em soluções satelitais rurais e monitoramento industrial.</p>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-900 mb-4">Soluções</h4>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li><a href="/" className="hover:text-blue-600">IoT Satelital Agrícola</a></li>
                            <li><a href="/" className="hover:text-blue-600">Indústria 4.0 / LoRa</a></li>
                            <li><a href="/" className="hover:text-blue-600">Gestão de Frotas</a></li>
                            <li><a href="/" className="hover:text-blue-600">Hardware Globalstar</a></li>
                            <li><button onClick={() => navigate('/agro-igam')} className="hover:text-blue-600 text-left">Plataforma Agro IGAM</button></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-900 mb-4">Plataforma</h4>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li><button onClick={() => navigate('/login')} className="hover:text-blue-600">Login</button></li>
                            <li><button onClick={() => navigate('/dashboard')} className="hover:text-blue-600">Dashboard</button></li>
                            <li><a href="/" className="hover:text-blue-600">Documentação API</a></li>
                            <li><a href="/" className="hover:text-blue-600">Suporte Técnico</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-900 mb-4">Contato</h4>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li>pedromarco@iotdata.com.br</li>
                            <li>+55 (31) 975280637</li>
                            <li>Rua da Bahia 504, SL 301, Centro,<br />Belo Horizonte, MG, BR - 30160-015</li>
                            <li className="font-semibold text-slate-700 mt-2">CNPJ: 37.227.651/0001-29</li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-sm">© 2026 IoTData Cloud by Data Frontier Systems. Todos os direitos reservados.</p>
                    <div className="flex gap-4">
                        <a href="/" className="text-sm text-slate-500 hover:text-slate-900">Termos de Uso</a>
                        <a href="/" className="text-sm text-slate-500 hover:text-slate-900">Política de Privacidade</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
