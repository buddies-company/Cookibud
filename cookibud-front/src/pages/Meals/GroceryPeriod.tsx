import { useEffect, useState } from 'react';
import type { Meal, GroceryList } from '../../utils/constants/types';
import type { IRecipe } from '../Recipes/types';
import { formatQtyUnit, normalizeQtyToBase } from '../../utils/quantities';

import { Button, Card, Checkbox, Progress } from '@soilhat/react-components';
import { callApi } from '../../services/api';

type Props = {
  meals: Meal[];
};

export default function GroceryPeriod({ meals }: Readonly<Props>) {
  const [periodStart, setPeriodStart] = useState<string>(() => {
    const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  });
  const [periodEnd, setPeriodEnd] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  });
  const [grocery, setGrocery] = useState<Record<string, { qty?: number; unit?: string; entries: string[] }>>({});
  const [loading, setLoading] = useState(false);
  const [savedLists, setSavedLists] = useState<GroceryList[]>([]);

  async function fetchRecipesByIds(ids: string[]): Promise<Record<string, IRecipe | undefined>> {
    const out: Record<string, IRecipe | undefined> = {};
    await Promise.all(ids.map(async (rid) => {
      try {
        const rres = await callApi<IRecipe>(`/recipes/${rid}`);
        out[rid] = rres.data;
      } catch (e) {
        console.error(`Failed to fetch recipe ${rid}`, e);
      }
    }));
    return out;
  }
  function aggregateIngredients(selectedMeals: Meal[], recipesById: Record<string, IRecipe | undefined>) {
    const agg: Record<string, { qty?: number; unit?: string; entries: string[] }> = {};
    for (const m of selectedMeals) {
      for (const it of m.items || []) {
        const rid = it.recipe_id ?? undefined;
        if (!rid) continue;
        const recipe = recipesById[rid];
        const servings = it.servings ?? 1;
        if (!recipe) continue;
        addIngredientsFromRecipe(recipe, servings, agg);
      }
    }
    return agg;
  }
  function addIngredientsFromRecipe(recipe: IRecipe | undefined, servings: number, agg: Record<string, { qty?: number; unit?: string; entries: string[] }>) {
    if (!recipe) return;
    for (const ing of recipe.ingredients || []) {
      const name = ing.name;
      const qtyRaw = String(ing.quantity ?? '');
      const exec = /^\s*(\d*\.?\d+)\s*(.*)$/u.exec(qtyRaw);
      if (exec) {
        const v = Number.parseFloat(exec[1]) * servings;
        const unit = (exec[2] || '').trim();
        const normalized = normalizeQtyToBase(v, unit);
        const key = `${name}::${normalized.unit}`;
        if (!agg[key]) agg[key] = { qty: 0, unit: normalized.unit, entries: [] };
        agg[key].qty = (agg[key].qty ?? 0) + (normalized.qty ?? 0);
        agg[key].entries.push(`${recipe.title} ×${servings}: ${qtyRaw}`);
      } else {
        const normalized = normalizeQtyToBase(undefined, '');
        const key = `${name}::${normalized.unit}`;
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
          if (it.recipe_id) recipeIds.add(it.recipe_id);
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await callApi<GroceryList[]>(`/groceries`);
        if (mounted) setSavedLists(res.data || []);
      } catch (err) {
        console.debug(err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function saveGrocery() {
    const items = Object.entries(grocery).map(([key, val]) => {
      const [name, unit] = key.split('::');
      return {
        name,
        qty: val.qty,
        unit: unit || "",
        entries: val.entries,
        bought: false,
      };
    });
    const payload = {
      title: `Grocery ${periodStart} — ${periodEnd}`,
      period_start: periodStart,
      period_end: periodEnd,
      items,
    };
    try {
      const res = await callApi<GroceryList>(`/groceries`, 'POST', undefined, payload);
      setSavedLists(prev => [res.data, ...prev]);
    } catch (err) {
      console.error('Failed to save grocery list', err);
    }
  }

  async function toggleItemStatus(listId: string, itemId: string, newVal: boolean) {
    try {
      const url = `/groceries/${listId}/items/${itemId}?bought=${newVal}`;
      const res = await callApi<GroceryList>(url, 'PATCH');
      setSavedLists((prev) => prev.map(s => s.id === listId ? res.data : s));
    } catch (err) {
      console.error('Failed to update item status', err);
    }
  }

  async function toggleAllItemsStatus(listId: string, bought: boolean) {
    try {
      const url = `/groceries/${listId}/items?bought=${bought}`;
      const res = await callApi<GroceryList>(url, 'PATCH');
      setSavedLists((prev) => prev.map(s => s.id === listId ? res.data : s));
    } catch (err) {
      console.error('Failed to update all item status', err);
    }
  }

  return (
    <div className="p-2 sm:p-4">

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="w-full sm:w-auto">
          <label htmlFor="gp-start" className="block text-sm">From</label>
          <input id="gp-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full sm:w-auto rounded border px-2 py-1 mt-1" />
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="gp-end" className="block text-sm">To</label>
          <input id="gp-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full sm:w-auto rounded border px-2 py-1 mt-1" />
        </div>
        <div className="w-full sm:w-auto">
          <Button onClick={generate} className="w-full sm:w-auto px-3 py-1">Generate</Button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? <div>Generating…</div> : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(grocery).map(([key, val]) => {
              const [name, unit] = key.split('::');
              let qtyDisplay: string | undefined = undefined;
              if (val.qty !== undefined) {
                qtyDisplay = formatQtyUnit(val.qty, unit);
              }
              return (
                <li key={key} className="p-2 sm:p-3 rounded border dark:border-gray-700">
                  <div className="font-medium text-base sm:text-lg break-words">{name}{qtyDisplay ? ` — ${qtyDisplay}` : ''}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 space-y-1">{val.entries.map(e => <div key={e} className="break-words">{e}</div>)}</div>
                </li>
              );
            })}
          </ul>
        )}
        {(!loading && Object.keys(grocery).length === 0) && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">No ingredients found for the selected period.</div>
        )}
      </div>
      <div className="mt-4">
        {Object.keys(grocery).length > 0 && (
          <div className="flex gap-2 mt-3">
            <Button onClick={saveGrocery} className="px-3 py-1">Save grocery list</Button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium mb-3">Saved grocery lists</h2>
        <div className="space-y-3 mt-3 max-h-[30vh] sm:max-h-[40vh] overflow-auto">
          {savedLists.map((list) => {
            const totalItems = list.items?.length || 0;
            const boughtItems = list.items?.filter(it => it.bought).length || 0;

            return (
              <Card key={list.id} className="p-0 overflow-hidden mb-6 shadow-lg border-border/40">
                <div className="bg-surface-panel dark:bg-surface-panel-dark px-4 py-3">
                  <div className="flex flex-col gap-3">
                    {/* Titre et Master Checkbox */}
                    <Checkbox
                      label={list.title || "Ma liste"}
                      checked={totalItems > 0 && boughtItems === totalItems}
                      indeterminate={boughtItems > 0 && boughtItems < totalItems}
                      onChange={(e) => toggleAllItemsStatus(list.id!, e.target.checked)}
                      containerClassName="p-0 hover:bg-transparent" // On annule le padding interne ici
                    />

                    {/* Barre de Progression Intégrée */}
                    <Progress
                      value={boughtItems}
                      max={totalItems}
                      size="sm"
                      showValue={totalItems > 0}
                      variant={boughtItems === totalItems ? 'success' : 'primary'}
                      className="mt-1"
                    />
                  </div>
                </div>

                <ul className="divide-y divide-border/30 dark:divide-border-dark/30 max-h-96 overflow-y-auto">
                  {(list.items || []).map((it) => (
                    <li key={it.id} className="bg-surface-base/10">
                      <Checkbox
                        checked={!!it.bought}
                        label={it.name}
                        description={it.qty ? `${it.qty} ${it.unit}` : undefined}
                        onChange={(e) => toggleItemStatus(list.id!, it.id!, e.target.checked)}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
