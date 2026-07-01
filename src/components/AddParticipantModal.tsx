import React, { useEffect, useState } from 'react';
import { createParticipant } from '../services/participants';

interface AddParticipantModalProps {
	tripId: string;
	isOpen: boolean;
	onClose: () => void;
	onParticipantAdded: () => void;
}

const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
	tripId,
	isOpen,
	onClose,
	onParticipantAdded,
}) => {
	const [name, setName] = useState('');
	const [adult, setAdult] = useState('1');
	const [kid, setKid] = useState('0');
	const [baby, setBaby] = useState('0');
	const [nights, setNights] = useState('1');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const resetForm = () => {
		setName('');
		setAdult('1');
		setKid('0');
		setBaby('0');
		setNights('1');
		setLoading(false);
		setError('');
	};

	useEffect(() => {
		if (!isOpen) {
			resetForm();
		}
	}, [isOpen]);

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const handleSubmit = async () => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError('Participant name is required.');
			return;
		}

		const adultCount = Number(adult);
		const kidCount = Number(kid);
		const babyCount = Number(baby);
		const nightsCount = Number(nights);

		if (!Number.isInteger(adultCount) || adultCount < 0) {
			setError('Adult count must be a non-negative integer.');
			return;
		}
		if (!Number.isInteger(kidCount) || kidCount < 0) {
			setError('Kid count must be a non-negative integer.');
			return;
		}
		if (!Number.isInteger(babyCount) || babyCount < 0) {
			setError('Baby count must be a non-negative integer.');
			return;
		}
		if (!Number.isInteger(nightsCount) || nightsCount < 1) {
			setError('Nights must be a positive integer.');
			return;
		}
		if (adultCount + kidCount + babyCount === 0) {
			setError('At least one person (adult, kid, or baby) is required.');
			return;
		}

		setLoading(true);
		setError('');

		try {
			await createParticipant(tripId, trimmedName, adultCount, kidCount, babyCount, nightsCount);
			onParticipantAdded();
			handleClose();
		} catch (err) {
			console.error('Failed to add participant:', err);
			setError('Failed to add participant. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
					<h2 className="text-xl font-bold text-gray-900">Add Participant</h2>
					<button
						type="button"
						onClick={handleClose}
						className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
						aria-label="Close modal"
					>
						✕
					</button>
				</div>

				<div className="space-y-4 px-6 py-5">
					{error && (
						<div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
							{error}
						</div>
					)}

					<div>
						<label htmlFor="participant-name" className="mb-1 block text-sm font-medium text-gray-700">
							Name
						</label>
						<input
							id="participant-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Smith Family"
							className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor="participant-adult" className="mb-1 block text-sm font-medium text-gray-700">
								Adults
							</label>
							<input
								id="participant-adult"
								type="number"
								min="0"
								step="1"
								value={adult}
								onChange={(e) => setAdult(e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label htmlFor="participant-kid" className="mb-1 block text-sm font-medium text-gray-700">
								Kids
							</label>
							<input
								id="participant-kid"
								type="number"
								min="0"
								step="1"
								value={kid}
								onChange={(e) => setKid(e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label htmlFor="participant-baby" className="mb-1 block text-sm font-medium text-gray-700">
								Babies
							</label>
							<input
								id="participant-baby"
								type="number"
								min="0"
								step="1"
								value={baby}
								onChange={(e) => setBaby(e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label htmlFor="participant-nights" className="mb-1 block text-sm font-medium text-gray-700">
								Nights (accommodation)
							</label>
							<input
								id="participant-nights"
								type="number"
								min="1"
								step="1"
								value={nights}
								onChange={(e) => setNights(e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
					<button
						type="button"
						onClick={handleClose}
						className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={loading}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Adding...' : 'Add Participant'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default AddParticipantModal;
