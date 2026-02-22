/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import Papa from 'papaparse';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  TrendingUp, 
  FileUp, 
  LogOut, 
  LogIn,
  ShieldCheck,
  Clock,
  Trophy,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Types
interface ProductionData {
  id: number;
  representante: string;
  prod_liquida: number;
  utilizacao: number;
  unidades: number;
  upload_date: string;
}

interface DashboardState {
  data: ProductionData[];
  lastUpdate: string | null;
  fileModified: string | null;
  loading: boolean;
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [dashboard, setDashboard] = useState<DashboardState>({
    data: [],
    lastUpdate: null,
    fileModified: null,
    loading: true,
  });
  const [filter, setFilter] = useState('Todos');

  // Fetch data on mount
  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      setDashboard({
        data: json.data || [],
        lastUpdate: json.lastUpdate,
        fileModified: json.fileModified,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch data", error);
      setDashboard(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.user === 'admin' && loginData.pass === 'admin') {
      setIsAdmin(true);
      setShowLogin(false);
      setLoginData({ user: '', pass: '' });
    } else {
      alert('Credenciais inválidas');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileModifiedDate = new Date(file.lastModified).toISOString();

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: results.data,
              fileModified: fileModifiedDate
            })
          });
          if (res.ok) {
            fetchData();
          }
        } catch (error) {
          console.error("Upload failed", error);
        }
      }
    });
  };

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleClearData = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 3000); // Reset after 3s
      return;
    }

    try {
      const res = await fetch('/api/data', { method: 'DELETE' });
      if (res.ok) {
        setFilter('Todos');
        await fetchData();
        setIsConfirmingDelete(false);
      } else {
        alert('Erro ao apagar dados do servidor.');
      }
    } catch (error) {
      console.error("Failed to clear data", error);
      alert('Erro de conexão ao tentar apagar dados.');
    }
  };

  const filteredData = useMemo(() => {
    if (filter === 'Todos') return dashboard.data;
    return dashboard.data.filter(d => d.representante === filter);
  }, [dashboard.data, filter]);

  const representatives = useMemo(() => {
    return Array.from(new Set(dashboard.data.map(d => d.representante))).sort();
  }, [dashboard.data]);

  const rankingData = useMemo(() => {
    return [...filteredData].sort((a, b) => b.unidades - a.unidades);
  }, [filteredData]);

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '-';
    const date = new Date(iso);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (dashboard.loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <LayoutDashboard className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Produção Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ADMIN
                </span>
                <button 
                  onClick={() => setIsAdmin(false)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Acesso Admin
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Filtrar Representante</span>
            </div>
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="Todos">Todos os Funcionários</option>
              {representatives.map(rep => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
            >
              <div className="flex items-center gap-2 mb-4 text-slate-500">
                <FileUp className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Importar Dados (CSV)</span>
              </div>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-xl file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 transition-all cursor-pointer"
              />
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={handleClearData}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 px-4 font-semibold rounded-xl transition-all text-sm",
                    isConfirmingDelete 
                      ? "bg-red-600 text-white hover:bg-red-700 animate-pulse" 
                      : "bg-red-50 text-red-600 hover:bg-red-100"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  {isConfirmingDelete ? "Clique novamente para confirmar" : "Apagar Todos os Dados"}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Admin Only Charts */}
        {isAdmin && (
          <div className="space-y-8 mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Production Chart */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="text-blue-600 w-5 h-5" />
                    <h3 className="font-bold text-slate-800">Produção Líquida</h3>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="representante" fontSize={10} stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="prod_liquida" name="Prod. Líquida" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Utilization Chart */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-emerald-600 w-5 h-5" />
                    <h3 className="font-bold text-slate-800">Utilização (%)</h3>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="representante" fontSize={10} stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" fontSize={12} unit="%" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="utilizacao" name="Utilização" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Units Line Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
            >
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="text-amber-500 w-5 h-5" />
                <h3 className="font-bold text-slate-800">Unidades Produzidas</h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="representante" fontSize={10} stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="unidades" name="Unidades" stroke="#F59E0B" strokeWidth={3} dot={{ r: 6, fill: '#F59E0B' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        )}

        {/* Ranking Table - Visible to Everyone */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Ranking de Produtividade (Unidades)
              </h3>
              <p className="text-sm text-slate-500 mt-1">Classificação baseada no volume total de unidades</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                Status da Base
              </div>
              <div className="text-xs text-slate-600 text-right">
                {dashboard.fileModified && (
                  <div>Arquivo: <span className="font-medium">{formatDateTime(dashboard.fileModified)}</span></div>
                )}
                {dashboard.lastUpdate && (
                  <div>Sincronizado: <span className="font-medium">{formatDateTime(dashboard.lastUpdate)}</span></div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Posição</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Representante</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Prod. Líquida</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Utilização</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Unidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankingData.length > 0 ? (
                  rankingData.map((row, index) => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                          index === 0 ? "bg-amber-100 text-amber-700" :
                          index === 1 ? "bg-slate-200 text-slate-700" :
                          index === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          {index + 1}º
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{row.representante}</td>
                      <td className="px-6 py-4 text-slate-600">{row.prod_liquida.toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${Math.min(row.utilizacao, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-600">{row.utilizacao.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-bold text-blue-600">{row.unidades}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                      Nenhum dado disponível. Importe um arquivo CSV para começar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2>
                  <p className="text-slate-500 mt-2">Entre com suas credenciais de administrador</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Usuário</label>
                    <input 
                      type="text" 
                      required
                      value={loginData.user}
                      onChange={e => setLoginData(prev => ({ ...prev, user: e.target.value }))}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Senha</label>
                    <input 
                      type="password" 
                      required
                      value={loginData.pass}
                      onChange={e => setLoginData(prev => ({ ...prev, pass: e.target.value }))}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                  >
                    Entrar no Painel
                  </button>
                </form>
              </div>
              <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                <button 
                  onClick={() => setShowLogin(false)}
                  className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancelar e voltar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
