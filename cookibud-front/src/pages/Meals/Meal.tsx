import { useEffect, useState, type MouseEventHandler } from 'react';
import ReactMarkdown from 'react-markdown';
import { formatQtyUnit } from '../../utils/quantities';
import { useParams, useNavigate } from 'react-router-dom';
import { callApi } from '../../services/api';
import { Heading, Card, Button } from '@soilhat/react-components';
import type { Meal } from '../../utils/constants/types';
import type { IRecipe } from '../Recipes/types';

export default function MealPage() {
    const { mealId } = useParams();
    const navigate = useNavigate();
    const [meal, setMeal] = useState<Meal | null>(null);
    const [grocery, setGrocery] = useState<Record<string, { qty?: number; unit?: string; entries: string[] }>>({});
    const [recipesById, setRecipesById] = useState<Record<string, IRecipe>>({});
    const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!mealId) return;
        const load = async () => {
            try {
                const res = await callApi<Meal>(`/meals/${mealId}`);
                const m: Meal = res.data;
                setMeal(m);
                // Fetch each recipe details and aggregate ingredients
                const agg: Record<string, { qty?: number; unit?: string; entries: string[] }> = {};
                for (const r of m.items || []) {
                    const rid = r.recipe_id;
                    if (!rid) continue;
                    
                    const recipeRes = await callApi<IRecipe>(`/recipes/${rid}`);
                    const recipe = recipeRes.data;
                    setRecipesById(prev => ({ ...prev, [rid]: recipe }));
                    
                    const servings = r.servings ?? 1;
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
                setGrocery(agg);
            } catch (err) {
                console.error('Failed to load meal', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [mealId]);

    if (!mealId) return <Card><div>No meal selected</div></Card>;

    return (
        <>
            <Heading title={`Meal ${meal?.date ?? ''}`}>
                <div className="flex gap-2">
                    <Button onClick={() => navigate(-1)}>Back</Button>
                </div>
            </Heading>
            <Card className="p-4">
                {loading ? <div>Loading…</div> : (
                    <div>
                        <div className="mb-4">
                            <strong className="block mb-2">Planned recipes</strong>
                            <ul className="space-y-3">
                                {(meal?.items || []).map((r) => {
                                    const rid = r.recipe_id ?? Math.random().toString(36).slice(2, 7);
                                    return (
                                        <li key={rid} className="border-b border-border pb-3 last:border-0">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium text-lg">{r.title ?? r.recipe_id} <span className="text-text-secondary text-sm ml-2">×{r.servings} servings</span></div>
                                                <div className="flex gap-2">
                                                    {/* Navigation button to full recipe page */}
                                                    <Button onClick={() => navigate(`/recipes/${r.recipe_id}`)} size="small" variant="border">
                                                        See recipe
                                                    </Button>
                                                    <Button onClick={() => setExpandedRecipes(prev => ({ ...prev, [rid]: !prev[rid] }))} size="small">
                                                        {expandedRecipes[rid] ? 'Hide quick view' : 'Quick view'}
                                                    </Button>
                                                </div>
                                            </div>
                                            
                                            {expandedRecipes[rid] && recipesById[rid] && (
                                                <Card className="mt-3 p-4 bg-surface-panel dark:bg-surface-panel-dark">
                                                    <div className="mb-4">
                                                        <strong className="text-sm uppercase tracking-wider text-text-secondary block mb-2">Ingredients:</strong>
                                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 ml-4 list-disc">
                                                            {recipesById[rid]?.ingredients?.map((ing, idx) => {
                                                                const qty = typeof ing.quantity === 'number' ? ing.quantity * (r.servings ?? 1) : undefined;
                                                                const unit = ing.unit ?? '';
                                                                return <li key={`${ing.name}-${idx}`} className="text-sm">{ing.name}{qty ? ` — ${formatQtyUnit(qty, unit)}` : ''}</li>
                                                            })}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong className="text-sm uppercase tracking-wider text-text-secondary block mb-2">Instructions:</strong>
                                                        <div className="markdown prose prose-sm dark:prose-invert max-w-none">
                                                            <ReactMarkdown>{recipesById[rid].description ?? ''}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </Card>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>

                        <div className="mt-8 border-t pt-6">
                            <strong className="block mb-4 text-xl">Combined Grocery List</strong>
                            <ul className="space-y-4">
                                {Object.entries(grocery).map(([key, val]) => {
                                    const [name, unit] = key.split('::');
                                    let qtyDisplay: string | undefined = undefined;
                                    if (val.qty !== undefined) {
                                        const unitSuffix = unit ? ' ' + unit : '';
                                        qtyDisplay = `${Number(val.qty.toFixed(2))}${unitSuffix}`;
                                    }
                                    return (
                                        <li key={key} className="bg-surface-panel/30 dark:bg-surface-panel-dark/30 p-3 rounded-lg border border-border/50">
                                            <div className="font-bold text-md text-primary">{name}{qtyDisplay ? ` — ${qtyDisplay}` : ''}</div>
                                            <div className="text-xs text-text-secondary mt-2 flex flex-col gap-0.5">
                                                {val.entries.map((e, idx) => <div key={idx} className="flex items-center gap-2"><span className="w-1 h-1 bg-border rounded-full"></span>{e}</div>)}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    </div>
                )}
            </Card>
        </>
    )
}