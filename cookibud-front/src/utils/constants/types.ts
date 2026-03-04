export type User = {
  id?:string,
  username?: string;
  avatar?: string | null;
};
export type LoginData = { username: string; password: string };

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type MealRecipe = { recipe_id?: string; title?: string; servings: number; meal_type?: MealType };
export type Meal = { id?: string; date: string; items: MealRecipe[] };
export type GroceryItem = { id?: string; name: string; qty?: number; unit?: string; entries?: string[]; bought?: boolean };
export type GroceryList = { id?: string; title?: string; period_start?: string; period_end?: string; created_at?: string; items?: GroceryItem[]; user_id?: string };
