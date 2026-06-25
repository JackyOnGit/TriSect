import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
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
    createdBy: data.createdBy,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    isSettled: data.isSettled,
  };
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
