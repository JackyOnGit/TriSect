import React, { useEffect, useMemo, useState } from 'react';
import { getTripInviteLinks, generateInviteLink, revokeInviteLink } from '../services/trips';
import { InviteLink } from '../types';
import { formatInviteUrl } from '../utils/inviteLinks';

interface ShareTripModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ShareTripModal: React.FC<ShareTripModalProps> = ({ tripId, isOpen, onClose }) => {
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revokingCode, setRevokingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadInviteLinks = async () => {
    setLoading(true);
    setError('');

    try {
      const links = await getTripInviteLinks(tripId);
      setInviteLinks(links);
    } catch (loadError) {
      console.error('Failed to load invite links:', loadError);
      setError('Unable to load invite links right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setInviteLinks([]);
      setCopiedCode(null);
      setError('');
      return;
    }

    loadInviteLinks();
  }, [isOpen, tripId]);

  useEffect(() => {
    if (!copiedCode) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopiedCode(null), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copiedCode]);

  const getExpirationValidationError = (value: string): string | null => {
    if (value.trim().length === 0) {
      return null;
    }

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return 'Expiration must be a positive number of days or left blank.';
    }

    return null;
  };

  const handleGenerateLink = async () => {
    const trimmedValue = expiresInDays.trim();
    const parsedValue = trimmedValue.length > 0 ? Number(trimmedValue) : undefined;
    const expirationError = getExpirationValidationError(expiresInDays);

    if (expirationError) {
      setError(expirationError);
      return;
    }

    setGenerating(true);
    setError('');

    try {
      await generateInviteLink(tripId, parsedValue);
      await loadInviteLinks();
    } catch (generationError) {
      console.error('Failed to generate invite link:', generationError);
      setError('Unable to generate an invite link right now. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(formatInviteUrl(code));
      setCopiedCode(code);
    } catch (copyError) {
      console.error('Failed to copy invite link:', copyError);
      setError('Copy failed. Please copy the link manually.');
    }
  };

  const handleRevokeLink = async (code: string) => {
    setRevokingCode(code);
    setError('');

    try {
      await revokeInviteLink(tripId, code);
      await loadInviteLinks();
    } catch (revokeError) {
      console.error('Failed to revoke invite link:', revokeError);
      setError('Unable to revoke this invite link right now. Please try again.');
    } finally {
      setRevokingCode(null);
    }
  };

  const formattedLinks = useMemo(
    () =>
      inviteLinks.map((inviteLink) => ({
        ...inviteLink,
        inviteUrl: formatInviteUrl(inviteLink.code),
      })),
    [inviteLinks]
  );

  const formatDateTime = (value: Date) =>
    new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Share Trip</h2>
            <p className="text-sm text-gray-600">Create a link your group can use to join this trip.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close modal"
          >
            X
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {error && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="md:w-56">
                <label htmlFor="invite-expiry" className="mb-1 block text-sm font-medium text-gray-700">
                  Expires in days
                </label>
                <input
                  id="invite-expiry"
                  type="number"
                  min="1"
                  step="1"
                  value={expiresInDays}
                  onChange={(event) => setExpiresInDays(event.target.value)}
                  placeholder="Leave blank for no expiry"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={generating}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate New Link'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Active invite links</h3>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                Loading invite links...
              </div>
            ) : formattedLinks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                No active invite links yet.
              </p>
            ) : (
              formattedLinks.map((inviteLink) => (
                <div key={inviteLink.code} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-700">Invite link</p>
                      <p className="mt-1 break-all rounded bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900">
                        {inviteLink.inviteUrl}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                        <span>Created {formatDateTime(inviteLink.createdAt)}</span>
                        <span>
                          {inviteLink.expiresAt ? `Expires ${formatDateTime(inviteLink.expiresAt)}` : 'No expiration'}
                        </span>
                        <span>Used {inviteLink.currentUses} time{inviteLink.currentUses === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(inviteLink.code)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        {copiedCode === inviteLink.code ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeLink(inviteLink.code)}
                        disabled={revokingCode === inviteLink.code}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {revokingCode === inviteLink.code ? 'Revoking...' : 'Revoke'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareTripModal;
