/** Number formats used in messages, matching the prototype. */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export const brl = (n: number) => (Number.isFinite(n) ? BRL.format(n) : "—");

export const nf = (n: number, digits = 2) =>
  Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";

/** Short money: "R$ 730 mil", "R$ 2,7 mi". */
export const mi = (n: number) =>
  !Number.isFinite(n)
    ? "—"
    : n >= 1e6
      ? `R$ ${nf(n / 1e6, 1)} mi`
      : n >= 1e3
        ? `R$ ${nf(n / 1e3, 0)} mil`
        : brl(n);
