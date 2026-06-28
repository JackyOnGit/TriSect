import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { deleteTrip, getTrip, updateTrip } from '../services/trips';

const currencyOptions = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

const EditTrip: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!tripId || !user) {
      setLoading(false);
      return;
    }

    const loadTrip = async () => {
      setLoading(true);
      setError('');

      try {
        const trip = await getTrip(tripId);

        if (!trip) {
          setError('Trip not found.');
          return;
        }

        setName(trip.name || '');
        setDescription(trip.description || '');
        setStartDate(trip.startDate ? trip.startDate.toISOString().split('T')[0] : '');
        setEndDate(trip.endDate ? trip.endDate.toISOString().split('T')[0] : '');
        setBudget(typeof trip.budget === 'number' ? String(trip.budget) : '');
        setCurrency(trip.currency || 'USD');
      } catch (loadError) {
        console.error('Failed to load trip details:', loadError);
        setError('Failed to load trip details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [tripId, user]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tripId) {
      setError('Trip not found.');
      return;
    }

    if (!name.trim() || !description.trim() || !startDate || !endDate) {
      setError('Please fill in all required fields.');
      return;
    }

    if (endDate <= startDate) {
      setError('End date must be after start date.');
      return;
    }

    const parsedBudget = budget.trim() ? Number(budget) : null;
    if (parsedBudget !== null && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
      setError('Budget must be a positive number.');
      return;
    }

    setError('');
    setSaving(true);

    try {
      await updateTrip(tripId, {
        name: name.trim(),
        description: description.trim(),
        startDate: new Date(`${startDate}T00:00:00`),
        endDate: new Date(`${endDate}T00:00:00`),
        budget: parsedBudget,
        currency: currency || null,
      });

      navigate(`/trip/${tripId}`);
    } catch (saveError: any) {
      console.error('Failed to update trip:', saveError);
      setError(saveError?.message || 'Failed to update trip.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!tripId) {
      setError('Trip not found.');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await deleteTrip(tripId);
      navigate('/dashboard');
    } catch (deleteError: any) {
      console.error('Failed to delete trip:', deleteError);
      setError(deleteError?.message || 'Failed to delete trip.');
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 p-4">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center">
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
              <h1 className="text-3xl font-bold text-gray-900">Edit Trip</h1>
              <p className="text-gray-600">Update your trip details and preferences.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {error && <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">{error}</div>}

            <div>
              <label htmlFor="trip-name" className="mb-1 block text-sm font-medium text-gray-700">
                Trip name
              </label>
              <input
                id="trip-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="trip-description" className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="trip-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="start-date" className="mb-1 block text-sm font-medium text-gray-700">
                  Start date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="end-date" className="mb-1 block text-sm font-medium text-gray-700">
                  End date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="trip-budget" className="mb-1 block text-sm font-medium text-gray-700">
                  Budget (optional)
                </label>
                <input
                  id="trip-budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="trip-currency" className="mb-1 block text-sm font-medium text-gray-700">
                  Currency (optional)
                </label>
                <select
                  id="trip-currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {currencyOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-between">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="rounded-lg bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-700"
              >
                Delete Trip
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
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Delete Trip</h2>
            <p className="mt-2 text-gray-600">
              Are you sure you want to delete this trip? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Keep Trip
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditTrip;
