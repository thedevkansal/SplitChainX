import { z } from 'zod';

export const KNOWN_ERRORS = {
  INVALID_EXPENSES: 'INVALID_EXPENSES',
  NO_SETTLEMENTS_NEEDED: 'NO_SETTLEMENTS_NEEDED',
} as const;

/**
 * Ability parameters schema
 */
export const abilityParamsSchema = z.object({
  groupId: z.string().min(1, 'Group ID is required'),
  expenses: z
    .array(
      z.object({
        paidBy: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid payer address'),
        amount: z.string().regex(/^\d+$/, 'Amount must be a positive integer in token units'),
        splitBetween: z
          .array(z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid participant address'))
          .min(1, 'At least one participant required'),
      }),
    )
    .min(1, 'At least one expense required'),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address'),
  tokenDecimals: z.number().int().min(0).max(18, 'Token decimals must be between 0 and 18'),
});

/**
 * Precheck success result schema
 */
export const precheckSuccessSchema = z.object({
  settlementsCount: z.number(),
  originalExpensesCount: z.number(),
  transactionsSaved: z.number(),
  gasSavingsPercent: z.string(),
});

/**
 * Precheck failure result schema
 */
export const precheckFailSchema = z.object({
  reason: z.union([
    z.literal(KNOWN_ERRORS['INVALID_EXPENSES']),
    z.literal(KNOWN_ERRORS['NO_SETTLEMENTS_NEEDED']),
  ]),
  error: z.string(),
});

/**
 * Execute success result schema
 */
export const executeSuccessSchema = z.object({
  success: z.literal(true),
  groupId: z.string(),
  settlements: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      amount: z.string(),
      amountFormatted: z.string(),
    }),
  ),
  metrics: z.object({
    originalExpenses: z.number(),
    optimizedSettlements: z.number(),
    transactionsSaved: z.number(),
    gasSavingsPercent: z.string(),
  }),
  message: z.string(),
});

/**
 * Execute failure result schema
 */
export const executeFailSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

// Type exports
export type AbilityParams = z.infer<typeof abilityParamsSchema>;
export type PrecheckSuccess = z.infer<typeof precheckSuccessSchema>;
export type PrecheckFail = z.infer<typeof precheckFailSchema>;
export type ExecuteSuccess = z.infer<typeof executeSuccessSchema>;
export type ExecuteFail = z.infer<typeof executeFailSchema>;
