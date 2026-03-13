import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  LogIn, 
  Layout, 
  Users, 
  FileText, 
  Map as MapIcon, 
  Settings, 
  User, 
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PortalProps {
  onNavigate: (view: 'client' | 'admin' | 'broker') => void;
}

export default function Portal({ onNavigate }: PortalProps) {
  const { user, profile, login, loginWithEmail, registerWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        if (!name) throw new Error('Nome é obrigatório');
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('E-mail ou senha incorretos. Verifique se o login por e-mail está ativado no Firebase.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1A4731]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
      >
        {/* Left Side: Branding & Info */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} />
              Portal do Colaborador
            </div>
            <h1 className="text-5xl font-serif italic text-[#1A4731] leading-tight">
              Bem-vindo ao <br />
              <span className="text-[#A97A50]">Sistema de Gestão</span>
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-md">
              Acesse as ferramentas de edição do mapa, gestão de leads e painel do corretor em um único lugar.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => onNavigate('client')}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-all shadow-sm"
            >
              <MapIcon size={18} />
              Ver Mapa Público
            </button>
          </div>
        </div>

        {/* Right Side: Action Card */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-black/5 border border-gray-100 p-8 lg:p-12">
          {!user ? (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <LogIn size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Acesse sua Conta</h2>
                <p className="text-gray-500">Escolha seu método de acesso preferido.</p>
              </div>

              {isEmailLogin ? (
                <form onSubmit={handleEmailAction} className="space-y-4">
                  {isRegistering && (
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest text-gray-400 ml-1">Nome Completo</label>
                      <input 
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A4731] outline-none transition-all"
                        placeholder="Seu Nome"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-gray-400 ml-1">E-mail</label>
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A4731] outline-none transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-gray-400 ml-1">Senha</label>
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A4731] outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 bg-[#1A4731] text-white rounded-2xl font-bold flex items-center justify-start gap-3 hover:bg-[#143625] transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processando...' : isRegistering ? 'Criar Conta' : 'Entrar'}
                    <ArrowRight size={18} />
                  </button>

                  <div className="flex flex-col gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="w-full text-center text-sm text-[#1A4731] font-medium hover:underline transition-all"
                    >
                      {isRegistering ? 'Já tenho uma conta' : 'Não tenho conta, quero me cadastrar'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEmailLogin(false);
                        setIsRegistering(false);
                      }}
                      className="w-full text-center text-sm text-gray-500 hover:text-[#1A4731] transition-colors"
                    >
                      Voltar para Login com Google
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <button 
                    onClick={login}
                    className="w-full py-4 px-6 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold flex items-center justify-start gap-3 hover:bg-gray-50 transition-all shadow-sm group"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    Entrar com Google
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-400">Ou use seu e-mail</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsEmailLogin(true)}
                    className="w-full py-4 px-6 bg-emerald-50 text-emerald-700 rounded-2xl font-bold flex items-center justify-start gap-3 hover:bg-emerald-100 transition-all"
                  >
                    <Mail size={18} />
                    Entrar com E-mail e Senha
                  </button>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100">
                <p className="text-center text-xs text-gray-400 leading-relaxed">
                  Problemas com o acesso? Entre em contato com o administrador do sistema.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-12 h-12 bg-[#A97A50] text-white rounded-xl flex items-center justify-center">
                  <User size={24} />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-gray-400">Logado como</p>
                  <p className="font-bold text-gray-900">{profile?.name || user.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-mono uppercase tracking-widest text-gray-400 ml-1">Ações Disponíveis</p>
                
                {profile?.role === 'admin' && (
                  <>
                    <button 
                      onClick={() => onNavigate('admin')}
                      className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#1A4731] hover:bg-emerald-50/30 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                          <Layout size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-900">Editor do Mapa</p>
                          <p className="text-xs text-gray-500">Configurações, Lotes e Layout</p>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-gray-300 group-hover:text-[#1A4731] group-hover:translate-x-1 transition-all" />
                    </button>

                    <button 
                      onClick={() => onNavigate('admin')}
                      className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#1A4731] hover:bg-emerald-50/30 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                          <FileText size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-900">Gestão de Leads</p>
                          <p className="text-xs text-gray-500">Ver contatos e propostas</p>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-gray-300 group-hover:text-[#1A4731] group-hover:translate-x-1 transition-all" />
                    </button>
                  </>
                )}

                {profile?.role === 'broker' && (
                  <button 
                    onClick={() => onNavigate('broker')}
                    className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#1A4731] hover:bg-emerald-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                        <Briefcase size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">Meu Painel de Corretor</p>
                        <p className="text-xs text-gray-500">Perfil e Links de Venda</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-gray-300 group-hover:text-[#1A4731] group-hover:translate-x-1 transition-all" />
                  </button>
                )}

                {(!profile || (profile.role !== 'admin' && profile.role !== 'broker')) && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-sm">
                    Sua conta ainda não possui permissões de acesso. Entre em contato com o suporte.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Footer */}
      <div className="mt-12 text-gray-400 text-[10px] font-mono uppercase tracking-widest">
        <a 
          href="https://auraview.com.br" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-[#1A4731] transition-colors"
        >
          © {new Date().getFullYear()} Aura View
        </a>
      </div>
    </div>
  );
}
