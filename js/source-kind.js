// Pure helper: maps a data `source.kind` to a short Turkish label. No DOM access here.

const LABELS = {
  official: 'resmî kayıt',
  dataset: 'yayımlanmış veri',
  news: 'haberlerden',
  derived: 'başka fiyatlardan hesaplandı',
};

/** Unknown or missing kinds return "" so the UI can simply hide the label. */
export function sourceKindLabel(kind) {
  return Object.hasOwn(LABELS, kind) ? LABELS[kind] : '';
}
