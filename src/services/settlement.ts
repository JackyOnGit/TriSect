import { Expense, Settlement, TripMember } from '../types';

/**
 * Calculate settlements between trip members
 * Returns an array of transactions needed to settle the trip
 */
export const calculateSettlements = (
  expenses: Expense[],
  members: TripMember[]
): Settlement[] => {
  // Create a map of balances: userId -> amount
  const balances: Map<string, number> = new Map();

  // Initialize balances for all members
  members.forEach((member) => {
    balances.set(member.userId, 0);
  });

  // Calculate balances based on expenses
  expenses.forEach((expense) => {
    // Add to the payer's balance (they paid money out)
    const payerBalance = balances.get(expense.paidBy) || 0;
    balances.set(expense.paidBy, payerBalance + expense.amount);

    // Distribute the expense among split members with distribution key
    const splitCount = expense.splitAmong.length;
    const amountPerPerson = expense.amount / splitCount;

    expense.splitAmong.forEach((userId) => {
      const userBalance = balances.get(userId) || 0;
      balances.set(userId, userBalance - amountPerPerson);
    });
  });

  // Create a map of user info for display
  const userMap = new Map(
    members.map((m) => [m.userId, { displayName: m.displayName, email: m.email }])
  );

  // Generate settlements (who owes whom)
  const settlements: Settlement[] = [];
  const debtors = Array.from(balances.entries())
    .filter(([, balance]) => balance < 0)
    .sort((a, b) => a[1] - b[1]); // Most negative first

  const creditors = Array.from(balances.entries())
    .filter(([, balance]) => balance > 0)
    .sort((a, b) => b[1] - a[1]); // Most positive first

  let debtorIndex = 0;
  let creditorIndex = 0;
  let debtorRemaining = Math.abs(debtors[debtorIndex]?.[1] || 0);
  let creditorRemaining = creditors[creditorIndex]?.[1] || 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const settlementAmount = Math.min(debtorRemaining, creditorRemaining);
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    settlements.push({
      from: debtor[0],
      to: creditor[0],
      amount: Math.round(settlementAmount * 100) / 100,
      fromName: userMap.get(debtor[0])?.displayName || 'Unknown',
      toName: userMap.get(creditor[0])?.displayName || 'Unknown',
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
 * Calculate how much each person spent vs. should have paid
 */
export const calculateBalances = (
  expenses: Expense[],
  members: TripMember[]
): Map<string, { spent: number; share: number; balance: number }> => {
  const balanceMap = new Map<string, { spent: number; share: number; balance: number }>();

  const getOrCreateBalance = (userId: string) => {
    if (!userId) {
      return null;
    }

    let userBalance = balanceMap.get(userId);
    if (!userBalance) {
      userBalance = { spent: 0, share: 0, balance: 0 };
      balanceMap.set(userId, userBalance);
    }

    return userBalance;
  };

  // Initialize for all members
  members.forEach((member) => {
    balanceMap.set(member.userId, { spent: 0, share: 0, balance: 0 });
  });

  // Calculate spent and share for each member
  expenses.forEach((expense) => {
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) {
      return;
    }

    // Add to spent for payer
    const payerBalance = getOrCreateBalance(expense.paidBy);
    if (payerBalance) {
      payerBalance.spent += expense.amount;
    }

    // Add to share for each person in split
    if (!Array.isArray(expense.splitAmong) || expense.splitAmong.length === 0) {
      return;
    }

    const amountPerPerson = expense.amount / expense.splitAmong.length;
    expense.splitAmong.forEach((userId) => {
      const userBalance = getOrCreateBalance(userId);
      if (userBalance) {
        userBalance.share += amountPerPerson;
      }
    });
  });

  // Calculate balance (spent - share)
  balanceMap.forEach((balance) => {
    balance.balance = balance.spent - balance.share;
  });

  return balanceMap;
};
