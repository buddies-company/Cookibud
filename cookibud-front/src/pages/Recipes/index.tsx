import { Container, Heading, StackedList, Card, Button, Input } from "@soilhat/react-components";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { callApi, getApiUrl } from "../../services/api";
import type { IRecipe } from "./types";

export default function Recipes() {
  const [recipes, setRecipes] = useState<IRecipe[]>([]);
  const [query, setQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const navigate = useNavigate();
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [total, setTotal] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const addRecipe=()=>{
    navigate("/recipes/new")
  }

  useEffect(() => {
    // initial load and tags list
    callApi<string[]>('/recipes/tags')
      .then((res) => setAvailableTags(res.data || []))
      .catch(() => setAvailableTags([]));
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      const qs = [] as string[];
      if (query) qs.push(`search=${encodeURIComponent(query)}`);
      if (selectedTags?.length) qs.push(`tags=${encodeURIComponent(selectedTags.join(','))}`);
      if (page) qs.push(`page=${page}`);
      if (pageSize) qs.push(`page_size=${pageSize}`);
      if (sortBy) qs.push(`sort_by=${encodeURIComponent(sortBy)}`);
      if (sortDir) qs.push(`sort_dir=${encodeURIComponent(sortDir)}`);
      const qstr = qs.length ? `?${qs.join('&')}` : '';
      callApi<{items:IRecipe[], total: number, page: number, page_size: number}>(`/recipes${qstr}`)
        .then(r => {
          const data = r.data;
          setRecipes(data.items || []);
          setTotal(typeof data.total === 'number' ? data.total : null);
        })
        .catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [query, selectedTags, page, pageSize, sortBy, sortDir]);

  return (
    <Container>
      <Heading title="Recipes"><Button onClick={addRecipe}>New Recipe</Button></Heading>
      <div className="mt-4 flex gap-4 items-center">
        <Input placeholder="Search by name or ingredient..." value={query} onChange={(e) => { setQuery((e.target as HTMLInputElement).value); setPage(1); }} />
        <ul className="flex gap-2 flex-wrap" aria-label="Available tags">
          {availableTags.map(t => (
            <button
              key={t}
              aria-pressed={selectedTags.includes(t)}
              aria-label={`Toggle tag ${t}`}
              onClick={() => {
                setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
                setPage(1);
              }}
              className={`px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${selectedTags.includes(t) ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}` }
            >{t}</button>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm mr-2" htmlFor="sort-select">Sort</label>
          <select id="sort-select" value={sortBy ?? ''} onChange={(e) => { const v = e.target.value; if (v) { const [field, dir] = v.split(':'); setSortBy(field); setSortDir((dir as 'asc'|'desc') || 'asc'); } else { setSortBy(null); } setPage(1); }} className="rounded border px-2 py-1">
            <option value="">Default</option>
            <option value="title:asc">Title (A → Z)</option>
            <option value="title:desc">Title (Z → A)</option>
            <option value="prep_time:asc">Prep time ↑</option>
            <option value="prep_time:desc">Prep time ↓</option>
            <option value="cook_time:asc">Cook time ↑</option>
            <option value="cook_time:desc">Cook time ↓</option>
          </select>
        </div>
      </div>

      {total !== null && (
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm">Showing page {page} — total {total} recipes</div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <Button onClick={() => setPage(p => p + 1)} disabled={recipes.length < pageSize}>Next</Button>
            <select value={pageSize} onChange={(e) => { setPageSize(Number((e.target as HTMLSelectElement).value)); setPage(1); }} className="rounded border px-2 py-1">
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>
        </div>
      )}
      <StackedList onEmptyClick={addRecipe} emptyMessage="No recipes found. Click to add a new recipe.">
        {recipes.length>0 && recipes.map((recipe: IRecipe) => (
          <Card className="cursor-pointer" key={recipe.id} onClick={()=> navigate(`/recipes/${recipe.id}`)}>
            <Card.Header>
          <img src={recipe.image_url? getApiUrl(recipe.image_url): "/assets/placeholder_recipe.png"} alt={recipe.title || "Recipe image"} className="w-full h-64 object-contain mb-4 rounded-lg" /></Card.Header>
            <Card.Body>{recipe.title} </Card.Body>
          </Card>
        ))}
      </StackedList>
    </Container>
  );
}