import { Container, Heading, StackedList, Card, Button, Input, Select, type Option } from "@soilhat/react-components";
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

  const sortOptions = [
    { value: '', label: 'Default'},
    { value: 'title:asc', label: 'Title (A → Z)'},
    { value: 'title:desc', label: 'Title (Z → A)'},
    { value: 'prep_time:asc', label: 'Prep time ↑'},
    { value: 'prep_time:desc', label: 'Prep time ↓'},
  ];
  const [sortValue, setSortValue] = useState<Option>(sortOptions[0]);

  useEffect(() => {
    callApi<string[]>('/recipes/tags')
      .then((res) => setAvailableTags(res.data || []))
      .catch(() => setAvailableTags([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = [] as string[];
      if (query) qs.push(`search=${encodeURIComponent(query)}`);
      if (selectedTags?.length) qs.push(`tags=${encodeURIComponent(selectedTags.join(','))}`);
      if (page) qs.push(`page=${page}`);
      if (pageSize) qs.push(`page_size=${pageSize}`);
      
      if (sortValue) {
        const [field, dir] = sortValue.label.split(':');
        qs.push(`sort_by=${encodeURIComponent(field)}`);
        qs.push(`sort_dir=${encodeURIComponent(dir)}`);
      }

      const qstr = qs.length ? `?${qs.join('&')}` : '';
      callApi<{items:IRecipe[], total: number, page: number, page_size: number}>(`/recipes${qstr}`)
        .then(r => {
          const data = r.data;
          setRecipes(data.items || []);
          setTotal(data.total ?? null);
        })
        .catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [query, selectedTags, page, pageSize, sortValue]);

  return (
    <Container>
      <Heading title="Recipes">
        <Button onClick={() => navigate("/recipes/new")}>
          New Recipe
        </Button>
      </Heading>

      <div className="mt-6 flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="flex-1 w-full">
          <Input 
            placeholder="Search by name or ingredient..." 
            value={query} 
            onChange={(e) => { setQuery(e.target.value); setPage(1); }} 
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {availableTags.map(t => {
            const isActive = selectedTags.includes(t);
            return (
              <button
                key={t}
                onClick={() => {
                  setSelectedTags(prev => isActive ? prev.filter(x => x !== t) : [...prev, t]);
                  setPage(1);
                }}
                className={`
                  px-3 py-1 rounded-full text-xs font-bold transition-all
                  ${isActive 
                    ? 'bg-primary text-text-on-primary' 
                    : 'bg-surface-base dark:bg-surface-base-dark text-text-secondary hover:bg-surface-panel'}
                `}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="w-full md:w-64">
          <Select 
            label="Sort by"
            value={sortValue?.value} 
            options={sortOptions} 
            onChange={(e) => { setSortValue(sortOptions.find(o => o.value === e) || sortOptions[0]); setPage(1); }}
          />
        </div>
      </div>

      <div className="mt-8">
        <StackedList 
          onEmptyClick={() => navigate("/recipes/new")} 
          emptyMessage="No recipes found. Click to add a new recipe."
        >
          {recipes.map((recipe) => (
            <Card 
              key={recipe.id} 
              className="group cursor-pointer" 
              onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
              <Card.Header>
                <img 
                  src={recipe.image_url ? getApiUrl(recipe.image_url) : "/assets/placeholder_recipe.png"} 
                  alt={recipe.title} 
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              </Card.Header>
              <Card.Body>
                <h3 className="font-bold text-text-primary dark:text-text-primary-dark">
                  {recipe.title}
                </h3>
                <p className="text-sm text-text-secondary line-clamp-2">
                  {recipe.description || "No description available."}
                </p>
              </Card.Body>
            </Card>
          ))}
        </StackedList>
      </div>

      {total !== null && (
        <div className="mt-12 pt-6 border-t border-border dark:border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-secondary">
            Showing page <strong>{page}</strong> — total <strong>{total}</strong> recipes
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button 
                color_name="light" 
                size="small"
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page <= 1}
              >
                Prev
              </Button>
              <Button 
                color_name="light" 
                size="small"
                onClick={() => setPage(p => p + 1)} 
                disabled={recipes.length < pageSize}
              >
                Next
              </Button>
            </div>
            
            <div className="w-24">
              <Select
                value={pageSize.toString()}
                options={[
                  { value: '6', label: '6 / page' },
                  { value: '12', label: '12 / page' },
                  { value: '24', label: '24 / page' },
                ]}
                onChange={(e) => { setPageSize(Number(e)); setPage(1); }}
              />
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}