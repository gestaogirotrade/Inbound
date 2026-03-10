/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Link as LinkIcon, 
  Monitor,
  Clock,
  Zap,
  BarChart3,
  LayoutDashboard,
  Tv,
  FileText,
  Truck,
  Box,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types for our logistics data
interface LogisticsData {
  date: string;
  fornecedor: string;
  ordem: string;
  tipo: string;
  chegadaDoca: string;
  saidaDoca: string;
  doca: string;
  inicioDescarga: string;
  fimDescarga: string;
  inicioConferencia: string;
  fimConferencia: string;
  conferente: string;
  status: string;
  tempoTotal: string;
  tipoArmazenagem: string;
  palete: string;
}

const isFinalizado = (d: LogisticsData) => {
  const s = d.status.toLowerCase().trim();
  const hasExit = d.saidaDoca && d.saidaDoca.trim() !== '' && d.saidaDoca !== '0' && d.saidaDoca !== '-' && d.saidaDoca.includes(':');
  
  // Strict keywords for finished
  const isFinishedStatus = 
    s === 'finalizado' || s === 'finalizada' || 
    s === 'concluido' || s === 'concluído' || 
    s === 'concluida' || s === 'concluída' || 
    s === 'encerrado' || s === 'encerrada' || 
    s === 'finalizados' || s === 'liberado' || s === 'liberada' ||
    s.includes('conferência finalizada') || s.includes('conferencia finalizada') ||
    s.includes('noshow') || s.includes('recusado');
  
  return isFinishedStatus || hasExit;
};

const isEmOperacao = (d: LogisticsData) => {
  if (isFinalizado(d)) return false;
  
  const s = d.status.toLowerCase().trim();
  const hasDoca = d.doca && d.doca.trim() !== '' && d.doca !== '0' && d.doca !== '-';
  
  // Keywords that indicate active operation
  const hasOpKeywords = s.includes('descarga') || s.includes('conferen') || s.includes('operando') || s.includes('processo') || s.includes('execução') || s.includes('andamento') || s.includes('doca');
  
  return (hasOpKeywords || hasDoca);
};

const isAguardando = (d: LogisticsData) => {
  if (isFinalizado(d) || isEmOperacao(d)) return false;
  
  const s = d.status.toLowerCase().trim();
  const hasWaitKeywords = s.includes('aguarda') || s.includes('pátio') || s.includes('patio') || s.includes('check') || s.includes('trânsito') || s.includes('transito') || s.includes('chegou') || s.includes('agendado');
  
  // If it has a supplier but no doca and not finished/operating, it's waiting
  const hasNoDoca = !d.doca || d.doca.trim() === '' || d.doca === '0' || d.doca === '-';
  
  return hasWaitKeywords || (hasNoDoca && d.fornecedor && d.fornecedor.trim() !== '');
};

const SHEET_ID = '1kgo_BrjuyPp5zxOGaJJfucd6t9fdufE8KF2Po-aCkGk';
const GID = '961088198';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

// Reports View Component
function ReportsView({ data, selectedDate, uniqueDates }: { data: LogisticsData[], selectedDate: string, uniqueDates: string[] }) {
  const [activeReportTab, setActiveReportTab] = useState<'fechados' | 'abertos' | 'saldo'>('saldo');
  const [activeReportSubject, setActiveReportSubject] = useState<'tickets' | 'devolucao'>('tickets');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  const todayIndex = uniqueDates.indexOf(selectedDate);
  
  // Filter data based on subject and active tab
  const filteredDataByTab = useMemo(() => {
    let subjectFiltered = data;
    if (activeReportSubject === 'devolucao') {
      subjectFiltered = data.filter(d => d.tipo.toUpperCase().includes('DEVOLUÇÃO') || d.tipo.toUpperCase().includes('DEVOLUCAO'));
    }
    // If subject is 'tickets', we show all data

    if (activeReportTab === 'fechados') return subjectFiltered.filter(isFinalizado);
    if (activeReportTab === 'abertos') return subjectFiltered.filter(d => isEmOperacao(d) || isAguardando(d));
    return subjectFiltered;
  }, [data, activeReportTab, activeReportSubject]);

  // Get next 5 days (including today)
  const forecastDates = uniqueDates.slice(todayIndex, todayIndex + 5);

  const getStatsForDate = (date: string | null) => {
    if (!date) return null;
    const filtered = filteredDataByTab.filter(d => d.date === date);
    const total = filtered.length;
    const pallets = filtered.reduce((acc, item) => {
      const p = parseInt((item.palete || '').toString().replace(/[^\d]/g, '')) || 0;
      return acc + p;
    }, 0);
    
    const cifList = filtered.filter(d => d.tipo.toUpperCase().includes('NÃO') || d.tipo.toUpperCase().includes('CIF'));
    const fobList = filtered.filter(d => d.tipo.toUpperCase().includes('SIM') || d.tipo.toUpperCase().includes('FOB'));
    const noshowList = filtered.filter(d => d.status.toLowerCase().includes('noshow'));
    const recusadoList = filtered.filter(d => d.status.toLowerCase().includes('recusado'));
    
    const storage: Record<string, number> = {};
    filtered.forEach(item => {
      const type = (item.tipoArmazenagem || '').toUpperCase().trim();
      const p = parseInt((item.palete || '').toString().replace(/[^\d]/g, '')) || 0;
      if (type) storage[type] = (storage[type] || 0) + p;
    });

    return { 
      total, 
      pallets, 
      cif: cifList.length, 
      fob: fobList.length, 
      noshow: noshowList.length, 
      recusado: recusadoList.length, 
      storage,
      cifSuppliers: cifList.map(d => d.fornecedor),
      fobSuppliers: fobList.map(d => d.fornecedor),
      noshowSuppliers: noshowList.map(d => d.fornecedor),
      recusadoSuppliers: recusadoList.map(d => d.fornecedor)
    };
  };

  const forecastData = forecastDates.map(date => ({
    date,
    stats: getStatsForDate(date)
  }));

  // Aggregate all unique sectors across forecast days
  const allSectors = Array.from(new Set(filteredDataByTab.map(item => (item.tipoArmazenagem || '').toUpperCase().trim()).filter(Boolean)))
    .filter(sector => sector !== 'NA' && sector !== 'N/A');

  const sectorTotals = allSectors.map((sector: string) => {
    const total = forecastData.reduce((acc, d: any) => acc + ((d.stats?.storage as any)?.[sector] || 0), 0);
    return { name: sector, total };
  }).sort((a, b) => b.total - a.total);

  const forecastSummary = {
    cif: forecastData.reduce((acc, d: any) => acc + (d.stats?.cif || 0), 0),
    fob: forecastData.reduce((acc, d: any) => acc + (d.stats?.fob || 0), 0),
    noshow: forecastData.reduce((acc, d: any) => acc + (d.stats?.noshow || 0), 0),
    recusado: forecastData.reduce((acc, d: any) => acc + (d.stats?.recusado || 0), 0),
    total: forecastData.reduce((acc, d: any) => acc + (d.stats?.total || 0), 0),
    cifSuppliers: Array.from(new Set(forecastData.flatMap((d: any) => d.stats?.cifSuppliers || []))),
    fobSuppliers: Array.from(new Set(forecastData.flatMap((d: any) => d.stats?.fobSuppliers || []))),
    noshowSuppliers: Array.from(new Set(forecastData.flatMap((d: any) => d.stats?.noshowSuppliers || []))),
    recusadoSuppliers: Array.from(new Set(forecastData.flatMap((d: any) => d.stats?.recusadoSuppliers || [])))
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  return (
    <motion.div 
      key="reports"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto custom-scrollbar pr-2 relative"
    >
      {/* Background Logo Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] opacity-[0.15] pointer-events-none z-0">
        <svg viewBox="0 0 48 32" className="w-full h-full overflow-visible">
          <path 
            d="M12 16 A8 8 0 1 1 28 16" 
            fill="none" 
            stroke="white" 
            strokeWidth="1.5" 
            strokeLinecap="round"
            className="drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
          />
          <path 
            d="M36 16 A8 8 0 1 1 20 16" 
            fill="none" 
            stroke="#10b981" 
            strokeWidth="1.5" 
            strokeLinecap="round"
            className="drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          />
        </svg>
      </div>

      {/* Subject Selector */}
      <div className="flex items-center gap-2 mb-2 relative z-10">
        <button 
          onClick={() => setActiveReportSubject('tickets')}
          className={cn(
            "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
            activeReportSubject === 'tickets' 
              ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
              : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
          )}
        >
          Tickets Gerais
        </button>
        <button 
          onClick={() => setActiveReportSubject('devolucao')}
          className={cn(
            "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
            activeReportSubject === 'devolucao' 
              ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]" 
              : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
          )}
        >
          Devoluções
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-col gap-2 mb-4 relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-[1px] flex-1 bg-white/5" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
            {activeReportSubject === 'tickets' ? 'Módulo de Tickets Gerais' : 'Módulo de Devolução'}
          </span>
          <div className="h-[1px] flex-1 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <button 
            onClick={() => setActiveReportTab('fechados')}
            className={cn(
              "px-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
              activeReportTab === 'fechados' 
                ? (activeReportSubject === 'tickets' ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]")
                : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
            )}
          >
            Finalizados
          </button>
          <button 
            onClick={() => setActiveReportTab('abertos')}
            className={cn(
              "px-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
              activeReportTab === 'abertos' 
                ? (activeReportSubject === 'tickets' ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "bg-orange-500 text-white border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]")
                : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
            )}
          >
            Em Aberto
          </button>
          <button 
            onClick={() => setActiveReportTab('saldo')}
            className={cn(
              "px-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
              activeReportTab === 'saldo' 
                ? "bg-slate-700 text-white border-slate-600 shadow-[0_0_15px_rgba(71,85,105,0.4)]" 
                : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
            )}
          >
            Saldo Total
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch relative z-10">
        {/* Card 1: Projeção 5 Dias */}
        <div className="glass-card tech-border rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">PROJEÇÃO 5 DIAS (CARGAS / PALETES)</h3>
          <div className="flex-1 flex flex-col gap-2">
            {forecastData.map((d, idx) => (
              <div key={idx} className={cn(
                "flex justify-between items-center p-2 rounded-xl border",
                idx === 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/5"
              )}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{d.date}</span>
                  <span className="text-[10px] text-slate-400">{d.stats?.pallets || 0} PLTS</span>
                </div>
                <span className={cn("text-2xl font-black font-mono", idx === 0 ? "text-white" : "text-slate-300")}>{d.stats?.total || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Total Paletes / Setor */}
        <div className="glass-card tech-border rounded-2xl p-4 flex flex-col gap-2">
          <h3 className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">TOTAL PALETES / SETOR (5 DIAS)</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1.5">
            {sectorTotals.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{s.name}</span>
                <span className="text-[12px] font-black text-white font-mono">{s.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Resumo Operacional */}
        <div className="glass-card tech-border rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.3em]">RESUMO OPERACIONAL (5 DIAS)</h3>
            <span className="text-[10px] font-bold text-slate-600">PROJEÇÃO_TOTAL</span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-3">
            {/* CIF */}
            <div className="flex flex-col border-b border-white/5 pb-2">
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                onClick={() => toggleCategory('cif')}
              >
                <div className="flex items-center gap-2">
                  {expandedCategory === 'cif' ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  <span className="text-[12px] font-bold text-slate-400 uppercase">NÃO (CIF)</span>
                </div>
                <div className="bg-slate-800/50 px-2 py-0.5 rounded text-[12px] font-black text-white font-mono">{forecastSummary.cif}</div>
              </div>
              {expandedCategory === 'cif' && (
                <div className="mt-2 pl-5 flex flex-col gap-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {forecastSummary.cifSuppliers.length > 0 ? (
                    forecastSummary.cifSuppliers.map((s, i) => (
                      <span key={i} className="text-[10px] text-slate-500 truncate">• {s}</span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">Nenhum fornecedor</span>
                  )}
                </div>
              )}
            </div>

            {/* FOB */}
            <div className="flex flex-col border-b border-white/5 pb-2">
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                onClick={() => toggleCategory('fob')}
              >
                <div className="flex items-center gap-2">
                  {expandedCategory === 'fob' ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  <span className="text-[12px] font-bold text-slate-400 uppercase">SIM (FOB)</span>
                </div>
                <div className="bg-slate-800/50 px-2 py-0.5 rounded text-[12px] font-black text-white font-mono">{forecastSummary.fob}</div>
              </div>
              {expandedCategory === 'fob' && (
                <div className="mt-2 pl-5 flex flex-col gap-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {forecastSummary.fobSuppliers.length > 0 ? (
                    forecastSummary.fobSuppliers.map((s, i) => (
                      <span key={i} className="text-[10px] text-slate-500 truncate">• {s}</span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">Nenhum fornecedor</span>
                  )}
                </div>
              )}
            </div>

            {/* NOSHOW */}
            <div className="flex flex-col border-b border-white/5 pb-2">
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                onClick={() => toggleCategory('noshow')}
              >
                <div className="flex items-center gap-2">
                  {expandedCategory === 'noshow' ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  <span className="text-[12px] font-bold text-rose-500 uppercase">NOSHOW</span>
                </div>
                <div className="bg-slate-800/50 px-2 py-0.5 rounded text-[12px] font-black text-white font-mono">{forecastSummary.noshow}</div>
              </div>
              {expandedCategory === 'noshow' && (
                <div className="mt-2 pl-5 flex flex-col gap-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {forecastSummary.noshowSuppliers.length > 0 ? (
                    forecastSummary.noshowSuppliers.map((s, i) => (
                      <span key={i} className="text-[10px] text-rose-400/70 truncate">• {s}</span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">Nenhum fornecedor</span>
                  )}
                </div>
              )}
            </div>

            {/* RECUSADO */}
            <div className="flex flex-col border-b border-white/5 pb-2">
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                onClick={() => toggleCategory('recusado')}
              >
                <div className="flex items-center gap-2">
                  {expandedCategory === 'recusado' ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  <span className="text-[12px] font-bold text-rose-500 uppercase">RECUSADO</span>
                </div>
                <div className="bg-slate-800/50 px-2 py-0.5 rounded text-[12px] font-black text-white font-mono">{forecastSummary.recusado}</div>
              </div>
              {expandedCategory === 'recusado' && (
                <div className="mt-2 pl-5 flex flex-col gap-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {forecastSummary.recusadoSuppliers.length > 0 ? (
                    forecastSummary.recusadoSuppliers.map((s, i) => (
                      <span key={i} className="text-[10px] text-rose-400/70 truncate">• {s}</span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">Nenhum fornecedor</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-emerald-500/20 flex justify-between items-center">
            <span className="text-[12px] font-black text-emerald-500 uppercase tracking-widest">TOTAL</span>
            <span className="text-3xl font-black text-emerald-400 font-mono drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              {forecastSummary.total}
            </span>
          </div>
        </div>
      </div>

      {/* Empty space for future use */}
      <div className="flex-1 min-h-[200px]" />
    </motion.div>
  );
}

export default function App() {
  const [data, setData] = useState<LogisticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [view, setView] = useState<'dashboard' | 'reports'>('dashboard');
  const [tvMode, setTvMode] = useState(false);

  useEffect(() => {
    let interval: any;
    if (tvMode) {
      interval = setInterval(() => {
        setView(prev => prev === 'dashboard' ? 'reports' : 'dashboard');
      }, 15000); // Cycle every 15 seconds for TV mode
    }
    return () => clearInterval(interval);
  }, [tvMode]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Handle formats like "9/3", "09/03", "9/3/2024", "2024-03-09"
    let day = '', month = '';
    
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) { // YYYY-MM-DD
        day = parts[2].padStart(2, '0');
        month = parts[1].padStart(2, '0');
      } else { // DD-MM-YYYY
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
      }
    }
    
    if (day && month) {
      return `${day}/${month}`;
    }
    return dateStr;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const cacheBuster = `&t=${new Date().getTime()}`;
      const response = await fetch(`${CSV_URL}${cacheBuster}`);
      if (!response.ok) throw new Error('Falha ao buscar dados');
      
      const csvText = await response.text();
      const rows = csvText.split(/\r?\n/).filter(row => row.trim() !== '');
      if (rows.length < 2) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayFormatted = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}`;
      
      // Helper to parse a CSV row correctly handling quotes
      const parseRow = (row: string) => {
        const cols: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cols.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        cols.push(current.trim().replace(/^"|"$/g, ''));
        return cols;
      };

      const headers = parseRow(rows[0]).map(h => h.toLowerCase());
      const findCol = (names: string[], defaultIdx: number, exclude: string[] = []) => {
        // Try exact match first
        let idx = headers.findIndex(h => names.some(n => h === n));
        if (idx !== -1) return idx;
        
        // Try partial match excluding certain terms
        idx = headers.findIndex(h => 
          names.some(n => h.includes(n)) && !exclude.some(e => h.includes(e))
        );
        return idx !== -1 ? idx : defaultIdx;
      };

      const colMap = {
        date: findCol(['data', 'date', 'dia'], 0),
        fornecedor: findCol(['fornecedor', 'cliente', 'empresa'], 1),
        ordem: findCol(['ordem', 'or', 'pedido'], 2),
        tipo: findCol(['tipo', 'frete'], 3),
        chegadaDoca: findCol(['chegada doca', 'entrada'], 5),
        saidaDoca: findCol(['saída doca', 'saida doca', 'saida'], 6),
        doca: findCol(['doca', 'portão', 'gate'], 7, ['chegada', 'saída', 'saida', 'horário', 'horario']),
        inicioDescarga: findCol(['início descarga', 'inicio descarga', 'descarga'], 9),
        fimDescarga: findCol(['fim descarga'], 10),
        inicioConferencia: findCol(['início conferência', 'inicio conferencia', 'conferencia'], 12),
        fimConferencia: findCol(['fim conferência', 'fim conferencia'], 13),
        conferente: findCol(['conferente', 'usuario'], 14),
        status: findCol(['status', 'situação', 'situacao'], 17),
        tempoTotal: findCol(['tempo total', 'duração'], 18),
        tipoArmazenagem: findCol(['tipo armazenagem', 'armazenagem', 'setor'], 19),
        palete: findCol(['palete', 'plts', 'paletes', 'qtd'], 20)
      };

      const parsedData: LogisticsData[] = rows.slice(1).map(row => {
        const cols = parseRow(row);
        const getVal = (idx: number) => idx !== -1 ? cols[idx] : '';

        return {
          date: formatDate(getVal(colMap.date)),
          fornecedor: getVal(colMap.fornecedor),
          ordem: getVal(colMap.ordem),
          tipo: getVal(colMap.tipo),
          chegadaDoca: getVal(colMap.chegadaDoca),
          saidaDoca: getVal(colMap.saidaDoca),
          doca: getVal(colMap.doca),
          inicioDescarga: getVal(colMap.inicioDescarga),
          fimDescarga: getVal(colMap.fimDescarga),
          inicioConferencia: getVal(colMap.inicioConferencia),
          fimConferencia: getVal(colMap.fimConferencia),
          conferente: getVal(colMap.conferente),
          status: getVal(colMap.status),
          tempoTotal: getVal(colMap.tempoTotal),
          tipoArmazenagem: getVal(colMap.tipoArmazenagem),
          palete: getVal(colMap.palete),
        };
      });

      setData(parsedData);
      
      // Update selected date
      const dates = Array.from(new Set(parsedData.map(d => d.date))).filter((d: string) => d && d !== '---' && d.includes('/'));
      
      // Force selectedDate to today if it's available, otherwise pick the most recent available date
      if (dates.includes(todayFormatted)) {
        setSelectedDate(todayFormatted);
      } else if (dates.length > 0) {
        // Sort dates to find the most recent one
        const sortedDates = [...dates].sort((a: string, b: string) => {
          const [da, ma] = a.split('/').map(Number);
          const [db, mb] = b.split('/').map(Number);
          if (ma !== mb) return ma - mb;
          return da - db;
        });
        setSelectedDate(sortedDates[sortedDates.length - 1]);
      } else {
        setSelectedDate(todayFormatted);
      }
      
      setLastUpdate(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const uniqueDates = useMemo(() => {
    const rawDates = data.map(d => d.date);
    return Array.from(new Set(rawDates))
      .filter((d: string) => d && d !== '---' && d.includes('/'))
      .sort((a: string, b: string) => {
        const [da, ma] = a.split('/').map(Number);
        const [db, mb] = b.split('/').map(Number);
        if (ma !== mb) return ma - mb;
        return da - db;
      });
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(d => d.date === selectedDate);
  }, [data, selectedDate]);

  const handlePrevDate = () => {
    const currentIndex = uniqueDates.indexOf(selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(uniqueDates[currentIndex - 1]);
    }
  };

  const handleNextDate = () => {
    const currentIndex = uniqueDates.indexOf(selectedDate);
    if (currentIndex < uniqueDates.length - 1) {
      setSelectedDate(uniqueDates[currentIndex + 1]);
    }
  };

  const formatSupplierName = (name: string) => {
    if (!name) return '';
    // Remove quotes if any
    const cleanName = name.replace(/^"|"$/g, '').trim();
    const words = cleanName.split(/\s+/);
    // Return more words to avoid excessive truncation
    return words.slice(0, 4).join(' ');
  };

  const formatTempoMedio = (tempo: string) => {
    if (!tempo || !tempo.includes(':')) return '0H 00M';
    const parts = tempo.split(':');
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    
    // If it's not a valid number or looks like a date error (very large/negative)
    if (isNaN(h) || isNaN(m) || h < -24 || h > 48) {
      return '---';
    }
    
    return `${Math.abs(h)}H ${Math.abs(m).toString().padStart(2, '0')}M`;
  };

  const calculateTimeDiff = (start: string, end: string) => {
    if (!start || !end || !start.includes(':') || !end.includes(':')) return '---';
    
    try {
      const parseTime = (str: string) => {
        const parts = str.trim().split(' ');
        const timePart = parts.length > 1 ? parts[1] : parts[0];
        const timeOnly = timePart.split(':');
        const h = parseInt(timeOnly[0]);
        const m = parseInt(timeOnly[1]);
        return { h, m };
      };

      const s = parseTime(start);
      const e = parseTime(end);
      
      if (isNaN(s.h) || isNaN(s.m) || isNaN(e.h) || isNaN(e.m)) return '---';
      
      let diffMinutes = (e.h * 60 + e.m) - (s.h * 60 + s.m);
      
      // Handle overnight
      if (diffMinutes < 0) diffMinutes += 1440; 
      
      const h = Math.floor(diffMinutes / 60);
      const m = diffMinutes % 60;
      
      return `${h}H ${m.toString().padStart(2, '0')}M`;
    } catch (err) {
      return '---';
    }
  };

  const stats = useMemo(() => {
    const total = filteredData.length;
    
    const isFinalizadoLocal = (d: LogisticsData) => isFinalizado(d);
    const isEmOperacaoLocal = (d: LogisticsData) => isEmOperacao(d);
    const isAguardandoLocal = (d: LogisticsData) => isAguardando(d);

    // 1. Finalizados
    const finalizados = filteredData.filter(isFinalizadoLocal);
    
    // 2. Em Operação
    const emOperacao = filteredData.filter(isEmOperacaoLocal);
    
    // 3. Aguardando
    const aguardando = filteredData.filter(isAguardandoLocal);

    // Storage types summary - Summing pallets per category
    const storageSummary: Record<string, number> = {
      'MERCEARIA SECA': 0,
      'BEBIDAS': 0,
      'LIMPEZA E LAVANDERIA': 0,
      'HIGIENE, SAUDE E BELEZA': 0,
      'AEROSOL': 0
    };

    filteredData.forEach(item => {
      const type = (item.tipoArmazenagem || '').toUpperCase().trim();
      // Clean the pallet string and parse it
      const palletStr = (item.palete || '').toString().replace(/[^\d]/g, '');
      const pallets = parseInt(palletStr) || 0;
      
      if (type && type !== 'NA' && type !== 'N/A') {
        storageSummary[type] = (storageSummary[type] || 0) + pallets;
      }
    });

    // Finalizados by type (CIF vs FOB)
    const finalizadosByType = {
      cif: finalizados.filter(d => d.tipo.toUpperCase().includes('NÃO') || d.tipo.toUpperCase().includes('CIF')).length,
      fob: finalizados.filter(d => d.tipo.toUpperCase().includes('SIM') || d.tipo.toUpperCase().includes('FOB')).length,
      noshow: filteredData.filter(d => d.status.toLowerCase().includes('noshow')).length,
      recusado: filteredData.filter(d => d.status.toLowerCase().includes('recusado')).length
    };

    return { 
      total, 
      finalizados, 
      emOperacao, 
      aguardando, 
      storageSummary,
      finalizadosByType
    };
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 flex flex-col gap-4 relative overflow-hidden">
      {/* Background Grid Decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      
      {/* Header */}
      <header className="flex items-center justify-between relative z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevDate}
              disabled={uniqueDates.indexOf(selectedDate) <= 0}
              className="p-1 hover:bg-emerald-500/20 rounded transition-all disabled:opacity-30 active:scale-90"
            >
              <ChevronLeft className="w-4 h-4 text-emerald-500" />
            </button>
            <div className="glass-card border-emerald-500/30 px-3 py-1 rounded-md flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              <Clock className="w-4 h-4 animate-pulse" />
              {(() => {
                const today = new Date();
                const todayFormatted = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}`;
                return selectedDate === todayFormatted ? `HOJE: ${selectedDate}` : `DATA: ${selectedDate || '---'}`;
              })()}
            </div>
            <button 
              onClick={handleNextDate}
              disabled={uniqueDates.indexOf(selectedDate) >= uniqueDates.length - 1}
              className="p-1 hover:bg-emerald-500/20 rounded transition-all disabled:opacity-30 active:scale-90"
            >
              <ChevronRight className="w-4 h-4 text-emerald-500" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card border-white/5 px-2 py-0.5 rounded text-[11px] font-bold text-slate-400 uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              ATUALIZADO: {lastUpdate.toLocaleTimeString('pt-BR')}
              <button 
                onClick={fetchData}
                disabled={loading}
                className="ml-1 hover:text-emerald-400 transition-colors disabled:opacity-50"
                title="Atualizar agora"
              >
                <Zap className={cn("w-3 h-3", loading && "animate-spin text-emerald-500")} />
              </button>
            </div>
            <div className="glass-card border-white/5 px-2 py-0.5 rounded text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              FILTRO: N/A
            </div>
          </div>
        </div>

        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
        >
          <h1 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-1 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            CONTROLE DE CARGAS
          </h1>
          <div className="glass-card tech-border rounded-xl px-12 py-2 flex flex-col items-center glow-emerald group hover:scale-105 transition-transform cursor-default">
            <div className="corner-accent corner-tl" />
            <div className="corner-accent corner-tr" />
            <div className="corner-accent corner-bl" />
            <div className="corner-accent corner-br" />
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.4em] opacity-70">TOTAL CARGAS</span>
            <span className="text-6xl font-black text-white leading-none font-mono tracking-tighter text-glow-emerald">{stats.total}</span>
          </div>
        </motion.div>

        <div className="flex flex-col items-end gap-2">
          {/* Logo and Text */}
          <div className="flex items-center gap-2 mb-1">
            <div className="relative w-12 h-8 flex items-center justify-center">
              <svg viewBox="0 0 48 32" className="w-full h-full">
                {/* Top White Link */}
                <path 
                  d="M12 16 A8 8 0 1 1 28 16" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="5" 
                  strokeLinecap="round"
                />
                {/* Bottom Green Link */}
                <path 
                  d="M36 16 A8 8 0 1 1 20 16" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="5" 
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-2xl font-black text-white leading-none tracking-tight">giro</span>
              <span className="text-2xl font-black text-white leading-none tracking-tight">trade</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setView(view === 'dashboard' ? 'reports' : 'dashboard')}
              className={cn(
                "border px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-2xl active:scale-95",
                view === 'dashboard' 
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500" 
                  : "bg-blue-500/10 border-blue-500/40 text-blue-500"
              )}
            >
              {view === 'dashboard' ? <BarChart3 className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {view === 'dashboard' ? 'RELATÓRIOS' : 'DASHBOARD'}
              </span>
            </button>
            <button 
              onClick={() => setTvMode(!tvMode)}
              className={cn(
                "px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-2xl active:scale-95 border",
                tvMode 
                  ? "bg-orange-500/20 border-orange-500/50 text-orange-500 animate-pulse" 
                  : "bg-[#0f172a] border-slate-800/40 text-[#64748b] hover:bg-slate-800"
              )}
            >
              <Tv className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">MODO TV</span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === 'dashboard' ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-4 flex-1 min-h-0 relative"
          >
            {/* Background Logo Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] opacity-[0.15] pointer-events-none z-0">
              <svg viewBox="0 0 48 32" className="w-full h-full overflow-visible">
                <path 
                  d="M12 16 A8 8 0 1 1 28 16" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                />
                <path 
                  d="M36 16 A8 8 0 1 1 20 16" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                />
              </svg>
            </div>
            {/* Top Cards */}
            <div className="grid grid-cols-3 gap-4 h-48 relative z-10">
        {/* Storage Summary */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card tech-border rounded-2xl p-4 flex flex-col group hover:glow-emerald transition-all"
        >
          <div className="corner-accent corner-tl opacity-40" />
          <div className="corner-accent corner-br opacity-40" />
          <h3 className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-[0.3em] mb-3 border-b border-white/5 pb-2 flex justify-between">
            <span>TIPO DE ARMAZENAGEM / QNT PALETES</span>
            <span className="text-[10px] opacity-50 font-mono">V.2.5</span>
          </h3>
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(stats.storageSummary).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center text-[11px] font-bold group/item">
                <span className="text-slate-400 uppercase group-hover/item:text-emerald-400 transition-colors flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500/30 rounded-full" />
                  {type}
                </span>
                <span className="text-white font-mono bg-emerald-500/5 px-1.5 rounded">{count} <span className="text-[10px] opacity-50">PLTS</span></span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* In Operation */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card tech-border rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:glow-orange transition-all"
        >
          <div className="corner-accent corner-tr border-orange-500/40" />
          <div className="corner-accent corner-bl border-orange-500/40" />
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse" />
          <div className="flex flex-col items-center gap-1 relative z-10">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.4em] flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
              EM OPERAÇÃO
            </span>
            <span className="text-9xl font-black text-white leading-none font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(255,165,0,0.5)]">
              {stats.emOperacao.length}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 font-mono">CARGAS EM DOCA</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent h-1/2 w-full animate-scan pointer-events-none" />
        </motion.div>

        {/* Finalizados Summary */}
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card tech-border rounded-2xl p-4 flex flex-col group hover:glow-emerald transition-all"
        >
          <div className="corner-accent corner-tr opacity-40" />
          <div className="corner-accent corner-bl opacity-40" />
          <h3 className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-[0.3em] mb-3 border-b border-white/5 pb-2 flex justify-between">
            <span>FINALIZADOS</span>
            <span className="text-[10px] opacity-50 font-mono">ARQUIVO_01</span>
          </h3>
          <div className="flex flex-col gap-2">
            {[
              { label: 'NÃO (CIF)', val: stats.finalizadosByType.cif, color: 'text-slate-400' },
              { label: 'SIM (FOB)', val: stats.finalizadosByType.fob, color: 'text-slate-400' },
              { label: 'NOSHOW', val: stats.finalizadosByType.noshow, color: 'text-red-400' },
              { label: 'RECUSADO', val: stats.finalizadosByType.recusado, color: 'text-red-500' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center text-[10px] font-bold">
                <span className={cn("uppercase", row.color)}>{row.label}</span>
                <span className="text-white font-mono bg-white/5 px-1.5 rounded">{row.val}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-[13px] font-black border-t border-white/10 pt-2 mt-1">
              <span className="text-emerald-500 uppercase tracking-[0.2em]">TOTAL</span>
              <span className="text-emerald-500 font-mono text-2xl text-glow-emerald">{stats.finalizados.length}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Columns */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 relative z-10">
        {/* Column 1: Waiting */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card tech-border rounded-3xl flex flex-col overflow-hidden"
        >
          <div className="bg-gradient-to-r from-blue-600/80 to-blue-500/80 px-4 py-2 flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 animate-pulse" />
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic relative z-10">AGUARDANDO / PÁTIO</h2>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-black text-white font-mono relative z-10">{stats.aguardando.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 custom-scrollbar">
            {stats.aguardando.length > 0 ? (
              stats.aguardando.map((item, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + (idx * 0.05) }}
                  className="border-b border-white/5 pb-2 group hover:bg-blue-500/5 transition-all p-2 rounded-lg cursor-default"
                >
                  <div className="text-[10px] font-black text-white uppercase truncate group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full group-hover:animate-ping" />
                    {formatSupplierName(item.fornecedor)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 tracking-widest font-mono">{item.tipoArmazenagem}</div>
                </motion.div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-20 grayscale">
                <Truck className="w-8 h-8 mb-2" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Sem cargas aguardando</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Column 2: In Operation */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-card tech-border rounded-3xl flex flex-col overflow-hidden"
        >
          <div className="bg-gradient-to-r from-orange-600/80 to-orange-500/80 px-4 py-2 flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 animate-pulse" />
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic relative z-10">EM DOCA / OPERAÇÃO</h2>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-black text-white font-mono relative z-10">{stats.emOperacao.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {stats.emOperacao.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                    <th className="px-3 py-1.5">FORNECEDOR</th>
                    <th className="px-3 py-1.5 text-center">DOCA</th>
                    <th className="px-3 py-1.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.emOperacao.map((item, idx) => {
                    const statusLower = item.status.toLowerCase();
                    let nameColor = "text-orange-400"; // Default
                    if (statusLower.includes('descarga') && !statusLower.includes('aguardando')) {
                      nameColor = "text-emerald-400";
                    } else if (statusLower.includes('conferência') || statusLower.includes('conferencia')) {
                      nameColor = "text-blue-400";
                    }

                    return (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="px-3 py-2">
                          <div className={cn("text-[9px] font-black uppercase leading-tight transition-colors", nameColor)}>
                            {formatSupplierName(item.fornecedor)}
                          </div>
                          <div className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 flex items-center gap-1 font-mono">
                            OR: {item.ordem} <Zap className="w-2 h-2 fill-orange-500 text-orange-500 animate-pulse" />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-2xl font-black text-orange-400 leading-none font-mono drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]">{item.doca}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn(
                            "border text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest whitespace-nowrap",
                            statusLower.includes('descarga') && !statusLower.includes('aguardando') 
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                              : (statusLower.includes('conferência') || statusLower.includes('conferencia'))
                                ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                                : "bg-orange-500/20 border-orange-500/40 text-orange-400 animate-pulse"
                          )}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                <Box className="w-8 h-8 mb-2" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Sem operações no momento</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Column 3: Finalizados */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="glass-card tech-border rounded-3xl flex flex-col overflow-hidden"
        >
          <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 px-4 py-2 flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 animate-pulse" />
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic relative z-10">FINALIZADOS</h2>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-black text-white font-mono relative z-10">{stats.finalizados.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {stats.finalizados.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                    <th className="px-3 py-1.5">FORNECEDOR</th>
                    <th className="px-1 py-1.5 text-center">TIPO</th>
                    <th className="px-1 py-1.5 text-center">SAÍDAS</th>
                    <th className="px-1 py-1.5 text-center">HORA</th>
                    <th className="px-1 py-1.5 text-center">MÉDIO</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.finalizados.map((item, idx) => {
                    const isAlert = item.status.toLowerCase().includes('noshow') || item.status.toLowerCase().includes('recusado');
                    return (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="px-3 py-2">
                          <div className={cn(
                            "text-[8px] font-black uppercase transition-colors",
                            isAlert ? "text-rose-500" : "text-white group-hover:text-emerald-400"
                          )}>
                            {formatSupplierName(item.fornecedor)}
                          </div>
                          <div className="text-[7px] font-bold text-slate-500 uppercase mt-0.5 font-mono">OR: {item.ordem}</div>
                        </td>
                      <td className="px-1 py-2 text-center">
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">{item.tipo.includes('NÃO') ? 'NÃO(CIF)' : 'SIM(FOB)'}</span>
                      </td>
                      <td className="px-1 py-2 text-center">
                        <span className="bg-emerald-500/20 text-emerald-500 text-[9px] font-black px-1 py-0.5 rounded font-mono">1</span>
                      </td>
                      <td className="px-1 py-2 text-center">
                        <span className="text-[9px] font-bold text-slate-300 font-mono">{item.fimConferencia.split(' ')[1]?.substring(0, 5) || '--:--'}</span>
                      </td>
                      <td className="px-1 py-2 text-center">
                        <span className="text-[9px] font-black text-emerald-500 italic font-mono">{calculateTimeDiff(item.chegadaDoca, item.fimConferencia)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                <CheckCircle2 className="w-8 h-8 mb-2" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Sem cargas finalizadas hoje</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
        ) : (
          <ReportsView 
            data={data} 
            selectedDate={selectedDate} 
            uniqueDates={uniqueDates}
          />
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}} />
    </div>
  );
}
