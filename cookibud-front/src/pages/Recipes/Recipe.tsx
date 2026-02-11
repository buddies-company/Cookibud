import { Heading, Card, Form, Input, Button, Textarea, StackedList, Modal, ImageUploader, TagInput, Select } from "@soilhat/react-components";
import { useEffect, useState, type ChangeEvent, type FormEvent, type MouseEventHandler, type KeyboardEvent } from "react";
import ReactMarkdown from 'react-markdown';
import { useAuth } from "../../routing/useAuth";
import { callApi, getApiUrl } from "../../services/api";
import { formatQtyUnit } from "../../utils/quantities";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { IRecipe, IIngredient, IReview } from "./types";
import type { MealRecipe, Meal } from "../../utils/constants/types";

export default function Recipe() {
  const [recipe, setRecipe] = useState<IRecipe>({});
  const [ingredientNames, setIngredientNames] = useState<string[]>([]);
  const [userMeals, setUserMeals] = useState<Meal[]>([]);
  const [planning, setPlanning] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { recipeId } = useParams();
  const [isEditing, setIsEditing] = useState<boolean>(() => (recipeId === 'new'));
  const { t } = useTranslation("translation", { keyPrefix: "pages.recipe" });
  const navigate = useNavigate();

  useEffect(() => {
    if (recipeId && recipeId !== "new") {
      callApi<IRecipe>(`/recipes/${recipeId}`)
        .then((res) => { setRecipe(res.data); setIsEditing(false); })
        .catch((error) => console.error("Error fetching recipe:", error));
      
      callApi<Meal[]>(`/meals`).then(r => setUserMeals(r.data || [])).catch(() => setUserMeals([]));
    }
    callApi<string[]>(`/recipes/ingredient-names`).then((res) => setIngredientNames(res.data || [])).catch(() => setIngredientNames([]));
    callApi<string[]>(`/recipes/tags`).then((res) => setAllTags(res.data || [])).catch(() => setAllTags([]));
  }, [recipeId]);

  const handleInput = (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecipe((prev) => ({ ...prev, [name]: value }));
  }

  const addOrUpdateIngredient = (ing: IIngredient, index?: number) => {
    setRecipe((prev) => {
      const ingredients = Array.isArray(prev.ingredients) ? [...prev.ingredients] : [];
      const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const withId = { ...ing, id: ing.id || genId(), unit: ing.unit || 'g' };
      if (typeof index === "number" && index >= 0 && index < ingredients.length) {
        ingredients[index] = withId;
      } else {
        ingredients.push(withId);
      }
      return { ...prev, ingredients };
    })
  }

  const deleteIngredient = (index: number) => {
    setRecipe((prev) => {
      const ingredients = Array.isArray(prev.ingredients) ? [...prev.ingredients] : [];
      if (index >= 0 && index < ingredients.length) {
        ingredients.splice(index, 1);
      }
      return { ...prev, ingredients };
    })
  }

  const handleSubmitEvent = async (e: FormEvent) => {
    e.preventDefault();
    const oldImageUrl = recipe.image_url;
    let newImageUrl: string | null = null;
    if (imageFile) newImageUrl = await uploadImage(imageFile);

    const payload = newImageUrl ? { ...recipe, image_url: newImageUrl } : recipe;

    if (recipeId === "new") {
      callApi("/recipes", "POST", undefined, payload).then(() => navigate("/recipes")).catch(console.error);
    } else {
      callApi(`/recipes/${recipeId}`, "PUT", undefined, payload)
        .then(() => {
          if (oldImageUrl && newImageUrl && oldImageUrl !== newImageUrl) {
            callApi(`/uploads?file_url=${oldImageUrl}`, "DELETE").then(() => navigate("/recipes")).catch(console.error);
          } else navigate("/recipes");
        })
        .catch(console.error);
    }
  }

  const handleDelete: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    if (recipeId && recipeId !== "new") {
      const oldImageUrl = recipe.image_url;
      callApi(`/recipes/${recipeId}`, "DELETE")
        .then(() => {
          if (oldImageUrl) callApi(`/uploads?file_url=${oldImageUrl}`, "DELETE").catch(console.error);
        })
        .catch(console.error);
      navigate("/recipes");
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await callApi<{ file_url: string }>(`/uploads`, 'POST', undefined, formData);
      const fileUrl = res?.data?.file_url ?? null;
      if (fileUrl) setRecipe((prev) => ({ ...prev, image_url: fileUrl }));
      return fileUrl;
    } catch (error) {
      console.error("Upload failed. If file > 1MB, check back-end/nginx limits.", error);
      throw error; 
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Heading title={recipeId === "new" ? t("new_recipe") : `${recipe.title}`}>
        {recipeId !== "new" && !isEditing && recipe.author_id && user && user.id === recipe.author_id && (
          <Button onClick={() => setIsEditing(true)} className="px-3 py-1" variant="border">Edit</Button>
        )}
      </Heading>

      {isEditing ? (
        <Card>
          <Form onSubmit={handleSubmitEvent}>
            <ImageUploader
              initialImageUrl={recipe.image_url ? getApiUrl(recipe.image_url) : undefined}
              placeholderImageUrl={"/assets/placeholder_recipe.png"}
              uploadImage={setImageFile}
              isUploading={isUploading}
            />
            <Input name="title" label={t("title")} placeholder={t("title")} autoComplete="off" onChange={handleInput} value={recipe.title || ""} />
            <TagInput label="Tags" placeholder="breakfast, batch-cooking..." tags={recipe.tags || []} suggestions={allTags} onChange={(newTags) => setRecipe(prev => ({ ...prev, tags: newTags }))} className="mb-2" />
            
            <div className="label mt-4">Ingredients</div>
            <StackedList emptyMessage="No ingredients added yet.">
              {recipe.ingredients && recipe.ingredients.map((ingredient, index) => (
                <Ingredient data={ingredient} key={ingredient.id ?? index} index={index} onSave={addOrUpdateIngredient} onDelete={deleteIngredient} names={ingredientNames} />
              ))}
              <Ingredient key="__add" onSave={addOrUpdateIngredient} names={ingredientNames} />
            </StackedList>

            <Textarea name="description" label={t("description")} placeholder="General cooking steps..." value={recipe.description || ""} onChange={handleInput} markdown />

            {/* Frozen Storage Section in Editor */}
            <div className="grid md:grid-cols-2 gap-4 border-t pt-4 mt-4">
              <Textarea name="freezing_instructions" label="Freezing Instructions" placeholder="How to freeze safely..." value={recipe.freezing_instructions || ""} onChange={handleInput} markdown />
              <Textarea name="unfreezing_instructions" label="Unfreezing & Reheating" placeholder="How to thaw and reheat..." value={recipe.unfreezing_instructions || ""} onChange={handleInput} markdown />
            </div>

            <div className="flex gap-2 mt-6">
                {(recipeId && recipeId !== "new") && <Button type="button" color_name="danger" onClick={handleDelete}>{t("delete_recipe")}</Button>}
                <Button type="submit" disabled={isUploading}>{t("save_recipe")}</Button>
            </div>
          </Form>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-4">
            {(recipe.tags || []).length > 0 && (
              <div className="mb-4 flex gap-2">
                {(recipe.tags || []).map(tg => (
                  <span key={tg} className="bg-surface-panel dark:bg-surface-panel-dark border rounded px-2 py-1 text-xs font-medium">{tg}</span>
                ))}
              </div>
            )}
            
            {recipe.image_url && <img src={getApiUrl(recipe.image_url)} alt={recipe.title} className="w-full max-h-96 object-cover rounded-lg mb-6 shadow-sm" />}
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <h3 className="font-bold text-lg mb-4 underline decoration-primary underline-offset-4">Ingredients</h3>
                <ul className="space-y-2">
                  {(recipe.ingredients || []).map((ing) => (
                    <li key={ing.id} className="text-sm border-b border-border/50 pb-1">
                      <span className="font-medium">{ing.name}</span>
                      {ing.quantity ? <span className="text-text-secondary ml-1">— {formatQtyUnit(ing.quantity, ing.unit)}</span> : ''}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="md:col-span-2 space-y-6">
                <div>
                    <h3 className="font-bold text-lg mb-2">Instructions</h3>
                    <div className="markdown prose dark:prose-invert max-w-none">
                        <ReactMarkdown>{recipe.description || ''}</ReactMarkdown>
                    </div>
                </div>

                {/* Display Frozen Storage Info */}
                {(recipe.freezing_instructions || recipe.unfreezing_instructions) && (
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
                    <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <h3 className="font-bold text-blue-800 dark:text-blue-300">Frozen Storage Guide</h3>
                    </div>
                    <div className="p-4 grid md:grid-cols-2 gap-6">
                        {recipe.freezing_instructions && (
                            <div>
                                <h4 className="text-xs font-bold uppercase text-blue-600 mb-2">Freezing</h4>
                                <div className="markdown prose prose-sm dark:prose-invert"><ReactMarkdown>{recipe.freezing_instructions}</ReactMarkdown></div>
                            </div>
                        )}
                        {recipe.unfreezing_instructions && (
                            <div>
                                <h4 className="text-xs font-bold uppercase text-blue-600 mb-2">Unfreezing & Reheating</h4>
                                <div className="markdown prose prose-sm dark:prose-invert"><ReactMarkdown>{recipe.unfreezing_instructions}</ReactMarkdown></div>
                            </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Review & Plan sections remain the same... */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Community Reviews</h3>
                {user && <Button onClick={() => setPlanning(true)} size="small">Plan this recipe</Button>}
            </div>
            {/* ... Review logic ... */}
            <ReviewForm recipeId={recipeId!} onAdded={(rev) => setRecipe((prev) => ({ ...prev, reviews: [...(prev.reviews || []), rev] }))} />
            <PlanModal open={planning} onClose={() => setPlanning(false)} recipeId={recipeId!} recipeTitle={recipe.title || ''} onPlanned={() => { callApi<Meal[]>(`/meals`).then(r => setUserMeals(r.data || [])); setPlanning(false); }} />
          </Card>
        </div>
      )}
    </>
  );
}

const Ingredient = ({ data, index, onSave, onDelete, names }: { data?: IIngredient, index?: number, onSave?: (ing: IIngredient, index?: number) => void, onDelete?: (index: number) => void, names?: string[] }) => {
  const [open, setOpen] = useState(false)
  const [ingredient, setIngredient] = useState<IIngredient>(data || { id: "", name: "", quantity: 0, unit: 'g' });
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [focused, setFocused] = useState<number>(-1)
  const { t } = useTranslation("translation", { keyPrefix: "pages.recipe" });

  useEffect(() => {
    if (data) setIngredient(data);
  }, [data]);

  // update suggestions when name changes
  useEffect(() => {
    const q = (ingredient?.name || "").trim().toLowerCase();
    if (!q || !names || names.length === 0) {
      setSuggestions([])
      setFocused(-1)
      return
    }
    // prioritize startsWith, then includes
    const starts = names.filter(n => n.toLowerCase().startsWith(q))
    const includes = names.filter(n => !n.toLowerCase().startsWith(q) && n.toLowerCase().includes(q))
    const merged = [...starts, ...includes].slice(0, 8)
    setSuggestions(merged)
    setFocused(merged.length ? 0 : -1)
  }, [ingredient?.name, names])

  const handleInput = (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setIngredient((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }))
  }

  const pickSuggestion = (s: string) => {
    setIngredient((prev) => ({ ...prev, name: s }))
    setSuggestions([])
    setFocused(-1)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused((f) => Math.min(suggestions.length - 1, f + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused((f) => Math.max(0, f - 1))
    } else if (e.key === 'Enter') {
      if (focused >= 0 && focused < suggestions.length) {
        e.preventDefault();
        pickSuggestion(suggestions[focused])
      }
    } else if (e.key === 'Escape') {
      setSuggestions([])
      setFocused(-1)
    }
  }

  const handleSubmit: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    const wasNew = data === undefined;
    if (onSave) onSave(ingredient, index);
    if (wasNew) setIngredient({ id: "", name: "", quantity: 0, unit: 'g' });
    setOpen(false);
  }

  const handleDelete = () => {
    if (typeof index === "number" && onDelete) onDelete(index);
    setOpen(false);
  }

  const unitOptions = [{value: 'g', label: 'g'}, {value: 'kg', label: 'kg'}, {value: 'ml', label: 'ml'}, {value: 'l', label: 'l'}, {value: 'tbsp', label: 'tbsp'}, {value: 'tsp', label: 'tsp'}, {value: 'cup', label: 'cup'}, {value: 'pc', label: 'pc'}, {value: '', label: '(none)'}];

  return (
    <div>
      {ingredient?.name ? <Button type="button" onClick={() => setOpen(true)}>{ingredient.name} {ingredient.quantity ? `(${formatQtyUnit(ingredient.quantity, ingredient.unit)})` : ""}</Button>
        : <Button type="button" onClick={() => setOpen(true)} className="border-2 border-dashed border-gray-300 dark:border-gray-600 dark:text-white bg-transparent text-center cursor-pointer">{t("add_ingredient")}</Button>}
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="relative">
          <Input
            label={t("add_ingredient")}
            value={ingredient?.name || ""}
            name="name"
            onChange={handleInput}
            onKeyDown={onKeyDown}
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto bg-white dark:bg-gray-800 border rounded shadow-sm">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  className={`w-full text-left p-2 ${i === focused ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                  onMouseDown={(ev) => { ev.preventDefault(); pickSuggestion(s); }}
                  onMouseEnter={() => setFocused(i)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          label={t("add_quantity")}
          value={ingredient?.quantity || 0}
          type="number"
          rightIcon={ingredient?.unit || 'g'}
          name="quantity"
          onChange={handleInput}
        />
        <div className="my-2 mb-4">
          <Select
            label="Unit"
            options={unitOptions}
            value={unitOptions.find(u => u.label === (ingredient?.unit || ''))?.value || ''}
            onChange={(e) => setIngredient((prev) => ({ ...prev, unit: e.toString() }))}
          />
        </div>
        {ingredient?.id && <Button type="button" color_name="danger" onClick={handleDelete}>{t("delete_ingredient")}</Button>}
        <Button type="button" onClick={handleSubmit}>{t("save_ingredient")}</Button>
      </Modal>
    </div>
  )
}

const ReviewForm = ({ recipeId, onAdded }: { recipeId: string, onAdded: (rev: IReview) => void }) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  if (!user) return <div className="mt-4 text-sm text-gray-600">Please log in to leave a review.</div>;

  const submit = async () => {
    if (!recipeId) return;
    setLoading(true);
    try {
      const res = await callApi<IReview>(`/recipes/${recipeId}/reviews`, 'POST', undefined, { rating, comment });
      onAdded(res.data);
      setRating(5);
      setComment('');
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2 items-center">
        <label className="text-sm">Rating</label>
        <Select
          label="Rating"
          options={[5,4,3,2,1].map(v => ({ value: v, label: `${v} star${v > 1 ? 's' : ''}` }) )}
          value={rating}
          onChange={(e) => setRating(Number(e))}
        />
      </div>
      <div className="mt-2">
        <label className="block text-sm">Comment</label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded border mt-1 p-2" rows={3} />
      </div>
      <div className="mt-2">
        <Button onClick={submit} disabled={loading} className="px-3 py-1">Submit review</Button>
      </div>
    </div>
  )
}

const PlanModal = ({ open, onClose, recipeId, recipeTitle, onPlanned }: { open: boolean, onClose: () => void, recipeId: string, recipeTitle: string, onPlanned: (meal: Meal) => void }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [servings, setServings] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const entry = { recipe_id: recipeId, title: recipeTitle, servings };
      const res = await callApi<Meal>(`/meals/plan`, 'POST', undefined, { date, entry });
      onPlanned(res.data);
    } catch (err) {
      console.error('Failed to plan recipe', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div>
        <h3 className="text-lg font-medium">Plan {recipeTitle}</h3>
        <div className="mt-2">
          <label className="block text-sm">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded border px-2 py-1" />
        </div>
        <div className="mt-2">
          <label className="block text-sm">Servings</label>
          <input type="number" value={servings} min={1} onChange={(e) => setServings(Number(e.target.value))} className="mt-1 rounded border px-2 py-1" />
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={submit} disabled={loading}>Plan</Button>
          <Button onClick={onClose} className="bg-gray-200">Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}