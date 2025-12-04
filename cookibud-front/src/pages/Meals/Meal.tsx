import { useEffect, useState, type MouseEventHandler } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callApi } from '../../services/api';
import { Container, Heading, Card, Button } from '@soilhat/react-components';
import type { Meal } from '../../utils/constants/types';

export default function MealPage() {
    const { mealId } = useParams();
    const navigate = useNavigate();
    const [meal, setMeal] = useState<Meal | null>(null);
    const [grocery, setGrocery] = useState<Record<string, { qty?: number; unit?: string; entries: string[] }>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!mealId) return;
        const load = async () => {
            try {
                const res = await callApi(`/meals/${mealId}`);
                const m: Meal = res.data;
                setMeal(m);
                // fetch each recipe details and aggregate ingredients
                const agg: Record<string, { qty?: number; unit?: string; entries: string[] }> = {};
                for (const r of m.items || []) {
                    const rid = (r as any).recipe_id ?? (r as any).recipeId;
                    if (!rid) continue;
                    const recipeRes = await callApi(`/recipes/${rid}`);
                    const recipe = recipeRes.data;
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

    if (!mealId) return <Container><Card><div>No meal selected</div></Card></Container>;

    const handleDelete: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.preventDefault();
        if (!mealId) return;
        (async () => {
            try {
                setLoading(true);
                await callApi(`/meals/${mealId}`, "DELETE");
                // navigate back to meals list
                navigate('/meals');
            } catch (err) {
                console.error('Failed to delete meal', err);
            } finally {
                setLoading(false);
            }
        })();
    }

    return (
        <Container>
            <Heading title={`Meal ${meal?.date ?? ''}`}>
                <div className="flex gap-2">
                    <Button className="bg-red-500" onClick={handleDelete}>Delete</Button>
                    <Button onClick={() => navigate(-1)}>Back</Button>
                </div>
            </Heading>
            <Card className="p-4">
                {loading ? <div>Loading…</div> : (
                    <div>
                        <div className="mb-4">
                            <strong className="block">Planned recipes</strong>
                            <ul className="list-disc ml-5">
                                {(meal?.items || []).map((r) => {
                                    const rid = (r as any).recipe_id ?? (r as any).recipeId ?? Math.random().toString(36).slice(2, 7);
                                    return <li key={rid}>{(r as any).title ?? (r as any).recipe_id ?? (r as any).recipeId} ×{r.servings}</li>
                                })}
                            </ul>
                        </div>

                        <div>
                            <strong className="block mb-2">Grocery list</strong>
                            <ul className="space-y-2">
                                {Object.entries(grocery).map(([key, val]) => {
                                    const [name, unit] = key.split('::');
                                    let qtyDisplay: string | undefined = undefined;
                                    if (val.qty !== undefined) {
                                        const unitSuffix = unit ? ' ' + unit : '';
                                        qtyDisplay = `${Number(val.qty.toFixed(2))}${unitSuffix}`;
                                    }
                                    return (
                                        <li key={key} className="">
                                            <div className="font-medium">{name}{qtyDisplay ? ` — ${qtyDisplay}` : ''}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                {val.entries.map((e) => <div key={e}>{e}</div>)}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    </div>
                )}
            </Card>
        </Container>
    )
}
