'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

export default function AdminSettingsPage() {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<{
    frontendPasswordEnabled: boolean;
    dailyVoteLimitEnabled: boolean;
    pauseVoting: boolean;
  } | null>(null);
  const [frontendPasswordData, setFrontendPasswordData] = useState({
    enabled: false,
    password: '',
    confirmPassword: '',
  });
  const [frontendPasswordLoading, setFrontendPasswordLoading] = useState(false);
  const [frontendPasswordError, setFrontendPasswordError] = useState('');
  const [frontendPasswordSuccess, setFrontendPasswordSuccess] = useState(false);
  const [dailyVoteLimitEnabled, setDailyVoteLimitEnabled] = useState(false);
  const [dailyVoteLimitLoading, setDailyVoteLimitLoading] = useState(false);
  const [dailyVoteLimitError, setDailyVoteLimitError] = useState('');
  const [dailyVoteLimitSuccess, setDailyVoteLimitSuccess] = useState(false);
  const [pauseVotingEnabled, setPauseVotingEnabled] = useState(false);
  const [pauseVotingLoading, setPauseVotingLoading] = useState(false);
  const [pauseVotingError, setPauseVotingError] = useState('');
  const [pauseVotingSuccess, setPauseVotingSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [showDeleteVotesModal, setShowDeleteVotesModal] = useState(false);
  const [deletingVotes, setDeletingVotes] = useState(false);
  const [deleteVotesError, setDeleteVotesError] = useState('');
  const [deleteVotesSuccess, setDeleteVotesSuccess] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchSettings();
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch('/api/admin/me');
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      const data = await res.json();
      setSettings(data.settings);
      setFrontendPasswordData({
        enabled: data.settings?.frontendPasswordEnabled || false,
        password: '',
        confirmPassword: '',
      });
      setDailyVoteLimitEnabled(data.settings?.dailyVoteLimitEnabled || false);
      setPauseVotingEnabled(data.settings?.pauseVoting || false);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAllPlayers() {
    setDeleting(true);
    setDeleteError('');
    setDeleteSuccess(false);

    try {
      const res = await fetch('/api/admin/delete-all-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete all players');

      setDeleteSuccess(true);
      setShowDeleteModal(false);
      setTimeout(() => setDeleteSuccess(false), 5000);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete all players');
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAllVotes() {
    setDeletingVotes(true);
    setDeleteVotesError('');
    setDeleteVotesSuccess(false);

    try {
      const res = await fetch('/api/admin/delete-all-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete votes');

      setDeleteVotesSuccess(true);
      setShowDeleteVotesModal(false);
      setTimeout(() => setDeleteVotesSuccess(false), 5000);
    } catch (error) {
      setDeleteVotesError(error instanceof Error ? error.message : 'Failed to delete votes');
    } finally {
      setDeletingVotes(false);
    }
  }

  async function handleFrontendPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFrontendPasswordError('');
    setFrontendPasswordSuccess(false);
    setFrontendPasswordLoading(true);

    // If enabling, require password
    if (frontendPasswordData.enabled && !frontendPasswordData.password) {
      setFrontendPasswordError('Password is required when enabling front-end protection');
      setFrontendPasswordLoading(false);
      return;
    }

    // If setting a password, require confirmation
    if (frontendPasswordData.password) {
      if (frontendPasswordData.password !== frontendPasswordData.confirmPassword) {
        setFrontendPasswordError("Passwords don't match");
        setFrontendPasswordLoading(false);
        return;
      }

      if (frontendPasswordData.password.length < 4) {
        setFrontendPasswordError('Password must be at least 4 characters');
        setFrontendPasswordLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontendPasswordEnabled: frontendPasswordData.enabled,
          frontendPassword: frontendPasswordData.password || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update front-end password settings');

      setSettings(data.settings);
      setFrontendPasswordData({
        enabled: data.settings.frontendPasswordEnabled,
        password: '',
        confirmPassword: '',
      });
      setFrontendPasswordSuccess(true);
      setTimeout(() => setFrontendPasswordSuccess(false), 3000);
    } catch (error) {
      setFrontendPasswordError(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setFrontendPasswordLoading(false);
    }
  }

  async function handleDailyVoteLimitToggle() {
    setDailyVoteLimitError('');
    setDailyVoteLimitSuccess(false);
    setDailyVoteLimitLoading(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyVoteLimitEnabled: !dailyVoteLimitEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update daily vote limit settings');

      setSettings(data.settings);
      setDailyVoteLimitEnabled(data.settings.dailyVoteLimitEnabled);
      setDailyVoteLimitSuccess(true);
      setTimeout(() => setDailyVoteLimitSuccess(false), 3000);
    } catch (error) {
      setDailyVoteLimitError(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setDailyVoteLimitLoading(false);
    }
  }

  async function handlePauseVotingToggle() {
    setPauseVotingError('');
    setPauseVotingSuccess(false);
    setPauseVotingLoading(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pauseVoting: !pauseVotingEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pause voting setting');

      setSettings(data.settings);
      setPauseVotingEnabled(data.settings.pauseVoting);
      setPauseVotingSuccess(true);
      setTimeout(() => setPauseVotingSuccess(false), 3000);
    } catch (error) {
      setPauseVotingError(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setPauseVotingLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div>
        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        <div className="max-w-2xl space-y-8">
          <div className="p-6 rounded-lg border-2 border-accent-blue bg-gray-900">
            <h2 className="text-2xl font-bold mb-4">Admin Account</h2>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">Username</label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed"
              />
              <p className="text-sm text-gray-400 mt-1">Username cannot be changed</p>
            </div>
          </div>

          <div className="p-6 rounded-lg border-2 border-accent-blue bg-gray-900">
            <h2 className="text-2xl font-bold mb-4">Front-End Password Protection</h2>
            <p className="text-sm text-gray-400 mb-4">
              Enable password protection for development testing. This only affects public pages (home, beastdex, player pages) and does not affect admin pages.
            </p>
            <form onSubmit={handleFrontendPasswordSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="frontendPasswordEnabled"
                  checked={frontendPasswordData.enabled}
                  onChange={(e) =>
                    setFrontendPasswordData({ ...frontendPasswordData, enabled: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-accent-blue focus:ring-accent-blue"
                />
                <label htmlFor="frontendPasswordEnabled" className="text-sm font-medium">
                  Enable front-end password protection
                </label>
              </div>

              {frontendPasswordData.enabled && (
                <>
                  <div>
                    <label className="block mb-2 text-sm font-medium">Password</label>
                    <input
                      type="password"
                      value={frontendPasswordData.password}
                      onChange={(e) =>
                        setFrontendPasswordData({ ...frontendPasswordData, password: e.target.value })
                      }
                      placeholder={settings?.frontendPasswordEnabled ? 'Leave blank to keep current password' : 'Enter password'}
                      minLength={4}
                      className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      {settings?.frontendPasswordEnabled 
                        ? 'Leave blank to keep current password, or enter a new password to change it'
                        : 'Must be at least 4 characters'}
                    </p>
                  </div>
                  {frontendPasswordData.password && (
                    <div>
                      <label className="block mb-2 text-sm font-medium">Confirm Password</label>
                      <input
                        type="password"
                        value={frontendPasswordData.confirmPassword}
                        onChange={(e) =>
                          setFrontendPasswordData({ ...frontendPasswordData, confirmPassword: e.target.value })
                        }
                        minLength={4}
                        className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
                      />
                    </div>
                  )}
                </>
              )}

              {frontendPasswordError && (
                <div className="p-3 rounded-lg bg-red-900 text-red-200 text-sm">
                  {frontendPasswordError}
                </div>
              )}
              {frontendPasswordSuccess && (
                <div className="p-3 rounded-lg bg-green-900 text-green-200 text-sm">
                  Front-end password settings updated successfully!
                </div>
              )}
              <button
                type="submit"
                disabled={frontendPasswordLoading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {frontendPasswordLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </div>

          <div className="p-6 rounded-lg border-2 border-accent-blue bg-gray-900">
            <h2 className="text-2xl font-bold mb-4">Vote Restrictions</h2>
            <p className="text-sm text-gray-400 mb-4">
              When enabled, each player can only receive one vote per day per browser cookie. The day resets at midnight Pacific time. This helps prevent vote manipulation.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="dailyVoteLimitEnabled"
                  checked={dailyVoteLimitEnabled}
                  onChange={handleDailyVoteLimitToggle}
                  disabled={dailyVoteLimitLoading}
                  className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-accent-blue focus:ring-accent-blue disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="dailyVoteLimitEnabled" className="text-sm font-medium">
                  Restrict votes to one vote per player per day
                </label>
              </div>

              {dailyVoteLimitError && (
                <div className="p-3 rounded-lg bg-red-900 text-red-200 text-sm">
                  {dailyVoteLimitError}
                </div>
              )}
              {dailyVoteLimitSuccess && (
                <div className="p-3 rounded-lg bg-green-900 text-green-200 text-sm">
                  Vote restriction settings updated successfully!
                </div>
              )}

              <div className="pt-2 border-t border-gray-800" />

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="pauseVotingEnabled"
                  checked={pauseVotingEnabled}
                  onChange={handlePauseVotingToggle}
                  disabled={pauseVotingLoading}
                  className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-accent-blue focus:ring-accent-blue disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="pauseVotingEnabled" className="text-sm font-medium">
                  Pause voting (show &quot;Voting is currently paused.&quot; to visitors)
                </label>
              </div>

              {pauseVotingError && (
                <div className="p-3 rounded-lg bg-red-900 text-red-200 text-sm">
                  {pauseVotingError}
                </div>
              )}
              {pauseVotingSuccess && (
                <div className="p-3 rounded-lg bg-green-900 text-green-200 text-sm">
                  Pause voting setting updated successfully!
                </div>
              )}
            </div>
          </div>

          <div className="p-6 rounded-lg border-2 border-accent-pink bg-gray-900">
            <h2 className="text-2xl font-bold mb-4">Change Password</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Current Password</label>
                <input
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, currentPassword: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-pink focus:outline-none"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">New Password</label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  required
                  minLength={8}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-pink focus:outline-none"
                />
                <p className="text-sm text-gray-400 mt-1">Must be at least 8 characters</p>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Confirm New Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  minLength={8}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-pink focus:outline-none"
                />
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-900 text-red-200 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-green-900 text-green-200 text-sm">
                  Password changed successfully!
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>

          <div className="p-6 rounded-lg border-2 border-red-600 bg-gray-900">
            <h2 className="text-2xl font-bold mb-4 text-red-400">Danger Zone</h2>
            <p className="text-sm text-gray-400 mb-4">
              Permanently delete all player data including votes and statistics. This action cannot be undone.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              You can also delete <strong>votes only</strong> (keeping players) which resets all vote totals back to 0.
            </p>
            {deleteError && (
              <div className="p-3 rounded-lg bg-red-900 text-red-200 text-sm mb-4">
                {deleteError}
              </div>
            )}
            {deleteSuccess && (
              <div className="p-3 rounded-lg bg-green-900 text-green-200 text-sm mb-4">
                All player data and stats have been deleted successfully.
              </div>
            )}
            {deleteVotesError && (
              <div className="p-3 rounded-lg bg-red-900 text-red-200 text-sm mb-4">
                {deleteVotesError}
              </div>
            )}
            {deleteVotesSuccess && (
              <div className="p-3 rounded-lg bg-green-900 text-green-200 text-sm mb-4">
                All votes have been deleted and vote totals have been reset.
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowDeleteVotesModal(true)}
                className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors"
              >
                Delete Votes Only
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              >
                Delete All Player Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Votes Confirmation Modal */}
      {showDeleteVotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-orange-600 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4 text-orange-400">Confirm Vote Deletion</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <strong>ALL</strong> votes? This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
              <li>All votes</li>
              <li>All vote totals (reset to 0)</li>
            </ul>
            <p className="text-orange-400 font-bold mb-6">
              Players will be kept. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteVotesModal(false);
                  setDeleteVotesError('');
                }}
                disabled={deletingVotes}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllVotes}
                disabled={deletingVotes}
                className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingVotes ? 'Deleting...' : 'Delete Votes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-red-600 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4 text-red-400">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <strong>ALL</strong> player data? This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
              <li>All players</li>
              <li>All votes</li>
              <li>All vote statistics</li>
            </ul>
            <p className="text-red-400 font-bold mb-6">
              This action cannot be undone!
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError('');
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllPlayers}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

