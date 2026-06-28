import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DeleteExpenseModal from '../components/DeleteExpenseModal';
import { useAuth } from '../hooks/useAuth';
import { getExpense, updateExpense } from '../services/expenses';
import { getTripMembers } from '../services/trips';
import { TripMember } from '../types';

type ExpenseCategory = 'Food' | 'Transport' | 'Accommodation' | 'Activities' | 'Other';
type SplitType = 'equal' | 'custom';

const categories: ExpenseCategory[] = ['Food', 'Transport', 'Accommodation', 'Activities', 'Other'];

const EditExpense: React.FC = () => {
  const { tripId, expenseId } = useParams<{ tripId: string; expenseId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!tripId || !expenseId || !user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const [tripMembers, expense] = await Promise.all([
          getTripMembers(tripId),
          getExpense(tripId, expenseId),
        ]);

        if (!expense) {
          setError('Expense not found.');
          setLoading(false);
          return;
        }

        setMembers(tripMembers);
        setDescription(expense.description || '');
        setAmount(String(expense.amount ?? ''));
        setCategory(expense.category);
        setPaidBy(expense.paidBy || '');
        setDate(expense.date ? expense.date.toISOString().split('T')[0] : '');

        const defaultSelected = Array.isArray(expense.splitAmong) ? expense.splitAmong : [];
        setSelectedMembers(defaultSelected);

        const hasCustomSplit = !!expense.customSplit && Object.keys(expense.customSplit).length > 0;
        setSplitType(hasCustomSplit ? 'custom' : 'equal');

        const nextSplits: Record<string, string> = {};
        tripMembers.forEach((member) => {
          const existing = expense.customSplit?.[member.userId];
          nextSplits[member.userId] = typeof existing === 'number' ? String(existing) : '';
        });
        setCustomSplits(nextSplits);
      } catch (loadError) {
        console.error('Failed to load expense details:', loadError);
        setError('Failed to load expense details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [expenseId, tripId, user]);

  const amountValue = Number(amount) || 0;
  const parsedExpenseDate = new Date(`${date}T00:00:00`);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => {
      map.set(member.userId, member.displayName);
    });
    return map;
  }, [members]);

  const customSplitTotal = useMemo(() => {
    return selectedMembers.reduce((sum, userId) => {
      const parsed = Number(customSplits[userId]);
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
  }, [customSplits, selectedMembers]);

  const remainingAmount = amountValue - customSplitTotal;

  const handleToggleSelectedMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSplitChange = (userId: string, value: string) => {
    if (value === '') {
      setCustomSplits((prev) => ({ ...prev, [userId]: '' }));
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }

    setCustomSplits((prev) => ({ ...prev, [userId]: value }));
  };

  const validateForm = (): string | null => {
    if (!tripId || !expenseId) {
      return 'Trip or expense was not found.';
    }

    if (!description.trim() || !amount || !paidBy || !date) {
      return 'Please fill in all required fields.';
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return 'Amount must be a positive number.';
    }

    if (Number.isNaN(parsedExpenseDate.getTime())) {
      return 'Please provide a valid expense date.';
    }

    if (selectedMembers.length === 0) {
      return 'Select at least one member for expense split.';
    }

    if (!members.some((member) => member.userId === paidBy)) {
      return 'Please select who paid for this expense.';
    }

    if (splitType === 'custom') {
      const hasInvalidValue = selectedMembers.some((userId) => {
        const value = customSplits[userId] || '';
        if (!value) {
          return false;
        }
        const parsed = Number(value);
        return !Number.isFinite(parsed) || parsed < 0;
      });

      if (hasInvalidValue) {
        return 'Custom split values must be valid positive amounts.';
      }

      const activeParticipants = selectedMembers.filter((userId) => Number(customSplits[userId]) > 0).length;
      if (activeParticipants === 0) {
        return 'Enter at least one member share for custom split.';
      }

      if (Math.abs(remainingAmount) > 0.01) {
        return 'Custom split amounts must exactly match the total amount.';
      }
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!tripId || !expenseId) {
      setError('Trip or expense was not found.');
      return;
    }

    const sanitizedDescription = description.trim();
    const sanitizedPaidBy = paidBy.trim();
    const sanitizedSplitAmong = selectedMembers.filter((userId) => Boolean(userId));
    const customSplitPayload =
      splitType === 'custom'
        ? Object.fromEntries(
            sanitizedSplitAmong
              .filter((userId) => Number(customSplits[userId]) > 0)
              .map((userId) => [userId, Number(customSplits[userId])])
          )
        : null;

    setError('');
    setSubmitting(true);

    try {
      await updateExpense(tripId, expenseId, {
        description: sanitizedDescription,
        amount: amountValue,
        category,
        paidBy: sanitizedPaidBy,
        splitAmong: sanitizedSplitAmong,
        customSplit: customSplitPayload,
        date: parsedExpenseDate,
      });

      navigate(`/trip/${tripId}`);
    } catch (updateError: any) {
      console.error('Failed to update expense:', updateError);
      setError(updateError?.message || 'Failed to update expense. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseDeleted = () => {
    if (tripId) {
      navigate(`/trip/${tripId}`);
      return;
    }

    navigate('/dashboard');
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 p-4">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center">
        <div className="w-full rounded-lg bg-white p-8 shadow-xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate(tripId ? `/trip/${tripId}` : '/dashboard')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Back to Trip
            </button>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900">Edit Expense</h1>
              <p className="text-gray-600">Update this expense and split details.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="expense-description" className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                id="expense-description"
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="expense-amount" className="mb-1 block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="expense-category" className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="expense-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="paid-by" className="mb-1 block text-sm font-medium text-gray-700">
                  Paid by
                </label>
                <select
                  id="paid-by"
                  value={paidBy}
                  onChange={(event) => setPaidBy(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Select member
                  </option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.displayName} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="expense-date" className="mb-1 block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Split members</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {members.map((member) => (
                  <label key={member.userId} className="flex items-center gap-2 text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.userId)}
                      onChange={() => handleToggleSelectedMember(member.userId)}
                    />
                    <span>{member.displayName}</span>
                  </label>
                ))}
              </div>
              {selectedMembers.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {selectedMembers.map((id) => memberNameById.get(id) || 'Unknown').join(', ')}
                </p>
              )}
            </div>

            <fieldset className="rounded-lg border border-gray-200 p-4">
              <legend className="px-2 text-sm font-semibold text-gray-700">Split type</legend>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name="split-type"
                    value="equal"
                    checked={splitType === 'equal'}
                    onChange={() => setSplitType('equal')}
                  />
                  Equal split
                </label>
                <label className="flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name="split-type"
                    value="custom"
                    checked={splitType === 'custom'}
                    onChange={() => setSplitType('custom')}
                  />
                  Custom split
                </label>
              </div>
            </fieldset>

            {splitType === 'custom' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Custom split amounts</h2>
                <div className="space-y-3">
                  {selectedMembers.map((userId) => (
                    <div key={userId} className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-center">
                      <label htmlFor={`split-${userId}`} className="text-sm font-medium text-gray-700">
                        {memberNameById.get(userId) || 'Unknown'}
                      </label>
                      <input
                        id={`split-${userId}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={customSplits[userId] || ''}
                        onChange={(event) => handleSplitChange(userId, event.target.value)}
                        className="md:col-span-2 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>
                <p
                  className={`mt-4 text-sm font-semibold ${
                    Math.abs(remainingAmount) <= 0.01 ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  Remaining to distribute: {remainingAmount.toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-between">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="rounded-lg bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(tripId ? `/trip/${tripId}` : '/dashboard')}
                  className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <DeleteExpenseModal
        expenseId={expenseId || ''}
        tripId={tripId || ''}
        expenseDescription={description}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleted={handleExpenseDeleted}
      />
    </div>
  );
};

export default EditExpense;
