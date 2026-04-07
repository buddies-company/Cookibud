import React, { useEffect, useState, useMemo } from "react";
import { Heading, Card, Button, Modal, Calendar, Input } from "@soilhat/react-components";
import SearchRecipe from './SearchRecipe';
import { callApi } from "../../services/api";
import { useNavigate } from 'react-router-dom';
import type { Meal, MealRecipe, MealType } from '../../utils/constants/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function pad(n: number) { return n < 10 ? `0${n}` : `${n}` }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export default function MealsPage() {
  const navigate = useNavigate();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [meals, setMeals] = useState<Meal[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>(undefined);
  const [selectedRecipeTitle, setSelectedRecipeTitle] = useState<string | undefined>(undefined);
  const [selectedServings, setSelectedServings] = useState<number>(1);
  const [selectedMealType, setSelectedMealType] = useState<MealType | "">('');
  const [plannedRecipes, setPlannedRecipes] = useState<MealRecipe[]>([]);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      const res = await callApi<Meal[]>("/meals");
      setMeals(res.data || []);
    } catch (err) {
      console.error("Failed to load meals", err);
    }
  };

  const handleEventDrop = async (eventKey: string, targetDate: Date) => {
    const targetIso = toISODate(targetDate);

    // 1. Parse the key (format: "mealId-index")
    const [mealId, itemIdxStr] = eventKey.split('-');
    const itemIdx = parseInt(itemIdxStr, 10);

    // 2. Find the source meal and the specific item
    const sourceMeal = meals.find(m => m.id === mealId);
    if (!sourceMeal || !sourceMeal.items?.[itemIdx]) return;

    const itemToMove = sourceMeal.items[itemIdx];

    // Don't do anything if dropped on the same day
    if (sourceMeal.date === targetIso) return;

    try {
      // 3. Prepare the updated source meal (item removed)
      const updatedSourceItems = sourceMeal.items.filter((_, i) => i !== itemIdx);

      // 4. Find or create the target meal
      const targetMeal = meals.find(m => m.date === targetIso);
      const updatedTargetItems = targetMeal
        ? [...(targetMeal.items || []), itemToMove]
        : [itemToMove];

      // 5. Optimistic UI Update
      setMeals(prev => {
        let next = prev.map(m => {
          if (m.id === mealId) return { ...m, items: updatedSourceItems };
          if (targetMeal && m.id === targetMeal.id) return { ...m, items: updatedTargetItems };
          return m;
        });

        // If the target date didn't have a meal entry yet, add a temporary one
        if (!targetMeal) {
          next.push({ id: 'temp-id', date: targetIso, items: updatedTargetItems });
        }
        return next;
      });

      // 6. Persistence: API Calls
      // Remove from old date
      await callApi(`/meals/${mealId}`, "PUT", undefined, {
        ...sourceMeal,
        items: updatedSourceItems
      });

      if (targetMeal) {
        await callApi(`/meals/${targetMeal.id}`, "PUT", undefined, {
          ...targetMeal,
          items: updatedTargetItems
        });
      } else {
        await callApi("/meals", "POST", undefined, {
          date: targetIso,
          items: [itemToMove]
        });
      }

      loadMeals();

    } catch (err) {
      console.error("Failed to move item", err);
      loadMeals(); // Rollback
    }
  };

  // Transform meals into unique calendar events.
  const calendarEvents = useMemo(() => {
    return meals.reduce<Record<string, any[]>>((acc, meal) => {
      acc[meal.date] = (meal.items || []).map((item, idx) => ({
        id: `${meal.id}-${idx}`,
        title: item.meal_type ? item.meal_type.toUpperCase() : (item.title || "Meal"),
        ...item
      }));
      return acc;
    }, {});
  }, [meals]);

  const openPlanModal = (d: Date) => {
    const iso = toISODate(d);
    setSelectedDate(iso);

    const existingMeal = meals.find(m => m.date === iso);
    if (existingMeal) {
      setEditingMealId(existingMeal.id ?? null);
      setPlannedRecipes(existingMeal.items || []);
    } else {
      setEditingMealId(null);
      setPlannedRecipes([]);
    }
    setModalOpen(true);
  };

  const addPlannedRecipe = () => {
    if (!selectedRecipeId && !selectedRecipeTitle?.trim()) return;

    const entry: MealRecipe = {
      recipe_id: selectedRecipeId,
      title: selectedRecipeTitle,
      servings: selectedServings,
      meal_type: selectedMealType as MealType
    };
    setPlannedRecipes(prev => [...prev, entry]);

    setSelectedRecipeId(undefined);
    setSelectedRecipeTitle(undefined);
    setSelectedServings(1);
    setSelectedMealType('');
  };

  const saveMeal = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedDate || plannedRecipes.length === 0) return;

    try {
      const payload = { date: selectedDate, items: plannedRecipes };
      if (editingMealId) {
        await callApi(`/meals/${editingMealId}`, "PUT", undefined, payload);
      } else {
        await callApi("/meals", "POST", undefined, payload);
      }
      await loadMeals();
      setModalOpen(false);
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  return (
    <div className="space-y-6">
      <Heading title="Meals Calendar">
        <Button onClick={() => navigate("/groceries")} color_name="primary">
          Grocery List
        </Button>
      </Heading>

      <Calendar
        year={year}
        month={month}
        eventsByDate={calendarEvents}
        onPrev={() => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)}
        onNext={() => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1)}
        onAction={openPlanModal}
        onEventClick={(id) => navigate(`/meals/${id}`)}
        onEventDrop={handleEventDrop}
        actionLabel="Plan"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="p-2">
          <Heading title="Plan Meals" meta={[{ key: "Date", value: selectedDate ?? '' }]} />

          <div className="mt-6 space-y-6">
            <div className="bg-surface-panel dark:bg-surface-panel-dark p-4 rounded-2xl border border-border dark:border-border-dark">
              <SearchRecipe onSelect={(id, title) => { setSelectedRecipeId(id); setSelectedRecipeTitle(title); }} />

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase ml-1">Meal Type</label>
                  <select
                    value={selectedMealType}
                    onChange={(e) => setSelectedMealType(e.target.value as MealType)}
                    className="w-full rounded-xl border-border dark:border-border-dark bg-white dark:bg-gray-900 text-sm p-2.5 h-[42px]"
                  >
                    <option value="">Select type...</option>
                    {MEAL_TYPES.map((type) => (
                      <option key={type} value={type}>{type.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Servings"
                  type="number"
                  value={selectedServings}
                  onChange={(e) => setSelectedServings(Number(e.target.value))}
                />
              </div>
              <Button onClick={addPlannedRecipe} className="w-full mt-4" color_name="primary">
                Add to List
              </Button>
            </div>

            <div className="space-y-2">
              {plannedRecipes.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between bg-surface-base dark:bg-surface-base-dark p-3 rounded-xl border border-border dark:border-border-dark">
                  <div className="text-sm">
                    <span className="font-black text-primary mr-2">
                      {p.meal_type?.toUpperCase() || "MEAL"}
                    </span>
                    <span className="font-bold">{p.title}</span>
                  </div>
                  <Button onClick={() => setPlannedRecipes(prev => prev.filter((_, i) => i !== idx))} variant="ghost" color_name="danger" size="small">
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Modal.Footer>
            <Button onClick={saveMeal}>Save Changes</Button>
            <Button onClick={() => setModalOpen(false)} variant="ghost">Cancel</Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}