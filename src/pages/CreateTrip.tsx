import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createTrip } from '../services/trips';

const CreateTrip: React.FC = () => {
	const { user, loading: authLoading } = useAuth();
	const navigate = useNavigate();
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!authLoading && !user) {
			navigate('/login');
		}
	}, [authLoading, navigate, user]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!user) {
			setError('You must be logged in to create a trip.');
			return;
		}

		if (endDate <= startDate) {
			setError('End date must be after start date.');
			return;
		}

		setError('');
		setLoading(true);

		try {
			await createTrip(user.uid, name.trim(), description.trim(), new Date(startDate), new Date(endDate));
			navigate('/dashboard');
		} catch (err: any) {
			setError(err.message || 'Failed to create trip');
		} finally {
			setLoading(false);
		}
	};

	if (authLoading) {
		return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 p-4">
			<div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center">
				<div className="w-full rounded-lg bg-white p-8 shadow-xl">
					<div className="mb-8 flex items-center justify-between gap-4">
						<button
							type="button"
							onClick={() => navigate('/dashboard')}
							className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
						>
							Back to Dashboard
						</button>
						<div className="text-right">
							<h1 className="text-3xl font-bold text-gray-900">Create Trip</h1>
							<p className="text-gray-600">Set up a new trip and start tracking expenses.</p>
						</div>
					</div>

					<form onSubmit={handleSubmit} className="space-y-5">
						{error && (
							<div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
								{error}
							</div>
						)}

						<div>
							<label htmlFor="trip-name" className="mb-1 block text-sm font-medium text-gray-700">
								Trip name
							</label>
							<input
								id="trip-name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Summer in Lisbon"
							/>
						</div>

						<div>
							<label htmlFor="trip-description" className="mb-1 block text-sm font-medium text-gray-700">
								Description
							</label>
							<textarea
								id="trip-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={4}
								className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Optional details about the trip"
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
									onChange={(e) => setStartDate(e.target.value)}
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
									onChange={(e) => setEndDate(e.target.value)}
									required
									className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? 'Creating trip...' : 'Create Trip'}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default CreateTrip;
