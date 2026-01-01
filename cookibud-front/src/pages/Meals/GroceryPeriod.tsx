import { useEffect, useState } from 'react';
import type { Meal, GroceryList } from '../../utils/constants/types';
import type { IRecipe } from '../Recipes/types';
import { formatQtyUnit, normalizeQtyToBase } from '../../utils/quantities';
import { Button, Card, Checkbox, Heading, Input, Progress } from '@soilhat/react-components';
import { callApi } from '../../services/api';

export default function GroceryPeriod() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [periodStart, setPeriodStart] = useState<string>(() => {
    const d = new Date(); d.setDate(1); 
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  });
  const [periodEnd, setPeriodEnd] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); 
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  });
  const [grocery, setGrocery] = useState<Record<string, { qty?: number; unit?: string; entries: string[] }>>({});
  const [loading, setLoading] = useState(false);
  const [savedLists, setSavedLists] = useState<GroceryList[]>([]);
  
  // NEW: State for tracking which lists are expanded
  const [expandedLists, setExpandedLists] = useState<string[]>([]);

  /**
   * Initial data fetching
   */
  useEffect(() => {
    callApi<Meal[]>("/meals").then(res => setMeals(res.data || [])).catch(() => { });
  }, []);

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

  /**
   * Auto-expand the first list once data is loaded
   */
  useEffect(() => {
    if (savedLists.length > 0 && expandedLists.length === 0) {
      const sorted = [...savedLists].sort((a, b) => 
        new Date(b.period_start || 0).getTime() - new Date(a.period_start || 0).getTime()
      );
      setExpandedLists([sorted[0].id!]);
    }
  }, [savedLists]);

  // Sorting lists by date desc (latest first)
  const sortedLists = [...savedLists].sort((a, b) => 
    new Date(b.period_start || 0).getTime() - new Date(a.period_start || 0).getTime()
  );

  /**
   * Helper Functions for Grocery Generation
   */
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
        const unit = (exec[2] || ing.unit || '').trim();
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

  /**
   * API Handlers
   */
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

  async function saveGrocery() {
    const items = Object.entries(grocery).map(([key, val]) => {
      const [name, unit] = key.split('::');
      return { name, qty: val.qty, unit: val.unit || "", entries: val.entries, bought: false };
    });
    const payload = {
      title: `${periodStart} — ${periodEnd}`,
      period_start: periodStart,
      period_end: periodEnd,
      items,
    };
    try {
      const res = await callApi<GroceryList>(`/groceries`, 'POST', undefined, payload);
      setSavedLists(prev => [res.data, ...prev]);
      setGrocery({});
      // Auto-expand the newly created list
      setExpandedLists([res.data.id!]);
    } catch (err) {
      console.error('Failed to save grocery list', err);
    }
  }

  async function deleteList(listId: string) {
    if (!window.confirm("Are you sure you want to delete this list?")) return;
    try {
      await callApi(`/groceries/${listId}`, 'DELETE');
      setSavedLists(prev => prev.filter(l => l.id !== listId));
    } catch (err) {
      console.error('Failed to delete list', err);
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

  const toggleExpand = (id: string) => {
    setExpandedLists(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <Heading 
        title="Grocery Planning" 
        meta={[{ value: 'Manage your ingredients and shopping lists.', key: 'meta' }]} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">

        {/* LEFT COLUMN: FILTERS & GENERATION */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Create New List</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
              <Button onClick={generate} className="w-full">
                {loading ? 'Generating...' : 'Aggregate Ingredients'}
              </Button>
            </div>
          </Card>

          {/* New Ingredients Preview */}
          {Object.keys(grocery).length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">New List Preview</h3>
                <Button onClick={saveGrocery} size="small">Save List</Button>
              </div>
              <ul className="text-xs space-y-2 max-h-80 overflow-auto p-3 border rounded-lg bg-surface-panel/30 dark:bg-surface-panel-dark/30">
                {Object.entries(grocery).map(([key, val]) => {
                  const [name, unit] = key.split('::');
                  const qtyDisplay = val.qty !== undefined ? formatQtyUnit(val.qty, unit) : '';
                  return (
                    <li key={key} className="flex justify-between border-b border-border/10 pb-1">
                      <span className="font-medium">{name}</span>
                      <span className="text-text-secondary">{qtyDisplay}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: SAVED LISTS ACCORDION */}
        <main className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border dark:border-border-dark pb-2">
            <h2 className="text-xl font-semibold">Saved Grocery Lists</h2>
            <span className="text-sm font-medium px-3 py-1 bg-surface-panel dark:bg-surface-panel-dark rounded-full border border-border dark:border-border-dark">
              {sortedLists.length} Total
            </span>
          </div>

          {sortedLists.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border dark:border-border-dark rounded-2xl opacity-60">
              <p>Your shopping history will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedLists.map((list) => {
                const isExpanded = expandedLists.includes(list.id!);
                const totalItems = list.items?.length || 0;
                const boughtItems = list.items?.filter(it => it.bought).length || 0;
                const isComplete = totalItems > 0 && boughtItems === totalItems;

                const sortedIngredients = [...(list.items || [])].sort((a, b) => 
                  Number(a.bought) - Number(b.bought)
                );

                return (
                  <Card key={list.id} className={`overflow-hidden transition-all ${isComplete ? 'opacity-80' : 'shadow-md border-primary/10'}`}>
                    {/* ACCORDION HEADER */}
                    <div 
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-panel/40 dark:bg-surface-panel-dark/20 cursor-pointer hover:bg-surface-panel/60 transition-colors"
                      onClick={() => toggleExpand(list.id!)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Checkbox
                          checked={isComplete}
                          indeterminate={boughtItems > 0 && boughtItems < totalItems}
                          onChange={(e) => {
                            e.stopPropagation(); // Don't trigger expand
                            toggleAllItemsStatus(list.id!, e.target.checked);
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-base">{list.title}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden sm:block w-24">
                           <Progress value={boughtItems} max={totalItems} size="sm" variant={isComplete ? 'success' : 'primary'} />
                        </div>
                        <span className="text-xs font-medium min-w-[50px] text-right">
                          {boughtItems}/{totalItems}
                        </span>
                        
                        {/* DELETE BUTTON */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteList(list.id!); }}
                          className="p-1.5 text-text-secondary hover:text-red-500 transition-colors rounded-full cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>

                        {/* CHEVRON ICON */}
                        <svg 
                          className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* ACCORDION CONTENT */}
                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-2 duration-200 bg-white dark:bg-surface-panel-dark/10">
                        <ul className="grid grid-cols-1 md:grid-cols-2 p-4 gap-x-8 gap-y-3 border-t border-border/10">
                          {sortedIngredients.map((it) => (
                            <li key={it.id} className="p-1">
                              <Checkbox
                                checked={!!it.bought}
                                label={
                                  <span className={`${it.bought ? 'line-through opacity-50 italic text-text-secondary' : 'font-medium'}`}>
                                    {it.name}
                                  </span>
                                }
                                description={it.qty ? formatQtyUnit(it.qty, it.unit) : undefined}
                                onChange={(e) => toggleItemStatus(list.id!, it.id!, e.target.checked)}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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