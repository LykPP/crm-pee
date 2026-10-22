import { z } from "zod";

/**
 * Rules of a call for projects (edital), stored as JSON in calls.rules.
 * Every utility and every year changes these values, so they are data and
 * never hard-coded. All sections are optional: a call may be registered
 * before its rules are transcribed.
 */

/** A share of the PEE total, optionally capped at an absolute amount (R$). */
const rubricLimit = z.union([
  z.number().min(0).max(1),
  z.object({ pct: z.number().min(0).max(1), cap: z.number().positive().optional() }).strict(),
]);

export const checklistAppliesTo = z.enum([
  "all",
  "fp",
  "cd",
  "cd_micro_small_business",
  "non_removable_uses",
  "heritage_listed",
  "incentivized_source",
]);

export const documentValidity = z.enum([
  // must be valid on the submission deadline
  "certificate",
  // issued at most 3 months before the submission deadline
  "bill_3_months",
  // issued at most 3 months before the call publication
  "quote_3_months",
  // issued at most 30 days before the submission deadline
  "property_30_days",
]);

export const checklistItem = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    group: z.string(),
    name: z.string(),
    ref: z.string().optional(),
    appliesTo: checklistAppliesTo,
    scope: z.enum(["proposal", "consumer_unit"]),
    hint: z.string().optional(),
    validity: documentValidity.optional(),
    optional: z.boolean().optional(),
  })
  .strict();

export const callRulesSchema = z
  .object({
    typologies: z
      .array(
        z
          .object({
            name: z.string(),
            budget: z.number().nonnegative(),
            min: z.number().nonnegative(),
            max: z.number().nonnegative(),
            modalityNote: z.string().optional(),
          })
          .strict(),
      )
      .optional(),
    maxBcr: z
      .object({
        fp: z.number().positive(),
        cd: z.number().positive(),
        incentivizedOnly: z.number().positive().optional(),
      })
      .strict()
      .optional(),
    discountRate: z.number().min(0).max(1).optional(),
    peakHours: z.string().optional(),
    executionPeriod: z.string().optional(),
    performanceContractReturn: z.string().optional(),
    limits: z
      .object({
        thirdPartyLabor: rubricLimit.optional(),
        diagnosis: rubricLimit.optional(),
        executiveDesign: rubricLimit.optional(),
        management: rubricLimit.optional(),
        finalReport: rubricLimit.optional(),
        measurementVerification: rubricLimit.optional(),
        marketing: rubricLimit.optional(),
        training: rubricLimit.optional(),
      })
      .strict()
      .optional(),
    mop: z.object({ fixed: z.number().nonnegative(), pct: z.number().min(0).max(1) }).strict().optional(),
    /** Fixed accounting and financial audit charged by the utility (Cemig: ET 5.16.1). */
    audit: z.object({ fixed: z.number().nonnegative(), ref: z.string().optional() }).strict().optional(),
    avoidedCosts: z
      .array(
        z
          .object({
            level: z.string(),
            description: z.string().optional(),
            energyCost: z.number().nonnegative(),
            demandCost: z.number().nonnegative(),
          })
          .strict(),
      )
      .optional(),
    checklist: z.array(checklistItem).optional(),
    rules: z.array(z.object({ text: z.string(), ref: z.string().optional() }).strict()).optional(),
    scoring: z
      .array(
        z.object({ item: z.string(), criterion: z.string(), points: z.number() }).strict(),
      )
      .optional(),
    minPhotos: z
      .array(z.object({ stage: z.string(), count: z.number().int().positive() }).strict())
      .optional(),
  })
  .strict()
  .superRefine((rules, ctx) => {
    const ids = new Set<string>();
    rules.checklist?.forEach((item, i) => {
      if (ids.has(item.id)) {
        ctx.addIssue({ code: "custom", path: ["checklist", i, "id"], message: `duplicate id ${item.id}` });
      }
      ids.add(item.id);
    });
    rules.typologies?.forEach((t, i) => {
      if (t.min > t.max) {
        ctx.addIssue({ code: "custom", path: ["typologies", i], message: "min greater than max" });
      }
    });
  });

export type CallRules = z.infer<typeof callRulesSchema>;
export type ChecklistItem = z.infer<typeof checklistItem>;
export type RubricLimit = z.infer<typeof rubricLimit>;
