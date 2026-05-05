import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleToggle from '@/components/RoleToggle';
import Dashboard from './Dashboard';
import MacrosTracker from './MacrosTracker';
import History from './History';
import Settings from './Settings';

export default function DaughterApp() {
  const { hasSupporterRole, profile } = useAuth();
  const [tab, setTab] = useState<'today' | 'history' | 'settings'>('today');
  const mode = profile?.tracking_mode === 'macros' ? 'macros' : 'exchanges';

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Sticky role switcher (mirrors Supporter view) */}
      {hasSupporterRole && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-3 py-2 flex items-center justify-center">
          <RoleToggle />
        </div>
      )}

      {tab === 'today' && (mode === 'macros' ? <MacrosTracker /> : <Dashboard />)}
      {tab === 'history' && <History />}
      {tab === 'settings' && <Settings />}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-30">
        <div className="max-w-lg mx-auto flex">
          {([
            { key: 'today', label: 'Today', emoji: '🏠' },
            { key: 'history', label: 'History', emoji: '📅' },
            { key: 'settings', label: 'Settings', emoji: '⚙️' },
          ] as const).map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
                tab === item.key ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
