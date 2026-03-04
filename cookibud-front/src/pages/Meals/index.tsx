import React, { useEffect, useState, useMemo } from "react";
import { Heading, Card, Button, Modal, Calendar, Input } from "@soilhat/react-components";
import SearchRecipe from './SearchRecipe';
import { callApi } from "../../services/api";
import { useNavigate } from 'react-router-dom';
import type { Meal, MealRecipe, MealType } from '../../utils/constants/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// English comment: Helpers for date string consistency
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

  // Transform meals into unique calendar events.
  // We use the array index (idx) to ensure the React 'key' is truly unique.
  const calendarEvents = useMemo(() => {
    return meals.reduce<Record<string, MealRecipe[]>>((acc, meal) => {
      acc[meal.date] = (meal.items || []).map((item, idx) => ({
        // 'id' is used for navigation/API calls
        id: meal.id, 
        key: `${meal.id}-${idx}`,
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

      <Card className="p-0 overflow-hidden shadow-xl border-none">
        <Calendar
          year={year}
          month={month}
          eventsByDate={calendarEvents}
          onPrev={() => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)}
          onNext={() => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1)}
          // Action button (Plan) opens the modal to add/edit items
          onAction={openPlanModal}
          // Clicking an event (the meal label) takes you to the Detail Page
          onEventClick={(id) => navigate(`/meals/${id}`)}
          actionLabel="Plan"
        />
      </Card>

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