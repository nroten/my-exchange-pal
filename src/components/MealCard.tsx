import { EXCHANGE_CATEGORIES, CATEGORY_META, ExchangeCategory } from '@/types/nutrition';

interface MealCardProps {
  mealLabel: string;
  totals: Record<ExchangeCategory, number>;
  foodItems: Array<{ foodName: string; serving: string; exchanges: Partial<Record<ExchangeCategory, number>>; quantity: number }>;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PILL_COLORS: Record<ExchangeCategory, string> = {
  starches: 'bg-exchange-starches/15 text-exchange-starches border border-exchange-starches/30',
  fruits: 'bg-exchange-fruits/15 text-exchange-fruits border border-exchange-fruits/30',
  vegetables: 'bg-exchange-vegetables/15 text-exchange-vegetables border border-exchange-vegetables/30',
  proteins: 'bg-exchange-proteins/15 text-exchange-proteins border border-exchange-proteins/30',
  dairy: 'bg-exchange-dairy/15 text-exchange-dairy border border-exchange-dairy/30',
  fats: 'bg-exchange-fats/15 text-exchange-fats border border-exchange-fats/30',
};

export default function MealCard({ mealLabel, totals, foodItems, onEdit, onDelete }: MealCardProps) {
  const activeCats = EXCHANGE_CATEGORIES.filter(c => totals[c] > 0);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">{mealLabel}</h3>
        <div className="flex gap-2">
          {onEdit && (
            <button onClick={onEdit} className="text-xs text-muted-foreground hover:text-foreground">
              Edit
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="text-xs text-destructive hover:text-destructive/80">
              Delete
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {activeCats.map(cat => (
          <span key={cat} className={`px-2 py-0.5 rounded-full text-xs font-medium ${PILL_COLORS[cat]}`}>
            {totals[cat]} {CATEGORY_META[cat].label.toLowerCase()}
          </span>
        ))}
      </div>
      {foodItems.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {foodItems.map((item, i) => (
            <div key={i}>{item.quantity > 1 ? `${item.quantity}× ` : ''}{item.foodName} ({item.serving})</div>
          ))}
        </div>
      )}
    </div>
  );
}
