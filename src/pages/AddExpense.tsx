import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { addExpense } from '../services/expenses';
import { getTripMembers } from '../services/trips';
import { TripMember } from '../types';

type ExpenseCategory = 'Food' | 'Transport' | 'Accommodation' | 'Activities' | 'Other';
type SplitType = 'equal' | 'custom';

const categories: ExpenseCategory[] = ['Food', 'Transport', 'Accommodation', 'Activities', 'Other'];

const AddExpense: React.FC = () => {
	const { tripId } = useParams<{ tripId: string }>();
	const { user, loading: authLoading } = useAuth();
	const navigate = useNavigate();

	const [members, setMembers] = useState<TripMember[]>([]);
	const [membersLoading, setMembersLoading] = useState(true);
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const [description, setDescription] = useState('');
	const [amount, setAmount] = useState('');
	const [category, setCategory] = useState<ExpenseCategory>('Food');
	const [paidBy, setPaidBy] = useState('');
	const [splitType, setSplitType] = useState<SplitType>('equal');
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
	const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

	useEffect(() => {
		if (!authLoading && !user) {
			navigate('/login');
		}
	}, [authLoading, navigate, user]);

	useEffect(() => {
		if (!tripId || !user) {
			setMembersLoading(false);
			return;
		}

		const loadMembers = async () => {
			setMembersLoading(true);
			setError('');

			try {
				const tripMembers = await getTripMembers(tripId);
				setMembers(tripMembers);

				const payerFallback = tripMembers.find((member) => member.userId === user.uid)?.userId;
				setPaidBy(payerFallback || user.uid || tripMembers[0]?.userId || '');

				const nextSplits: Record<string, string> = {};
				tripMembers.forEach((member) => {
					nextSplits[member.userId] = '';
				});
				if (!nextSplits[user.uid]) {
					nextSplits[user.uid] = '';
				}
				setCustomSplits(nextSplits);
			} catch (loadError) {
				console.error('Failed to load trip members:', loadError);
				setError('Failed to load trip members. Please refresh and try again.');
			} finally {
				setMembersLoading(false);
			}
		};

		loadMembers();
	}, [tripId, user]);

	const participants = useMemo(() => {
		const participantMap = new Map<string, { userId: string; displayName: string; email: string }>();

		members.forEach((member) => {
			participantMap.set(member.userId, {
				userId: member.userId,
				displayName: member.displayName,
				email: member.email,
			});
		});

		if (user && !participantMap.has(user.uid)) {
			participantMap.set(user.uid, {
				userId: user.uid,
				displayName: user.displayName || 'You',
				email: user.email || '',
			});
		}

		return Array.from(participantMap.values());
	}, [members, user]);

	const amountValue = Number(amount) || 0;
	const parsedExpenseDate = new Date(`${date}T00:00:00`);
	const customSplitTotal = useMemo(() => {
		return Object.values(customSplits).reduce((sum, splitAmount) => {
			const parsed = Number(splitAmount);
			return sum + (Number.isFinite(parsed) ? parsed : 0);
		}, 0);
	}, [customSplits]);
	const remainingAmount = amountValue - customSplitTotal;

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
		if (!tripId) {
			return 'Trip not found.';
		}

		if (!description.trim() || !amount || !category || !paidBy || !date) {
			return 'Please fill in all required fields.';
		}

		if (!Number.isFinite(amountValue) || amountValue <= 0) {
			return 'Amount must be a positive number.';
		}

		if (Number.isNaN(parsedExpenseDate.getTime())) {
			return 'Please provide a valid expense date.';
		}

		if (!participants.some((participant) => participant.userId === paidBy)) {
			return 'Please select who paid this expense.';
		}

		if (splitType === 'equal' && participants.length === 0) {
			return 'This trip has no members to split the expense with.';
		}

		if (splitType === 'custom') {
			const hasInvalidValue = Object.values(customSplits).some((value) => {
				if (value === '') {
					return false;
				}
				const parsed = Number(value);
				return !Number.isFinite(parsed) || parsed < 0;
			});

			if (hasInvalidValue) {
				return 'Custom split values must be valid positive amounts.';
			}

			const activeParticipants = Object.values(customSplits).filter((value) => Number(value) > 0).length;
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

		const splitAmong =
			splitType === 'equal'
				? participants.map((participant) => participant.userId)
				: Object.entries(customSplits)
						.filter(([, splitAmount]) => Number(splitAmount) > 0)
						.map(([userId]) => userId);

		const sanitizedSplitAmong = splitAmong.filter((userId) => Boolean(userId));
		if (sanitizedSplitAmong.length === 0) {
			setError('Please select at least one participant for this expense split.');
			return;
		}

		const customSplitPayload =
			splitType === 'custom'
				? Object.fromEntries(
						Object.entries(customSplits)
							.filter(([, splitAmount]) => Number(splitAmount) > 0)
							.map(([userId, splitAmount]) => [userId, Number(splitAmount)])
				  )
				: {};

		const sanitizedDescription = description.trim();
		const sanitizedPaidBy = paidBy.trim();

		if (!sanitizedDescription || !sanitizedPaidBy) {
			setError('Please fill in all required fields.');
			return;
		}

		setError('');
		setSubmitting(true);

		try {
			await addExpense(
				tripId,
				sanitizedDescription,
				amountValue,
				category,
				sanitizedPaidBy,
				sanitizedSplitAmong,
				parsedExpenseDate,
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

	if (authLoading || membersLoading) {
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
									value={paidBy}
									onChange={(e) => setPaidBy(e.target.value)}
									required
									className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="" disabled>
										Select member
									</option>
									{participants.map((participant) => (
										<option key={participant.userId} value={participant.userId}>
											{participant.displayName} {participant.email ? `(${participant.email})` : ''}
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
										value="equal"
										checked={splitType === 'equal'}
										onChange={() => setSplitType('equal')}
										required
									/>
									Equal split (divide equally among all members)
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
									Custom split (set each member share)
								</label>
							</div>
						</fieldset>

						{splitType === 'custom' && (
							<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
								<h2 className="mb-3 text-lg font-semibold text-gray-900">Custom split amounts</h2>
								<div className="space-y-3">
									{participants.map((participant) => (
										<div key={participant.userId} className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-center">
											<label htmlFor={`split-${participant.userId}`} className="text-sm font-medium text-gray-700">
												{participant.displayName}
											</label>
											<input
												id={`split-${participant.userId}`}
												type="number"
												min="0"
												step="0.01"
												value={customSplits[participant.userId] || ''}
												onChange={(e) => handleSplitChange(participant.userId, e.target.value)}
												className="md:col-span-2 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
												placeholder="0.00"
											/>
										</div>
									))}
								</div>
								<p className={`mt-4 text-sm font-semibold ${Math.abs(remainingAmount) <= 0.01 ? 'text-green-700' : 'text-red-700'}`}>
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
