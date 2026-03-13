import { useState } from 'react';
import { motion } from 'motion/react';
import InteractiveMap from './components/InteractiveMap';
import { AdminEditor } from './components/AdminEditor';
import BrokerDashboard from './components/BrokerDashboard';
import Portal from './components/Portal';
import { Settings, Map as MapIcon, User, LogOut, LogIn, Layout } from 'lucide-react';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, profile, login, logout, loading } = useAuth();
  const [view, setView] = useState<'client' | 'admin' | 'broker' | 'portal'>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'admin') return 'admin';
    if (viewParam === 'broker') return 'broker';
    if (viewParam === 'portal') return 'portal';
    return 'client';
  });

  const isEmbedded = new URLSearchParams(window.location.search).get('view') === 'client';

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <main className="w-full h-screen overflow-hidden relative">
      {view === 'client' ? (
        <motion.div 
          key="client"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full h-full"
        >
          <InteractiveMap 
            user={user}
            profile={profile}
            onLogout={logout}
            onNavigate={setView}
            isEmbedded={isEmbedded}
          />
        </motion.div>
      ) : view === 'portal' ? (
        <motion.div 
          key="portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full h-full"
        >
          <Portal onNavigate={setView} />
        </motion.div>
      ) : view === 'admin' ? (
        <motion.div 
          key="admin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full h-full"
        >
          {profile?.role === 'admin' ? (
            <AdminEditor onNavigate={setView} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] text-white p-6">
              <h2 className="text-2xl font-serif mb-4">Acesso Restrito</h2>
              <p className="text-white/60 mb-8">Você não tem permissão para acessar esta área.</p>
              <button 
                onClick={() => setView('client')}
                className="px-6 py-3 bg-emerald-500 rounded-xl font-bold"
              >
                Voltar para o Mapa
              </button>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div 
          key="broker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full h-full"
        >
          {user ? (
            <BrokerDashboard broker={profile as any} onLogout={logout} onNavigate={setView} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] text-white p-6">
              <h2 className="text-2xl font-serif mb-4">Área do Corretor</h2>
              <p className="text-white/60 mb-8">Faça login para acessar seu painel.</p>
              <button 
                onClick={() => setView('portal')}
                className="px-8 py-4 bg-emerald-500 rounded-xl font-bold flex items-center gap-2"
              >
                <LogIn size={20} />
                Acessar Portal
              </button>
            </div>
          )}
        </motion.div>
      )}
    </main>
  );
}
