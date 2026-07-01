// User type
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Trip type
export interface Trip {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  budget?: number;
  currency?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isSettled: boolean;
}

// Trip member type (auth/access control)
export interface TripMember {
  userId: string;
  email: string;
  displayName: string;
  role: 'Adult' | 'Kid' | 'Baby';
  joinedAt: Date;
  status: 'invited' | 'joined' | 'declined';
}

// Participant type — a group (e.g. a family) that participates in expense splitting
export interface Participant {
  id: string;
  name: string;
  adult: number;
  kid: number;
  baby: number;
  nights: number;
}

// CategoryDistribution type — defines the relative weight each role carries for a given distribution key
export interface CategoryDistribution {
  id: string;
  category: string;
  adult: number;
  kid: number;
  baby: number;
}

// Expense type
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'Food' | 'Accommodation' | 'Transport' | 'Activities' | 'Other';
  paidByParticipant: string; // participant id
  splitType: 'byCategory' | 'custom';
  categoryId?: string; // id of CategoryDistribution, used when splitType is 'byCategory'
  customSplit?: Record<string, number> | null; // participantId -> amount
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Settlement type
export interface Settlement {
  from: string;
  to: string;
  amount: number;
  fromName: string;
  toName: string;
}

// Distribution key type (legacy alias kept for reference)
export interface DistributionKey {
  category: string;
  Adult: number;
  Kid: number;
  Baby: number;
}
