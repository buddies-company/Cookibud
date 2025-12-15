export function formatQtyUnit(qty?: number, unit?: string) {
  if (qty == null) return '';
  const u = (unit || '').toLowerCase();
  if (u === 'g') {
    if (qty >= 1000) {
      return `${Number((qty / 1000).toFixed(2))} kg`;
    }
    return `${Number(qty.toFixed(2))} g`;
  }
  if (u === 'ml') {
    if (qty >= 1000) {
      return `${Number((qty / 1000).toFixed(2))} l`;
    }
    return `${Number(qty.toFixed(2))} ml`;
  }
  if (u === '') {
    return `${Number(qty.toFixed(0))}`;
  }
  const unitSuffix = u ? ' ' + u : '';
  return `${Number(qty.toFixed(2))}${unitSuffix}`;
}

export function normalizeQtyToBase(qty?: number, unit?: string) {
  if (qty == null) return { qty: undefined as number | undefined, unit: unit || '' };
  const u = (unit || '').trim().toLowerCase();
  const aliases: Record<string, string> = {
    kilogram: 'kg',
    kilograms: 'kg',
    kg: 'kg',
    g: 'g',
    gram: 'g',
    grams: 'g',
    l: 'l',
    liter: 'l',
    litre: 'l',
    ml: 'ml',
    milliliter: 'ml',
    millilitre: 'ml',
    tbsp: 'tbsp',
    tablespoon: 'tbsp',
    tablespoons: 'tbsp',
    tsp: 'tsp',
    teaspoon: 'tsp',
    teaspoons: 'tsp',
    cup: 'cup',
    cups: 'cup',
    pcs: 'pc',
    pc: 'pc',
    piece: 'pc',
    pieces: 'pc',
  };
  const mapped = aliases[u] || u;
  const weight: Record<string, number> = { kg: 1000, g: 1, mg: 0.001 };
  const volume: Record<string, number> = { l: 1000, ml: 1, tbsp: 15, tsp: 5, cup: 240 };
  if (weight[mapped]) {
    return { qty: qty * weight[mapped], unit: 'g' };
  }
  if (volume[mapped]) {
    return { qty: qty * volume[mapped], unit: 'ml' };
  }
  if (mapped === 'pc') {
    return { qty, unit: '' };
  }
  return { qty, unit: mapped };
}
