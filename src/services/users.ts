import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getUserTrips, getTripMembers } from './trips';

export interface UserSearchResult {
  uid: string;
  email: string;
  displayName: string;
}

/**
 * Search for users that share at least one trip with `currentUserId`,
 * filtered by `emailQuery` matching their email or display name.
 *
 * Results are limited to co-members to avoid exposing the full user list.
 */
export const searchCoMembersByEmail = async (
  currentUserId: string,
  emailQuery: string
): Promise<UserSearchResult[]> => {
  const normalizedQuery = emailQuery.trim().toLowerCase();

  if (!normalizedQuery || !currentUserId) {
    return [];
  }

  // 1. Collect all trips the current user belongs to.
  const trips = await getUserTrips(currentUserId);

  if (trips.length === 0) {
    return [];
  }

  // 2. Collect unique co-member UIDs across all trips (excluding self).
  const coMemberUids = new Set<string>();
  await Promise.all(
    trips.map(async (trip) => {
      const members = await getTripMembers(trip.id);
      members.forEach((member) => {
        if (member.userId && member.userId !== currentUserId) {
          coMemberUids.add(member.userId);
        }
      });
    })
  );

  if (coMemberUids.size === 0) {
    return [];
  }

  // 3. Fetch user docs for all co-members, filter by query, return matches.
  const results: UserSearchResult[] = [];

  await Promise.all(
    Array.from(coMemberUids).map(async (uid) => {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) {
        return;
      }
      const data = userSnap.data();
      const email = typeof data.email === 'string' ? data.email : '';
      const displayName =
        typeof data.displayName === 'string' && data.displayName.trim().length > 0
          ? data.displayName
          : email;

      const matchesQuery =
        email.toLowerCase().includes(normalizedQuery) ||
        displayName.toLowerCase().includes(normalizedQuery);

      if (matchesQuery) {
        results.push({ uid, email, displayName });
      }
    })
  );

  return results.sort((a, b) => a.email.localeCompare(b.email));
};
