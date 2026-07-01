import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Participant } from '../types';

export const createParticipant = async (
  tripId: string,
  name: string,
  adult: number,
  kid: number,
  baby: number,
  nights: number
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'trips', tripId, 'participants'), {
    name,
    adult,
    kid,
    baby,
    nights,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getTripParticipants = async (tripId: string): Promise<Participant[]> => {
  const querySnapshot = await getDocs(collection(db, 'trips', tripId, 'participants'));

  const participants: Participant[] = [];
  querySnapshot.forEach((snap) => {
    const data = snap.data();
    participants.push({
      id: snap.id,
      name: data.name,
      adult: data.adult ?? 0,
      kid: data.kid ?? 0,
      baby: data.baby ?? 0,
      nights: data.nights ?? 1,
    });
  });

  return participants;
};

export const getParticipant = async (
  tripId: string,
  participantId: string
): Promise<Participant | null> => {
  const snap = await getDoc(doc(db, 'trips', tripId, 'participants', participantId));
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    adult: data.adult ?? 0,
    kid: data.kid ?? 0,
    baby: data.baby ?? 0,
    nights: data.nights ?? 1,
  };
};

export const updateParticipant = async (
  tripId: string,
  participantId: string,
  updates: Partial<Omit<Participant, 'id'>>
): Promise<void> => {
  const payload: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.adult !== undefined) payload.adult = updates.adult;
  if (updates.kid !== undefined) payload.kid = updates.kid;
  if (updates.baby !== undefined) payload.baby = updates.baby;
  if (updates.nights !== undefined) payload.nights = updates.nights;

  await updateDoc(doc(db, 'trips', tripId, 'participants', participantId), payload);
};

export const deleteParticipant = async (
  tripId: string,
  participantId: string
): Promise<void> => {
  await deleteDoc(doc(db, 'trips', tripId, 'participants', participantId));
};
