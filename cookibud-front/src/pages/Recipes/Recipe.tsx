import { Container, Heading, Card, Form, Input, Button, Textarea, StackedList, Modal, ImageUploader } from "@soilhat/react-components";
import { useEffect, useState, type ChangeEvent, type FormEvent, type MouseEventHandler, type KeyboardEvent } from "react";
import ReactMarkdown from 'react-markdown';
import { useAuth } from "../../routing/AuthProvider";
import { callApi, getApiUrl } from "../../services/api";
import { formatQtyUnit } from "../../utils/quantities";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { IRecipe, IIngredient } from "./types";


export default function Recipe() {
  const [recipe, setRecipe] = useState<IRecipe>({});
  const [ingredientNames, setIngredientNames] = useState<string[]>([]);
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { recipeId } = useParams();
  const [isEditing, setIsEditing] = useState<boolean>(() => (recipeId === 'new'));
  const { t } = useTranslation("translation", { keyPrefix: "pages.recipe" });
  const navigate = useNavigate();

  useEffect(() => {
    if (recipeId && recipeId != "new") {
      callApi<IRecipe>(`/recipes/${recipeId}`)
        .then((res) => { setRecipe(res.data); setIsEditing(false); })
        .catch((error) => console.error("Error fetching recipe:", error));
    }
    // fetch existing ingredient names for datalist
    callApi<string[]>(`/recipes/ingredient-names`)
      .then((res) => setIngredientNames(res.data || []))
      .catch(() => setIngredientNames([]));
  }, [recipeId]);

  const handleInput = (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecipe((prev) => ({
      ...prev,
      [name]: value,
    }))
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
    // If there is a new image file selected, upload it and get the new URL
    let newImageUrl: string | null = null;
    if (imageFile) newImageUrl = await uploadImage(imageFile);

    // Build payload deterministically using the new image URL when present
    const payload = newImageUrl ? { ...recipe, image_url: newImageUrl } : recipe;

    if (recipeId === "new") {
      callApi("/recipes", "POST", undefined, payload)
        .then(() => navigate("/recipes"))
        .catch(console.error);
    } else {
      callApi(`/recipes/${recipeId}`, "PUT", undefined, payload)
        .then(() => {
          // Only delete the old image if we replaced it with a different one
          if (oldImageUrl && newImageUrl && oldImageUrl !== newImageUrl) {
            callApi(`/uploads?file_url=${oldImageUrl}`, "DELETE")
              .then(() => navigate("/recipes"))
              .catch(console.error);
          } else navigate("/recipes");
        })
        .catch(console.error);
    }
  }

  const handleDelete: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    if (recipeId && recipeId != "new") {
      const oldImageUrl = recipe.image_url;
      callApi(`/recipes/${recipeId}`, "DELETE")
        .then(() => {
          if (oldImageUrl) callApi(`/uploads?file_url=${oldImageUrl}`, "DELETE")
            .catch(console.error);
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
      const res = await callApi<{file_url:string}>(`/uploads`, 'POST', undefined, formData);
      const fileUrl = res?.data?.file_url ?? null;
      if (fileUrl) {
        setRecipe((prev) => ({ ...prev, image_url: fileUrl }));
      }
      return fileUrl;
    } catch (error) {
      console.error("Failed to upload image:", error);
      throw error; // Propagate the error to prevent saving the recipe
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Container>
      <Heading title={recipeId === "new" ? t("new_recipe") : `${recipe.title}`}>
        {recipeId !== "new" && !isEditing && recipe.author_id && user && user.id === recipe.author_id && (
          <Button onClick={() => setIsEditing(true)} className="px-3 py-1">Edit</Button>
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
            <Input
              name="title"
              type="string"
              label={t("title")}
              placeholder={t("title")}
              autoComplete="off"
              onChange={handleInput}
              size="md"
              variant="outline"
              value={recipe.title || ""}
            />
            <div className="label">Ingredients</div>
            <StackedList emptyMessage="No ingredients added yet.">
              {recipe.ingredients && recipe.ingredients.length > 0 && recipe.ingredients.map((ingredient, index) => {
                return <Ingredient data={ingredient} key={ingredient.id ?? index} index={index} onSave={addOrUpdateIngredient} onDelete={deleteIngredient} names={ingredientNames} />
              })}
              {/* Ingredient without data is used to add new ingredient */}
              <Ingredient key="__add" onSave={addOrUpdateIngredient} names={ingredientNames} />
            </StackedList>
            <Textarea
              name="description"
              label={t("description")}
              placeholder={recipe.description || t("description")}
              value={recipe.description || ""}
              onChange={handleInput}
              markdown
            />
            {(recipeId && recipeId != "new") && <Button type="button" className="bg-red-500" onClick={handleDelete}>{t("delete_recipe")}</Button>}
            <Button type="submit">{t("save_recipe")}</Button>
          </Form>
        </Card>
      ) : (
        <>
          <Card className="p-4">
            {recipe.image_url && <img src={getApiUrl(recipe.image_url)} alt={recipe.title} className="w-full max-h-72 object-cover rounded mb-4" />}
            <div className="mb-3">
              <strong>Ingredients</strong>
              <ul className="list-disc ml-5 mt-2">
                {(recipe.ingredients || []).map((ing) => (
                  <li key={ing.id}>{ing.name}{ing.quantity ? ` — ${formatQtyUnit(ing.quantity, ing.unit)}` : ''}</li>
                ))}
              </ul>
            </div>
            <div className="markdown mb-3"><ReactMarkdown>{recipe.description || ''}</ReactMarkdown></div>
          </Card>

          <Card className="p-4 mt-4">
            <h3 className="text-lg font-medium">Reviews</h3>
            <div className="mt-3 space-y-3">
              {(recipe.reviews || []).length === 0 && <div className="text-sm text-gray-600">No reviews yet.</div>}
              {(recipe.reviews || []).map((r) => (
                <div key={r.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.username || 'User'}</div>
                    <div className="text-sm text-gray-600">{new Date(r.created_at || '').toLocaleString()}</div>
                  </div>
                  <div className="mt-1">{Array.from({length: r.rating}).map(() => '★').join('')} {r.rating}/5</div>
                  {r.comment && <div className="mt-2">{r.comment}</div>}
                </div>
              ))}
            </div>

            <ReviewForm recipeId={recipeId!} onAdded={(rev) => setRecipe((prev) => ({ ...prev, reviews: [...(prev.reviews || []), rev] }))} />
          </Card>
        </>
      )}
    </Container>
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
        <div className="mt-2">
          <label htmlFor={`ing-unit-${index ?? '__new'}`} className="block text-sm">Unit</label>
          <select
            id={`ing-unit-${index ?? '__new'}`}
            value={ingredient?.unit || ''}
            name="unit"
            onChange={(e) => setIngredient((prev) => ({ ...prev, unit: e.target.value }))}
            className="mt-1 w-full rounded border px-2 py-1"
          >
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="ml">ml</option>
            <option value="l">l</option>
            <option value="tbsp">tbsp</option>
            <option value="tsp">tsp</option>
            <option value="cup">cup</option>
            <option value="pc">pc</option>
            <option value="">(none)</option>
          </select>
        </div>
        {ingredient?.id && <Button type="button" className="bg-danger dark:bg-danger-dark" onClick={handleDelete}>{t("delete_ingredient")}</Button>}
        <Button type="button" onClick={handleSubmit}>{t("save_ingredient")}</Button>
      </Modal>
    </div>
  )
}

const ReviewForm = ({ recipeId, onAdded }: { recipeId: string, onAdded: (rev: any) => void }) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  if (!user) return <div className="mt-4 text-sm text-gray-600">Please log in to leave a review.</div>;

  const submit = async () => {
    if (!recipeId) return;
    setLoading(true);
    try {
      const res = await callApi<any>(`/recipes/${recipeId}/reviews`, 'POST', undefined, { rating, comment });
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
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="rounded border px-2 py-1">
          {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} star{v>1?'s':''}</option>)}
        </select>
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