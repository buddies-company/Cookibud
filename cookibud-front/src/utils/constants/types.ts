export type User = {
  username: string;
  avatar?: string | null;
};

export type MealRecipe = { recipe_id?: string; title?: string; servings: number };
export type Meal = { id?: string; date: string; items: MealRecipe[] };
