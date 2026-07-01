import { CategoryDistribution, Expense, Participant, Settlement } from '../types';

const normalizeCategoryName = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const isHousingCategory = (value?: string | null) => {
  const normalized = normalizeCategoryName(value);
  return normalized === 'housing' || normalized === 'accommodation';
};

const getCategoryDistributionForExpense = (
  expense: Expense,
  categoryDistributions: CategoryDistribution[]
) => {
  if (expense.categoryId) {
    const byId = categoryDistributions.find((distribution) => distribution.id === expense.categoryId);
    if (byId) {
      return byId;
    }
  }

  return categoryDistributions.find(
    (distribution) =>
      normalizeCategoryName(distribution.category) === normalizeCategoryName(expense.category)
  );
};

/**
 * Compute each participant's share for a single expense.
 * - splitType 'byCategory': distributes based on role weights from the matching
 *   CategoryDistribution, multiplied by nights for Housing expenses.
 * - splitType 'custom': uses the customSplit map directly.
 */
const computeShares = (
  expense: Expense,
  participants: Participant[],
  categoryDistributions: CategoryDistribution[]
): Map<string, number> => {
  const shares = new Map<string, number>();

  if (expense.splitType === 'custom' && expense.customSplit) {
    for (const [participantId, amount] of Object.entries(expense.customSplit)) {
      shares.set(participantId, amount);
    }
    return shares;
  }

  // byCategory — look up the distribution key
  const catDist = getCategoryDistributionForExpense(expense, categoryDistributions);

  if (!catDist || participants.length === 0) {
    // Fallback: equal split among all participants
    const equalShare = participants.length > 0 ? expense.amount / participants.length : 0;
    participants.forEach((p) => shares.set(p.id, equalShare));
    return shares;
  }

  const useNights = isHousingCategory(catDist.category || expense.category);
  let totalWeight = 0;
  const weights = new Map<string, number>();

  participants.forEach((p) => {
    const nights = useNights ? p.nights : 1;
    const weight =
      (p.adult * catDist.adult + p.kid * catDist.kid + p.baby * catDist.baby) * nights;
    weights.set(p.id, weight);
    totalWeight += weight;
  });

  if (totalWeight === 0) {
    // All weights are zero — fall back to equal split
    const equalShare = expense.amount / participants.length;
    participants.forEach((p) => shares.set(p.id, equalShare));
    return shares;
  }

  participants.forEach((p) => {
    const weight = weights.get(p.id) ?? 0;
    shares.set(p.id, (weight / totalWeight) * expense.amount);
  });

  return shares;
};

/**
 * Calculate settlements between trip participants.
 * Returns an array of transactions needed to settle the trip.
 */
export const calculateSettlements = (
  expenses: Expense[],
  participants: Participant[],
  categoryDistributions: CategoryDistribution[]
): Settlement[] => {
  const balances = new Map<string, number>();

  participants.forEach((p) => balances.set(p.id, 0));

  expenses.forEach((expense) => {
    // Credit the payer
    const payerBalance = balances.get(expense.paidByParticipant) ?? 0;
    balances.set(expense.paidByParticipant, payerBalance + expense.amount);

    // Debit each participant by their share
    const shares = computeShares(expense, participants, categoryDistributions);
    shares.forEach((share, participantId) => {
      const current = balances.get(participantId) ?? 0;
      balances.set(participantId, current - share);
    });
  });

  const participantNameById = new Map(participants.map((p) => [p.id, p.name]));

  const debtors = Array.from(balances.entries())
    .filter(([, balance]) => balance < 0)
    .sort((a, b) => a[1] - b[1]); // Most negative first

  const creditors = Array.from(balances.entries())
    .filter(([, balance]) => balance > 0)
    .sort((a, b) => b[1] - a[1]); // Most positive first

  const settlements: Settlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  let debtorRemaining = Math.abs(debtors[debtorIndex]?.[1] ?? 0);
  let creditorRemaining = creditors[creditorIndex]?.[1] ?? 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const settlementAmount = Math.min(debtorRemaining, creditorRemaining);
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    settlements.push({
      from: debtor[0],
      to: creditor[0],
      amount: Math.round(settlementAmount * 100) / 100,
      fromName: participantNameById.get(debtor[0]) ?? 'Unknown',
      toName: participantNameById.get(creditor[0]) ?? 'Unknown',
    });

    debtorRemaining -= settlementAmount;
    creditorRemaining -= settlementAmount;

    if (debtorRemaining === 0) {
      debtorIndex++;
      if (debtorIndex < debtors.length) {
        debtorRemaining = Math.abs(debtors[debtorIndex][1]);
      }
    }

    if (creditorRemaining === 0) {
      creditorIndex++;
      if (creditorIndex < creditors.length) {
        creditorRemaining = creditors[creditorIndex][1];
      }
    }
  }

  return settlements;
};

/**
 * Calculate how much each participant spent vs. should have paid.
 */
export const calculateBalances = (
  expenses: Expense[],
  participants: Participant[],
  categoryDistributions: CategoryDistribution[]
): Map<string, { spent: number; share: number; balance: number }> => {
  const balanceMap = new Map<string, { spent: number; share: number; balance: number }>();

  participants.forEach((p) => {
    balanceMap.set(p.id, { spent: 0, share: 0, balance: 0 });
  });

  expenses.forEach((expense) => {
    // Credit the payer
    const payerBalance = balanceMap.get(expense.paidByParticipant);
    if (!payerBalance) {
      console.warn('Skipping expense with unknown payer in calculateBalances:', expense);
      return;
    }
    payerBalance.spent += expense.amount;

    // Debit each participant their share
    const shares = computeShares(expense, participants, categoryDistributions);
    shares.forEach((share, participantId) => {
      const entry = balanceMap.get(participantId);
      if (!entry) return;
      entry.share += share;
    });
  });

  balanceMap.forEach((balance) => {
    balance.balance = balance.spent - balance.share;
  });

  return balanceMap;
};
