import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getTripById, getTripMembers, removeTripMember, deleteTrip } from '../services/trips';
import { getTripExpenses } from '../services/expenses';
import { getTripParticipants } from '../services/participants';
import { getTripCategoryDistributions } from '../services/categoryDistributions';
import {
	calculateBalances,
	calculateParticipantCategoryTotals,
	calculateSettlements,
} from '../services/settlement';
import AddMemberModal from '../components/AddMemberModal';
import ManageParticipantsModal from '../components/ManageParticipantsModal';
import ManageCategoryDistributionsModal from '../components/ManageCategoryDistributionsModal';
import DeleteExpenseModal from '../components/DeleteExpenseModal';
import ShareTripModal from '../components/ShareTripModal';
import { CategoryDistribution, Expense, Participant, Trip, TripMember } from '../types';

type ExpenseSortField = 'date' | 'category' | 'paidBy' | 'amount' | 'description';
type SortDirection = 'asc' | 'desc';

type CategoryTheme = {
	accent: string;
	soft: string;
	badgeClassName: string;
};

type ExpenseRow = {
	expense: Expense;
	category: string;
	paidByName: string;
};

const CATEGORY_THEMES: CategoryTheme[] = [
	{
		accent: '#2563eb',
		soft: '#dbeafe',
		badgeClassName: 'border-blue-200 bg-blue-50 text-blue-800',
	},
	{
		accent: '#059669',
		soft: '#d1fae5',
		badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
	},
	{
		accent: '#e11d48',
		soft: '#ffe4e6',
		badgeClassName: 'border-rose-200 bg-rose-50 text-rose-800',
	},
	{
		accent: '#d97706',
		soft: '#fef3c7',
		badgeClassName: 'border-amber-200 bg-amber-50 text-amber-800',
	},
	{
		accent: '#7c3aed',
		soft: '#ede9fe',
		badgeClassName: 'border-violet-200 bg-violet-50 text-violet-800',
	},
	{
		accent: '#0891b2',
		soft: '#cffafe',
		badgeClassName: 'border-cyan-200 bg-cyan-50 text-cyan-800',
	},
	{
		accent: '#475569',
		soft: '#e2e8f0',
		badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
	},
];

const getNormalizedCategory = (category: string) => category.trim().toLowerCase();

const hashCategory = (value: string) =>
	Array.from(value).reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);

const getCategoryTheme = (category: string): CategoryTheme => {
	const normalized = getNormalizedCategory(category);

	if (
		normalized.includes('housing') ||
		normalized.includes('accommodation') ||
		normalized.includes('stay')
	) {
		return CATEGORY_THEMES[0];
	}

	if (
		normalized.includes('food') ||
		normalized.includes('meal') ||
		normalized.includes('grocery')
	) {
		return CATEGORY_THEMES[1];
	}

	if (normalized.includes('alcohol') || normalized.includes('drink')) {
		return CATEGORY_THEMES[2];
	}

	if (
		normalized.includes('transport') ||
		normalized.includes('travel') ||
		normalized.includes('taxi') ||
		normalized.includes('fuel')
	) {
		return CATEGORY_THEMES[3];
	}

	if (
		normalized.includes('activity') ||
		normalized.includes('ticket') ||
		normalized.includes('entertainment')
	) {
		return CATEGORY_THEMES[4];
	}

	if (normalized.includes('shopping') || normalized.includes('supply')) {
		return CATEGORY_THEMES[5];
	}

	if (normalized.includes('other') || normalized.includes('misc')) {
		return CATEGORY_THEMES[6];
	}

	return CATEGORY_THEMES[hashCategory(normalized) % CATEGORY_THEMES.length];
};

const TripDetail: React.FC = () => {
	const { tripId } = useParams<{ tripId: string }>();
	const { user, loading: authLoading } = useAuth();
	const navigate = useNavigate();

	const [trip, setTrip] = useState<Trip | null>(null);
	const [members, setMembers] = useState<TripMember[]>([]);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [categoryDistributions, setCategoryDistributions] = useState<CategoryDistribution[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
	const [isManageParticipantsModalOpen, setIsManageParticipantsModalOpen] = useState(false);
	const [isManageDistributionsModalOpen, setIsManageDistributionsModalOpen] = useState(false);
	const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
	const [memberToRemove, setMemberToRemove] = useState<TripMember | null>(null);
	const [isRemovingMember, setIsRemovingMember] = useState(false);
	const [isDeletingTrip, setIsDeletingTrip] = useState(false);
	const [showDeleteTripModal, setShowDeleteTripModal] = useState(false);
	const [deleteTripError, setDeleteTripError] = useState('');
	const [isShareModalOpen, setIsShareModalOpen] = useState(false);
	const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
	const [selectedPaidByFilter, setSelectedPaidByFilter] = useState('all');
	const [expenseSortField, setExpenseSortField] = useState<ExpenseSortField>('date');
	const [expenseSortDirection, setExpenseSortDirection] = useState<SortDirection>('desc');

	const refreshMembers = async () => {
		if (!tripId) return;
		try {
			const latestMembers = await getTripMembers(tripId);
			setMembers(latestMembers);
		} catch (refreshError) {
			console.error('Failed to refresh trip members:', refreshError);
		}
	};

	const handleRemoveMember = async (member: TripMember) => {
		if (!tripId) return;
		setIsRemovingMember(true);
		try {
			await removeTripMember(tripId, member.userId);
			await refreshMembers();
		} catch (removeError) {
			console.error('Failed to remove member:', removeError);
			setError('Failed to remove member. Please try again.');
		} finally {
			setIsRemovingMember(false);
			setMemberToRemove(null);
		}
	};

	const refreshParticipants = async () => {
		if (!tripId) return;
		try {
			const latestParticipants = await getTripParticipants(tripId);
			setParticipants(latestParticipants);
		} catch (refreshError) {
			console.error('Failed to refresh participants:', refreshError);
		}
	};

	const refreshDistributions = async () => {
		if (!tripId) return;
		try {
			const latest = await getTripCategoryDistributions(tripId);
			setCategoryDistributions(latest);
		} catch (refreshError) {
			console.error('Failed to refresh category distributions:', refreshError);
		}
	};

	const refreshExpenses = async () => {
		if (!tripId) return;
		try {
			const latestExpenses = await getTripExpenses(tripId);
			setExpenses(latestExpenses);
		} catch (refreshError) {
			console.error('Failed to refresh trip expenses:', refreshError);
		}
	};

	useEffect(() => {
		if (authLoading) return;

		if (!user) {
			navigate('/login');
			return;
		}

		if (!tripId) {
			setError('Trip not found.');
			setLoading(false);
			return;
		}

		const loadTripDetails = async () => {
			setLoading(true);
			setError(null);

			try {
				const tripData = await getTripById(tripId);

				if (!tripData) {
					setError('Trip not found.');
					setLoading(false);
					return;
				}

				const [tripMembers, tripParticipants, distributions, tripExpenses] = await Promise.all([
					getTripMembers(tripId),
					getTripParticipants(tripId),
					getTripCategoryDistributions(tripId),
					getTripExpenses(tripId),
				]);

				setTrip(tripData);
				setMembers(tripMembers);
				setParticipants(tripParticipants);
				setCategoryDistributions(distributions);
				setExpenses(tripExpenses);
			} catch (loadError) {
				console.error('Failed to load trip details:', loadError);
				setError('Failed to load trip details. Please try again.');
			} finally {
				setLoading(false);
			}
		};

		loadTripDetails();
	}, [tripId, user, authLoading, navigate]);

	const participantNameById = useMemo(() => {
		const map = new Map<string, string>();
		participants.forEach((p) => map.set(p.id, p.name));
		return map;
	}, [participants]);

	const categoryNameById = useMemo(() => {
		const map = new Map<string, string>();
		categoryDistributions.forEach((distribution) => map.set(distribution.id, distribution.category));
		return map;
	}, [categoryDistributions]);

	const settlements = useMemo(
		() => calculateSettlements(expenses, participants, categoryDistributions),
		[expenses, participants, categoryDistributions]
	);

	const balances = useMemo(
		() => calculateBalances(expenses, participants, categoryDistributions),
		[expenses, participants, categoryDistributions]
	);

	const participantCategoryTotals = useMemo(
		() => calculateParticipantCategoryTotals(expenses, participants, categoryDistributions),
		[expenses, participants, categoryDistributions]
	);

	const expenseRows = useMemo<ExpenseRow[]>(() => {
		return expenses.map((expense) => ({
			expense,
			category: expense.categoryId
				? categoryNameById.get(expense.categoryId) || expense.category
				: expense.category,
			paidByName: participantNameById.get(expense.paidByParticipant) || 'Unknown',
		}));
	}, [categoryNameById, expenses, participantNameById]);

	const availableExpenseCategories = useMemo(() => {
		return Array.from(new Set(expenseRows.map((row) => row.category))).sort((a, b) =>
			a.localeCompare(b)
		);
	}, [expenseRows]);

	const filteredExpenses = useMemo(() => {
		const nextExpenses = expenseRows.filter((row) => {
			const matchesCategory =
				selectedCategoryFilter === 'all' || row.category === selectedCategoryFilter;
			const matchesPaidBy =
				selectedPaidByFilter === 'all' || row.expense.paidByParticipant === selectedPaidByFilter;

			return matchesCategory && matchesPaidBy;
		});

		nextExpenses.sort((left, right) => {
			const directionMultiplier = expenseSortDirection === 'asc' ? 1 : -1;

			switch (expenseSortField) {
				case 'amount':
					return (left.expense.amount - right.expense.amount) * directionMultiplier;
				case 'category':
					return left.category.localeCompare(right.category) * directionMultiplier;
				case 'paidBy':
					return left.paidByName.localeCompare(right.paidByName) * directionMultiplier;
				case 'description':
					return left.expense.description.localeCompare(right.expense.description) * directionMultiplier;
				case 'date':
				default:
					return (left.expense.date.getTime() - right.expense.date.getTime()) * directionMultiplier;
			}
		});

		return nextExpenses;
	}, [
		expenseRows,
		expenseSortDirection,
		expenseSortField,
		selectedCategoryFilter,
		selectedPaidByFilter,
	]);

	const chartCategories = useMemo(() => {
		const nextCategories = new Set<string>();

		participantCategoryTotals.forEach((totals) => {
			Object.keys(totals.paidByCategory).forEach((category) => nextCategories.add(category));
			Object.keys(totals.shareByCategory).forEach((category) => nextCategories.add(category));
		});

		return Array.from(nextCategories).sort((a, b) => a.localeCompare(b));
	}, [participantCategoryTotals]);

	const participantChartData = useMemo(() => {
		return participants.map((participant) => {
			const totals = participantCategoryTotals.get(participant.id) || {
				paidByCategory: {},
				shareByCategory: {},
				totalPaid: 0,
				totalShare: 0,
			};
			const balance = balances.get(participant.id) || { spent: 0, share: 0, balance: 0 };

			return {
				participant,
				totals,
				balance,
			};
		});
	}, [balances, participantCategoryTotals, participants]);

	const maxParticipantChartValue = useMemo(() => {
		return participantChartData.reduce((largest, item) => {
			return Math.max(largest, item.totals.totalPaid, item.totals.totalShare);
		}, 0);
	}, [participantChartData]);

	const visibleExpenseTotal = useMemo(() => {
		return filteredExpenses.reduce((total, row) => total + row.expense.amount, 0);
	}, [filteredExpenses]);

	const handleSort = (field: ExpenseSortField) => {
		if (field === expenseSortField) {
			setExpenseSortDirection((currentDirection) =>
				currentDirection === 'asc' ? 'desc' : 'asc'
			);
			return;
		}

		setExpenseSortField(field);
		setExpenseSortDirection(field === 'amount' || field === 'date' ? 'desc' : 'asc');
	};

	const formatDate = (date: Date) =>
		new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		}).format(date);

	const formatCurrency = (value: number) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: trip?.currency && trip.currency !== '€' ? trip.currency : 'EUR',
		}).format(value);

	const handleExpenseDeleted = async () => {
		await refreshExpenses();
		setExpenseToDelete(null);
	};

	const handleDeleteTrip = async () => {
		if (!tripId) return;
		setIsDeletingTrip(true);
		setDeleteTripError('');
		try {
			await deleteTrip(tripId);
			navigate('/dashboard');
		} catch (deleteError: any) {
			console.error('Failed to delete trip:', deleteError);
			setDeleteTripError(deleteError?.message || 'Failed to delete trip. Please try again.');
			setIsDeletingTrip(false);
		}
	};

	if (authLoading || loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="flex items-center gap-3 text-gray-700">
					<div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
					<span>Loading trip details...</span>
				</div>
			</div>
		);
	}

	if (error || !trip) {
		return (
			<div className="min-h-screen bg-gray-50">
				<main className="max-w-6xl mx-auto px-4 py-12">
					<button
						onClick={() => navigate('/dashboard')}
						className="mb-6 text-blue-700 hover:text-blue-900 font-medium"
					>
						← Back to Dashboard
					</button>
					<div className="bg-white rounded-lg shadow p-8 text-center">
						<p className="text-red-600 font-medium">{error || 'Trip not found.'}</p>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
				<section className="bg-white rounded-lg shadow p-6 md:p-8 mb-6">
					<button
						onClick={() => navigate('/dashboard')}
						className="mb-4 text-blue-700 hover:text-blue-900 font-medium"
					>
						← Back to Dashboard
					</button>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">{trip.name}</h1>
							<p className="text-gray-600 mt-2">{trip.description || 'No description provided.'}</p>
						</div>
						<div className="flex flex-col items-start md:items-end gap-3">
							<div className="flex flex-wrap gap-2">
								<button
									onClick={() => setIsShareModalOpen(true)}
									className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
								>
									Share link
								</button>
								{user?.uid === trip.createdBy && (
									<>
										<button
											onClick={() => navigate(`/trip/${trip.id}/edit`)}
											className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
										>
											Edit Trip
										</button>
										<button
											onClick={() => setShowDeleteTripModal(true)}
											className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
										>
											Delete Trip
										</button>
									</>
								)}
							</div>
							<div className="text-sm text-gray-600 bg-gray-100 rounded-lg px-4 py-3">
								<p>
									<span className="font-semibold text-gray-700">Start:</span> {formatDate(trip.startDate)}
								</p>
								<p>
									<span className="font-semibold text-gray-700">End:</span> {formatDate(trip.endDate)}
								</p>
							</div>
						</div>
					</div>
				</section>

				<section className="bg-white rounded-lg shadow p-6 mb-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-2xl font-bold text-gray-900">Members</h2>
						<button
							onClick={() => setIsAddMemberModalOpen(true)}
							className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
						>
							+ Add Member
						</button>
					</div>

					{members.length === 0 ? (
						<p className="text-gray-600">No members yet.</p>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{members.map((member) => (
								<div
									key={member.userId}
									className="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-2"
								>
									<div>
										<p className="text-lg font-semibold text-gray-900">{member.displayName}</p>
										<p className="text-gray-600 text-sm">{member.email}</p>
										<span className="inline-block mt-3 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
											{member.role}
										</span>
									</div>
									{user?.uid === trip.createdBy && member.userId !== trip.createdBy && (
										<button
											onClick={() => setMemberToRemove(member)}
											className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded shrink-0"
										>
											Remove
										</button>
									)}
								</div>
							))}
						</div>
					)}

					{memberToRemove && (
						<div
							className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
							role="dialog"
							aria-modal="true"
							aria-labelledby="remove-member-dialog-title"
						>
							<div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
								<h3 id="remove-member-dialog-title" className="text-lg font-bold text-gray-900 mb-2">
									Remove Member
								</h3>
								<p className="text-gray-600 mb-6">
									Are you sure you want to remove{' '}
									<span className="font-semibold">{memberToRemove.displayName}</span> from this trip?
								</p>
								<div className="flex justify-end gap-3">
									<button
										onClick={() => setMemberToRemove(null)}
										disabled={isRemovingMember}
										className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
									>
										Cancel
									</button>
									<button
										onClick={() => handleRemoveMember(memberToRemove)}
										disabled={isRemovingMember}
										className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
									>
										{isRemovingMember ? 'Removing...' : 'Remove'}
									</button>
								</div>
							</div>
						</div>
					)}
				</section>

				<section className="bg-white rounded-lg shadow p-6 mb-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-2xl font-bold text-gray-900">Participants</h2>
							<p className="text-sm text-gray-500 mt-1">Groups used for expense splitting (e.g. families).</p>
						</div>
						<button
							onClick={() => setIsManageParticipantsModalOpen(true)}
							className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
						>
							Manage Participants
						</button>
					</div>

					{participants.length === 0 ? (
						<p className="text-gray-600">No participants yet. Add participants to split expenses.</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm border-collapse">
								<thead>
									<tr className="border-b border-gray-200 text-gray-700">
										<th className="py-2 pr-4">Name</th>
										<th className="py-2 pr-4">Adults</th>
										<th className="py-2 pr-4">Kids</th>
										<th className="py-2 pr-4">Babies</th>
										<th className="py-2">Nights</th>
									</tr>
								</thead>
								<tbody>
									{participants.map((p) => (
										<tr key={p.id} className="border-b border-gray-100">
											<td className="py-2 pr-4 font-medium text-gray-900">{p.name}</td>
											<td className="py-2 pr-4 text-gray-700">{p.adult}</td>
											<td className="py-2 pr-4 text-gray-700">{p.kid}</td>
											<td className="py-2 pr-4 text-gray-700">{p.baby}</td>
											<td className="py-2 text-gray-700">{p.nights}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>

				<section className="bg-white rounded-lg shadow p-6 mb-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-2xl font-bold text-gray-900">Categories</h2>
							<p className="text-sm text-gray-500 mt-1">
								Role weights applied when splitting expenses by category.
							</p>
						</div>
						<button
							onClick={() => setIsManageDistributionsModalOpen(true)}
							className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
						>
							Manage Categories
						</button>
					</div>

					{categoryDistributions.length === 0 ? (
						<p className="text-gray-600">No categories yet.</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm border-collapse">
								<thead>
									<tr className="border-b border-gray-200 text-gray-700">
										<th className="py-2 pr-4">Category</th>
										<th className="py-2 pr-4">Adult weight</th>
										<th className="py-2 pr-4">Kid weight</th>
										<th className="py-2">Baby weight</th>
									</tr>
								</thead>
								<tbody>
									{categoryDistributions.map((dist) => (
										<tr key={dist.id} className="border-b border-gray-100">
											<td className="py-2 pr-4">
												<span
													className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryTheme(dist.category).badgeClassName}`}
												>
													<span
														className="h-2.5 w-2.5 rounded-full"
														style={{ backgroundColor: getCategoryTheme(dist.category).accent }}
														aria-hidden="true"
													/>
													{dist.category}
												</span>
											</td>
											<td className="py-2 pr-4 text-gray-700">{dist.adult}</td>
											<td className="py-2 pr-4 text-gray-700">{dist.kid}</td>
											<td className="py-2 text-gray-700">{dist.baby}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>

				<section className="bg-white rounded-lg shadow p-6 mb-6">
					<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-4">
						<div>
							<h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
							<p className="mt-1 text-sm text-gray-500">
								Sort and filter expenses by category, payer, amount, or date.
							</p>
						</div>
						<button
							onClick={() => navigate(`/trip/${trip.id}/expense/new`)}
							className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
						>
							+ Add Expense
						</button>
					</div>

					{expenses.length === 0 ? (
						<p className="text-gray-600">No expenses yet.</p>
					) : (
						<>
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-4 mb-5">
								<div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
									<p className="text-sm font-medium text-gray-500">Visible expenses</p>
									<p className="mt-2 text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
									<p className="mt-1 text-xs text-gray-500">
										{filteredExpenses.length === expenses.length
											? 'Showing every expense'
											: `Filtered from ${expenses.length} total`}
									</p>
								</div>
								<div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
									<p className="text-sm font-medium text-gray-500">Visible total</p>
									<p className="mt-2 text-2xl font-bold text-gray-900">
										{formatCurrency(visibleExpenseTotal)}
									</p>
									<p className="mt-1 text-xs text-gray-500">Based on current filters</p>
								</div>
								<div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
									<label htmlFor="expense-category-filter" className="text-sm font-medium text-gray-500">
										Filter by category
									</label>
									<select
										id="expense-category-filter"
										value={selectedCategoryFilter}
										onChange={(event) => setSelectedCategoryFilter(event.target.value)}
										className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="all">All categories</option>
										{availableExpenseCategories.map((category) => (
											<option key={category} value={category}>
												{category}
											</option>
										))}
									</select>
								</div>
								<div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
									<label htmlFor="expense-paidby-filter" className="text-sm font-medium text-gray-500">
										Filter by payer
									</label>
									<select
										id="expense-paidby-filter"
										value={selectedPaidByFilter}
										onChange={(event) => setSelectedPaidByFilter(event.target.value)}
										className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="all">All participants</option>
										{participants.map((participant) => (
											<option key={participant.id} value={participant.id}>
												{participant.name}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="overflow-x-auto">
								<table className="min-w-full text-left text-sm border-collapse">
									<thead>
										<tr className="border-b border-gray-200 text-gray-700">
											{[
												{ key: 'date', label: 'Date' },
												{ key: 'description', label: 'Description' },
												{ key: 'category', label: 'Category' },
												{ key: 'paidBy', label: 'Paid by' },
												{ key: 'amount', label: 'Amount' },
											].map((column) => {
												const isActive = expenseSortField === column.key;
												const directionIndicator =
													isActive && expenseSortDirection === 'asc' ? '↑' : '↓';

												return (
													<th key={column.key} className="py-3 pr-4 font-semibold">
														<button
															type="button"
															onClick={() => handleSort(column.key as ExpenseSortField)}
															className="inline-flex items-center gap-1 text-left hover:text-blue-700"
															aria-label={`Sort expenses by ${column.label}`}
														>
															{column.label}
															<span className={isActive ? 'text-blue-700' : 'text-gray-300'}>
																{directionIndicator}
															</span>
														</button>
													</th>
												);
											})}
											<th className="py-3 pr-4 font-semibold">Split mode</th>
											<th className="py-3 font-semibold text-right">Actions</th>
										</tr>
									</thead>
									<tbody>
										{filteredExpenses.map((row) => {
											const categoryTheme = getCategoryTheme(row.category);

											return (
												<tr key={row.expense.id} className="border-b border-gray-100 align-top">
													<td className="py-4 pr-4 text-gray-700 whitespace-nowrap">
														{formatDate(row.expense.date)}
													</td>
													<td className="py-4 pr-4">
														<div className="flex items-start gap-3">
															<span
																className="mt-1 h-3 w-3 shrink-0 rounded-full"
																style={{ backgroundColor: categoryTheme.accent }}
																aria-hidden="true"
															/>
															<div>
																<p className="font-semibold text-gray-900">
																	{row.expense.description}
																</p>
																<p className="mt-1 text-xs text-gray-500">
																	Recorded on {formatDate(row.expense.date)}
																</p>
															</div>
														</div>
													</td>
													<td className="py-4 pr-4">
														<span
															className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${categoryTheme.badgeClassName}`}
														>
															<span
																className="h-2.5 w-2.5 rounded-full"
																style={{ backgroundColor: categoryTheme.accent }}
																aria-hidden="true"
															/>
															{row.category}
														</span>
													</td>
													<td className="py-4 pr-4 text-gray-700 whitespace-nowrap">{row.paidByName}</td>
													<td className="py-4 pr-4 font-semibold text-gray-900 whitespace-nowrap">
														{formatCurrency(row.expense.amount)}
													</td>
													<td className="py-4 pr-4 text-gray-600">
														{row.expense.splitType === 'byCategory' ? 'Category weights' : 'Custom split'}
													</td>
													<td className="py-4 text-right">
														<div className="flex justify-end gap-3">
															<button
																onClick={() => navigate(`/trip/${trip.id}/expense/${row.expense.id}/edit`)}
																className="text-sm font-medium text-blue-700 hover:text-blue-900"
															>
																Edit
															</button>
															<button
																onClick={() => setExpenseToDelete(row.expense)}
																className="text-sm font-medium text-red-700 hover:text-red-900"
															>
																Delete
															</button>
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{filteredExpenses.length === 0 && (
								<div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-gray-600">
									No expenses match the selected filters.
								</div>
							)}
						</>
					)}
				</section>

				<section className="bg-white rounded-lg shadow p-6 mb-6">
					<div className="mb-4">
						<h2 className="text-2xl font-bold text-gray-900">Participant overview</h2>
						<p className="mt-1 text-sm text-gray-500">
							Trip totals by participant, with stacked bars showing which categories make up what was paid and what each participant owes.
						</p>
					</div>

					{participants.length === 0 || maxParticipantChartValue === 0 ? (
						<p className="text-gray-600">Add expenses to unlock participant spending charts.</p>
					) : (
						<>
							<div className="overflow-x-auto pb-2">
								<div className="flex min-w-max gap-4">
									{participantChartData.map(({ participant, totals, balance }) => (
										<div
											key={participant.id}
											className="w-52 shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-4"
										>
											<div className="flex h-60 items-end justify-center gap-4">
												{([
													{ key: 'paid', label: 'Paid', values: totals.paidByCategory, total: totals.totalPaid },
													{ key: 'share', label: 'Share', values: totals.shareByCategory, total: totals.totalShare },
												] as const).map((bar) => (
													<div key={bar.key} className="flex w-16 flex-col items-center">
														<span className="mb-2 text-center text-xs font-semibold text-gray-700">
															{formatCurrency(bar.total)}
														</span>
														<div className="flex h-40 w-full flex-col justify-end overflow-hidden rounded-t-xl border border-gray-200 bg-white">
															{chartCategories
																.filter((category) => (bar.values[category] ?? 0) > 0)
																.map((category) => (
																	<div
																		key={`${participant.id}-${bar.key}-${category}`}
																		title={`${bar.label}: ${category} — ${formatCurrency(
																			bar.values[category]
																		)}`}
																		style={{
																			height: `${
																				((bar.values[category] ?? 0) / maxParticipantChartValue) * 100
																			}%`,
																			backgroundColor: getCategoryTheme(category).accent,
																		}}
																	/>
																))}
														</div>
														<span className="mt-2 text-xs font-medium text-gray-600">{bar.label}</span>
													</div>
												))}
											</div>
											<p className="mt-4 text-center text-sm font-semibold text-gray-900">{participant.name}</p>
											<p
												className={`mt-1 text-center text-xs font-semibold ${
													balance.balance >= 0 ? 'text-green-700' : 'text-red-700'
												}`}
											>
												Balance {formatCurrency(balance.balance)}
											</p>
										</div>
									))}
								</div>
							</div>

							<div className="mt-5 flex flex-wrap gap-2">
								<span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
									<span className="h-2.5 w-2.5 rounded-full bg-gray-500" aria-hidden="true" />
									Each bar stacks category colors
								</span>
								{chartCategories.map((category) => (
									<span
										key={category}
										className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryTheme(category).badgeClassName}`}
										style={{ backgroundColor: getCategoryTheme(category).soft }}
									>
										<span
											className="h-2.5 w-2.5 rounded-full"
											style={{ backgroundColor: getCategoryTheme(category).accent }}
											aria-hidden="true"
										/>
										{category}
									</span>
								))}
							</div>
						</>
					)}
				</section>

				<section className="bg-white rounded-lg shadow p-6">
					<h2 className="text-2xl font-bold text-gray-900 mb-4">Settlement</h2>

					{settlements.length === 0 ? (
						<p className="text-gray-600 mb-5">All settled up or no expenses to settle.</p>
					) : (
						<div className="space-y-2 mb-5">
							{settlements.map((settlement, index) => (
								<div
									key={`${settlement.from}-${settlement.to}-${index}`}
									className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-900"
								>
									<span className="font-semibold">{settlement.fromName}</span> owes{' '}
									<span className="font-semibold">{settlement.toName}</span>{' '}
									<span className="font-bold">{formatCurrency(settlement.amount)}</span>
								</div>
							))}
						</div>
					)}

					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="border-b border-gray-200 text-gray-700">
									<th className="py-2 pr-2">Participant</th>
									<th className="py-2 pr-2">Spent</th>
									<th className="py-2 pr-2">Share</th>
									<th className="py-2 pr-2">Balance</th>
								</tr>
							</thead>
							<tbody>
								{participants.map((p) => {
									const balance = balances.get(p.id) || { spent: 0, share: 0, balance: 0 };

									return (
										<tr key={p.id} className="border-b border-gray-100">
											<td className="py-3 pr-2 font-medium text-gray-900">{p.name}</td>
											<td className="py-3 pr-2 text-gray-700">{formatCurrency(balance.spent)}</td>
											<td className="py-3 pr-2 text-gray-700">{formatCurrency(balance.share)}</td>
											<td
												className={`py-3 pr-2 font-semibold ${
													balance.balance >= 0 ? 'text-green-700' : 'text-red-700'
												}`}
											>
												{formatCurrency(balance.balance)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</section>

				<AddMemberModal
					tripId={trip.id}
					isOpen={isAddMemberModalOpen}
					onClose={() => setIsAddMemberModalOpen(false)}
					onMemberAdded={refreshMembers}
				/>
				<ShareTripModal
					tripId={trip.id}
					isOpen={isShareModalOpen}
					onClose={() => setIsShareModalOpen(false)}
				/>
				<ManageParticipantsModal
					tripId={trip.id}
					participants={participants}
					expenses={expenses}
					isOpen={isManageParticipantsModalOpen}
					onClose={() => setIsManageParticipantsModalOpen(false)}
					onChanged={refreshParticipants}
				/>
				<ManageCategoryDistributionsModal
					tripId={trip.id}
					distributions={categoryDistributions}
					expenses={expenses}
					isOpen={isManageDistributionsModalOpen}
					onClose={() => setIsManageDistributionsModalOpen(false)}
					onChanged={refreshDistributions}
				/>
				<DeleteExpenseModal
					expenseId={expenseToDelete?.id || ''}
					tripId={trip.id}
					expenseDescription={expenseToDelete?.description || ''}
					isOpen={!!expenseToDelete}
					onClose={() => setExpenseToDelete(null)}
					onDeleted={handleExpenseDeleted}
				/>

				{showDeleteTripModal && (
					<div
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
						role="dialog"
						aria-modal="true"
						aria-labelledby="delete-trip-dialog-title"
					>
						<div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
							<h2 id="delete-trip-dialog-title" className="text-xl font-bold text-gray-900">
								Delete Trip
							</h2>
							<p className="mt-2 text-gray-600">
								Are you sure you want to delete <span className="font-semibold">{trip.name}</span>? This
								will permanently remove the trip and all its data.
							</p>
							<p className="mt-1 text-sm text-gray-500">This cannot be undone.</p>
							{deleteTripError && (
								<div className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
									{deleteTripError}
								</div>
							)}
							<div className="mt-6 flex justify-end gap-3">
								<button
									type="button"
									disabled={isDeletingTrip}
									onClick={() => {
										setShowDeleteTripModal(false);
										setDeleteTripError('');
									}}
									className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleDeleteTrip}
									disabled={isDeletingTrip}
									className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isDeletingTrip ? 'Deleting...' : 'Delete'}
								</button>
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
};

export default TripDetail;
