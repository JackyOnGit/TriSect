import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Expense } from '../types';

export const createExpense = async (
  tripId: string,
  description: string,
  amount: number,
  category: 'Food' | 'Accommodation' | 'Transport' | 'Activities' | 'Other',
  paidBy: string,
  splitAmong: string[],
  date: Date,
  customSplit?: Record<string, number> | null
): Promise<string> => {
  const expense: Record<string, unknown> = {
    description,
    amount,
    category,
    paidBy,
    splitAmong,
    date: Timestamp.fromDate(date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (customSplit !== undefined) {
    expense.customSplit = customSplit;
  }

  const docRef = await addDoc(collection(db, 'trips', tripId, 'expenses'), expense);
  return docRef.id;
};

export const addExpense = createExpense;

export const getExpense = async (tripId: string, expenseId: string): Promise<Expense | null> => {
  const expenseRef = doc(db, 'trips', tripId, 'expenses', expenseId);
  const expenseSnap = await getDoc(expenseRef);

  if (!expenseSnap.exists()) {
    return null;
  }

  const data = expenseSnap.data();
  return {
    id: expenseSnap.id,
    description: data.description,
    amount: data.amount,
    category: data.category,
    paidBy: data.paidBy,
    splitAmong: data.splitAmong,
    customSplit: data.customSplit ?? null,
    date: data.date.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
};

export const getTripExpenses = async (tripId: string): Promise<Expense[]> => {
  const querySnapshot = await getDocs(collection(db, 'trips', tripId, 'expenses'));

  const expenses: Expense[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    expenses.push({
      id: doc.id,
      description: data.description,
      amount: data.amount,
      category: data.category,
      paidBy: data.paidBy,
      splitAmong: data.splitAmong,
      customSplit: data.customSplit ?? null,
      date: data.date.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    });
  });

  return expenses;
};

export const deleteExpense = async (tripId: string, expenseId: string): Promise<void> => {
  await deleteDoc(doc(db, 'trips', tripId, 'expenses', expenseId));
};

export function updateExpense(
  tripId: string,
  expenseId: string,
  data: Expense
): Promise<void>;
export function updateExpense(
  tripId: string,
  expenseId: string,
  data: Partial<Expense>
): Promise<void>;
export async function updateExpense(
  tripId: string,
  expenseId: string,
  updates: Partial<Expense>
): Promise<void> {
  const expenseRef = doc(db, 'trips', tripId, 'expenses', expenseId);
  const payload: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (updates.description !== undefined) {
    payload.description = updates.description;
  }
  if (updates.amount !== undefined) {
    payload.amount = updates.amount;
  }
  if (updates.category !== undefined) {
    payload.category = updates.category;
  }
  if (updates.paidBy !== undefined) {
    payload.paidBy = updates.paidBy;
  }
  if (updates.splitAmong !== undefined) {
    payload.splitAmong = updates.splitAmong;
  }
  if (updates.customSplit !== undefined) {
    payload.customSplit = updates.customSplit;
  }
  if (updates.date !== undefined) {
    payload.date = Timestamp.fromDate(updates.date);
  }

  await updateDoc(expenseRef, payload);
}
