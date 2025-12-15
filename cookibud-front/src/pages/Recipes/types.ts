
export interface IIngredient { quantity: number, name: string, id:string, unit?: string }

export interface IRecipe {
  id?: string;
  title?: string;
  description?: string;
  ingredients?: IIngredient[];
  image_url?: string;
  author_id?: string;
  reviews?: { id?: string; user_id?: string; username?: string; rating: number; comment?: string; created_at?: string }[];
}