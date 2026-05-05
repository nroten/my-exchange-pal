import { useAuth } from '@/contexts/AuthContext';

/**
 * Segmented pill toggle for switching between Tracker and Supporter views.
 * Renders as a single connected control (not two buttons) so the relationship
 * between the two modes is obvious. Compact enough for mobile.
 */
export default function RoleToggle() {
  const { activeView, setActiveView, hasTrackerRole, hasSupporterRole } = useAuth();

  // Only show the toggle if the user actually has access to both views
  if (!hasTrackerRole || !hasSupporterRole) return null;

  const baseSegment =
    'flex-1 px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap';
  const active = 'bg-primary text-primary-foreground shadow-sm';
  const inactive = 'text-muted-foreground hover:text-foreground';

  return (
    <div
      role="tablist"
      aria-label="Switch view"
      className="inline-flex items-center bg-muted rounded-full p-1 gap-1 shrink-0"
    >
      <button
        role="tab"
        aria-selected={activeView === 'tracker'}
        onClick={() => setActiveView('tracker')}
        className={`${baseSegment} ${activeView === 'tracker' ? active : inactive}`}
      >
        🏠 Tracker
      </button>
      <button
        role="tab"
        aria-selected={activeView === 'supporter'}
        onClick={() => setActiveView('supporter')}
        className={`${baseSegment} ${activeView === 'supporter' ? active : inactive}`}
      >
        🧡 Supporter
      </button>
    </div>
  );
}
