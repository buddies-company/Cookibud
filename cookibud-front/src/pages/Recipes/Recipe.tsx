import { Container, Heading, Card, Form, Input, Button, Textarea, StackedList, Modal } from "@soilhat/react-components";
import { useEffect, useState, type ChangeEvent, type FormEvent, type MouseEventHandler, type KeyboardEvent } from "react";
import { callApi } from "../../services/api";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface IIngredient { quantity: number, name: string, id:string }

interface IRecipe {
  id?: string;
  title?: string;
  description?: string;
  ingredients?: IIngredient[];
}

export default function Recipe() {
  const [recipe, setRecipe] = useState<IRecipe>({});
  const [ingredientNames, setIngredientNames] = useState<string[]>([]);
  const { recipeId } = useParams();
  const { t } = useTranslation("translation", { keyPrefix: "pages.recipe" });
  const navigate = useNavigate();

  useEffect(() => {
    if (recipeId && recipeId != "new") {
      callApi(`/recipes/${recipeId}`)
        .then((res) => setRecipe(res.data))
        .catch((error) => console.error("Error fetching recipe:", error));
    }
    // fetch existing ingredient names for datalist
    callApi(`/recipes/ingredient-names`)
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
      const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
      const withId = { ...ing, id: ing.id || genId() };
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

  const handleSubmitEvent = (e: FormEvent) => {
    e.preventDefault();
    const payload = recipe;
    if (recipeId === "new") {
      callApi("/recipes", "POST", undefined, payload)
        .then(() => navigate("/recipes"))
        .catch(console.error);
    } else {
      callApi(`/recipes/${recipeId}`, "PUT", undefined, payload)
        .then(() => navigate("/recipes"))
        .catch(console.error);
    }
  }

  const handleDelete: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    if (recipeId && recipeId != "new") {
      callApi(`/recipes/${recipeId}`, "DELETE")
        .then(() => navigate("/recipes"))
        .catch(console.error);
    }
  }

  return (
    <Container>
      <Heading title={recipeId === "new" ? t("new_recipe") : `${recipe.title}`} />
      <Card>
        <Form onSubmit={handleSubmitEvent}>
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
            placeholder={t("description")}
            value={recipe.description || ""}
            onChange={handleInput}
            markdown
          />
          {(recipeId && recipeId != "new")&& <Button type="button" className="bg-red-500" onClick={handleDelete}>{t("delete_recipe")}</Button>}
          <Button type="submit">{t("save_recipe")}</Button>
        </Form>
      </Card>
    </Container>
  );
}

const Ingredient = ({ data, index, onSave, onDelete, names }: { data?: IIngredient, index?: number, onSave?: (ing:IIngredient, index?:number)=>void, onDelete?: (index:number)=>void, names?: string[] }) => {
  const [open, setOpen] = useState(false)
  const [ingredient, setIngredient] = useState<IIngredient>(data || { id: "", name: "", quantity: 0 });
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
      [name]: type==="number" ? Number(value):value,
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
    if (wasNew) setIngredient({ id: "", name: "", quantity: 0 });
    setOpen(false);
  }

  const handleDelete = () => {
    if (typeof index === "number" && onDelete) onDelete(index);
    setOpen(false);
  }

  return (
    <div>
      {ingredient?.name ? <Button type="button" onClick={() => setOpen(true)}>{ingredient.name} {ingredient.quantity ? `(${ingredient.quantity}g)` : ""}</Button>
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
            rightIcon="g"
            name="quantity"
            onChange={handleInput}
          />
          {ingredient?.id && <Button type="button" className="bg-red-500" onClick={handleDelete}>{t("delete_ingredient")}</Button>}
          <Button type="button" onClick={handleSubmit}>{t("save_ingredient")}</Button>
      </Modal>
    </div>
  )
}