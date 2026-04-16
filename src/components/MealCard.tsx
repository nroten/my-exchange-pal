import { EXCHANGE_CATEGORIES, CATEGORY_META, ExchangeCategory } from '@/types/nutrition';

interface MealCardProps {
  mealLabel: string;
  totals: Record<ExchangeCategory, number>;
  foodItems: Array<{ foodName: string; serving: string; exchanges: Partial<Record<ExchangeCategory, number>>; quantity: number }>;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PILL_COLORS: Record<ExchangeCategory, string> = {
  starches: 'bg-exchange-starches/20 text-orange-800',
  fruits: 'bg-exchange-fruits/20 text-yellow-800',
  vegetables: 'bg-exchange-vegetables/20 text-green-800',
  proteins: 'bg-exchange-proteins/20 text-teal-800',
  dairy: 'bg-exchange-dairy/20 text-purple-800',
  fats: 'bg-exchange-fats/20 text-red-800',
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
