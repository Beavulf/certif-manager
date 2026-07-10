/** Нормализует ФИО для сравнения: регистр, пробелы, ё/е. */
export function normalizePersonName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ёЁ]/g, 'е')
    .replace(/\s+/g, ' ');
}

export function personNamesMatch(a: string, b: string): boolean {
  return normalizePersonName(a) === normalizePersonName(b);
}

/** Варианты строки для поиска в AD/БД: исходное и с ё→е. */
export function personNameSearchVariants(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const variants = new Set([trimmed]);
  if (/[ёЁ]/.test(trimmed)) {
    variants.add(trimmed.replace(/[ёЁ]/g, 'е'));
  }
  return [...variants];
}
