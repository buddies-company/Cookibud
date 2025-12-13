
export interface IIngredient { quantity: number, name: string, id:string }

export interface IRecipe {
  id?: string;
  title?: string;
  description?: string;
  ingredients?: IIngredient[];
  image_url?: string;
}