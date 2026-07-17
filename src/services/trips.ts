import {
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
  Timestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { InviteLink, Trip, TripMember } from '../types';
import { generateUniqueCode } from '../utils/inviteLinks';

const INVITE_LINK_COLLECTION = 'inviteLinks';
const INVITE_CODE_LOOKUP_COLLECTION = 'inviteCodes';
const MAX_INVITE_CODE_GENERATION_ATTEMPTS = 5;
const INVITE_CODE_EXISTS_ERROR = 'INVITE_CODE_EXISTS';

export interface InviteCodeValidationResult {
  tripId: string | null;
  valid: boolean;
  error?: string;
  inviteLink?: InviteLink;
}

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

const mapDocToTrip = (docSnap: { id: string; data: () => Record<string, any> }): Trip => {
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

const mapDocToInviteLink = (docSnap: { id: string; data: () => Record<string, any> }): InviteLink => {
  const data = docSnap.data();

  return {
    code: typeof data.code === 'string' ? data.code : docSnap.id,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : undefined,
    maxUses: typeof data.maxUses === 'number' ? data.maxUses : undefined,
    currentUses: typeof data.currentUses === 'number' ? data.currentUses : 0,
    status: data.status === 'revoked' ? 'revoked' : 'active',
  };
};

const normalizeInviteCode = (code: string): string => code.trim().toUpperCase();

const getInviteLinkValidationError = (inviteLink: InviteLink): string | null => {
  if (inviteLink.status !== 'active') {
    return 'This invite link has been revoked.';
  }

  if (inviteLink.expiresAt && inviteLink.expiresAt.getTime() <= Date.now()) {
    return 'This invite link has expired.';
  }

  if (typeof inviteLink.maxUses === 'number' && inviteLink.currentUses >= inviteLink.maxUses) {
    return 'This invite link has reached its usage limit.';
  }

  return null;
};

const findInviteLinkByCode = async (
  code: string
): Promise<{
  tripId: string;
  inviteLink: InviteLink;
  inviteRef: ReturnType<typeof doc>;
  inviteCodeRef: ReturnType<typeof doc>;
} | null> => {
  const normalizedCode = normalizeInviteCode(code);

  if (!normalizedCode) {
    return null;
  }

  const inviteCodeRef = doc(db, INVITE_CODE_LOOKUP_COLLECTION, normalizedCode);
  const inviteCodeSnap = await getDoc(inviteCodeRef);
  const inviteCodeData = inviteCodeSnap.data();
  const tripId = typeof inviteCodeData?.tripId === 'string' ? inviteCodeData.tripId : '';

  if (!inviteCodeSnap.exists() || !tripId) {
    return null;
  }

  const inviteRef = doc(db, 'trips', tripId, INVITE_LINK_COLLECTION, normalizedCode);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    return null;
  }

  return {
    tripId,
    inviteLink: mapDocToInviteLink(inviteSnap),
    inviteRef,
    inviteCodeRef,
  };
};

export const getUserTrips = async (userId: string): Promise<Trip[]> => {
  console.log('🔎 getUserTrips called with userId:', userId);
  
  // Query trips created by the user
  const createdQuery = query(collection(db, 'trips'), where('createdBy', '==', userId));
  const createdSnapshot = await getDocs(createdQuery);
  
  console.log('📋 Created trips found:', createdSnapshot.docs.length);

  const tripsMap = new Map<string, Trip>();

  createdSnapshot.forEach((docSnap) => {
    tripsMap.set(docSnap.id, mapDocToTrip(docSnap));
  });

  // Query all members subcollections for docs belonging to this user
  const memberQuery = query(collectionGroup(db, 'members'), where('userId', '==', userId));
  const memberSnapshot = await getDocs(memberQuery);
  
  console.log('👥 Member records found:', memberSnapshot.docs.length);
  memberSnapshot.forEach(doc => {
    console.log(`  - Found in trip: ${doc.ref.parent.parent?.id}, member userId: ${doc.data().userId}`);
  });

  // Fetch parent trip docs...
  const memberTripFetches = memberSnapshot.docs
    .map((memberDoc) => memberDoc.ref.parent.parent)
    .filter((tripRef): tripRef is NonNullable<typeof tripRef> => tripRef != null && !tripsMap.has(tripRef.id))
    .map(async (tripRef) => {
      const tripSnap = await getDoc(tripRef);
      if (tripSnap.exists()) {
        console.log(`🎫 Added member trip: ${tripSnap.data().name}`);
        tripsMap.set(tripSnap.id, mapDocToTrip(tripSnap));
      }
    });

  await Promise.all(memberTripFetches);

  console.log('🏁 Total trips returned:', tripsMap.size);
  return Array.from(tripsMap.values());
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

export const generateInviteLink = async (tripId: string, expiresInDays?: number): Promise<string> => {
  const tripRef = doc(db, 'trips', tripId);
  const tripSnap = await getDoc(tripRef);

  if (!tripSnap.exists()) {
    throw new Error('Trip not found.');
  }

  const tripData = tripSnap.data();
  const createdBy = typeof tripData.createdBy === 'string' ? tripData.createdBy : '';

  if (!createdBy) {
    throw new Error('Trip creator not found.');
  }

  for (let attempt = 0; attempt < MAX_INVITE_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const code = generateUniqueCode();
    const inviteCodeRef = doc(db, INVITE_CODE_LOOKUP_COLLECTION, code);
    const inviteRef = doc(db, 'trips', tripId, INVITE_LINK_COLLECTION, code);
    const createdAt = Timestamp.now();
    const invitePayload: Record<string, unknown> = {
      code,
      createdBy,
      createdAt,
      currentUses: 0,
      status: 'active',
    };
    const inviteCodePayload: Record<string, unknown> = {
      code,
      tripId,
      createdAt,
      status: 'active',
    };

    if (typeof expiresInDays === 'number' && Number.isFinite(expiresInDays) && expiresInDays > 0) {
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000));
      invitePayload.expiresAt = expiresAt;
      inviteCodePayload.expiresAt = expiresAt;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const existingInvite = await transaction.get(inviteCodeRef);

        if (existingInvite.exists()) {
          throw new Error(INVITE_CODE_EXISTS_ERROR);
        }

        transaction.set(inviteRef, invitePayload);
        transaction.set(inviteCodeRef, inviteCodePayload);
      });

      return code;
    } catch (error: any) {
      if (error?.message === INVITE_CODE_EXISTS_ERROR) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('Unable to generate a unique invite link. Please try again.');
};

export const validateInviteCode = async (code: string): Promise<InviteCodeValidationResult> => {
  const inviteRecord = await findInviteLinkByCode(code);

  if (!inviteRecord) {
    return {
      tripId: null,
      valid: false,
      error: 'This invite link is invalid.',
    };
  }

  const validationError = getInviteLinkValidationError(inviteRecord.inviteLink);

  if (validationError) {
    return {
      tripId: inviteRecord.tripId,
      valid: false,
      error: validationError,
      inviteLink: inviteRecord.inviteLink,
    };
  }

  return {
    tripId: inviteRecord.tripId,
    valid: true,
    inviteLink: inviteRecord.inviteLink,
  };
};

export const joinTripViaCode = async (userId: string, code: string): Promise<void> => {
  const inviteRecord = await findInviteLinkByCode(code);

  if (!inviteRecord) {
    throw new Error('This invite link is invalid.');
  }

  const tripRef = doc(db, 'trips', inviteRecord.tripId);
  const memberRef = doc(db, 'trips', inviteRecord.tripId, 'members', userId);
  const userRef = doc(db, 'users', userId);

  await runTransaction(db, async (transaction) => {
    const inviteSnap = await transaction.get(inviteRecord.inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error('This invite link is invalid.');
    }

    const tripSnap = await transaction.get(tripRef);

    if (!tripSnap.exists()) {
      throw new Error('Trip not found.');
    }

    const memberSnap = await transaction.get(memberRef);
    const tripData = tripSnap.data();
    const createdBy = typeof tripData.createdBy === 'string' ? tripData.createdBy : '';

    if (memberSnap.exists() || createdBy === userId) {
      return;
    }

    const userSnap = await transaction.get(userRef);

    if (!userSnap.exists()) {
      throw new Error('User account not found.');
    }

    const inviteLink = mapDocToInviteLink(inviteSnap);
    const validationError = getInviteLinkValidationError(inviteLink);

    if (validationError) {
      throw new Error(validationError);
    }

    const userData = userSnap.data();
    const email = typeof userData.email === 'string' ? userData.email : '';
    const displayName =
      typeof userData.displayName === 'string' && userData.displayName.trim().length > 0
        ? userData.displayName
        : email || 'Trip Member';

    transaction.set(memberRef, {
      userId,
      email,
      displayName,
      role: 'Adult',
      joinedAt: Timestamp.now(),
      status: 'joined',
    });
    transaction.update(inviteRecord.inviteRef, {
      currentUses: inviteLink.currentUses + 1,
    });
  });
};

export const revokeInviteLink = async (tripId: string, code: string): Promise<void> => {
  const normalizedCode = normalizeInviteCode(code);
  const batch = writeBatch(db);

  batch.update(doc(db, 'trips', tripId, INVITE_LINK_COLLECTION, normalizedCode), {
    status: 'revoked',
  });
  batch.set(
    doc(db, INVITE_CODE_LOOKUP_COLLECTION, normalizedCode),
    {
      tripId,
      code: normalizedCode,
      status: 'revoked',
    },
    { merge: true }
  );

  await batch.commit();
};

export const getTripInviteLinks = async (tripId: string): Promise<InviteLink[]> => {
  const inviteSnapshot = await getDocs(collection(db, 'trips', tripId, INVITE_LINK_COLLECTION));

  return inviteSnapshot.docs
    .map((docSnap) => mapDocToInviteLink(docSnap))
    .filter((inviteLink) => inviteLink.status === 'active')
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
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

export const removeTripMember = async (tripId: string, memberId: string): Promise<void> => {
  await deleteDoc(doc(db, 'trips', tripId, 'members', memberId));
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
