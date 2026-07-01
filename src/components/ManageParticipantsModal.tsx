import React, { useEffect, useState } from 'react';
import {
	createParticipant,
	updateParticipant,
	deleteParticipant,
} from '../services/participants';
import { Expense, Participant } from '../types';

interface ManageParticipantsModalProps {
	tripId: string;
	participants: Participant[];
	expenses: Expense[];
	isOpen: boolean;
	onClose: () => void;
	onChanged: () => void;
}

const ManageParticipantsModal: React.FC<ManageParticipantsModalProps> = ({
	tripId,
	participants,
	expenses,
	isOpen,
	onClose,
	onChanged,
}) => {
	const [name, setName] = useState('');
	const [adult, setAdult] = useState('1');
	const [kid, setKid] = useState('0');
	const [baby, setBaby] = useState('0');
	const [nights, setNights] = useState('1');
	const [drafts, setDrafts] = useState<
		Record<string, { name: string; adult: string; kid: string; baby: string; nights: string }>
	>({});
	const [loading, setLoading] = useState(false);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [error, setError] = useState('');

	const resetForm = () => {
		setName('');
		setAdult('1');
		setKid('0');
		setBaby('0');
		setNights('1');
		setLoading(false);
		setSavingId(null);
		setDeletingId(null);
		setError('');
	};

	useEffect(() => {
		if (isOpen) {
			setDrafts(
				Object.fromEntries(
					participants.map((p) => [
						p.id,
						{
							name: p.name,
							adult: String(p.adult),
							kid: String(p.kid),
							baby: String(p.baby),
							nights: String(p.nights),
						},
					])
				)
			);
		}
	}, [participants, isOpen]);

	useEffect(() => {
		if (!isOpen) {
			resetForm();
		}
	}, [isOpen]);

	const getErrorMessage = (err: unknown, fallback: string) =>
		err instanceof Error && err.message ? err.message : fallback;

	const parseCount = (value: string, label: string) => {
		const parsed = Number(value);
		if (!Number.isInteger(parsed) || parsed < 0) {
			throw new Error(`${label} must be a non-negative integer.`);
		}
		return parsed;
	};

	const parseNights = (value: string) => {
		const parsed = Number(value);
		if (!Number.isInteger(parsed) || parsed < 1) {
			throw new Error('Nights must be a positive integer.');
		}
		return parsed;
	};

	const isParticipantUsedInExpenses = (participantId: string): boolean =>
		expenses.some(
			(e) =>
				e.paidByParticipant === participantId ||
				(e.customSplit != null && participantId in e.customSplit)
		);

	const handleAdd = async () => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError('Participant name is required.');
			return;
		}

		try {
			const adultCount = parseCount(adult, 'Adults');
			const kidCount = parseCount(kid, 'Kids');
			const babyCount = parseCount(baby, 'Babies');
			const nightsCount = parseNights(nights);

			if (adultCount + kidCount + babyCount === 0) {
				setError('At least one person (adult, kid, or baby) is required.');
				return;
			}

			setLoading(true);
			setError('');
			await createParticipant(tripId, trimmedName, adultCount, kidCount, babyCount, nightsCount);
			onChanged();
			resetForm();
		} catch (err: unknown) {
			console.error('Failed to add participant:', err);
			setError(getErrorMessage(err, 'Failed to add participant. Please try again.'));
		} finally {
			setLoading(false);
		}
	};

	const handleDraftChange = (
		participantId: string,
		field: 'name' | 'adult' | 'kid' | 'baby' | 'nights',
		value: string
	) => {
		setDrafts((prev) => ({
			...prev,
			[participantId]: {
				...prev[participantId],
				[field]: value,
			},
		}));
	};

	const handleSave = async (participantId: string) => {
		const draft = drafts[participantId];
		const trimmedName = draft?.name?.trim();

		if (!draft || !trimmedName) {
			setError('Participant name is required.');
			return;
		}

		try {
			const adultCount = parseCount(draft.adult, 'Adults');
			const kidCount = parseCount(draft.kid, 'Kids');
			const babyCount = parseCount(draft.baby, 'Babies');
			const nightsCount = parseNights(draft.nights);

			if (adultCount + kidCount + babyCount === 0) {
				setError('At least one person (adult, kid, or baby) is required.');
				return;
			}

			setSavingId(participantId);
			setError('');
			await updateParticipant(tripId, participantId, {
				name: trimmedName,
				adult: adultCount,
				kid: kidCount,
				baby: babyCount,
				nights: nightsCount,
			});
			await onChanged();
		} catch (err: unknown) {
			console.error('Failed to update participant:', err);
			setError(getErrorMessage(err, 'Failed to update participant. Please try again.'));
		} finally {
			setSavingId(null);
		}
	};

	const handleDelete = async (participantId: string) => {
		if (isParticipantUsedInExpenses(participantId)) {
			setError(
				'Cannot delete this participant. There are expenses assigned to this participant. Please delete or modify those expenses first.'
			);
			return;
		}

		try {
			setDeletingId(participantId);
			setError('');
			await deleteParticipant(tripId, participantId);
			await onChanged();
		} catch (err) {
			console.error('Failed to delete participant:', err);
			setError('Failed to delete participant. Please try again.');
		} finally {
			setDeletingId(null);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
					<h2 className="text-xl font-bold text-gray-900">Manage Participants</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
						aria-label="Close modal"
					>
						✕
					</button>
				</div>

				<div className="px-6 py-5 space-y-5">
					{error && (
						<div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
							{error}
						</div>
					)}

					{/* Existing participants */}
					{participants.length === 0 ? (
						<p className="text-sm text-gray-500">No participants yet.</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm border-collapse">
								<thead>
									<tr className="border-b border-gray-200 text-gray-700">
										<th className="py-2 pr-4">Name</th>
										<th className="py-2 pr-4">Adults</th>
										<th className="py-2 pr-4">Kids</th>
										<th className="py-2 pr-4">Babies</th>
										<th className="py-2 pr-4">Nights</th>
										<th className="py-2" />
									</tr>
								</thead>
								<tbody>
									{participants.map((p) => (
										<tr key={p.id} className="border-b border-gray-100">
											<td className="py-2 pr-4">
												<input
													type="text"
													value={drafts[p.id]?.name ?? p.name}
													onChange={(e) => handleDraftChange(p.id, 'name', e.target.value)}
													className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</td>
											<td className="py-2 pr-4">
												<input
													type="number"
													min="0"
													step="1"
													value={drafts[p.id]?.adult ?? String(p.adult)}
													onChange={(e) => handleDraftChange(p.id, 'adult', e.target.value)}
													className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</td>
											<td className="py-2 pr-4">
												<input
													type="number"
													min="0"
													step="1"
													value={drafts[p.id]?.kid ?? String(p.kid)}
													onChange={(e) => handleDraftChange(p.id, 'kid', e.target.value)}
													className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</td>
											<td className="py-2 pr-4">
												<input
													type="number"
													min="0"
													step="1"
													value={drafts[p.id]?.baby ?? String(p.baby)}
													onChange={(e) => handleDraftChange(p.id, 'baby', e.target.value)}
													className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</td>
											<td className="py-2 pr-4">
												<input
													type="number"
													min="1"
													step="1"
													value={drafts[p.id]?.nights ?? String(p.nights)}
													onChange={(e) => handleDraftChange(p.id, 'nights', e.target.value)}
													className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</td>
											<td className="py-2">
												<div className="flex items-center gap-3">
													<button
														type="button"
														onClick={() => handleSave(p.id)}
														disabled={savingId === p.id}
														className="text-xs font-medium text-blue-700 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
													>
														{savingId === p.id ? 'Saving...' : 'Save'}
													</button>
													<button
														type="button"
														onClick={() => handleDelete(p.id)}
														disabled={deletingId === p.id}
														className="text-xs font-medium text-red-700 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
													>
														{deletingId === p.id ? 'Deleting...' : 'Delete'}
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{/* Add new participant */}
					<div className="rounded-lg border border-gray-200 p-4 space-y-3">
						<h3 className="text-sm font-semibold text-gray-700">Add participant</h3>
						<div className="grid grid-cols-2 gap-3">
							<div className="col-span-2">
								<label htmlFor="p-name" className="mb-1 block text-xs font-medium text-gray-700">
									Name
								</label>
								<input
									id="p-name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g. Smith Family"
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label htmlFor="p-adult" className="mb-1 block text-xs font-medium text-gray-700">
									Adults
								</label>
								<input
									id="p-adult"
									type="number"
									min="0"
									step="1"
									value={adult}
									onChange={(e) => setAdult(e.target.value)}
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label htmlFor="p-kid" className="mb-1 block text-xs font-medium text-gray-700">
									Kids
								</label>
								<input
									id="p-kid"
									type="number"
									min="0"
									step="1"
									value={kid}
									onChange={(e) => setKid(e.target.value)}
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label htmlFor="p-baby" className="mb-1 block text-xs font-medium text-gray-700">
									Babies
								</label>
								<input
									id="p-baby"
									type="number"
									min="0"
									step="1"
									value={baby}
									onChange={(e) => setBaby(e.target.value)}
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label htmlFor="p-nights" className="mb-1 block text-xs font-medium text-gray-700">
									Nights (accommodation)
								</label>
								<input
									id="p-nights"
									type="number"
									min="1"
									step="1"
									value={nights}
									onChange={(e) => setNights(e.target.value)}
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>
						<button
							type="button"
							onClick={handleAdd}
							disabled={loading}
							className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? 'Adding...' : 'Add'}
						</button>
					</div>
				</div>

				<div className="flex justify-end border-t border-gray-200 px-6 py-4">
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
};

export default ManageParticipantsModal;
