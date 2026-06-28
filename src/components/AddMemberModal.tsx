import React, { useEffect, useState } from 'react';
import { addMemberToTrip } from '../services/trips';
import { searchUsersByEmail, UserSearchResult } from '../services/users';

type MemberRole = 'Adult' | 'Kid' | 'Baby';

interface AddMemberModalProps {
	tripId: string;
	isOpen: boolean;
	onClose: () => void;
	onMemberAdded: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
	tripId,
	isOpen,
	onClose,
	onMemberAdded,
}) => {
	const [searchEmail, setSearchEmail] = useState('');
	const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
	const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
	const [selectedRole, setSelectedRole] = useState<MemberRole>('Adult');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const resetForm = () => {
		setSearchEmail('');
		setSearchResults([]);
		setSelectedUser(null);
		setSelectedRole('Adult');
		setLoading(false);
		setError('');
		setSuccess('');
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	useEffect(() => {
		if (!isOpen) {
			resetForm();
			return;
		}

		setError('');
		setSuccess('');
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const trimmedEmail = searchEmail.trim();
		if (trimmedEmail.length < 2 || selectedUser) {
			setSearchResults([]);
			return;
		}

		let isCancelled = false;
		const timeoutId = window.setTimeout(async () => {
			setLoading(true);
			setError('');

			try {
				const results = await searchUsersByEmail(trimmedEmail);
				if (!isCancelled) {
					setSearchResults(results);
				}
			} catch (searchError) {
				console.error('Failed to search users:', searchError);
				if (!isCancelled) {
					setError('Unable to search users right now. Please try again.');
					setSearchResults([]);
				}
			} finally {
				if (!isCancelled) {
					setLoading(false);
				}
			}
		}, 300);

		return () => {
			isCancelled = true;
			window.clearTimeout(timeoutId);
		};
	}, [isOpen, searchEmail, selectedUser]);

	const handleSelectUser = (user: UserSearchResult) => {
		setSelectedUser(user);
		setSearchEmail(user.email);
		setSearchResults([]);
		setError('');
		setSuccess('');
	};

	const handleAddMember = async () => {
		if (!selectedUser) {
			setError('Please select a user to add.');
			return;
		}

		setLoading(true);
		setError('');
		setSuccess('');

		try {
			await addMemberToTrip(tripId, selectedUser.uid, selectedRole);
			setSuccess('Member added successfully.');
			onMemberAdded();
			window.setTimeout(() => {
				handleClose();
			}, 600);
		} catch (addError) {
			console.error('Failed to add member:', addError);
			setError('Failed to add member. Please try again.');
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
					<h2 className="text-xl font-bold text-gray-900">Add Member</h2>
					<button
						type="button"
						onClick={handleClose}
						className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
						aria-label="Close modal"
					>
						X
					</button>
				</div>

				<div className="space-y-4 px-6 py-5">
					{error && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
					{success && (
						<div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
							{success}
						</div>
					)}

					<div>
						<label htmlFor="member-email-search" className="mb-1 block text-sm font-medium text-gray-700">
							Search by email
						</label>
						<input
							id="member-email-search"
							type="email"
							value={searchEmail}
							onChange={(event) => {
								setSearchEmail(event.target.value);
								setSelectedUser(null);
								setSuccess('');
							}}
							placeholder="name@example.com"
							className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					{loading && !selectedUser && (
						<div className="flex items-center gap-2 text-sm text-gray-600">
							<span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
							Searching users...
						</div>
					)}

					{!loading && !selectedUser && searchEmail.trim().length >= 2 && (
						<div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
							{searchResults.length === 0 ? (
								<p className="px-4 py-3 text-sm text-gray-500">No users found for this email.</p>
							) : (
								<ul>
									{searchResults.map((userResult) => (
										<li key={userResult.uid}>
											<button
												type="button"
												onClick={() => handleSelectUser(userResult)}
												className="w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-blue-50 last:border-b-0"
											>
												<p className="font-medium text-gray-900">{userResult.displayName}</p>
												<p className="text-sm text-gray-600">{userResult.email}</p>
											</button>
										</li>
									))}
								</ul>
							)}
						</div>
					)}

					{selectedUser && (
						<div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
							<div>
								<p className="text-sm text-gray-600">Selected user</p>
								<p className="font-semibold text-gray-900">{selectedUser.displayName}</p>
								<p className="text-sm text-gray-600">{selectedUser.email}</p>
							</div>

							<div>
								<label htmlFor="member-role" className="mb-1 block text-sm font-medium text-gray-700">
									Role
								</label>
								<select
									id="member-role"
									value={selectedRole}
									onChange={(event) => setSelectedRole(event.target.value as MemberRole)}
									className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="Adult">Adult</option>
									<option value="Kid">Kid</option>
									<option value="Baby">Baby</option>
								</select>
							</div>
						</div>
					)}
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
						onClick={handleAddMember}
						disabled={!selectedUser || loading}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading && selectedUser ? 'Adding...' : 'Add Member'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default AddMemberModal;
