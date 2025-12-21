import React, { useEffect, useState } from "react";
import { Container, Heading, Card, Button, Modal, Calendar } from "@soilhat/react-components";
import SearchRecipe from './SearchRecipe';
import GroceryPeriod from './GroceryPeriod';
import { callApi } from "../../services/api";
import { useNavigate } from 'react-router-dom';
import type { Meal, MealRecipe } from '../../utils/constants/types';

function pad(n: number) { return n < 10 ? `0${n}` : `${n}` }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }

export default function MealsPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [meals, setMeals] = useState<Meal[]>([]);
  // removed full recipes list - we fetch suggestions via search
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>(undefined);
  const [selectedRecipeTitle, setSelectedRecipeTitle] = useState<string | undefined>(undefined);
  const [selectedServings, setSelectedServings] = useState<number>(1);
  const [plannedRecipes, setPlannedRecipes] = useState<MealRecipe[]>([]);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [groceryModalOpen, setGroceryModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // load meals and recipes
    callApi<Meal[]>("/meals").then(res => setMeals(res.data || [])).catch(() => {});
  }, []);

  const mealsByDate = meals.reduce<Record<string, Meal[]>>((acc, m) => {
    acc[m.date] ??= [];
    acc[m.date].push(m);
    return acc;
  }, {} as Record<string, Meal[]>);

  const openPlan = (d: Date) => {
    setSelectedDate(toISODate(d));
    setSelectedRecipeId(undefined);
    setPlannedRecipes([]);
    setSelectedServings(1);
    // if there is already a meal planned for this date, prefill for editing
    const iso = toISODate(d);
    const dayMeals = mealsByDate[iso] ?? [];
    if (dayMeals.length > 0) {
      // pick the first meal to edit
      const meal = dayMeals[0];
      setEditingMealId(meal.id ?? null);
      // map backend items/recipes to local plannedRecipes
      const items = meal.items ?? [];
      const mapped: MealRecipe[] = items.map(it => ({ recipe_id: it.recipe_id, title: it.title ?? it.recipe_id, servings: it.servings ?? 1 }));
      setPlannedRecipes(mapped);
    } else {
      setEditingMealId(null);
    }
    setModalOpen(true);
  }

  const addPlannedRecipe = () => {
    // allow adding free-text title when recipe id isn't available
    if (!selectedRecipeId && !selectedRecipeTitle?.trim()) navigate("/recipes/new");
    const entry: MealRecipe = { recipe_id: selectedRecipeId ?? undefined, title: selectedRecipeTitle ?? selectedRecipeId, servings: selectedServings };
    setPlannedRecipes(prev => [...prev, entry]);
    // reset selection for another entry
    setSelectedRecipeId(undefined);
    setSelectedRecipeTitle(undefined);
    setSelectedServings(1);
  }

  const removePlannedRecipe = (idx: number) => {
    setPlannedRecipes(prev => prev.filter((_, i) => i !== idx));
  }

  const saveMeal = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedDate || plannedRecipes.length === 0) return;
    try {
      // prepare payload: date + items array
  const payload = { date: selectedDate, items: plannedRecipes.map(r => ({ recipe_id: r.recipe_id, title: r.title, servings: r.servings })) };
      if (editingMealId) {
        // update existing meal
        await callApi(`/meals/${editingMealId}`, "PUT", undefined, payload);
      } else {
        await callApi("/meals", "POST", undefined, payload);
      }
      // refresh meals
      const res = await callApi<Meal[]>("/meals");
      setMeals(res.data || []);
      setModalOpen(false);
    } catch (err) {
      console.error("Failed to save meal", err);
    }
  }


  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <Container>
      <Heading title={`Meals calendar`}>
        <div>
          <Button onClick={() => setGroceryModalOpen(true)} className="px-3 py-1">Grocery list</Button>
        </div>
      </Heading>

      <Card className="p-4">
        
        <Calendar
          year={year}
          month={month}
          eventsByDate={mealsByDate}
          onPrev={prevMonth}
          onNext={nextMonth}
          onAction={openPlan}
          onEventClick={(id) => navigate(`/meals/${id}`)}
          actionLabel="Plan"
        />
      </Card>


      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
          <form onSubmit={(e) => saveMeal(e)}>
            <div className="mb-3"><strong className="block">Plan meal for:</strong> <span className="text-gray-700 dark:text-gray-200">{selectedDate}</span></div>
            <div className="mb-3">
              <label htmlFor="meal-recipe-select" className="block text-sm text-gray-700 dark:text-gray-300">Recipe</label>
              <div className="mt-2">
                <SearchRecipe onSelect={(id, title) => { setSelectedRecipeId(id); setSelectedRecipeTitle(title); }} />

                <div className="flex gap-2 mt-2">
                  <input id="meal-servings" type="number" min={1} value={selectedServings} onChange={(e) => setSelectedServings(Number(e.target.value || 1))} className="w-24 rounded border px-2 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100" />
                  <Button type="button" onClick={addPlannedRecipe} className="px-3 py-1">Add</Button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {plannedRecipes.map((p, idx) => (
                  <div key={`${p.recipe_id ?? 'free'}-${idx}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded px-2 py-1 text-sm">
                    <div>{p.title} ×{p.servings}</div>
                    <div>
                      <Button type="button" onClick={() => removePlannedRecipe(idx)} className="px-2 py-0 bg-state-danger">Remove</Button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1" variant="border">Cancel</Button>
              <Button type="submit" className="px-4 py-1">Save</Button>
            </div>
          </form>
      </Modal>
      <Modal open={groceryModalOpen} onClose={() => setGroceryModalOpen(false)}>
        <div className="max-w-2xl mx-auto p-4 max-h-[calc(100vh-4rem)] overflow-auto z-50">
          <GroceryPeriod meals={meals} />
        </div>
      </Modal>
    </Container>
  )
}
