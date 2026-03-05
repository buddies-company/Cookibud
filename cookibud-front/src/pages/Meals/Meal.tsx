import { useEffect, useState } from 'react';
import { formatQtyUnit } from '../../utils/quantities';
import { useParams, useNavigate } from 'react-router-dom';
import { callApi } from '../../services/api';
import { Heading, Card, Button, Select } from '@soilhat/react-components';
import type { Meal, MealRecipe, MealType } from '../../utils/constants/types';
import type { IRecipe } from '../Recipes/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

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

                        const match = qtyRaw.match(/^(\d*\.?\d+)\s*(.*)$/);

                        let numericQty = 0;
                        let unit = (ing.unit || '').trim();

                        if (match) {
                            numericQty = parseFloat(match[1]) * servings;
                            if (!unit) unit = match[2].trim();
                        }

                        const key = `${name}::${unit}`;

                        if (!agg[key]) {
                            agg[key] = { qty: 0, unit: unit, entries: [] };
                        }

                        if (numericQty > 0) {
                            agg[key].qty = (agg[key].qty ?? 0) + numericQty;
                            agg[key].entries.push(`${recipe.title}: ${qtyRaw}`);
                        } else {
                            agg[key].entries.push(`${recipe.title}: ${qtyRaw || '—'}`);
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

    const groupedByMealType = (items: MealRecipe[]) => {
        const grouped: Record<string, MealRecipe[]> = {};
        MEAL_TYPES.forEach(type => { grouped[type] = []; });
        items.forEach(item => {
            const type = item.meal_type || 'lunch';
            grouped[type].push(item);
        });
        return grouped;
    };

    if (!mealId) return <Card className="p-10 text-center">No meal selected</Card>;

    const itemsByMealType = groupedByMealType(meal?.items || []);

    const updateMealType = async (itemIndex: number, newType: MealType) => {
        if (!meal || !mealId) return;

        const updatedItems = [...(meal.items || [])];
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], meal_type: newType };

        try {
            const payload = { ...meal, items: updatedItems };
            await callApi(`/meals/${mealId}`, "PUT", undefined, payload);

            setMeal(payload);
        } catch (err) {
            console.error("Failed to update meal type", err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <Heading title={`Meal Plan: ${meal?.date ?? ''}`}>
                <Button onClick={() => navigate(-1)} variant="border">← Back</Button>
            </Heading>

            {loading ? (
                <Card className="p-10 text-center">Loading meal data...</Card>
            ) : (
                <>
                    <Card className="p-6">
                        <div className="space-y-8">
                            {MEAL_TYPES.map((mealType) => {
                                const recipes = itemsByMealType[mealType] || [];
                                if (recipes.length === 0) return null;
                                return (
                                    <div key={mealType}>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 border-b border-border pb-2">
                                            {mealType}
                                        </h3>
                                        <div className="grid gap-3">
                                            {recipes.map((r, idx) => {
                                                const rid = r.recipe_id ?? `idx-${idx}`;
                                                const isExpanded = expandedRecipes[rid];
                                                return (
                                                    <div key={rid} className="border border-border rounded-xl p-4 bg-surface-panel/10">
                                                        <div className="flex items-center justify-between">
                                                            <Select
                                                                value={r.meal_type || 'lunch'}
                                                                options={MEAL_TYPES.map(type => (
                                                                    {key: type, value: type, label: type.toUpperCase()}
                                                                ))}
                                                                onChange={(e) => updateMealType(idx, e as MealType)}
                                                            />
                                                            <div>
                                                                <div className="font-bold text-lg">{r.title ?? 'Untitled Recipe'}</div>
                                                                <div className="text-sm text-text-secondary dark:text-text-secondary-dark">{r.servings} Servings</div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button onClick={() => setExpandedRecipes(p => ({ ...p, [rid]: !isExpanded }))} size="small" variant="ghost">
                                                                    {isExpanded ? 'Hide' : 'Quick View'}
                                                                </Button>
                                                                <Button onClick={() => navigate(`/recipes/${r.recipe_id}`)} size="small" variant="border">Recipe</Button>
                                                            </div>
                                                        </div>
                                                        {isExpanded && recipesById[rid] && (
                                                            <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-2 gap-4">
                                                                <ul className="text-sm space-y-1">
                                                                    {recipesById[rid].ingredients?.map((ing, i) => (
                                                                        <li key={i}>• {ing.name}: {formatQtyUnit(parseFloat(String(ing.quantity)) * (r.servings ?? 1), ing.unit ?? '')}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card className="p-6 bg-surface-panel/30">
                        <Heading title="Consolidated Grocery List" meta={[{ key: "subtitle", value: "All units calculated for your planned servings" }]} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                            {Object.entries(grocery).map(([key, val]) => {
                                const [name, unitFromKey] = key.split('::');

                                const finalUnit = val.unit || unitFromKey || '';
                                const displayQty = (val.qty && val.qty > 0)
                                    ? formatQtyUnit(val.qty, finalUnit)
                                    : '';

                                return (
                                    <div key={key} className="p-3 bg-surface-base dark:bg-surface-base-dark rounded-lg border border-border flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-sm">{name}</div>
                                            <div className="text-[10px] text-text-secondary opacity-60">
                                                {val.entries.join(' | ')} {finalUnit}
                                            </div>
                                        </div>
                                        {displayQty && (
                                            <span className="font-black text-primary text-sm whitespace-nowrap ml-4">
                                                {displayQty}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}