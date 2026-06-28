import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, TripMember } from '../types';

export const createTrip = async (
  userId: string,
  name: string,
  description: string,
  startDate: Date,
  endDate: Date
): Promise<string> => {
  const trip = {
    name,
    description,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    createdBy: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isSettled: false,
  };

  const docRef = await addDoc(collection(db, 'trips'), trip);
  return docRef.id;
};

export const getUserTrips = async (userId: string): Promise<Trip[]> => {
  const q = query(collection(db, 'trips'), where('createdBy', '==', userId));
  const querySnapshot = await getDocs(q);

  const trips: Trip[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    trips.push({
      id: doc.id,
      name: data.name,
      description: data.description,
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
      createdBy: data.createdBy,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      isSettled: data.isSettled,
    });
  });

  return trips;
};

export const getTripById = async (tripId: string): Promise<Trip | null> => {
  const docRef = doc(db, 'trips', tripId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    description: data.description,
    startDate: data.startDate.toDate(),
    endDate: data.endDate.toDate(),
    budget: typeof data.budget === 'number' ? data.budget : undefined,
    currency: typeof data.currency === 'string' ? data.currency : undefined,
    createdBy: data.createdBy,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    isSettled: data.isSettled,
  };
};

export const getTrip = getTripById;

export const updateTrip = async (
  tripId: string,
  updates: {
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    budget?: number | null;
    currency?: string | null;
  }
): Promise<void> => {
  const payload: Record<string, unknown> = {
    name: updates.name,
    description: updates.description,
    startDate: Timestamp.fromDate(updates.startDate),
    endDate: Timestamp.fromDate(updates.endDate),
    updatedAt: Timestamp.now(),
    budget: typeof updates.budget === 'number' ? updates.budget : null,
    currency: updates.currency && updates.currency.trim() ? updates.currency.trim() : null,
  };

  await updateDoc(doc(db, 'trips', tripId), payload);
};

export const deleteTrip = async (tripId: string): Promise<void> => {
  await deleteDoc(doc(db, 'trips', tripId));
};

export const addTripMember = async (
  tripId: string,
  userId: string,
  email: string,
  displayName: string,
  role: 'Adult' | 'Kid' | 'Baby'
): Promise<void> => {
  const member: TripMember = {
    userId,
    email,
    displayName,
    role,
    joinedAt: new Date(),
    status: 'joined',
  };

  const memberRef = doc(db, 'trips', tripId, 'members', userId);
  await setDoc(memberRef, member as any);
};

export const addMemberToTrip = async (
  tripId: string,
  userId: string,
  role: 'Adult' | 'Kid' | 'Baby'
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error('Selected user was not found.');
  }

  const userData = userSnap.data();
  const email = typeof userData.email === 'string' ? userData.email : '';
  const displayName =
    typeof userData.displayName === 'string' && userData.displayName.trim().length > 0
      ? userData.displayName
      : email || 'Unknown User';

  await addTripMember(tripId, userId, email, displayName, role);
};

export const getTripMembers = async (tripId: string): Promise<TripMember[]> => {
  const querySnapshot = await getDocs(collection(db, 'trips', tripId, 'members'));

  const members: TripMember[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    members.push({
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      joinedAt: data.joinedAt.toDate ? data.joinedAt.toDate() : data.joinedAt,
      status: data.status,
    });
  });

  return members;
};
