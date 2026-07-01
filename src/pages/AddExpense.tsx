import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createExpense } from '../services/expenses';
import { getTripParticipants } from '../services/participants';
import { getTripCategoryDistributions } from '../services/categoryDistributions';
import { CategoryDistribution, Participant } from '../types';

type ExpenseCategory = 'Food' | 'Transport' | 'Accommodation' | 'Activities' | 'Other';
type SplitType = 'byCategory' | 'custom';

const categories: ExpenseCategory[] = ['Food', 'Transport', 'Accommodation', 'Activities', 'Other'];

const AddExpense: React.FC = () => {
	const { tripId } = useParams<{ tripId: string }>();
	const { user, loading: authLoading } = useAuth();
	const navigate = useNavigate();

	const [participants, setParticipants] = useState<Participant[]>([]);
	const [categoryDistributions, setCategoryDistributions] = useState<CategoryDistribution[]>([]);
	const [dataLoading, setDataLoading] = useState(true);
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const [description, setDescription] = useState('');
	const [amount, setAmount] = useState('');
	const [category, setCategory] = useState<ExpenseCategory>('Food');
	const [paidByParticipant, setPaidByParticipant] = useState('');
	const [splitType, setSplitType] = useState<SplitType>('byCategory');
	const [categoryId, setCategoryId] = useState('');
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
	const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

	useEffect(() => {
		if (!authLoading && !user) {
			navigate('/login');
		}
	}, [authLoading, navigate, user]);

	useEffect(() => {
		if (!tripId || !user) {
			setDataLoading(false);
			return;
		}

		const loadData = async () => {
			setDataLoading(true);
			setError('');

			try {
				const [tripParticipants, distributions] = await Promise.all([
					getTripParticipants(tripId),
					getTripCategoryDistributions(tripId),
				]);

				setParticipants(tripParticipants);
				setCategoryDistributions(distributions);

				if (tripParticipants.length > 0) {
					setPaidByParticipant(tripParticipants[0].id);
				}

				const nextSplits: Record<string, string> = {};
				tripParticipants.forEach((p) => {
					nextSplits[p.id] = '';
				});
				setCustomSplits(nextSplits);
			} catch (loadError) {
				console.error('Failed to load trip data:', loadError);
				setError('Failed to load trip data. Please refresh and try again.');
			} finally {
				setDataLoading(false);
			}
		};

		loadData();
	}, [tripId, user]);

	const amountValue = Number(amount) || 0;
	const parsedExpenseDate = new Date(`${date}T00:00:00`);

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
		if (!tripId) {
			return 'Trip not found.';
		}

		if (!description.trim() || !amount || !category || !paidByParticipant || !date) {
			return 'Please fill in all required fields.';
		}

		if (!Number.isFinite(amountValue) || amountValue <= 0) {
			return 'Amount must be a positive number.';
		}

		if (Number.isNaN(parsedExpenseDate.getTime())) {
			return 'Please provide a valid expense date.';
		}

		if (participants.length === 0) {
			return 'This trip has no participants. Please add participants before adding expenses.';
		}

		if (!participants.some((p) => p.id === paidByParticipant)) {
			return 'Please select who paid this expense.';
		}

		if (splitType === 'byCategory') {
			if (!categoryId) {
				return 'Please select a distribution key for the category split.';
			}
		}

		if (splitType === 'custom') {
			const hasInvalidValue = Object.values(customSplits).some((value) => {
				if (value === '') return false;
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

		if (!user) {
			setError('You must be logged in to add an expense.');
			return;
		}

		const validationError = validateForm();
		if (validationError) {
			setError(validationError);
			return;
		}

		if (!tripId) {
			setError('Trip not found.');
			return;
		}

		const customSplitPayload =
			splitType === 'custom'
				? Object.fromEntries(
						Object.entries(customSplits)
							.filter(([, splitAmount]) => Number(splitAmount) > 0)
							.map(([id, splitAmount]) => [id, Number(splitAmount)])
				  )
				: null;

		const sanitizedDescription = description.trim();
		const sanitizedPaidBy = paidByParticipant.trim();

		if (!sanitizedDescription || !sanitizedPaidBy) {
			setError('Please fill in all required fields.');
			return;
		}

		setError('');
		setSubmitting(true);

		try {
			await createExpense(
				tripId,
				sanitizedDescription,
				amountValue,
				category,
				sanitizedPaidBy,
				splitType,
				parsedExpenseDate,
				splitType === 'byCategory' ? categoryId : null,
				customSplitPayload
			);

			navigate(`/trip/${tripId}`);
		} catch (submitError) {
			console.error('Failed to create expense:', submitError);
			setError('Failed to create expense. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	if (authLoading || dataLoading) {
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
							<h1 className="text-3xl font-bold text-gray-900">Add Expense</h1>
							<p className="text-gray-600">Track what was spent and how to split it.</p>
						</div>
					</div>

					{participants.length === 0 && (
						<div className="mb-4 rounded border border-amber-400 bg-amber-50 px-4 py-3 text-amber-800">
							No participants found for this trip. Please add participants from the trip page before
							adding expenses.
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
								onChange={(e) => setDescription(e.target.value)}
								required
								placeholder="Dinner at local restaurant"
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
									onChange={(e) => setAmount(e.target.value)}
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
									onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
									required
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
									value={paidByParticipant}
									onChange={(e) => setPaidByParticipant(e.target.value)}
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
									onChange={(e) => setDate(e.target.value)}
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
										required
									/>
									By distribution key (split using role weights)
								</label>
								<label className="flex items-center gap-2 text-gray-700">
									<input
										type="radio"
										name="split-type"
										value="custom"
										checked={splitType === 'custom'}
										onChange={() => setSplitType('custom')}
										required
									/>
									Custom split (set each participant's share)
								</label>
							</div>
						</fieldset>

						{splitType === 'byCategory' && (
							<div>
								<label htmlFor="category-id" className="mb-1 block text-sm font-medium text-gray-700">
									Distribution key
								</label>
								{categoryDistributions.length === 0 ? (
									<p className="text-sm text-amber-700 bg-amber-50 border border-amber-300 rounded-lg px-4 py-2">
										No distribution keys found. Please add distribution keys from the trip page.
									</p>
								) : (
									<select
										id="category-id"
										value={categoryId}
										onChange={(e) => setCategoryId(e.target.value)}
										required
										className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="" disabled>
											Select distribution key
										</option>
										{categoryDistributions.map((dist) => (
											<option key={dist.id} value={dist.id}>
												{dist.category} (Adult: {dist.adult}, Kid: {dist.kid}, Baby: {dist.baby})
											</option>
										))}
									</select>
								)}
							</div>
						)}

						{splitType === 'custom' && (
							<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
								<h2 className="mb-3 text-lg font-semibold text-gray-900">Custom split amounts</h2>
								{participants.length === 0 ? (
									<p className="text-sm text-gray-500">No participants to split with.</p>
								) : (
									<div className="space-y-3">
										{participants.map((p) => (
											<div key={p.id} className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-center">
												<label htmlFor={`split-${p.id}`} className="text-sm font-medium text-gray-700">
													{p.name}
												</label>
												<input
													id={`split-${p.id}`}
													type="number"
													min="0"
													step="0.01"
													value={customSplits[p.id] || ''}
													onChange={(e) => handleSplitChange(p.id, e.target.value)}
													className="md:col-span-2 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="0.00"
												/>
											</div>
										))}
									</div>
								)}
								<p
									className={`mt-4 text-sm font-semibold ${
										Math.abs(remainingAmount) <= 0.01 ? 'text-green-700' : 'text-red-700'
									}`}
								>
									Remaining to distribute: {remainingAmount.toFixed(2)}
								</p>
							</div>
						)}

						<button
							type="submit"
							disabled={submitting}
							className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{submitting ? 'Creating expense...' : 'Create Expense'}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default AddExpense;

