// Ported verbatim from the original app (UTILITAIRE GLOBAL DE PARSING).
// Handles French number formatting: thousands spaces and decimal comma.
export const safeParseFloat = (val: unknown): number => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;

  let str = val.toString();
  str = str.replace(/\s/g, ""); // remove spaces (incl. non-breaking)
  str = str.replace(",", "."); // comma -> dot

  const result = parseFloat(str);
  return isNaN(result) ? 0 : result;
};

export const formatCurrency = (value: number, currency = "EUR"): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export const formatDateFr = (iso: string | null | undefined): string => {
  if (!iso) return "--/--/----";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--/--/----";
  return d.toLocaleDateString("fr-FR");
};
