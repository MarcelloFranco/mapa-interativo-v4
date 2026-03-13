import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Save, 
  Trash2, 
  Settings, 
  Users, 
  User,
  ZoomIn,
  ZoomOut,
  Layout, 
  Map as MapIcon, 
  LogOut,
  Search,
  ChevronRight,
  ChevronLeft,
  Upload,
  Palette,
  Type,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Maximize2,
  MousePointer2,
  PenTool,
  Move,
  Grid,
  FileText,
  MessageSquare,
  UserPlus,
  Mail,
  Phone,
  Building2,
  ExternalLink,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  PieChart,
  BarChart3,
  RefreshCw,
  Image as ImageIcon,
  MoreVertical,
  Edit2,
  Copy,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { Lot, LotStatus, Broker } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query,
  orderBy,
  getDoc,
  getDocs,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type Tab = 'dashboard' | 'lots' | 'layout' | 'broker-layout' | 'brokers' | 'leads' | 'settings';

interface AdminEditorProps {
  onNavigate?: (view: any) => void;
}

export function AdminEditor({ onNavigate }: AdminEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [lots, setLots] = useState<Lot[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    title: 'Aura View',
    address: '',
    primaryColor: '#A97A50',
    secondaryColor: '#1A4731',
    logo: null,
    backgroundImage: null,
    version: 0,
    brokerShowAgency: true,
    brokerShowAddress: true,
    brokerCardStyle: 'modern',
    brokerWelcomeMessage: 'Olá! Como posso ajudar você hoje?'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map state
  const [zoom, setZoom] = useState(0.5);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 2400, height: 1700 });
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number, y: number }[]>([]);
  const [editingLot, setEditingLot] = useState<Lot | null>(null);

  useEffect(() => {
    const unsubLots = onSnapshot(collection(db, 'lots'), (snapshot) => {
      setLots(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Lot)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'lots'));

    const unsubBrokers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setBrokers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Broker)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubLeads = onSnapshot(query(collection(db, 'leads'), orderBy('createdAt', 'desc')), (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'leads'));

    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(prev => ({ ...prev, ...docSnap.data() }));
      }
      setIsLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'config/global'));

    return () => {
      unsubLots();
      unsubBrokers();
      unsubLeads();
      unsubConfig();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-brand-offwhite">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
          <p className="font-mono text-xs uppercase tracking-widest text-brand-green/60">Carregando Painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-brand-offwhite overflow-hidden text-brand-green">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-brand-green/10 flex flex-col z-50">
        <div className="p-6 border-b border-brand-green/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center text-white">
            <Layout size={20} />
          </div>
          <div>
            <h1 className="font-bold text-sm">Admin Panel</h1>
            <p className="text-[10px] font-mono uppercase opacity-40">Gestão de Loteamento</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem 
            icon={<BarChart3 size={18} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<Grid size={18} />} 
            label="Lotes" 
            active={activeTab === 'lots'} 
            onClick={() => setActiveTab('lots')} 
          />
          <SidebarItem 
            icon={<PenTool size={18} />} 
            label="Desenhar Mapa" 
            active={activeTab === 'layout'} 
            onClick={() => setActiveTab('layout')} 
          />
          <SidebarItem 
            icon={<Palette size={18} />} 
            label="Layout Corretor" 
            active={activeTab === 'broker-layout'} 
            onClick={() => setActiveTab('broker-layout')} 
          />
          <SidebarItem 
            icon={<Users size={18} />} 
            label="Corretores" 
            active={activeTab === 'brokers'} 
            onClick={() => setActiveTab('brokers')} 
          />
          <SidebarItem 
            icon={<MessageSquare size={18} />} 
            label="Leads" 
            active={activeTab === 'leads'} 
            onClick={() => setActiveTab('leads')} 
          />
          <SidebarItem 
            icon={<Settings size={18} />} 
            label="Configurações" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        <div className="p-4 border-t border-brand-green/10 space-y-2">
          <button 
            onClick={() => onNavigate?.('client')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-brand-green hover:bg-brand-green/5 transition-colors text-sm font-medium"
          >
            <MapIcon size={18} />
            Voltar para o Mapa
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-brand-green/10 flex items-center justify-between px-8 z-40">
          <h2 className="font-serif italic text-xl capitalize">{activeTab.replace('-', ' ')}</h2>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold">{auth.currentUser?.email}</span>
              <span className="text-[9px] font-mono uppercase opacity-40">Administrador</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center">
              <Settings size={20} className="text-brand-green" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <DashboardView lots={lots} leads={leads} brokers={brokers} />}
            {activeTab === 'lots' && <LotsView lots={lots} onEdit={(lot) => { setEditingLot(lot); setActiveTab('layout'); }} />}
            {activeTab === 'layout' && <LayoutView lots={lots} config={config} editingLot={editingLot} setEditingLot={setEditingLot} />}
            {activeTab === 'broker-layout' && <BrokerLayoutView config={config} setConfig={setConfig} />}
            {activeTab === 'brokers' && <BrokersView brokers={brokers} />}
            {activeTab === 'leads' && <LeadsView leads={leads} />}
            {activeTab === 'settings' && <SettingsView config={config} setConfig={setConfig} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium group",
        active 
          ? "bg-brand-green text-white shadow-lg shadow-brand-green/20" 
          : "text-brand-green/60 hover:bg-brand-green/5 hover:text-brand-green"
      )}
    >
      <span className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-brand-green/40 group-hover:text-brand-green")}>
        {icon}
      </span>
      {label}
    </button>
  );
}

// Sub-views (to be implemented in next steps)
function DashboardView({ lots, leads, brokers }: { lots: Lot[], leads: any[], brokers: Broker[] }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Lotes" value={lots.length} icon={<Grid />} color="bg-blue-500" />
        <StatCard title="Lotes Vendidos" value={lots.filter(l => l.status === 'sold').length} icon={<CheckCircle2 />} color="bg-emerald-500" />
        <StatCard title="Novos Leads" value={leads.length} icon={<MessageSquare />} color="bg-amber-500" />
        <StatCard title="Corretores" value={brokers.length} icon={<Users />} color="bg-purple-500" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-brand-green/10 shadow-sm">
          <h3 className="font-serif italic text-lg mb-6">Vendas por Status</h3>
          <div className="h-64 flex items-center justify-center text-brand-green/20">
            <PieChart size={48} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-brand-green/10 shadow-sm">
          <h3 className="font-serif italic text-lg mb-6">Leads Recentes</h3>
          <div className="space-y-4">
            {leads.slice(0, 5).map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-3 hover:bg-brand-green/5 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">{lead.name}</p>
                    <p className="text-[10px] opacity-50">{lead.email}</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase opacity-40">
                  {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString() : 'Recent'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-brand-green/10 shadow-sm flex items-center gap-6">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white", color)}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest opacity-40">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function LotsView({ lots, onEdit }: { lots: Lot[], onEdit: (lot: Lot) => void }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<LotStatus | 'all'>('all');

  const filteredLots = lots.filter(lot => {
    const matchesSearch = lot.number.toLowerCase().includes(search.toLowerCase()) || 
                         lot.area.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lot.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleBulkPriceUpdate = async () => {
    const percentage = prompt('Digite a porcentagem de ajuste (ex: 10 para +10%, -5 para -5%):');
    if (!percentage) return;

    const factor = 1 + (parseFloat(percentage) / 100);
    const batch = writeBatch(db);

    filteredLots.forEach(lot => {
      if (lot.price) {
        const newPrice = Math.round(Number(lot.price) * factor);
        batch.update(doc(db, 'lots', lot.id), { price: newPrice });
      }
    });

    try {
      await batch.commit();
      alert('Preços atualizados com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'lots/bulk');
    }
  };

  const getStatusColor = (status: LotStatus) => {
    switch (status) {
      case 'available': return 'text-emerald-500 bg-emerald-500/10';
      case 'sold': return 'text-red-500 bg-red-500/10';
      case 'reserved': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-green/30" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por número ou área..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-brand-green/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleBulkPriceUpdate}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-brand-green/10 rounded-2xl text-sm font-bold hover:bg-brand-green/5 transition-colors"
          >
            <DollarSign size={18} />
            Ajuste em Massa
          </button>
          <select 
            className="px-4 py-3 bg-white border border-brand-green/10 rounded-2xl text-sm focus:outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">Todos os Status</option>
            <option value="available">Disponíveis</option>
            <option value="sold">Vendidos</option>
            <option value="reserved">Reservados</option>
          </select>
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-2xl text-sm font-bold shadow-lg shadow-brand-green/20 hover:scale-105 transition-transform">
            <Plus size={18} />
            Novo Lote
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-brand-green/10 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-green/5 text-[10px] font-mono uppercase tracking-widest opacity-50">
              <th className="px-6 py-4">Lote</th>
              <th className="px-6 py-4">Área</th>
              <th className="px-6 py-4">Preço</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-green/5">
            {filteredLots.map(lot => (
              <tr key={lot.id} className="hover:bg-brand-green/5 transition-colors group">
                <td className="px-6 py-4 font-bold text-sm">Lote {lot.number}</td>
                <td className="px-6 py-4 text-xs opacity-60">{lot.area}</td>
                <td className="px-6 py-4 text-xs font-mono">
                  {lot.price ? `R$ ${Number(lot.price).toLocaleString('pt-BR')}` : '---'}
                </td>
                <td className="px-6 py-4">
                  <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", getStatusColor(lot.status))}>
                    {lot.status === 'available' ? 'Disponível' : lot.status === 'sold' ? 'Vendido' : 'Reservado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(lot)}
                      className="p-2 hover:bg-brand-green/10 rounded-lg text-brand-green transition-colors"
                      title="Editar no Mapa"
                    >
                      <PenTool size={16} />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function LayoutView({ lots, config, editingLot, setEditingLot }: { lots: Lot[], config: any, editingLot: Lot | null, setEditingLot: (lot: Lot | null) => void }) {
  const [zoom, setZoom] = useState(0.5);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number, y: number }[]>([]);
  const [imageDimensions, setImageDimensions] = useState({ width: 2400, height: 1700 });
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const [lotForm, setLotForm] = useState<Partial<Lot>>({
    number: '',
    area: '',
    status: 'available',
    price: ''
  });

  useEffect(() => {
    if (editingLot) {
      setLotForm(editingLot);
      // Parse points string to array of objects
      const points = editingLot.points.split(' ').map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });
      setCurrentPoints(points);
      setIsDrawing(true);
    }
  }, [editingLot]);

  const handleMapClick = (e: React.MouseEvent) => {
    if (!isDrawing || isDragging) return;

    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);

    setCurrentPoints(prev => [...prev, { x, y }]);
  };

  const handleSaveLot = async () => {
    if (currentPoints.length < 3) {
      alert('O polígono deve ter pelo menos 3 pontos.');
      return;
    }

    const pointsStr = currentPoints.map(p => `${p.x},${p.y}`).join(' ');
    const lotData = {
      ...lotForm,
      points: pointsStr,
      updatedAt: Timestamp.now()
    };

    try {
      if (editingLot) {
        await updateDoc(doc(db, 'lots', editingLot.id), lotData);
      } else {
        await addDoc(collection(db, 'lots'), {
          ...lotData,
          createdAt: Timestamp.now()
        });
      }
      
      // Reset
      setIsDrawing(false);
      setCurrentPoints([]);
      setEditingLot(null);
      setLotForm({ number: '', area: '', status: 'available', price: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'lots');
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="h-full flex flex-col gap-6"
    >
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setIsDrawing(!isDrawing);
              if (isDrawing) {
                setCurrentPoints([]);
                setEditingLot(null);
              }
            }}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg",
              isDrawing ? "bg-red-500 text-white shadow-red-500/20" : "bg-brand-green text-white shadow-brand-green/20"
            )}
          >
            {isDrawing ? <X size={18} /> : <Plus size={18} />}
            {isDrawing ? 'Cancelar Desenho' : 'Novo Lote'}
          </button>
          {isDrawing && currentPoints.length > 0 && (
            <button 
              onClick={() => setCurrentPoints(prev => prev.slice(0, -1))}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-brand-green/10 rounded-2xl text-sm font-bold hover:bg-brand-green/5 transition-colors"
            >
              <ChevronLeft size={18} />
              Desfazer Ponto
            </button>
          )}
        </div>

        {isDrawing && (
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-brand-green/10 shadow-sm">
            <input 
              type="text" 
              placeholder="Nº do Lote" 
              className="w-24 px-4 py-2 bg-brand-offwhite rounded-xl text-sm focus:outline-none"
              value={lotForm.number}
              onChange={e => setLotForm(prev => ({ ...prev, number: e.target.value }))}
            />
            <input 
              type="text" 
              placeholder="Área (ex: 300 m²)" 
              className="w-32 px-4 py-2 bg-brand-offwhite rounded-xl text-sm focus:outline-none"
              value={lotForm.area}
              onChange={e => setLotForm(prev => ({ ...prev, area: e.target.value }))}
            />
            <select 
              className="px-4 py-2 bg-brand-offwhite rounded-xl text-sm focus:outline-none"
              value={lotForm.status}
              onChange={e => setLotForm(prev => ({ ...prev, status: e.target.value as LotStatus }))}
            >
              <option value="available">Disponível</option>
              <option value="sold">Vendido</option>
              <option value="reserved">Reservado</option>
            </select>
            <button 
              onClick={handleSaveLot}
              disabled={currentPoints.length < 3 || !lotForm.number}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors"
            >
              <Save size={18} />
              Salvar
            </button>
            {editingLot && (
              <button 
                onClick={async () => {
                  if (confirm('Excluir este lote permanentemente?')) {
                    await deleteDoc(doc(db, 'lots', editingLot.id));
                    setIsDrawing(false);
                    setCurrentPoints([]);
                    setEditingLot(null);
                  }
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 relative bg-[#2A2A2A] rounded-3xl overflow-hidden border border-brand-green/10 shadow-inner">
        <div 
          ref={containerRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={(e) => { if (e.button === 1 || !isDrawing) setIsDragging(true); }}
          onMouseMove={(e) => {
            if (isDragging) {
              setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onWheel={(e) => {
            const sensitivity = 0.001;
            const zoomMultiplier = Math.exp(-e.deltaY * sensitivity);
            setZoom(prev => Math.min(Math.max(prev * zoomMultiplier, 0.1), 5));
          }}
          onClick={handleMapClick}
        >
          <div 
            ref={mapRef}
            className="absolute origin-center transition-transform duration-200 ease-out"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              width: imageDimensions.width,
              height: imageDimensions.height,
              left: '50%',
              top: '50%',
              marginLeft: -imageDimensions.width / 2,
              marginTop: -imageDimensions.height / 2,
            }}
          >
            {config.backgroundImage && (
              <img 
                src={config.backgroundImage} 
                alt="Mapa" 
                className="w-full h-full object-cover pointer-events-none"
                onLoad={handleImageLoad}
                referrerPolicy="no-referrer"
              />
            )}

            <svg 
              viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              {/* Existing Lots */}
              {lots.map(lot => (
                <polygon 
                  key={lot.id}
                  points={lot.points}
                  className={cn(
                    "fill-brand-green/20 stroke-brand-green/40 stroke-[2] transition-colors",
                    editingLot?.id === lot.id && "fill-brand-gold/40 stroke-brand-gold"
                  )}
                />
              ))}

              {/* Current Drawing */}
              {isDrawing && currentPoints.length > 0 && (
                <>
                  <polyline 
                    points={currentPoints.map(p => `${p.x},${p.y}`).join(' ')}
                    className="fill-none stroke-brand-gold stroke-[3]"
                  />
                  {currentPoints.map((p, i) => (
                    <circle 
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={5 / zoom}
                      className="fill-brand-gold stroke-white stroke-[1]"
                    />
                  ))}
                  {currentPoints.length >= 3 && (
                    <polygon 
                      points={`${currentPoints.map(p => `${p.x},${p.y}`).join(' ')} ${currentPoints[0].x},${currentPoints[0].y}`}
                      className="fill-brand-gold/30 stroke-none"
                    />
                  )}
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Map Controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
          <button onClick={() => setZoom(prev => prev * 1.2)} className="p-3 bg-white rounded-xl shadow-lg hover:bg-brand-offwhite transition-colors"><ZoomIn size={20} /></button>
          <button onClick={() => setZoom(prev => prev / 1.2)} className="p-3 bg-white rounded-xl shadow-lg hover:bg-brand-offwhite transition-colors"><ZoomOut size={20} /></button>
          <button onClick={() => { setZoom(0.5); setOffset({ x: 0, y: 0 }); }} className="p-3 bg-white rounded-xl shadow-lg hover:bg-brand-offwhite transition-colors"><Maximize2 size={20} /></button>
        </div>

        {/* Instructions Overlay */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest">
            {isDrawing ? 'Clique no mapa para adicionar pontos' : 'Use o scroll para zoom e arraste para navegar'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
function BrokerLayoutView({ config, setConfig }: { config: any, setConfig: (c: any) => void }) {
  const handleUpdate = async (updates: any) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    try {
      await updateDoc(doc(db, 'config', 'global'), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/global');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl space-y-8"
    >
      <div className="bg-white p-8 rounded-3xl border border-brand-green/10 shadow-sm space-y-8">
        <div className="space-y-2">
          <h3 className="text-xl font-serif italic">Configurações do Cartão do Corretor</h3>
          <p className="text-xs opacity-50">Personalize como as informações do corretor aparecem para o cliente.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Estilo do Cartão</label>
              <div className="grid grid-cols-3 gap-3">
                {['modern', 'classic', 'minimal'].map((style) => (
                  <button
                    key={style}
                    onClick={() => handleUpdate({ brokerCardStyle: style })}
                    className={cn(
                      "px-4 py-3 rounded-xl text-xs font-bold border transition-all capitalize",
                      config.brokerCardStyle === style 
                        ? "bg-brand-green text-white border-brand-green shadow-lg shadow-brand-green/20" 
                        : "bg-white border-brand-green/10 text-brand-green/60 hover:bg-brand-green/5"
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Opções de Exibição</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={config.brokerShowAgency} 
                    onChange={(e) => handleUpdate({ brokerShowAgency: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-brand-green/20 text-brand-green focus:ring-brand-green"
                  />
                  <span className="text-sm font-medium opacity-70 group-hover:opacity-100 transition-opacity">Mostrar Imobiliária/Agência</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={config.brokerShowAddress} 
                    onChange={(e) => handleUpdate({ brokerShowAddress: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-brand-green/20 text-brand-green focus:ring-brand-green"
                  />
                  <span className="text-sm font-medium opacity-70 group-hover:opacity-100 transition-opacity">Mostrar Endereço do Corretor</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Mensagem de Boas-vindas</label>
              <textarea 
                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-green/10 rounded-2xl text-sm focus:outline-none min-h-[100px]"
                placeholder="Ex: Olá! Como posso ajudar você hoje?"
                value={config.brokerWelcomeMessage}
                onChange={(e) => setConfig({ ...config, brokerWelcomeMessage: e.target.value })}
                onBlur={(e) => handleUpdate({ brokerWelcomeMessage: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-brand-offwhite p-8 rounded-3xl border border-brand-green/5 flex flex-col items-center justify-center">
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Prévia do Cartão</p>
            {/* Mock Broker Card Preview */}
            <div className={cn(
              "w-full max-w-[280px] backdrop-blur-sm border border-brand-green/5 space-y-3 transition-all bg-white shadow-xl",
              config.brokerCardStyle === 'modern' ? "p-6 rounded-3xl" : 
              config.brokerCardStyle === 'classic' ? "p-6 rounded-lg border-l-4 border-l-brand-gold" : 
              "p-4 border-none shadow-none bg-transparent"
            )}>
              {config.brokerWelcomeMessage && config.brokerCardStyle !== 'minimal' && (
                <p className="text-[10px] italic text-brand-green/60 mb-2 leading-relaxed">
                  "{config.brokerWelcomeMessage}"
                </p>
              )}
              
              <div>
                <p className={cn(
                  "font-bold",
                  config.brokerCardStyle === 'minimal' ? "text-xs" : "text-sm"
                )}>João Corretor</p>
                {config.brokerShowAgency && (
                  <p className="text-[9px] font-mono uppercase opacity-50">Imobiliária Exemplo</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
                  <MessageSquare size={14} />
                  <span>(11) 99999-9999</span>
                </div>

                {config.brokerShowAddress && config.brokerCardStyle !== 'minimal' && (
                  <div className="flex items-start gap-2 text-[10px] opacity-60">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    <span>Rua das Flores, 123 - Centro</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BrokersView({ brokers }: { brokers: Broker[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newBroker, setNewBroker] = useState<Partial<Broker>>({
    name: '',
    email: '',
    phone: '',
    agency: '',
    address: '',
    password: ''
  });

  const handleAddBroker = async () => {
    try {
      await addDoc(collection(db, 'users'), {
        ...newBroker,
        role: 'broker',
        createdAt: Timestamp.now()
      });
      setIsAdding(false);
      setNewBroker({ name: '', email: '', phone: '', agency: '', address: '', password: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  const handleDeleteBroker = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este corretor?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif italic">Gestão de Corretores</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-2xl text-sm font-bold shadow-lg shadow-brand-green/20 hover:scale-105 transition-transform"
        >
          <UserPlus size={18} />
          Novo Corretor
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-8 rounded-3xl border border-brand-green/10 shadow-sm overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-brand-offwhite rounded-2xl text-sm focus:outline-none"
                  value={newBroker.name}
                  onChange={e => setNewBroker(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">E-mail</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 bg-brand-offwhite rounded-2xl text-sm focus:outline-none"
                  value={newBroker.email}
                  onChange={e => setNewBroker(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-brand-offwhite rounded-2xl text-sm focus:outline-none"
                  value={newBroker.phone}
                  onChange={e => setNewBroker(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Imobiliária / Agência</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-brand-offwhite rounded-2xl text-sm focus:outline-none"
                  value={newBroker.agency}
                  onChange={e => setNewBroker(prev => ({ ...prev, agency: e.target.value }))}
                />
              </div>
              <div className="space-y-4 md:col-span-2">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Endereço Profissional</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-brand-offwhite rounded-2xl text-sm focus:outline-none"
                  value={newBroker.address}
                  onChange={e => setNewBroker(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Senha de Acesso</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 bg-brand-offwhite rounded-2xl text-sm focus:outline-none"
                  value={newBroker.password}
                  onChange={e => setNewBroker(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-6 py-3 text-sm font-bold opacity-50 hover:opacity-100 transition-opacity"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddBroker}
                className="px-8 py-3 bg-brand-green text-white rounded-2xl text-sm font-bold shadow-lg shadow-brand-green/20"
              >
                Salvar Corretor
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brokers.filter(b => (b as any).role === 'broker').map(broker => (
          <div key={broker.id} className="bg-white p-6 rounded-3xl border border-brand-green/10 shadow-sm group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green">
                <User size={24} />
              </div>
              <button 
                onClick={() => handleDeleteBroker(broker.id)}
                className="p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <h4 className="font-bold text-lg">{broker.name}</h4>
            <p className="text-[10px] font-mono uppercase opacity-40 mb-4">{broker.agency || 'Autônomo'}</p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs opacity-60">
                <Mail size={14} />
                <span>{broker.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-60">
                <Phone size={14} />
                <span>{broker.phone}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-brand-green/5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase opacity-40">Link de Vendas</span>
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}?brokerId=${broker.id}`;
                    navigator.clipboard.writeText(url);
                    alert('Link copiado!');
                  }}
                  className="text-[10px] font-bold text-brand-green hover:underline flex items-center gap-1"
                >
                  Copiar Link <Copy size={10} />
                </button>
              </div>
              <a 
                href={`${window.location.origin}?brokerId=${broker.id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-brand-green/5 rounded-lg text-brand-green hover:bg-brand-green/10 transition-colors"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function LeadsView({ leads }: { leads: any[] }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif italic">Leads e Contatos</h3>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-brand-green/10 rounded-2xl text-sm font-bold hover:bg-brand-green/5 transition-colors">
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-brand-green/10 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-green/5 text-[10px] font-mono uppercase tracking-widest opacity-50">
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Lote</th>
              <th className="px-6 py-4">Corretor</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-green/5">
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-brand-green/5 transition-colors group">
                <td className="px-6 py-4 text-xs font-mono opacity-60">
                  {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleString() : 'Recent'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{lead.name}</span>
                    <span className="text-[10px] opacity-50">{lead.email} | {lead.phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-brand-green/10 text-brand-green rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Lote {lead.lotNumber}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs opacity-60">
                  {lead.brokerName || 'Direto'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a 
                      href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                    >
                      <MessageSquare size={16} />
                    </a>
                    <button className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function SettingsView({ config, setConfig }: { config: any, setConfig: (c: any) => void }) {
  const handleUpdate = async (updates: any) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    try {
      await updateDoc(doc(db, 'config', 'global'), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/global');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      await handleUpdate({ [field]: base64, version: (config.version || 0) + 1 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl space-y-8"
    >
      <div className="bg-white p-8 rounded-3xl border border-brand-green/10 shadow-sm space-y-8">
        <h3 className="text-xl font-serif italic">Configurações Gerais</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Título do Projeto</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-brand-offwhite rounded-2xl text-sm focus:outline-none"
                value={config.title}
                onChange={e => setConfig({ ...config, title: e.target.value })}
                onBlur={e => handleUpdate({ title: e.target.value })}
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Endereço do Loteamento</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-brand-offwhite rounded-2xl text-sm focus:outline-none"
                value={config.address}
                onChange={e => setConfig({ ...config, address: e.target.value })}
                onBlur={e => handleUpdate({ address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Cor Primária</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    className="w-10 h-10 rounded-lg border-none cursor-pointer"
                    value={config.primaryColor}
                    onChange={e => handleUpdate({ primaryColor: e.target.value })}
                  />
                  <input 
                    type="text" 
                    className="flex-1 px-3 py-2 bg-brand-offwhite rounded-lg text-xs font-mono"
                    value={config.primaryColor}
                    onChange={e => handleUpdate({ primaryColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Cor Secundária</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    className="w-10 h-10 rounded-lg border-none cursor-pointer"
                    value={config.secondaryColor}
                    onChange={e => handleUpdate({ secondaryColor: e.target.value })}
                  />
                  <input 
                    type="text" 
                    className="flex-1 px-3 py-2 bg-brand-offwhite rounded-lg text-xs font-mono"
                    value={config.secondaryColor}
                    onChange={e => handleUpdate({ secondaryColor: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Logo do Projeto</label>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-brand-offwhite rounded-2xl border-2 border-dashed border-brand-green/10 flex items-center justify-center overflow-hidden">
                  {config.logo ? (
                    <img src={config.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon size={24} className="opacity-20" />
                  )}
                </div>
                <label className="px-6 py-3 bg-brand-green text-white rounded-2xl text-sm font-bold cursor-pointer hover:scale-105 transition-transform">
                  <Upload size={18} className="inline mr-2" />
                  Upload Logo
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo')} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Imagem do Mapa (Background)</label>
              <div className="space-y-4">
                <div className="aspect-video bg-brand-offwhite rounded-2xl border-2 border-dashed border-brand-green/10 flex items-center justify-center overflow-hidden">
                  {config.backgroundImage ? (
                    <img src={config.backgroundImage} alt="Mapa" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={32} className="opacity-20" />
                  )}
                </div>
                <label className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-brand-green/10 rounded-2xl text-sm font-bold cursor-pointer hover:bg-brand-green/5 transition-colors">
                  <ImageIcon size={18} />
                  Alterar Imagem do Mapa
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'backgroundImage')} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
