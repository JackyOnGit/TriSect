import {
  collection,
  addDoc,
  getDocs,
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
  customSplit?: Record<string, number>
): Promise<string> => {
  const expense = {
    description,
    amount,
    category,
    paidBy,
    splitAmong,
    customSplit,
    date: Timestamp.fromDate(date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, 'trips', tripId, 'expenses'), expense);
  return docRef.id;
};

export const addExpense = createExpense;

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
      customSplit: data.customSplit,
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

export const updateExpense = async (
  tripId: string,
  expenseId: string,
  updates: Partial<Expense>
): Promise<void> => {
  const expenseRef = doc(db, 'trips', tripId, 'expenses', expenseId);
  await updateDoc(expenseRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};
