import { useEffect, useState } from 'react';
import type { Meal, GroceryList } from '../../utils/constants/types';
import type { IRecipe } from '../Recipes/types';
import { formatQtyUnit, normalizeQtyToBase } from '../../utils/quantities';

import { Button, Card, Checkbox, Heading, Input, Progress } from '@soilhat/react-components';
import { callApi } from '../../services/api';


export default function GroceryPeriod() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [periodStart, setPeriodStart] = useState<string>(() => {
    const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  });
  const [periodEnd, setPeriodEnd] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  });
  const [grocery, setGrocery] = useState<Record<string, { qty?: number; unit?: string; entries: string[] }>>({});
  const [loading, setLoading] = useState(false);
  const [savedLists, setSavedLists] = useState<GroceryList[]>([]);

  useEffect(() => {
    // load meals and recipes
    callApi<Meal[]>("/meals").then(res => setMeals(res.data || [])).catch(() => { });
  }, []);

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
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <Heading title="Grocery Planning" meta={[
        { value: 'Generate new lists or manage your shopping history.', key: 'meta' },]}></Heading>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: GENERATOR (Sticky on Desktop) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Create New List</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date Range</label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={generate} className="w-full justify-center py-2" >
                {loading ? 'Processing...' : 'Generate Ingredients'}
              </Button>
            </div>
          </Card>

          {/* PREVIEW AREA: Only shows if a list was just generated but not saved yet */}
          {Object.keys(grocery).length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Previewing {Object.keys(grocery).length} items</h3>
                <Button onClick={saveGrocery} size="small">Save This List</Button>
              </div>
              <ul className="text-xs space-y-2 max-h-60 overflow-auto p-2 border rounded bg-surface-muted/30">
                {Object.entries(grocery).map(([key, val]) => {
                  const [name, unit] = key.split('::');
                  let qtyDisplay: string | undefined = undefined;
                  if (val.qty !== undefined) {
                    qtyDisplay = formatQtyUnit(val.qty, unit);
                  }
                  return (
                    <li key={key} className="truncate">• {name}{qtyDisplay ? ` — ${qtyDisplay}` : ''}</li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: SAVED LISTS FEED */}
        <main className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-xl font-semibold">Saved Grocery Lists</h2>
            <span className="text-sm bg-primary dark:bg-primary-dark text-text-on-primary dark:text-text-on-primary-dark px-2 py-1 rounded-full">{savedLists.length} Lists</span>
          </div>

          {savedLists.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-xl opacity-50">
              <p>No saved lists found. Generate your first one on the left!</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {savedLists.map((list) => {
                const totalItems = list.items?.length || 0;
                const boughtItems = list.items?.filter(it => it.bought).length || 0;
                const isComplete = totalItems > 0 && boughtItems === totalItems;

                return (
                  <Card key={list.id} className={`overflow-hidden transition-all ${isComplete ? 'opacity-75' : 'shadow-md'}`}>
                    {/* List Header */}
                    <div className="p-4 border-b bg-surface-panel/50 dark:bg-surface-panel-dark/50 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <Checkbox
                          label={<span className="font-bold text-lg">{list.title}</span>}
                          checked={isComplete}
                          indeterminate={boughtItems > 0 && boughtItems < totalItems}
                          onChange={(e) => toggleAllItemsStatus(list.id!, e.target.checked)}
                        />
                        <div className="text-xs text-text-secondary dark:text-text-secondary font-mono">
                          {list.period_start} — {list.period_end}
                        </div>
                      </div>

                      <Progress
                        value={boughtItems}
                        max={totalItems}
                        size="md"
                        variant={isComplete ? 'success' : 'primary'}
                      />
                    </div>

                    {/* List Items Grid */}
                    <ul className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-x-4 p-4 bg-background">
                      {(list.items || []).map((it) => (
                        <li key={it.id} className="py-2 flex items-center border-b border-border/20 dark:border-border-dark/20">
                          <Checkbox
                            checked={!!it.bought}
                            label={<span className={it.bought ? 'line-through opacity-50' : ''}>{it.name}</span>}
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
          )}
        </main>
      </div>
    </div>
  );
}
