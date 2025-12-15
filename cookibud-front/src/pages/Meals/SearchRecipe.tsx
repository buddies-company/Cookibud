import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@soilhat/react-components';
import { callApi } from '../../services/api';
import type { IRecipe } from '../Recipes/types';

type Props = {
  onSelect: (recipeId: string | undefined, title?: string) => void;
  placeholder?: string;
  allowFreeText?: boolean;
};

export default function SearchRecipe({ onSelect, placeholder = 'Search recipes...', allowFreeText = true }: Readonly<Props>) {
  const [term, setTerm] = useState('');
  const [suggestions, setSuggestions] = useState<IRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uid = useRef(`sr-${Math.random().toString(36).slice(2, 8)}`);

  // debounced search
  useEffect(() => {
    if (!term || term.length < 2) { setSuggestions([]); setFocused(-1); return; }
    setLoading(true);
    const t = setTimeout(() => {
      callApi<IRecipe[]>(`/recipes?search=${encodeURIComponent(term)}`)
        .then(res => setSuggestions(res.data || []))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  const pick = (s: IRecipe) => {
    onSelect(s?.id, s?.title);
    setTerm(s?.title ?? '');
    setSuggestions([]);
    setFocused(-1);
  };

  const acceptFreeText = () => {
    if (!allowFreeText) return;
    if (!term.trim()) return;
    onSelect(undefined, term.trim());
    setSuggestions([]);
    setFocused(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focused >= 0 && suggestions[focused]) pick(suggestions[focused]);
      else acceptFreeText();
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setFocused(-1);
    }
  };

  const listId = `${uid.current}-list`;

  return (
    <div className="w-full relative">
      <input
        id={`${uid.current}-input`}
        ref={inputRef}
        value={term}
        onChange={(e) => { setTerm(e.target.value); setFocused(-1); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-controls={listId}
        aria-activedescendant={focused >= 0 ? `${uid.current}-opt-${focused}` : undefined}
        className="w-full rounded border px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100"
      />

      {loading && <div className="absolute right-2 top-2 text-sm">…</div>}

      {suggestions.length > 0 && (
        <ul id={listId} className="absolute z-20 w-full mt-1 max-h-44 overflow-auto bg-white dark:bg-gray-800 border rounded shadow-sm">
          {suggestions.map((s, i) => {
            const optId = `${uid.current}-opt-${i}`;
            return (
              <li key={s.id ?? `${s.title}-${i}`} className={`${focused === i ? 'bg-gray-100 dark:bg-gray-900' : ''}`}>
                <button
                  id={optId}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm"
                  onMouseEnter={() => setFocused(i)}
                  onMouseLeave={() => setFocused(-1)}
                  onClick={() => pick(s)}
                >
                  {s.title}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2 mt-2">
        <Button type="button" onClick={() => { setTerm(''); setSuggestions([]); setFocused(-1); }} className="px-3 py-1">Clear</Button>
      </div>
    </div>
  );
}
