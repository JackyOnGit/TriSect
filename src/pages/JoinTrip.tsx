import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { joinTripViaCode, validateInviteCode } from '../services/trips';

const JoinTrip: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [validationLoading, setValidationLoading] = useState(true);
  const [tripId, setTripId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinState, setJoinState] = useState<'idle' | 'joining' | 'success'>('idle');

  const code = useMemo(() => searchParams.get('code')?.trim().toUpperCase() ?? '', [searchParams]);
  const redirectPath = `${location.pathname}${location.search}`;
  const authPromptMessage = 'Join trip after signing in';

  // Validate the invite code on mount
  useEffect(() => {
    let isCancelled = false;

    if (!code) {
      setTripId(null);
      setValidationLoading(false);
      setError('This invite link is invalid.');
      return;
    }

    const validateCode = async () => {
      setValidationLoading(true);
      setError(null);
      setJoinState('idle');

      try {
        const result = await validateInviteCode(code);

        if (isCancelled) {
          return;
        }

        if (!result.valid || !result.tripId) {
          setTripId(result.tripId);
          setError(result.error || 'This invite link is invalid.');
          return;
        }

        setTripId(result.tripId);
      } catch (validationError) {
        console.error('Failed to validate invite code:', validationError);
        if (!isCancelled) {
          setTripId(null);
          setError('Unable to validate this invite link right now. Please try again.');
        }
      } finally {
        if (!isCancelled) {
          setValidationLoading(false);
        }
      }
    };

    validateCode();

    return () => {
      isCancelled = true;
    };
  }, [code]);

  // Attempt to join the trip when conditions are met
  useEffect(() => {
    if (authLoading || !user || !tripId || error || joinState !== 'idle') {
      return;
    }

    let isCancelled = false;

    const joinTrip = async () => {
      setJoinState('joining');

      try {
        await joinTripViaCode(user.uid, code);

        if (!isCancelled) {
          setJoinState('success');
        }
      } catch (joinError: any) {
        console.error('Failed to join trip via invite code:', joinError);
        if (!isCancelled) {
          // Handle "already belongs to trip" gracefully - just redirect without error
          if (joinError?.message?.includes('already')) {
            setJoinState('success');
          } else {
            setError(joinError?.message || 'Unable to join this trip right now. Please try again.');
            setJoinState('idle');
          }
        }
      }
    };

    joinTrip();

    return () => {
      isCancelled = true;
    };
  }, [authLoading, code, error, joinState, tripId, user]);

  // Handle successful join by redirecting
  useEffect(() => {
    if (joinState === 'success' && tripId) {
      navigate(`/trip/${tripId}`, { replace: true });
    }
  }, [joinState, tripId, navigate]);

  const loginUrl = `/login?redirect=${encodeURIComponent(redirectPath)}`;
  const registerUrl = `/register?redirect=${encodeURIComponent(redirectPath)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 p-4">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center">
        <div className="w-full rounded-lg bg-white p-8 shadow-xl">
          <h1 className="text-center text-3xl font-bold text-gray-900">Join Trip</h1>
          <p className="mt-2 text-center text-gray-600">Use your invite link to join a shared trip in TriSect.</p>

          {validationLoading || authLoading || joinState === 'joining' ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 text-gray-700">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <p>{joinState === 'joining' ? 'Joining trip...' : 'Checking invite link...'}</p>
            </div>
          ) : error ? (
            <div className="mt-8 rounded-lg border border-red-300 bg-red-50 px-4 py-5 text-center text-red-700">
              <p className="font-medium">{error}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link
                  to={user ? '/dashboard' : '/login'}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  {user ? 'Back to Dashboard' : 'Go to Login'}
                </Link>
              </div>
            </div>
          ) : user && joinState === 'success' ? (
            <div className="mt-8 rounded-lg border border-green-300 bg-green-50 px-4 py-5 text-center text-green-700">
              <p className="font-medium">You've joined the trip!</p>
              <p className="mt-1 text-sm">Redirecting you now...</p>
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 px-6 py-6 text-center">
              <p className="text-lg font-semibold text-gray-900">{authPromptMessage}</p>
              <p className="mt-2 text-sm text-gray-600">
                Sign in or create an account, and we&apos;ll connect you to this trip automatically.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to={loginUrl}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Sign In
                </Link>
                <Link
                  to={registerUrl}
                  className="rounded-lg border border-blue-600 px-5 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinTrip;
