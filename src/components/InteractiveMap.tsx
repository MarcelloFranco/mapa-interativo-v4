import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Info, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock,
  User,
  Phone,
  Building2,
  MessageCircle,
  LogIn,
  LogOut,
  Settings,
  X
} from 'lucide-react';
import { Lot, LotStatus, Broker } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import LeadForm from './LeadForm';
import { cn, getContrastColor } from '../lib/utils';

interface InteractiveMapProps {
  user?: any;
  profile?: any;
  onLogout?: () => void;
  onNavigate?: (view: any) => void;
  isEmbedded?: boolean;
}

export default function InteractiveMap({ 
  user, 
  profile, 
  onLogout, 
  onNavigate,
  isEmbedded 
}: InteractiveMapProps) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bgVersion, setBgVersion] = useState<number>(0);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [hoveredLot, setHoveredLot] = useState<Lot | null>(null);
  const [zoom, setZoom] = useState(0.5);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({ width: 2400, height: 1700 });
  const [projectTitle, setProjectTitle] = useState('Aura View');
  const [projectAddress, setProjectAddress] = useState('');
  const [projectLogo, setProjectLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#A97A50');
  const [secondaryColor, setSecondaryColor] = useState('#1A4731');
  const [broker, setBroker] = useState<Broker | null>(null);
  
  // Broker Layout Settings
  const [brokerShowAgency, setBrokerShowAgency] = useState(true);
  const [brokerShowAddress, setBrokerShowAddress] = useState(true);
  const [brokerCardStyle, setBrokerCardStyle] = useState<'modern' | 'classic' | 'minimal'>('modern');
  const [brokerWelcomeMessage, setBrokerWelcomeMessage] = useState('Olá! Como posso ajudar você hoje?');

  const [isMobile, setIsMobile] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const lastTouchPos = useRef<{ x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const [showLeadForm, setShowLeadForm] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Real-time lots
    const unsubscribeLots = onSnapshot(collection(db, 'lots'), (snapshot) => {
      const lotsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Lot));
      setLots(lotsData);
    });

    // Real-time config
    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBackgroundImage(data.backgroundImage);
        setBgVersion(data.version || 0);
        if (data.title) setProjectTitle(data.title);
        if (data.address) setProjectAddress(data.address);
        if (data.logo) setProjectLogo(data.logo);
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
        if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
        
        setBrokerShowAgency(data.brokerShowAgency ?? true);
        setBrokerShowAddress(data.brokerShowAddress ?? true);
        setBrokerCardStyle(data.brokerCardStyle || 'modern');
        setBrokerWelcomeMessage(data.brokerWelcomeMessage || 'Olá! Como posso ajudar você hoje?');
      }
    });

    const params = new URLSearchParams(window.location.search);
    const brokerId = params.get('brokerId');
    if (brokerId) {
      getDoc(doc(db, 'users', brokerId))
        .then(docSnap => {
          if (docSnap.exists()) {
            setBroker(docSnap.data() as Broker);
          }
        })
        .catch(err => {
          console.error('Error fetching broker info:', err);
        });
    }

    return () => {
      unsubscribeLots();
      unsubscribeConfig();
    };
  }, []);

  const stats = useMemo(() => {
    const total = lots.length;
    if (total === 0) return { available: 0, sold: 0, reserved: 0, percentage: 0 };
    
    const available = lots.filter(l => l.status === 'available').length;
    const sold = lots.filter(l => l.status === 'sold').length;
    const reserved = lots.filter(l => l.status === 'reserved').length;
    const percentage = Math.round((sold / total) * 100);
    
    return { available, sold, reserved, percentage };
  }, [lots]);

  const resetView = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const scaleX = container.clientWidth / imageDimensions.width;
      const scaleY = container.clientHeight / imageDimensions.height;
      
      // Usamos Math.max para preencher a tela inteira (cover) conforme solicitado
      // Isso garante que não haja bordas vazias, ajustando-se tanto no desktop quanto no mobile
      const fitScale = Math.max(scaleX, scaleY);
      
      setZoom(fitScale);
      setOffset({ x: 0, y: 0 });
    }
  };

  // Auto-fit on load or when data changes
  useEffect(() => {
    if (backgroundImage && imageDimensions.width > 0) {
      // Pequeno atraso para garantir que o container tenha dimensões reais
      const timer = setTimeout(resetView, 100);
      return () => clearTimeout(timer);
    }
  }, [backgroundImage, imageDimensions.width, imageDimensions.height]);

  // Re-ajustar ao redimensionar a janela
  useEffect(() => {
    window.addEventListener('resize', resetView);
    return () => window.removeEventListener('resize', resetView);
  }, [imageDimensions]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
    setImageDimensions(dimensions);
    setIsImageLoading(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
  };

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
    
    // Update mouse position for tooltip
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom direto com o scroll do mouse, sem necessidade de Ctrl
    e.preventDefault();
    const sensitivity = 0.0015;
    const zoomMultiplier = Math.exp(-e.deltaY * sensitivity);
    setZoom(prev => Math.min(Math.max(prev * zoomMultiplier, 0.05), 4));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      lastTouchPos.current = { x: e.touches[0].pageX, y: e.touches[0].pageY };
    } else if (e.touches.length === 2) {
      setIsDragging(true); // Mantenha como dragging para desativar transições CSS durante o pinch
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setLastTouchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && lastTouchPos.current) {
      const touch = e.touches[0];
      const dx = touch.pageX - lastTouchPos.current.x;
      const dy = touch.pageY - lastTouchPos.current.y;
      
      setOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      lastTouchPos.current = { x: touch.pageX, y: touch.pageY };
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Pinch to zoom
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      
      const delta = distance / lastTouchDistance;
      // Sensibilidade ajustada para pinch mais suave
      const zoomFactor = Math.pow(delta, 1.5); 
      setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.05), 4));
      setLastTouchDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    setLastTouchDistance(null);
    setIsDragging(false);
    lastTouchPos.current = null;
  };

  const handleRequestProposal = () => {
    if (!selectedLot) return;
    setShowLeadForm(true);
  };

  const translateStatus = (status: LotStatus) => {
    switch (status) {
      case 'available': return 'Disponível';
      case 'sold': return 'Vendido';
      case 'reserved': return 'Reservado';
      default: return status;
    }
  };

  const getStatusColor = (status: LotStatus) => {
    switch (status) {
      case 'available': return 'text-emerald-500';
      case 'sold': return 'text-red-500';
      case 'reserved': return 'text-amber-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBg = (status: LotStatus) => {
    switch (status) {
      case 'available': return 'bg-emerald-500/20';
      case 'sold': return 'bg-red-500/20';
      case 'reserved': return 'bg-amber-500/20';
      default: return 'bg-gray-500/20';
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col-reverse lg:flex-row overflow-hidden bg-[#2A2A2A]">
      {/* Sidebar / Info Panel */}
      <div className="w-full lg:w-72 h-auto lg:h-full bg-brand-offwhite border-t lg:border-t-0 lg:border-r border-brand-green/10 z-20 flex flex-col shadow-xl">
        {/* Mobile Handle */}
        <div className="w-12 h-1 bg-brand-green/10 rounded-full mx-auto mt-3 mb-1 lg:hidden" />
        
        <div 
          className="p-3 lg:p-8 border-b border-brand-green/10 text-brand-offwhite flex flex-row lg:flex-col items-center justify-between lg:justify-center text-center gap-3 lg:gap-4"
          style={{ backgroundColor: secondaryColor }}
        >
          {projectLogo && (
            <img 
              src={projectLogo.startsWith('data:') ? projectLogo : `${projectLogo}${projectLogo.includes('?') ? '&' : '?'}v=${bgVersion}`} 
              alt={projectTitle} 
              className="h-6 lg:h-24 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="text-right lg:text-center flex-1 lg:flex-none">
            <h1 className="font-serif italic text-base lg:text-2xl tracking-tight leading-tight" style={{ color: getContrastColor(secondaryColor) }}>{projectTitle}</h1>
            <p className="hidden lg:block text-[9px] font-mono uppercase tracking-[0.2em] opacity-60 mt-1" style={{ color: getContrastColor(secondaryColor) }}>Projeto Técnico</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 lg:space-y-8 text-brand-green max-h-[40vh] lg:max-h-none custom-scrollbar">
          {/* Selected Lot Info */}
          <AnimatePresence mode="wait">
            {selectedLot ? (
              <motion.div 
                key="selected-lot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="pb-6 border-b border-brand-green/10 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif italic text-brand-green">Lote {selectedLot.number}</h2>
                  <button onClick={() => setSelectedLot(null)} className="p-1 opacity-40 hover:opacity-100 transition-opacity">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-brand-green/5 rounded-2xl border border-brand-green/10">
                    <p className="text-[9px] font-mono uppercase opacity-40 mb-1">Área</p>
                    <p className="text-base font-bold text-brand-green">{selectedLot.area.split(' ')[0]}m²</p>
                  </div>
                  <div className="p-3 bg-brand-gold/5 rounded-2xl border border-brand-gold/10">
                    <p className="text-[9px] font-mono uppercase opacity-40 mb-1">Valor</p>
                    <p className="text-base font-bold text-brand-gold">
                      {selectedLot.price ? `R$ ${selectedLot.price.toLocaleString()}` : 'Consulte'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-black/5 rounded-xl">
                  <span className="text-[10px] font-mono uppercase opacity-40">Status</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest",
                    getStatusBg(selectedLot.status),
                    getStatusColor(selectedLot.status)
                  )}>
                    {translateStatus(selectedLot.status)}
                  </span>
                </div>

                {selectedLot.status === 'available' && (
                  <button 
                    onClick={handleRequestProposal}
                    className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                    style={{ 
                      backgroundColor: primaryColor,
                      color: getContrastColor(primaryColor)
                    }}
                  >
                    Solicitar Proposta
                  </button>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="space-y-6">
            {/* Legend */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono uppercase tracking-widest opacity-50 text-brand-green">Legenda de Status</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    <span className="text-xs font-semibold text-brand-green">Disponível</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-30 group-hover:opacity-100 transition-opacity text-brand-green">{stats.available}</span>
                </div>
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                    <span className="text-xs font-semibold text-brand-green">Reservado</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-30 group-hover:opacity-100 transition-opacity text-brand-green">{stats.reserved}</span>
                </div>
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                    <span className="text-xs font-semibold text-brand-green">Vendido</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-30 group-hover:opacity-100 transition-opacity text-brand-green">{stats.sold}</span>
                </div>
              </div>
            </div>

            {/* Broker Info */}
            {broker && (
              <div className="pt-6 border-t border-brand-green/10 space-y-4">
                <div className="flex items-center gap-2 opacity-50">
                  <User size={12} />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Atendimento</span>
                </div>
                
                <div className={cn(
                  "backdrop-blur-sm border border-brand-green/5 space-y-3 transition-all",
                  brokerCardStyle === 'modern' ? "bg-white/40 p-4 rounded-2xl shadow-sm" : 
                  brokerCardStyle === 'classic' ? "bg-white/60 p-5 rounded-lg border-l-4" : 
                  "bg-transparent p-2 border-none shadow-none"
                )}
                style={{ borderLeftColor: brokerCardStyle === 'classic' ? primaryColor : undefined }}
                >
                  {brokerWelcomeMessage && brokerCardStyle !== 'minimal' && (
                    <p className="text-[10px] italic text-brand-green/60 mb-2 leading-relaxed">
                      "{brokerWelcomeMessage}"
                    </p>
                  )}
                  
                  <div>
                    <p className={cn(
                      "font-bold",
                      brokerCardStyle === 'minimal' ? "text-xs" : "text-sm"
                    )}>{broker.name}</p>
                    {brokerShowAgency && broker.agency && (
                      <p className="text-[9px] font-mono uppercase opacity-50">{broker.agency}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <a 
                      href={`https://wa.me/${broker.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-2 text-xs font-medium transition-colors",
                        brokerCardStyle === 'minimal' ? "text-emerald-600" : "text-emerald-600 hover:text-emerald-700"
                      )}
                    >
                      <MessageCircle size={14} />
                      <span>{broker.phone}</span>
                    </a>

                    {brokerShowAddress && broker.address && brokerCardStyle !== 'minimal' && (
                      <div className="flex items-start gap-2 text-[10px] opacity-60">
                        <MapPin size={12} className="mt-0.5 shrink-0" />
                        <span>{broker.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="pt-4 opacity-40">
              <p className="text-[10px] leading-relaxed italic">
                * Use o scroll para zoom e arraste para navegar no mapa. Clique nos lotes para detalhes.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-brand-green/10 bg-brand-offwhite space-y-4">
          {!isEmbedded && (
            <div className="flex gap-2">
              {user ? (
                <>
                  <button 
                    onClick={onLogout}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all text-sm font-bold"
                  >
                    <LogOut size={18} />
                    Sair
                  </button>
                  {profile?.role === 'admin' && (
                    <button 
                      onClick={() => onNavigate?.('admin')}
                      className="p-3 bg-brand-green/5 rounded-2xl hover:bg-brand-green/10 transition-all text-brand-green"
                      title="Admin"
                    >
                      <Settings size={20} />
                    </button>
                  )}
                  {profile?.role === 'broker' && (
                    <button 
                      onClick={() => onNavigate?.('broker')}
                      className="p-3 bg-brand-green/5 rounded-2xl hover:bg-brand-green/10 transition-all text-brand-green"
                      title="Meu Perfil"
                    >
                      <User size={20} />
                    </button>
                  )}
                </>
              ) : (
                <button 
                  onClick={() => onNavigate?.('portal')}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all shadow-lg font-black text-xs uppercase tracking-widest"
                  style={{ 
                    backgroundColor: primaryColor,
                    color: getContrastColor(primaryColor)
                  }}
                >
                  <LogIn size={18} />
                  Acesso Restrito
                </button>
              )}
            </div>
          )}
          {projectAddress && (
            <div className="flex items-start gap-2 opacity-40 hover:opacity-100 transition-opacity">
              <MapPin size={10} className="mt-0.5 shrink-0" />
              <p className="text-[9px] font-medium leading-tight text-brand-green">{projectAddress}</p>
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] font-mono uppercase opacity-40 text-brand-green">
            <a 
              href="https://auraview.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-100 transition-opacity"
            >
              © Aura View
            </a>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden map-container select-none flex items-center justify-center touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence>
          {isImageLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#2A2A2A]"
            >
              <div className="w-10 h-10 border-3 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin mb-3" />
              <p className="text-brand-offwhite/40 font-mono text-[10px] uppercase tracking-widest">Carregando Mapa...</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          ref={mapRef}
          className={cn(
            "absolute origin-center will-change-transform",
            !isMobile && "shadow-[0_0_100px_rgba(35,53,43,0.3)]",
            // Ajuste na classe de transição para uma curva mais orgânica e tempo estendido
            !isDragging && "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          )}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            willChange: 'transform', // Ajuda na performance do zoom e arraste
            width: imageDimensions.width,
            height: imageDimensions.height,
            left: '50%',
            top: '50%',
            marginLeft: -imageDimensions.width / 2,
            marginTop: -imageDimensions.height / 2,
            visibility: isImageLoading ? 'hidden' : 'visible'
          }}
        >
          {/* Base Image */}
          {backgroundImage && (
            <img 
              src={backgroundImage.startsWith('data:') ? backgroundImage : `${backgroundImage}${backgroundImage.includes('?') ? '&' : '?'}v=${bgVersion}`} 
              alt="Mapa Morada do Bosque"
              className={cn(
                "w-full h-full object-cover",
                !isMobile && "rounded-sm"
              )}
              draggable={false}
              referrerPolicy="no-referrer"
              onLoad={handleImageLoad}
              onError={() => setIsImageLoading(false)}
            />
          )}

          {/* SVG Overlay for Interaction */}
          <svg 
            viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {lots.map((lot) => (
              <polygon
                key={lot.id}
                points={lot.points}
                className={cn(
                  "lot-path cursor-pointer transition-all duration-300",
                  selectedLot?.id === lot.id 
                    ? "stroke-white stroke-[5] z-10" 
                    : lot.status === 'available'
                      ? "fill-emerald-500/50 hover:fill-emerald-500/70 stroke-emerald-400 stroke-[3]"
                      : lot.status === 'sold'
                        ? "fill-red-500/50 hover:fill-red-500/70 stroke-red-400 stroke-[3]"
                        : "fill-amber-500/50 hover:fill-amber-500/70 stroke-amber-400 stroke-[3]"
                )}
                style={{ 
                  filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))',
                  fill: selectedLot?.id === lot.id ? `${primaryColor}CC` : undefined
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLot(lot);
                  setShowPopup(true);
                }}
                onMouseEnter={() => setHoveredLot(lot)}
                onMouseLeave={() => setHoveredLot(null)}
              />
            ))}
          </svg>
        </div>


        {/* Tooltip Overlay */}
        <AnimatePresence>
          {hoveredLot && !isDragging && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute pointer-events-none bg-white/95 backdrop-blur-md border border-[#141414]/10 p-3 rounded-xl shadow-2xl z-50 min-w-[120px] text-brand-green"
              style={{
                left: mousePos.x + 15,
                top: mousePos.y + 15,
              }}
            >
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-wider opacity-50">Lote {hoveredLot.number}</p>
                <p className="text-sm font-semibold">{hoveredLot.area}</p>
                <div className={cn("text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md inline-block", getStatusBg(hoveredLot.status), getStatusColor(hoveredLot.status))}>
                  {translateStatus(hoveredLot.status)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls Overlay */}
        <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 flex flex-col gap-3 z-30">
          <div className="bg-white/90 backdrop-blur-md border border-brand-green/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-2 text-brand-green">
            <button 
              onClick={() => setZoom(prev => Math.min(prev * 1.25, 4))}
              className="p-2 lg:p-3 hover:bg-brand-green/10 hover:scale-110 rounded-xl transition-all text-brand-green active:scale-95"
              title="Aumentar Zoom"
            >
              <ZoomIn size={18} className="lg:hidden" />
              <ZoomIn size={20} className="hidden lg:block" />
            </button>
            <div className="h-px bg-brand-green/10 mx-2" />
            <button 
              onClick={() => setZoom(prev => Math.max(prev / 1.25, 0.05))}
              className="p-2 lg:p-3 hover:bg-brand-green/10 hover:scale-110 rounded-xl transition-all text-brand-green active:scale-95"
              title="Diminuir Zoom"
            >
              <ZoomOut size={18} className="lg:hidden" />
              <ZoomOut size={20} className="hidden lg:block" />
            </button>
            <div className="h-px bg-brand-green/10 mx-2" />
            <button 
              onClick={resetView}
              className="p-2 lg:p-3 hover:bg-brand-green/10 hover:scale-110 rounded-xl transition-all text-brand-green active:scale-95"
              title="Ajustar à tela"
            >
              <Maximize size={18} className="lg:hidden" />
              <Maximize size={20} className="hidden lg:block" />
            </button>
          </div>
        </div>

        {/* Mini Stats Overlay */}
        <div className="absolute top-8 right-8 z-30 hidden md:flex gap-4">
          <div 
            className="border-2 border-white/20 px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 text-brand-offwhite"
            style={{ backgroundColor: secondaryColor }}
          >
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-brand-green shadow-lg" />
              <div className="w-7 h-7 rounded-full bg-amber-500 border-2 border-brand-green shadow-lg" />
              <div className="w-7 h-7 rounded-full bg-red-500 border-2 border-brand-green shadow-lg" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-widest opacity-70 leading-none">Vendas</span>
              <span className="text-sm font-bold" style={{ color: primaryColor }}>{stats.percentage}% Vendido</span>
            </div>
          </div>
        </div>

        {/* Lot Details Popup - REMOVED, now in sidebar */}
        <AnimatePresence>
          {showLeadForm && selectedLot && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto border border-brand-green/10 text-brand-green"
              >
                <div className="relative p-8 space-y-6">
                  <button 
                    onClick={() => setShowLeadForm(false)}
                    className="absolute top-6 right-6 p-2 hover:bg-brand-green/5 rounded-full transition-colors text-brand-green/40 hover:text-brand-green"
                  >
                    <XCircle size={24} />
                  </button>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-4xl font-serif italic text-brand-green">Proposta Lote {selectedLot.number}</h2>
                    </div>
                    <div className="h-px bg-brand-green/10 w-full" />
                  </div>

                  <LeadForm 
                    lot={selectedLot} 
                    broker={broker || undefined} 
                    onClose={() => setShowLeadForm(false)}
                    primaryColor={primaryColor}
                  />
                </div>
              </motion.div>
              <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm -z-10 pointer-events-auto"
                onClick={() => setShowLeadForm(false)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}