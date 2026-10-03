import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { Info, Plus, UserRound } from 'lucide-react';
import api from '../../api/client';

export default function StaffList() {
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // Add user modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [userForm, setUserForm] = useState({
        full_name: '',
        email: '',
        password: '',
    });
    const [addingUser, setAddingUser] = useState(false);
    const [addError, setAddError] = useState('');

    // Password reset modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/business/users');
            setUsers(data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(loadUsers);
    }, [loadUsers]);

    const handleAddUser = async () => {
        setAddError('');

        if (!userForm.full_name || !userForm.email || !userForm.password) {
            setAddError('All fields are required');
            return;
        }
        if (userForm.password.length < 6) {
            setAddError('Password must be at least 6 characters');
            return;
        }

        try {
            setAddingUser(true);
            await api.post('/business/users', {
                ...userForm,
                role: 'staff',
            });
            setShowAddModal(false);
            setUserForm({ full_name: '', email: '', password: '' });
            await loadUsers();
        } catch (err) {
            setAddError(err.response?.data?.error || 'Failed to add user');
        } finally {
            setAddingUser(false);
        }
    };

    const handleToggleUser = async (userId, currentActive, userName) => {
        const action = currentActive ? 'deactivate' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} "${userName}"?`)) return;

        try {
            await api.patch(`/business/users/${userId}/toggle`, {
                is_active: !currentActive,
            });
            await loadUsers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to toggle user');
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            alert('Password must be 6+ characters');
            return;
        }

        try {
            setResettingPassword(true);
            await api.post(`/business/users/${selectedUser.id}/reset-password`, {
                new_password: newPassword,
            });
            setShowPasswordModal(false);
            setNewPassword('');
            setSelectedUser(null);
            alert('Password reset successfully!');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setResettingPassword(false);
        }
    };

    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setNewPassword('');
        setShowPasswordModal(true);
    };

    const filtered = users.filter(
        (u) =>
            u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="workspace-kicker">TEAM</p>
                    <h1 className="workspace-title">Staff Management</h1>
                    <p className="workspace-copy">
                        Manage your team members
                    </p>
                </div>
                <button
                    onClick={() => {
                        setUserForm({ full_name: '', email: '', password: '' });
                        setAddError('');
                        setShowAddModal(true);
                    }}
                    className="btn btn-primary"
                >
                    <Plus size={17} /> Add Staff
                </button>
            </div>

            {/* Info Box */}
            <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 mb-6 flex items-start gap-3">
                <Info size={18} className="mt-0.5 text-primary-700" />
                <div className="text-sm">
                    <p className="font-medium text-primary-900">
                        Staff accounts
                    </p>
                    <p className="text-primary-800 mt-0.5">
                        Staff can create customers, quotations, and invoices. They cannot access settings or manage other users.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="workspace-toolbar rounded-lg p-3 sm:p-4 mb-4">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input"
                />
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
                    {error}
                </div>
            )}

            {/* Users List */}
            {loading ? (
                <div className="workspace-card p-12 text-center text-ink-500">
                    Loading...
                </div>
            ) : filtered.length === 0 ? (
                <div className="workspace-card p-12 text-center">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center mx-auto mb-4">
                        <UserRound size={22} />
                    </div>
                    <p className="text-ink-500">
                        {search ? 'No users match your search' : 'No users yet'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white shadow-soft">
                    <table className="w-full min-w-[900px]">
                        <thead className="bg-ink-50/80 border-b border-ink-200">
                            <tr>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="text-center px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="text-center px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Last Login
                                </th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u) => {
                                const isSelf = u.id === currentUser?.id;
                                const isOwner = u.role === 'owner';

                                return (
                                    <tr
                                        key={u.id}
                                        className="border-b border-ink-100 hover:bg-primary-50/30 transition-colors"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                                                        isOwner
                                                            ? 'bg-primary-50 text-primary-800'
                                                            : 'bg-ink-100 text-ink-700'
                                                    }`}
                                                >
                                                    {u.full_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-ink-900">
                                                        {u.full_name}
                                                        {isSelf && (
                                                            <span className="text-xs text-ink-400 ml-2">
                                                                (You)
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-ink-600">
                                            {u.email}
                                        </td>

                                        <td className="px-5 py-4 text-center">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    isOwner
                                                        ? 'bg-primary-50 text-primary-800'
                                                        : 'bg-ink-100 text-ink-700'
                                                }`}
                                            >
                                                {u.role}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4 text-center">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    u.is_active
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}
                                            >
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-ink-500">
                                            {u.last_login
                                                ? new Date(u.last_login).toLocaleDateString(
                                                      'es-ES',
                                                      {
                                                          day: '2-digit',
                                                          month: 'short',
                                                          year: 'numeric',
                                                      }
                                                  )
                                                : '—'}
                                        </td>

                                        <td className="px-5 py-4 text-right whitespace-nowrap">
                                            {!isOwner && !isSelf ? (
                                                <>
                                                    <button
                                                        onClick={() => openPasswordModal(u)}
                                                        className="text-primary-700 hover:text-primary-900 text-sm font-medium mr-3"
                                                    >
                                                        Reset Password
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleToggleUser(
                                                                u.id,
                                                                u.is_active,
                                                                u.full_name
                                                            )
                                                        }
                                                        className={`text-sm font-medium ${
                                                            u.is_active
                                                                ? 'text-red-600 hover:text-red-700'
                                                                : 'text-green-600 hover:text-green-700'
                                                        }`}
                                                    >
                                                        {u.is_active
                                                            ? 'Deactivate'
                                                            : 'Activate'}
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ========== ADD USER MODAL ========== */}
            {showAddModal && (
                <Modal
                    onClose={() => setShowAddModal(false)}
                    title="Add Staff Member"
                >
                    <p className="text-sm text-ink-600 mb-4">
                        Create a new staff account for your business.
                    </p>

                    {addError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4" role="alert">
                            {addError}
                        </div>
                    )}

                    <div className="space-y-3 mb-6">
                        <div>
                            <label className="label">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                value={userForm.full_name}
                                onChange={(e) =>
                                    setUserForm({
                                        ...userForm,
                                        full_name: e.target.value,
                                    })
                                }
                                placeholder="e.g., Maria Garcia"
                                autoFocus
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="label">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={userForm.email}
                                onChange={(e) =>
                                    setUserForm({
                                        ...userForm,
                                        email: e.target.value,
                                    })
                                }
                                placeholder="maria@yourcompany.com"
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="label">
                                Password * (min 6 chars)
                            </label>
                            <input
                                type="text"
                                value={userForm.password}
                                onChange={(e) =>
                                    setUserForm({
                                        ...userForm,
                                        password: e.target.value,
                                    })
                                }
                                placeholder="e.g., Maria@123"
                                className="input font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddUser}
                            disabled={addingUser}
                            className="btn btn-primary disabled:opacity-50"
                        >
                            {addingUser ? 'Adding...' : 'Add Staff'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ========== RESET PASSWORD MODAL ========== */}
            {showPasswordModal && selectedUser && (
                <Modal
                    onClose={() => setShowPasswordModal(false)}
                    title={`Reset Password: ${selectedUser.full_name}`}
                >
                    <p className="text-sm text-ink-600 mb-4">
                        Set a new password for this staff member.
                    </p>

                    <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        autoFocus
                        className="input font-mono mb-6"
                    />

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowPasswordModal(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleResetPassword}
                            disabled={resettingPassword}
                            className="btn btn-primary disabled:opacity-50"
                        >
                            {resettingPassword ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ============================================
// Modal Component
// ============================================
function Modal({ onClose, title, children }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-ink-200 shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-ink-100 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-ink-400 hover:text-ink-700 text-xl leading-none"
                    >
                        ×
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}