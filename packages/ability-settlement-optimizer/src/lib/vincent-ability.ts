import {
  createVincentAbility,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';

import type {AbilityParams} from './schemas';

import {
  abilityParamsSchema,
  precheckSuccessSchema,
  precheckFailSchema,
  executeSuccessSchema,
  executeFailSchema,
  KNOWN_ERRORS
  
} from './schemas';

interface Settlement {
  from: string;
  to: string;
  amount: string;
}

/**
 * Smart Settlement Optimizer Ability
 */
export const settlementOptimizerAbility = createVincentAbility({
  packageName: '@splitchainx/ability-settlement-optimizer' as const,
  abilityParamsSchema: abilityParamsSchema,
  abilityDescription:
    'Optimizes group expense settlements by minimizing transactions through debt simplification',
  supportedPolicies: supportedPoliciesForAbility([]),

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  /**
   * Pre-execution checks
   */
  precheck: async ({ abilityParams }, { fail, succeed }) => {
    try {
      const inputs = abilityParams;

      if (!inputs.expenses || inputs.expenses.length === 0) {
        return fail({
          reason: KNOWN_ERRORS.INVALID_EXPENSES,
          error: 'No expenses provided',
        });
      }

      const settlements = calculateOptimalSettlements(inputs.expenses, inputs.tokenDecimals);

      if (settlements.length === 0) {
        return fail({
          reason: KNOWN_ERRORS.NO_SETTLEMENTS_NEEDED,
          error: 'All balances are already settled',
        });
      }

      const transactionsSaved = inputs.expenses.length - settlements.length;
      const gasSavings = ((transactionsSaved / inputs.expenses.length) * 100).toFixed(1);

      console.log(
        `✅ Pre-check: ${inputs.expenses.length} expenses → ${settlements.length} settlements`,
      );

      return succeed({
        settlementsCount: settlements.length,
        originalExpensesCount: inputs.expenses.length,
        transactionsSaved,
        gasSavingsPercent: `${gasSavings}%`,
      });
    } catch (error: any) {
      return fail({
        reason: KNOWN_ERRORS.INVALID_EXPENSES,
        error: error.message || 'Unknown precheck error',
      });
    }
  },

  /**
   * Main execution
   */
  execute: async ({ abilityParams }, { succeed, fail }) => {
    try {
      const inputs = abilityParams;

      console.log(`🚀 Optimizing settlements for group: ${inputs.groupId}`);

      const settlements = calculateOptimalSettlements(inputs.expenses, inputs.tokenDecimals);

      const settlementDetails = settlements.map((s) => ({
        from: s.from,
        to: s.to,
        amount: s.amount,
        amountFormatted: formatTokenAmount(s.amount, inputs.tokenDecimals),
      }));

      const transactionsSaved = inputs.expenses.length - settlements.length;
      const gasSavings = ((transactionsSaved / inputs.expenses.length) * 100).toFixed(1);

      console.log(
        `📊 Result: ${inputs.expenses.length} expenses → ${settlements.length} settlements`,
      );

      return succeed({
        success: true,
        groupId: inputs.groupId,
        settlements: settlementDetails,
        metrics: {
          originalExpenses: inputs.expenses.length,
          optimizedSettlements: settlements.length,
          transactionsSaved,
          gasSavingsPercent: `${gasSavings}%`,
        },
        message: `Optimized ${inputs.expenses.length} expenses into ${settlements.length} settlements (${transactionsSaved} tx saved, ${gasSavings}% gas reduction)`,
      });
    } catch (error: any) {
      return fail({
        success: false,
        error: error.message || 'Unknown execution error',
      });
    }
  },
});

/**
 * Debt Simplification Algorithm
 */
function calculateOptimalSettlements(
  expenses: AbilityParams['expenses'],
  decimals: number,
): Settlement[] {
  const balances = new Map<string, number>();

  // Calculate net balances
  expenses.forEach((expense) => {
    const totalAmount = parseFloat(expense.amount);
    const perPersonAmount = totalAmount / expense.splitBetween.length;

    const payerBalance = balances.get(expense.paidBy) || 0;
    balances.set(expense.paidBy, payerBalance + totalAmount);

    expense.splitBetween.forEach((person) => {
      const personBalance = balances.get(person) || 0;
      balances.set(person, personBalance - perPersonAmount);
    });
  });

  // Separate debtors and creditors
  const debtors = Array.from(balances.entries())
    .filter(([_, balance]) => balance < -0.000001)
    .map(([address, balance]) => ({ address, balance: Math.abs(balance) }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = Array.from(balances.entries())
    .filter(([_, balance]) => balance > 0.000001)
    .map(([address, balance]) => ({ address, balance }))
    .sort((a, b) => b.balance - a.balance);

  // Greedy matching
  const settlements: Settlement[] = [];
  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settleAmount = Math.min(debtor.balance, creditor.balance);
    const amountInTokenUnits = Math.floor(settleAmount).toString();

    settlements.push({
      from: debtor.address,
      to: creditor.address,
      amount: amountInTokenUnits,
    });

    debtor.balance -= settleAmount;
    creditor.balance -= settleAmount;

    if (debtor.balance < 0.000001) i++;
    if (creditor.balance < 0.000001) j++;
  }

  return settlements;
}

/**
 * Format token amount
 */
function formatTokenAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount) / Math.pow(10, decimals);
  return num.toFixed(Math.min(decimals, 6));
}

/**
 * Supported policies - currently no policies configured
 */
export const settlementOptimizerPolicies = supportedPoliciesForAbility([]);
