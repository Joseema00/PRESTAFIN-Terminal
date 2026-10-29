import { z } from "zod";

const holdingSchema = z.object({
  assetId: z.string().min(1).max(160),
  amount: z.number().finite().nonnegative(),
  meta: z
    .object({
      symbol: z.string().min(1).max(64),
      name: z.string().min(1).max(180),
      kind: z.string().min(1).max(80),
      currency: z.string().min(1).max(8),
      isin: z.string().max(32).nullable().optional(),
      cls: z.string().max(40).optional(),
    })
    .optional(),
});

const portfolioSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  origin: z.string().max(160).nullable(),
  isActive: z.boolean(),
  holdings: z.array(holdingSchema).max(500),
});

export const saveWorkspaceSchema = z.object({
  portfolios: z.array(portfolioSchema).max(250).optional(),
  wealth: z
    .object({
      cash: z.number().finite().nonnegative(),
      otherAssets: z.number().finite().nonnegative(),
      monthlyContribution: z.number().finite().nonnegative(),
      settings: z.object({
        contribGrowth: z.number().finite(),
        inflation: z.number().finite(),
        taxRate: z.number().finite(),
        expenses: z.number().finite().nonnegative(),
        share: z.number().finite().min(0).max(1),
        realTerms: z.boolean(),
      }),
    })
    .optional(),
  mortgage: z
    .object({
      id: z.string().uuid().nullable(),
      principal: z.number().finite().nonnegative(),
      rate: z.number().finite().nonnegative(),
      years: z.number().int().min(1).max(100),
      extraMonthly: z.number().finite().nonnegative(),
    })
    .optional(),
});

export const deletePortfolioSchema = z.object({ id: z.string().uuid() });

export const profileSchema = z.object({
  fullName: z.string().trim().max(80).nullable(),
  currency: z.enum(["EUR", "USD", "GBP", "CHF"]),
});

export const preferencesSchema = z.object({
  transactional: z.boolean(),
  newsletter: z.boolean(),
  newsletterFrequency: z.enum(["weekly", "biweekly", "monthly"]),
});