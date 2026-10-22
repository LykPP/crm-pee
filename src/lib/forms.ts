/** Helpers to read and validate form submissions in server actions. */
import { z } from "zod";

export type FormState = { error?: string; ok?: boolean };

/** Empty strings become null so optional columns stay empty. */
export const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const requiredText = (message: string) => z.string().trim().min(1, message);

export const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida")
  .transform((v) => (v === "" ? null : v))
  .optional()
  .transform((v) => v ?? null);

export const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === "" || z.email().safeParse(v).success, "Confira o e-mail")
  .transform((v) => (v === "" ? null : v.toLowerCase()))
  .optional()
  .transform((v) => v ?? null);

export const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "O link deve começar com http:// ou https://")
  .transform((v) => (v === "" ? null : v))
  .optional()
  .transform((v) => v ?? null);

/** Accepts "1.500.000,50" or "1500000.50". */
export const optionalMoney = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const normalized = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
    const n = Number(normalized.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Valor inválido" });
      return z.NEVER;
    }
    return n;
  })
  .optional()
  .transform((v) => v ?? null);

export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

export function parseForm<T extends z.ZodType>(schema: T, form: FormData) {
  const data = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const res = schema.safeParse(data);
  if (res.success) return { data: res.data as z.infer<T>, error: undefined };
  return { data: undefined, error: res.error.issues[0]?.message ?? "Confira os campos." };
}

/** Friendly message for database errors; details go to the server log. */
export function dbError(error: { message: string; code?: string }, fallback: string) {
  console.error(fallback, error);
  if (error.code === "42501" || /row-level security/.test(error.message)) {
    return "Você não tem permissão para fazer isso.";
  }
  return fallback;
}

function toNumber(v: string) {
  const normalized = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  return Number(normalized.replace(/[^\d.-]/g, ""));
}

/** A required number written with comma or dot decimals, within bounds. */
export const numberIn = (label: string, min: number, max = Infinity) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = v === "" ? NaN : toNumber(v);
      if (!Number.isFinite(n) || n < min || n > max) {
        const range = Number.isFinite(max) ? `entre ${min} e ${max}` : `a partir de ${min}`;
        ctx.addIssue({ code: "custom", message: `${label}: informe um número ${range}.` });
        return z.NEVER;
      }
      return n;
    });

/** An optional number; empty or zero means "not informed". */
export const optionalPositive = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = toNumber(v);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Valor inválido" });
      return z.NEVER;
    }
    return n > 0 ? n : null;
  });
