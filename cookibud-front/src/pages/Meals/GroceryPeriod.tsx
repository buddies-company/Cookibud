import { useState } from 'react';
import { Button, Card } from '@soilhat/react-components';
import type { Meal } from '../../utils/constants/types';
import { callApi } from '../../services/api';

type Props = {
  meals: Meal[];
};

export default function GroceryPeriod({ meals }: Readonly<Props>) {
  const [periodStart, setPeriodStart] = useState<string>(() => {
    const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  });
  const [periodEnd, setPeriodEnd] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  });
  const [grocery, setGrocery] = useState<Record<string, { qty?: number; unit?: string; entries: string[] }>>({});
  const [loading, setLoading] = useState(false);

  async function fetchRecipesByIds(ids: string[]): Promise<Record<string, any>> {
    const out: Record<string, any> = {};
    await Promise.all(ids.map(async (rid) => {
      try {
        const rres = await callApi(`/recipes/${rid}`);
        out[rid] = rres.data;
      } catch (e) {
        console.error(`Failed to fetch recipe ${rid}`, e);
      }
    }));
    return out;
  }

  function aggregateIngredients(selectedMeals: Meal[], recipesById: Record<string, any>) {
    const agg: Record<string, { qty?: number; unit?: string; entries: string[] }> = {};
    for (const m of selectedMeals) {
      for (const it of m.items || []) {
        const rid = (it as any).recipe_id ?? (it as any).recipeId;
        if (!rid) continue;
        const recipe = recipesById[rid];
        const servings = (it as any).servings ?? 1;
        if (!recipe) continue;
        addIngredientsFromRecipe(recipe, servings, agg);
      }
    }
    return agg;
  }

  function addIngredientsFromRecipe(recipe: any, servings: number, agg: Record<string, { qty?: number; unit?: string; entries: string[] }>) {
    for (const ing of recipe.ingredients || []) {
      const name = ing.name;
      const qtyRaw = String(ing.quantity ?? '');
      const exec = /^\s*(\d*\.?\d+)\s*(.*)$/u.exec(qtyRaw);
      if (exec) {
        const v = Number.parseFloat(exec[1]) * servings;
        const unit = (exec[2] || '').trim();
        const key = `${name}::${unit}`;
        if (!agg[key]) agg[key] = { qty: 0, unit, entries: [] };
        agg[key].qty = (agg[key].qty ?? 0) + v;
        agg[key].entries.push(`${recipe.title} ×${servings}: ${qtyRaw}`);
      } else {
        const key = `${name}::`;
        if (!agg[key]) agg[key] = { entries: [] };
        agg[key].entries.push(`${recipe.title} ×${servings}: ${qtyRaw || '—'}`);
      }
    }
  }

  const generate = async () => {
    setLoading(true);
    try {
      const start = periodStart;
      const end = periodEnd;
      const selectedMeals = meals.filter(m => m.date >= start && m.date <= end);
      const recipeIds = new Set<string>();
      for (const m of selectedMeals) {
        for (const it of m.items || []) {
          const rid = (it as any).recipe_id ?? (it as any).recipeId;
          if (rid) recipeIds.add(rid);
        }
      }
      const recipesById = await fetchRecipesByIds(Array.from(recipeIds));
      const agg = aggregateIngredients(selectedMeals, recipesById);
      setGrocery(agg);
    } catch (err) {
      console.error('Failed to generate grocery list', err);
      setGrocery({});
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      
      <div className="flex items-end gap-3">
        <div>
          <label htmlFor="gp-start" className="block text-sm">From</label>
          <input id="gp-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="rounded border px-2 py-1" />
        </div>
        <div>
          <label htmlFor="gp-end" className="block text-sm">To</label>
          <input id="gp-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="rounded border px-2 py-1" />
        </div>
        <div>
          <Button onClick={generate} className="px-3 py-1">Generate grocery list</Button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? <div>Generating…</div> : (
          <ul className="space-y-2">
            {Object.entries(grocery).map(([key, val]) => {
              const [name, unit] = key.split('::');
              let qtyDisplay: string | undefined = undefined;
              if (val.qty !== undefined) {
                const unitSuffix = unit ? ' ' + unit : '';
                qtyDisplay = `${Number((val.qty ?? 0).toFixed(2))}${unitSuffix}`;
              }
              return (
                <li key={key}>
                  <div className="font-medium">{name}{qtyDisplay ? ` — ${qtyDisplay}` : ''}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{val.entries.map(e => <div key={e}>{e}</div>)}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
