import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Phone, MapPin, Building2, Copy, Check, ExternalLink, LogOut, Share2, Mail, Map as MapIcon } from 'lucide-react';
import { Broker } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface BrokerDashboardProps {
  broker: Broker;
  onLogout: () => void;
  onNavigate?: (view: any) => void;
}

export default function BrokerDashboard({ broker: initialBroker, onLogout, onNavigate }: BrokerDashboardProps) {
  const [broker, setBroker] = useState<Broker>(initialBroker);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  const personalizedUrl = `${window.location.origin}?view=client&brokerId=${broker.id}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const brokerRef = doc(db, 'users', broker.id);
      await updateDoc(brokerRef, {
        name: broker.name,
        agency: broker.agency,
        phone: broker.phone,
        email: broker.email,
        address: broker.address,
        updatedAt: new Date()
      });

      setMessage({ text: 'Perfil atualizado com sucesso!', type: 'success' });
    } catch (err) {
      console.error('Error updating broker profile:', err);
      setMessage({ text: 'Erro ao salvar alterações.', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(personalizedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar Info */}
      <div className="w-full lg:w-80 bg-[#1A4731] text-white p-8 flex flex-col">
        <div className="flex-1">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
            <User size={40} />
          </div>
          <h1 className="text-2xl font-serif italic mb-2">{broker.name}</h1>
          <p className="text-white/80 text-sm mb-8">{broker.agency}</p>

          <div className="space-y-6">
            <div className="flex items-center gap-3 text-sm text-white">
              <Phone size={18} className="text-[#A97A50]" />
              <span>{broker.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white">
              <MapPin size={18} className="text-[#A97A50]" />
              <span className="leading-tight">{broker.address}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <button 
            onClick={() => onNavigate?.('client')}
            className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all text-sm font-medium"
          >
            <MapIcon size={16} />
            Voltar para o Mapa
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-200 hover:text-white border border-red-500/20 rounded-xl transition-all text-sm font-medium"
          >
            <LogOut size={16} />
            Sair da Conta
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Link Generator Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Share2 size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Seu Link Personalizado</h2>
            </div>

            <p className="text-gray-500 text-sm mb-6">
              Use este link para compartilhar o mapa com seus clientes. Seus dados de contato aparecerão automaticamente na barra lateral.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-mono text-xs text-gray-600 truncate flex items-center">
                {personalizedUrl}
              </div>
              <button 
                onClick={copyToClipboard}
                className="bg-[#A97A50] text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#8e6643] transition-all shrink-0"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copiado!' : 'Copiar Link'}
              </button>
              <a 
                href={personalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shrink-0"
              >
                <ExternalLink size={18} />
                Testar Link
              </a>
            </div>
          </div>

          {/* Profile Edit Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <User size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Editar Perfil</h2>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-gray-600 ml-1">Nome Completo</label>
                <input 
                  type="text"
                  value={broker.name}
                  onChange={(e) => setBroker({ ...broker, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A4731] outline-none transition-all text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-gray-600 ml-1">Imobiliária</label>
                <input 
                  type="text"
                  value={broker.agency}
                  onChange={(e) => setBroker({ ...broker, agency: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A4731] outline-none transition-all text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-gray-600 ml-1">WhatsApp</label>
                <input 
                  type="text"
                  value={broker.phone}
                  onChange={(e) => setBroker({ ...broker, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A4731] outline-none transition-all text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-gray-600 ml-1">E-mail</label>
                <input 
                  type="email"
                  value={broker.email}
                  onChange={(e) => setBroker({ ...broker, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A4731] outline-none transition-all text-gray-900"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-mono uppercase tracking-widest text-gray-600 ml-1">Endereço Profissional</label>
                <input 
                  type="text"
                  value={broker.address}
                  onChange={(e) => setBroker({ ...broker, address: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A4731] outline-none transition-all text-gray-900"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between pt-4">
                {message && (
                  <span className={message.type === 'success' ? 'text-emerald-500 text-sm' : 'text-red-500 text-sm'}>
                    {message.text}
                  </span>
                )}
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="ml-auto bg-[#1A4731] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#143625] transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
