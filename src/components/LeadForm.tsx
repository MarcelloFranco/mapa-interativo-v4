import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, Send, CheckCircle } from 'lucide-react';
import { Lot, Broker } from '../types';

interface LeadFormProps {
  lot: Lot;
  broker?: Broker;
  onClose: () => void;
  primaryColor: string;
}

export default function LeadForm({ lot, broker, onClose, primaryColor }: LeadFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'leads'), {
        lotId: lot.id,
        lotNumber: lot.number,
        brokerId: broker?.id || 'direct',
        brokerName: broker?.name || 'Venda Direta',
        name,
        email,
        phone,
        createdAt: serverTimestamp(),
      });
      setIsSuccess(true);
      setTimeout(onClose, 3000);
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Erro ao enviar proposta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle size={64} className="text-emerald-500" />
        </div>
        <h3 className="text-2xl font-bold">Proposta Enviada!</h3>
        <p className="text-gray-600">Em breve um de nossos corretores entrará em contato.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 relative">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X size={20} />
      </button>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold">Tenho Interesse</h3>
        <p className="text-sm text-gray-500">Preencha seus dados para receber uma proposta personalizada do Lote {lot.number}.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Nome Completo</label>
          <input 
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all"
            style={{ '--tw-ring-color': primaryColor } as any}
            placeholder="Seu nome"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">E-mail</label>
          <input 
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all"
            style={{ '--tw-ring-color': primaryColor } as any}
            placeholder="seu@email.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Telefone / WhatsApp</label>
          <input 
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all"
            style={{ '--tw-ring-color': primaryColor } as any}
            placeholder="(00) 00000-0000"
          />
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          {isSubmitting ? 'Enviando...' : (
            <>
              <Send size={18} />
              Enviar Proposta
            </>
          )}
        </button>
      </form>
    </div>
  );
}
