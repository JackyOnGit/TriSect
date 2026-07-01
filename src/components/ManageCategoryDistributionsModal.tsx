import React, { useEffect, useState } from 'react';
import {
	createCategoryDistribution,
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
	const [kid, setKid] = useState('0.5');
	const [baby, setBaby] = useState('0');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const resetForm = () => {
		setCategory('');
		setAdult('1');
		setKid('0.5');
		setBaby('0');
		setLoading(false);
		setError('');
	};

	useEffect(() => {
		if (!isOpen) {
			resetForm();
		}
	}, [isOpen]);

	const handleAdd = async () => {
		const trimmedCategory = category.trim();
		if (!trimmedCategory) {
			setError('Category name is required.');
			return;
		}

		const adultWeight = Number(adult);
		const kidWeight = Number(kid);
		const babyWeight = Number(baby);

		if (!Number.isFinite(adultWeight) || adultWeight < 0) {
			setError('Adult weight must be a non-negative number.');
			return;
		}
		if (!Number.isFinite(kidWeight) || kidWeight < 0) {
			setError('Kid weight must be a non-negative number.');
			return;
		}
		if (!Number.isFinite(babyWeight) || babyWeight < 0) {
			setError('Baby weight must be a non-negative number.');
			return;
		}

		setLoading(true);
		setError('');

		try {
			await createCategoryDistribution(tripId, trimmedCategory, adultWeight, kidWeight, babyWeight);
			onChanged();
			resetForm();
		} catch (err) {
			console.error('Failed to add distribution key:', err);
			setError('Failed to add distribution key. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (distributionId: string) => {
		try {
			await deleteCategoryDistribution(tripId, distributionId);
			onChanged();
		} catch (err) {
			console.error('Failed to delete distribution key:', err);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
					<h2 className="text-xl font-bold text-gray-900">Distribution Keys</h2>
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
						<p className="text-sm text-gray-500">No distribution keys yet.</p>
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
											<td className="py-2 pr-4 font-medium text-gray-900">{dist.category}</td>
											<td className="py-2 pr-4 text-gray-700">{dist.adult}</td>
											<td className="py-2 pr-4 text-gray-700">{dist.kid}</td>
											<td className="py-2 pr-4 text-gray-700">{dist.baby}</td>
											<td className="py-2">
												<button
													type="button"
													onClick={() => handleDelete(dist.id)}
													className="text-xs font-medium text-red-700 hover:text-red-900"
												>
													Delete
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{/* Add new distribution */}
					<div className="rounded-lg border border-gray-200 p-4 space-y-3">
						<h3 className="text-sm font-semibold text-gray-700">Add distribution key</h3>
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
