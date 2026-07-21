import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from '../services/auth';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">TriSect</h1>
        <p className="text-center text-gray-600 mb-8">Reset your password</p>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">Password reset email sent!</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your inbox for the password reset link (also check your spam or promotions folder).</li>
                <li>Click the link and reset your password on the confirmation page.</li>
                <li>Once your password is reset, you will see a confirmation message — then manually navigate back to the Trisect login page or click the back button in your browser.</li>
              </ul>
            </div>
            <p className="text-center text-gray-600">
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Back to login
              </Link>
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-600">
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
