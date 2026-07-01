import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { CategoryDistribution } from '../types';

const DEFAULT_CATEGORY_DISTRIBUTIONS: Array<CategoryDistribution & { id: string }> = [
  { id: 'default-housing', category: 'Housing', adult: 1, kid: 1, baby: 1 },
  { id: 'default-food', category: 'Food', adult: 1, kid: 0.5, baby: 0 },
  { id: 'default-alcohol', category: 'Alcohol', adult: 1, kid: 0, baby: 0 },
];

export const createCategoryDistribution = async (
  tripId: string,
  category: string,
  adult: number,
  kid: number,
  baby: number
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'trips', tripId, 'categoryDistributions'), {
    category,
    adult,
    kid,
    baby,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getTripCategoryDistributions = async (
  tripId: string
): Promise<CategoryDistribution[]> => {
  const querySnapshot = await getDocs(
    collection(db, 'trips', tripId, 'categoryDistributions')
  );

  if (querySnapshot.empty) {
    const now = Timestamp.now();

    await Promise.all(
      DEFAULT_CATEGORY_DISTRIBUTIONS.map((distribution) =>
        setDoc(doc(db, 'trips', tripId, 'categoryDistributions', distribution.id), {
          category: distribution.category,
          adult: distribution.adult,
          kid: distribution.kid,
          baby: distribution.baby,
          createdAt: now,
          updatedAt: now,
        })
      )
    );

    return DEFAULT_CATEGORY_DISTRIBUTIONS.map(({ id, category, adult, kid, baby }) => ({
      id,
      category,
      adult,
      kid,
      baby,
    }));
  }

  const distributions: CategoryDistribution[] = [];
  querySnapshot.forEach((snap) => {
    const data = snap.data();
    distributions.push({
      id: snap.id,
      category: data.category,
      adult: data.adult ?? 1,
      kid: data.kid ?? 0.5,
      baby: data.baby ?? 0,
    });
  });

  return distributions;
};

export const getCategoryDistribution = async (
  tripId: string,
  distributionId: string
): Promise<CategoryDistribution | null> => {
  const snap = await getDoc(
    doc(db, 'trips', tripId, 'categoryDistributions', distributionId)
  );
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data();
  return {
    id: snap.id,
    category: data.category,
    adult: data.adult ?? 1,
    kid: data.kid ?? 0.5,
    baby: data.baby ?? 0,
  };
};

export const updateCategoryDistribution = async (
  tripId: string,
  distributionId: string,
  updates: Partial<Omit<CategoryDistribution, 'id'>>
): Promise<void> => {
  const payload: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.adult !== undefined) payload.adult = updates.adult;
  if (updates.kid !== undefined) payload.kid = updates.kid;
  if (updates.baby !== undefined) payload.baby = updates.baby;

  await updateDoc(
    doc(db, 'trips', tripId, 'categoryDistributions', distributionId),
    payload
  );
};

export const deleteCategoryDistribution = async (
  tripId: string,
  distributionId: string
): Promise<void> => {
  await deleteDoc(doc(db, 'trips', tripId, 'categoryDistributions', distributionId));
};
