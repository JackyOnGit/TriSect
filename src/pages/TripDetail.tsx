import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getTripById, getTripMembers } from '../services/trips';
import { getTripExpenses } from '../services/expenses';
import { calculateBalances, calculateSettlements } from '../services/settlement';
import AddMemberModal from '../components/AddMemberModal';
import { Expense, Trip, TripMember } from '../types';

const TripDetail: React.FC = () => {
	const { tripId } = useParams<{ tripId: string }>();
	const { user, loading: authLoading } = useAuth();
	const navigate = useNavigate();

	const [trip, setTrip] = useState<Trip | null>(null);
	const [members, setMembers] = useState<TripMember[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

	const refreshMembers = async () => {
		if (!tripId) {
			return;
		}

		try {
			const latestMembers = await getTripMembers(tripId);
			setMembers(latestMembers);
		} catch (refreshError) {
			console.error('Failed to refresh trip members:', refreshError);
		}
	};

	useEffect(() => {
		if (authLoading) {
			return;
		}

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

				const [tripMembers, tripExpenses] = await Promise.all([
					getTripMembers(tripId),
					getTripExpenses(tripId),
				]);

				setTrip(tripData);
				setMembers(tripMembers);
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

	const memberNameById = useMemo(() => {
		const nameMap = new Map<string, string>();
		members.forEach((member) => {
			nameMap.set(member.userId, member.displayName);
		});
		return nameMap;
	}, [members]);

	const settlements = useMemo(() => calculateSettlements(expenses, members), [expenses, members]);
	const balances = useMemo(() => calculateBalances(expenses, members), [expenses, members]);

	const formatDate = (date: Date) =>
		new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		}).format(date);

	const formatCurrency = (value: number) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(value);

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
						<div className="text-sm text-gray-600 bg-gray-100 rounded-lg px-4 py-3">
							<p>
								<span className="font-semibold text-gray-700">Start:</span> {formatDate(trip.startDate)}
							</p>
							<p>
								<span className="font-semibold text-gray-700">End:</span> {formatDate(trip.endDate)}
							</p>
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
								<div key={member.userId} className="border border-gray-200 rounded-lg p-4">
									<p className="text-lg font-semibold text-gray-900">{member.displayName}</p>
									<p className="text-gray-600 text-sm">{member.email}</p>
									<span className="inline-block mt-3 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
										{member.role}
									</span>
								</div>
							))}
						</div>
					)}
				</section>

				<section className="bg-white rounded-lg shadow p-6 mb-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
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
						<div className="space-y-3">
							{expenses.map((expense) => (
								<div
									key={expense.id}
									className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
								>
									<div>
										<p className="text-lg font-semibold text-gray-900">{expense.description}</p>
										<p className="text-sm text-gray-600">
											{expense.category} • Paid by {memberNameById.get(expense.paidBy) || 'Unknown'} •{' '}
											{formatDate(expense.date)}
										</p>
									</div>
									<p className="text-lg font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
								</div>
							))}
						</div>
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
									<th className="py-2 pr-2">Member</th>
									<th className="py-2 pr-2">Spent</th>
									<th className="py-2 pr-2">Share</th>
									<th className="py-2 pr-2">Balance</th>
								</tr>
							</thead>
							<tbody>
								{members.map((member) => {
									const balance = balances.get(member.userId) || { spent: 0, share: 0, balance: 0 };

									return (
										<tr key={member.userId} className="border-b border-gray-100">
											<td className="py-3 pr-2 font-medium text-gray-900">{member.displayName}</td>
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
			</main>
		</div>
	);
};

export default TripDetail;
