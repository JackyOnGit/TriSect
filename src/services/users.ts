import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAt,
  endAt,
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserSearchResult {
  uid: string;
  email: string;
  displayName: string;
}

export const searchUsersByEmail = async (emailQuery: string): Promise<UserSearchResult[]> => {
  const normalizedQuery = emailQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const usersRef = collection(db, 'users');
  const usersQuery = query(
    usersRef,
    orderBy('email'),
    startAt(normalizedQuery),
    endAt(`${normalizedQuery}\uf8ff`),
    limit(10)
  );

  const querySnapshot = await getDocs(usersQuery);

  const results: UserSearchResult[] = [];
  querySnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const email = typeof data.email === 'string' ? data.email : '';

    if (!email || !email.toLowerCase().includes(normalizedQuery)) {
      return;
    }

    results.push({
      uid: docSnapshot.id,
      email,
      displayName:
        typeof data.displayName === 'string' && data.displayName.trim().length > 0
          ? data.displayName
          : email,
    });
  });

  return results;
};
