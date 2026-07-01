import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DeleteExpenseModal from '../components/DeleteExpenseModal';
import { useAuth } from '../hooks/useAuth';
import { getExpense, updateExpense } from '../services/expenses';
import { getTripParticipants } from '../services/participants';
import { getTripCategoryDistributions } from '../services/categoryDistributions';
import { CategoryDistribution, Participant } from '../types';

type SplitType = 'byCategory' | 'custom';

const EditExpense: React.FC = () => {
  const { tripId, expenseId } = useParams<{ tripId: string; expenseId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categoryDistributions, setCategoryDistributions] = useState<CategoryDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paidByParticipant, setPaidByParticipant] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('byCategory');
  const [categoryId, setCategoryId] = useState('');
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
        const [tripParticipants, distributions, expense] = await Promise.all([
          getTripParticipants(tripId),
          getTripCategoryDistributions(tripId),
          getExpense(tripId, expenseId),
        ]);

        if (!expense) {
          setError('Expense not found.');
          setLoading(false);
          return;
        }

        setParticipants(tripParticipants);
        setCategoryDistributions(distributions);

        setDescription(expense.description || '');
        setAmount(String(expense.amount ?? ''));
        setCategory(expense.category);
        setPaidByParticipant(expense.paidByParticipant || '');
        setDate(expense.date ? expense.date.toISOString().split('T')[0] : '');
        setSplitType(expense.splitType ?? 'byCategory');
        setCategoryId(expense.categoryId ?? '');

        const nextSplits: Record<string, string> = {};
        tripParticipants.forEach((p) => {
          const existing = expense.customSplit?.[p.id];
          nextSplits[p.id] = typeof existing === 'number' ? String(existing) : '';
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

  useEffect(() => {
    if (categoryDistributions.length === 0) {
      setCategory('');
      setCategoryId('');
      return;
    }

    const selectedDistribution = categoryId
      ? categoryDistributions.find((distribution) => distribution.id === categoryId)
      : undefined;

    if (selectedDistribution) {
      if (category !== selectedDistribution.category) {
        setCategory(selectedDistribution.category);
      }
      return;
    }

    const distributionMatchingCategory = category
      ? categoryDistributions.find((distribution) => distribution.category === category)
      : undefined;

    if (distributionMatchingCategory) {
      setCategoryId(distributionMatchingCategory.id);
      return;
    }

    setCategoryId(categoryDistributions[0].id);
    setCategory(categoryDistributions[0].category);
  }, [category, categoryDistributions, categoryId]);

  const amountValue = Number(amount) || 0;
  const parsedExpenseDate = new Date(`${date}T00:00:00`);

  const participantNameById = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [participants]);

  const customSplitTotal = useMemo(() => {
    return Object.values(customSplits).reduce((sum, splitAmount) => {
      const parsed = Number(splitAmount);
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
  }, [customSplits]);

  const remainingAmount = amountValue - customSplitTotal;

  const handleSplitChange = (participantId: string, value: string) => {
    if (value === '') {
      setCustomSplits((prev) => ({ ...prev, [participantId]: '' }));
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }

    setCustomSplits((prev) => ({ ...prev, [participantId]: value }));
  };

  const validateForm = (): string | null => {
    if (!tripId || !expenseId) {
      return 'Trip or expense was not found.';
    }

    if (!description.trim() || !amount || !paidByParticipant || !date) {
      return 'Please fill in all required fields.';
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return 'Amount must be a positive number.';
    }

    if (Number.isNaN(parsedExpenseDate.getTime())) {
      return 'Please provide a valid expense date.';
    }

    if (!participants.some((p) => p.id === paidByParticipant)) {
      return 'Please select who paid for this expense.';
    }

    if (categoryDistributions.length === 0) {
      return 'This trip has no categories. Please add a category distribution before editing expenses.';
    }

    if (!categoryId || !category.trim()) {
      return 'Please select a category.';
    }

    if (splitType === 'byCategory' && !categoryDistributions.some((dist) => dist.id === categoryId)) {
      return 'The selected category is missing its distribution key.';
    }

    if (splitType === 'custom') {
      const hasInvalidValue = Object.values(customSplits).some((value) => {
        if (!value) return false;
        const parsed = Number(value);
        return !Number.isFinite(parsed) || parsed < 0;
      });

      if (hasInvalidValue) {
        return 'Custom split values must be valid positive amounts.';
      }

      const activeParticipants = Object.values(customSplits).filter(
        (value) => Number(value) > 0
      ).length;
      if (activeParticipants === 0) {
        return 'Enter at least one participant share for custom split.';
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
    const sanitizedPaidBy = paidByParticipant.trim();
    const customSplitPayload =
      splitType === 'custom'
        ? Object.fromEntries(
            participants
              .filter((p) => Number(customSplits[p.id]) > 0)
              .map((p) => [p.id, Number(customSplits[p.id])])
          )
        : null;

    setError('');
    setSubmitting(true);

    try {
      await updateExpense(tripId, expenseId, {
        description: sanitizedDescription,
        amount: amountValue,
        category,
        paidByParticipant: sanitizedPaidBy,
        splitType,
        categoryId: splitType === 'byCategory' ? categoryId : null,
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

          {participants.length === 0 && (
            <div className="mb-4 rounded border border-amber-400 bg-amber-50 px-4 py-3 text-amber-800">
              No participants found for this trip. Please add participants from the trip page before editing
              expenses.
            </div>
          )}
          {categoryDistributions.length === 0 && (
            <div className="mb-4 rounded border border-amber-400 bg-amber-50 px-4 py-3 text-amber-800">
              No categories found for this trip. Please add category distributions from the trip page before
              editing expenses.
            </div>
          )}

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
                  value={categoryId}
                  onChange={(event) => {
                    const selectedId = event.target.value;
                    const selectedDistribution = categoryDistributions.find(
                      (distribution) => distribution.id === selectedId
                    );
                    setCategoryId(selectedId);
                    setCategory(selectedDistribution?.category || '');
                  }}
                  disabled={categoryDistributions.length === 0}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoryDistributions.length === 0 ? (
                    <option value="">No categories available</option>
                  ) : (
                    categoryDistributions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.category}
                      </option>
                    ))
                  )}
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
                  value={paidByParticipant}
                  onChange={(event) => setPaidByParticipant(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Select participant
                  </option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
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

            <fieldset className="rounded-lg border border-gray-200 p-4">
              <legend className="px-2 text-sm font-semibold text-gray-700">Split type</legend>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name="split-type"
                    value="byCategory"
                    checked={splitType === 'byCategory'}
                    onChange={() => setSplitType('byCategory')}
                  />
                  According to the category
                </label>
                <label className="flex items-center gap-2 text-gray-700">
                  <input
                    type="radio"
                    name="split-type"
                    value="custom"
                    checked={splitType === 'custom'}
                    onChange={() => setSplitType('custom')}
                  />
                  Custom Split
                </label>
              </div>
            </fieldset>

            {splitType === 'byCategory' && (
              <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                This expense will be split using the selected category weights. Housing also takes each
                participant&apos;s nights into account.
              </p>
            )}

            {splitType === 'custom' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Custom split amounts</h2>
                <div className="space-y-3">
                  {participants.map((p) => (
                    <div key={p.id} className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-center">
                      <label htmlFor={`split-${p.id}`} className="text-sm font-medium text-gray-700">
                        {participantNameById.get(p.id) || 'Unknown'}
                      </label>
                      <input
                        id={`split-${p.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={customSplits[p.id] || ''}
                        onChange={(event) => handleSplitChange(p.id, event.target.value)}
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
                  disabled={submitting || participants.length === 0 || categoryDistributions.length === 0}
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
