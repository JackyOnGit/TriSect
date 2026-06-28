import React, { useEffect, useState } from 'react';
import { deleteExpense } from '../services/expenses';

interface DeleteExpenseModalProps {
  expenseId: string;
  tripId: string;
  expenseDescription: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

const DeleteExpenseModal: React.FC<DeleteExpenseModalProps> = ({
  expenseId,
  tripId,
  expenseDescription,
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError('');
    }
  }, [isOpen]);

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      await deleteExpense(tripId, expenseId);
      onDeleted();
    } catch (deleteError: any) {
      console.error('Failed to delete expense:', deleteError);
      setError(deleteError?.message || 'Failed to delete expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Delete Expense</h2>
        <p className="mt-2 text-gray-600">
          Are you sure you want to delete this expense: <span className="font-semibold">{expenseDescription}</span>?
        </p>
        <p className="mt-1 text-sm text-gray-500">This cannot be undone.</p>
        {error && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteExpenseModal;
