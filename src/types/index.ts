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
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isSettled: boolean;
}

// Trip member type
export interface TripMember {
  userId: string;
  email: string;
  displayName: string;
  role: 'Adult' | 'Kid' | 'Baby';
  joinedAt: Date;
  status: 'invited' | 'joined' | 'declined';
}

// Expense type
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'Food' | 'Accommodation' | 'Transport' | 'Activities' | 'Other';
  paidBy: string;
  splitAmong: string[];
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

// Distribution key type (for future use in Phase 2/3)
export interface DistributionKey {
  category: string;
  Adult: number;
  Kid: number;
  Baby: number;
}
