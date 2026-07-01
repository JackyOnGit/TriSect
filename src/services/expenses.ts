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
  category: string,
  paidByParticipant: string,
  splitType: 'byCategory' | 'custom',
  date: Date,
  categoryId?: string | null,
  customSplit?: Record<string, number> | null
): Promise<string> => {
  const expense: Record<string, unknown> = {
    description,
    amount,
    category,
    paidByParticipant,
    splitType,
    date: Timestamp.fromDate(date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (categoryId != null) {
    expense.categoryId = categoryId;
  }
  if (customSplit != null) {
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
    paidByParticipant: data.paidByParticipant,
    splitType: data.splitType ?? 'custom',
    categoryId: data.categoryId ?? undefined,
    customSplit: data.customSplit ?? null,
    date: data.date.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
};

export const getTripExpenses = async (tripId: string): Promise<Expense[]> => {
  const querySnapshot = await getDocs(collection(db, 'trips', tripId, 'expenses'));

  const expenses: Expense[] = [];
  querySnapshot.forEach((snap) => {
    const data = snap.data();
    expenses.push({
      id: snap.id,
      description: data.description,
      amount: data.amount,
      category: data.category,
      paidByParticipant: data.paidByParticipant,
      splitType: data.splitType ?? 'custom',
      categoryId: data.categoryId ?? undefined,
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
  if (updates.paidByParticipant !== undefined) {
    payload.paidByParticipant = updates.paidByParticipant;
  }
  if (updates.splitType !== undefined) {
    payload.splitType = updates.splitType;
  }
  if (updates.categoryId !== undefined) {
    payload.categoryId = updates.categoryId;
  }
  if (updates.customSplit !== undefined) {
    payload.customSplit = updates.customSplit;
  }
  if (updates.date !== undefined) {
    payload.date = Timestamp.fromDate(updates.date);
  }

  await updateDoc(expenseRef, payload);
}
