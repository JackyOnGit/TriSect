import React, { useEffect, useState } from 'react';
import {
	createCategoryDistribution,
	updateCategoryDistribution,
	deleteCategoryDistribution,
} from '../services/categoryDistributions';
import { CategoryDistribution } from '../types';

interface ManageCategoryDistributionsModalProps {
	tripId: string;
	distributions: CategoryDistribution[];
	isOpen: boolean;
	onClose: () => void;
	onChanged: () => void;
}

const ManageCategoryDistributionsModal: React.FC<ManageCategoryDistributionsModalProps> = ({
	tripId,
	distributions,
	isOpen,
	onClose,
	onChanged,
}) => {
	const [category, setCategory] = useState('');
	const [adult, setAdult] = useState('1');
	const [kid, setKid] = useState('1');
	const [baby, setBaby] = useState('1');
	const [drafts, setDrafts] = useState<
		Record<string, { category: string; adult: string; kid: string; baby: string }>
	>({});
	const [loading, setLoading] = useState(false);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [error, setError] = useState('');

	const resetForm = () => {
		setCategory('');
		setAdult('1');
		setKid('1');
		setBaby('1');
		setLoading(false);
		setSavingId(null);
		setDeletingId(null);
		setError('');
	};

	useEffect(() => {
		if (isOpen) {
			setDrafts(
				Object.fromEntries(
					distributions.map((distribution) => [
						distribution.id,
						{
							category: distribution.category,
							adult: String(distribution.adult),
							kid: String(distribution.kid),
							baby: String(distribution.baby),
						},
					])
				)
			);
		}
	}, [distributions, isOpen]);

	useEffect(() => {
		if (!isOpen) {
			resetForm();
		}
	}, [isOpen]);

	const parseWeight = (value: string, label: string) => {
		const parsed = Number(value);
		if (!Number.isFinite(parsed) || parsed < 0) {
			throw new Error(`${label} weight must be a non-negative number.`);
		}

		return parsed;
	};

	const getErrorMessage = (error: unknown, fallback: string) =>
		error instanceof Error && error.message ? error.message : fallback;

	const categoryExists = (categoryName: string, excludedId?: string) =>
		distributions.some(
			(distribution) =>
				distribution.id !== excludedId &&
				distribution.category.trim().toLowerCase() === categoryName.trim().toLowerCase()
		);

	const handleAdd = async () => {
		const trimmedCategory = category.trim();
		if (!trimmedCategory) {
			setError('Category name is required.');
			return;
		}
		if (categoryExists(trimmedCategory)) {
			setError('Category names must be unique.');
			return;
		}

		try {
			const adultWeight = parseWeight(adult, 'Adult');
			const kidWeight = parseWeight(kid, 'Kid');
			const babyWeight = parseWeight(baby, 'Baby');

			setLoading(true);
			setError('');
			await createCategoryDistribution(tripId, trimmedCategory, adultWeight, kidWeight, babyWeight);
			onChanged();
			resetForm();
		} catch (err: unknown) {
			console.error('Failed to add distribution key:', err);
			setError(getErrorMessage(err, 'Failed to add distribution key. Please try again.'));
		} finally {
			setLoading(false);
		}
	};

	const handleDraftChange = (
		distributionId: string,
		field: 'category' | 'adult' | 'kid' | 'baby',
		value: string
	) => {
		setDrafts((prev) => ({
			...prev,
			[distributionId]: {
				...prev[distributionId],
				[field]: value,
			},
		}));
	};

	const handleSave = async (distributionId: string) => {
		const draft = drafts[distributionId];
		const trimmedCategory = draft?.category?.trim();

		if (!draft || !trimmedCategory) {
			setError('Category name is required.');
			return;
		}
		if (categoryExists(trimmedCategory, distributionId)) {
			setError('Category names must be unique.');
			return;
		}

		try {
			const adultWeight = parseWeight(draft.adult, 'Adult');
			const kidWeight = parseWeight(draft.kid, 'Kid');
			const babyWeight = parseWeight(draft.baby, 'Baby');

			setSavingId(distributionId);
			setError('');
			await updateCategoryDistribution(tripId, distributionId, {
				category: trimmedCategory,
				adult: adultWeight,
				kid: kidWeight,
				baby: babyWeight,
			});
			await onChanged();
		} catch (err: unknown) {
			console.error('Failed to update distribution key:', err);
			setError(getErrorMessage(err, 'Failed to update distribution key. Please try again.'));
		} finally {
			setSavingId(null);
		}
	};

	const handleDelete = async (distributionId: string) => {
		try {
			setDeletingId(distributionId);
			setError('');
			await deleteCategoryDistribution(tripId, distributionId);
			await onChanged();
		} catch (err) {
			console.error('Failed to delete distribution key:', err);
			setError('Failed to delete distribution key. Please try again.');
		} finally {
			setDeletingId(null);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
					<h2 className="text-xl font-bold text-gray-900">Category Distribution</h2>
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

					{/* Existing distributions */}
					{distributions.length === 0 ? (
						<p className="text-sm text-gray-500">No categories yet.</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm border-collapse">
								<thead>
									<tr className="border-b border-gray-200 text-gray-700">
										<th className="py-2 pr-4">Category</th>
										<th className="py-2 pr-4">Adult</th>
										<th className="py-2 pr-4">Kid</th>
										<th className="py-2 pr-4">Baby</th>
										<th className="py-2" />
									</tr>
								</thead>
								<tbody>
									{distributions.map((dist) => (
										<tr key={dist.id} className="border-b border-gray-100">
											<td className="py-2 pr-4">
												<input
													type="text"
													value={drafts[dist.id]?.category ?? dist.category}
													onChange={(e) => handleDraftChange(dist.id, 'category', e.target.value)}
													className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</td>
											<td className="py-2 pr-4">
												<input
													type="number"
													min="0"
													step="0.1"
													value={drafts[dist.id]?.adult ?? String(dist.adult)}
													onChange={(e) => handleDraftChange(dist.id, 'adult', e.target.value)}
													className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</td>
											<td className="py-2 pr-4">
												<input
													type="number"
													min="0"
													step="0.1"
													value={drafts[dist.id]?.kid ?? String(dist.kid)}
													onChange={(e) => handleDraftChange(dist.id, 'kid', e.target.value)}
													className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</td>
											<td className="py-2 pr-4">
												<input
													type="number"
													min="0"
													step="0.1"
													value={drafts[dist.id]?.baby ?? String(dist.baby)}
													onChange={(e) => handleDraftChange(dist.id, 'baby', e.target.value)}
													className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</td>
											<td className="py-2">
												<div className="flex items-center gap-3">
													<button
														type="button"
														onClick={() => handleSave(dist.id)}
														disabled={savingId === dist.id}
														className="text-xs font-medium text-blue-700 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
													>
														{savingId === dist.id ? 'Saving...' : 'Save'}
													</button>
													<button
														type="button"
														onClick={() => handleDelete(dist.id)}
														disabled={deletingId === dist.id}
														className="text-xs font-medium text-red-700 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
													>
														{deletingId === dist.id ? 'Deleting...' : 'Delete'}
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{/* Add new distribution */}
					<div className="rounded-lg border border-gray-200 p-4 space-y-3">
						<h3 className="text-sm font-semibold text-gray-700">Add category</h3>
						<div className="grid grid-cols-2 gap-3">
							<div className="col-span-2">
								<label htmlFor="dist-category" className="mb-1 block text-xs font-medium text-gray-700">
									Category name
								</label>
								<input
									id="dist-category"
									type="text"
									value={category}
									onChange={(e) => setCategory(e.target.value)}
									placeholder="e.g. Food"
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label htmlFor="dist-adult" className="mb-1 block text-xs font-medium text-gray-700">
									Adult weight
								</label>
								<input
									id="dist-adult"
									type="number"
									min="0"
									step="0.1"
									value={adult}
									onChange={(e) => setAdult(e.target.value)}
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label htmlFor="dist-kid" className="mb-1 block text-xs font-medium text-gray-700">
									Kid weight
								</label>
								<input
									id="dist-kid"
									type="number"
									min="0"
									step="0.1"
									value={kid}
									onChange={(e) => setKid(e.target.value)}
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label htmlFor="dist-baby" className="mb-1 block text-xs font-medium text-gray-700">
									Baby weight
								</label>
								<input
									id="dist-baby"
									type="number"
									min="0"
									step="0.1"
									value={baby}
									onChange={(e) => setBaby(e.target.value)}
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

export default ManageCategoryDistributionsModal;
