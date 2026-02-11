import { Heading, StackedList, Card, Button, Input, Select, type Option } from "@soilhat/react-components";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { callApi, getApiUrl } from "../../services/api";
import type { IRecipe } from "./types";

export default function Recipes() {
  const navigate = useNavigate();
  
  const [recipes, setRecipes] = useState<IRecipe[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  const [query, setQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const sortOptions = [
    { value: '', label: 'Default'},
    { value: 'title:asc', label: 'Title (A → Z)'},
    { value: 'title:desc', label: 'Title (Z → A)'},
    { value: 'prep_time:asc', label: 'Prep time ↑'},
    { value: 'prep_time:desc', label: 'Prep time ↓'},
  ];
  const [sortValue, setSortValue] = useState<Option>(sortOptions[0]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && recipes.length < total) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, recipes.length, total]);

  // Fetch Tags once
  useEffect(() => {
    callApi<string[]>('/recipes/tags')
      .then((res) => setAvailableTags(res.data || []))
      .catch(() => setAvailableTags([]));
  }, []);

  // Main Data Fetcher
  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      const qs = [];
      if (query) qs.push(`search=${encodeURIComponent(query)}`);
      if (selectedTags.length) qs.push(`tags=${encodeURIComponent(selectedTags.join(','))}`);
      qs.push(`page=${page}`);
      qs.push(`page_size=${pageSize}`);
      
      if (sortValue.value) {
        const [field, dir] = (sortValue.value as string).split(':');
        qs.push(`sort_by=${encodeURIComponent(field)}`);
        qs.push(`sort_dir=${encodeURIComponent(dir)}`);
      }

      const qstr = qs.length ? `?${qs.join('&')}` : '';
      try {
        const r = await callApi<{items: IRecipe[], total: number}>(`/recipes${qstr}`);
        const data = r.data;
        
        // If page is 1, we replace (new search). If > 1, we append (infinite scroll).
        setRecipes(prev => page === 1 ? (data.items || []) : [...prev, ...(data.items || [])]);
        setTotal(data.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(fetchRecipes, page === 1 ? 300 : 0); // Debounce only on new search
    return () => clearTimeout(t);
  }, [query, selectedTags, page, sortValue]);

  // Reset page when filters change
  const handleFilterChange = () => {
    setPage(1);
    setRecipes([]);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Heading title="Recipes">
        <Button onClick={() => navigate("/recipes/new")}>
          New Recipe
        </Button>
      </Heading>

      {/* FILTER BAR - STICKY SEARCH */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md pt-4 pb-2 border-b border-border dark:border-border-dark">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <Input 
                placeholder="Search recipes..." 
                value={query} 
                onChange={(e) => { setQuery(e.target.value); handleFilterChange(); }} 
              />
            </div>
            <div className="w-full md:w-64">
              <Select 
                placeholder="Sort by"
                value={sortValue.value} 
                options={sortOptions} 
                onChange={(v) => { 
                  setSortValue(sortOptions.find(o => o.value === v) || sortOptions[0]); 
                  handleFilterChange(); 
                }}
              />
            </div>
          </div>

          {/* SCROLLABLE TAG BAR - Design fix for many tags */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <span className="text-xs font-bold text-text-secondary uppercase whitespace-nowrap">Tags:</span>
            {availableTags.map(t => {
              const isActive = selectedTags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => {
                    setSelectedTags(prev => isActive ? prev.filter(x => x !== t) : [...prev, t]);
                    handleFilterChange();
                  }}
                  className={`
                    px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border
                    ${isActive 
                      ? 'bg-primary border-primary text-text-on-primary' 
                      : 'bg-surface-panel dark:bg-surface-panel-dark border-border text-text-secondary hover:border-primary/50'}
                  `}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RESULTS LIST */}
      <div className="mt-8">
        <StackedList 
          onEmptyClick={() => navigate("/recipes/new")} 
          emptyMessage={loading ? "Searching..." : "No recipes found matching your criteria."}
        >
            {recipes.map((recipe, index) => (
              <Card 
                key={`${recipe.id}-${index}`} // Using index for safety during rapid scrolls
                className="group cursor-pointer overflow-hidden flex flex-col h-full hover:shadow-xl transition-all border-border/50" 
                onClick={() => navigate(`/recipes/${recipe.id}`)}
              >
                <div className="aspect-video overflow-hidden bg-surface-base">
                  <img 
                    src={recipe.image_url ? getApiUrl(recipe.image_url) : "/assets/placeholder_recipe.png"} 
                    alt={recipe.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    loading="lazy"
                  />
                </div>
                <Card.Body className="flex-1">
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                    {recipe.title}
                  </h3>
                </Card.Body>
                {recipe.tags && (
                   <div className="px-4 pb-4 flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-surface-base dark:bg-surface-base-dark text-text-secondary">
                          #{tag}
                        </span>
                      ))}
                   </div>
                )}
              </Card>
            ))}
        </StackedList>
      </div>

      {/* INFINITE SCROLL TARGET */}
      {recipes.length > 0 && (
        <div ref={lastElementRef} className="py-12 flex justify-center">
          {loading && (
            <div className="flex items-center gap-2 text-primary font-medium">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading more recipes...
            </div>
          )}
          {!loading && recipes.length >= total && total > 0 && (
            <span className="text-text-secondary text-sm italic">You've reached the end of the pantry.</span>
          )}
        </div>
      )}
    </div>
  );
}