import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Ban, Building2, Check, KeyRound, Landmark, Pencil, Plus, RefreshCw, UsersRound } from 'lucide-react';
import api from '../../api/client';
import {
    SUBSCRIPTION_PLANS,
    getSubscriptionStatus,
    getDaysRemaining,
} from '../../utils/subscriptionPlans';

export default function BusinessDetail() {
    const { id } = useParams();

    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Renew modal
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [renewing, setRenewing] = useState(false);

    // Reset password modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);

    // Add user modal
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'staff',
    });
    const [addingUser, setAddingUser] = useState(false);

    const loadBusiness = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/admin/businesses/${id}`);
            setBusiness(data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void Promise.resolve().then(loadBusiness);
    }, [loadBusiness]);

    const handleRenew = async () => {
        try {
            setRenewing(true);
            await api.post(`/admin/businesses/${id}/renew`, {
                plan_code: selectedPlan,
            });
            setShowRenewModal(false);
            await loadBusiness();
            alert('Subscription renewed successfully!');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to renew');
        } finally {
            setRenewing(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            alert('Password must be 6+ characters');
            return;
        }
        try {
            setResettingPassword(true);
            await api.post(`/admin/businesses/${id}/reset-owner-password`, {
                new_password: newPassword,
            });
            setShowPasswordModal(false);
            setNewPassword('');
            alert('Owner password reset successfully!');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setResettingPassword(false);
        }
    };

    const handleAddUser = async () => {
        if (!userForm.full_name || !userForm.email || !userForm.password) {
            alert('All fields required');
            return;
        }
        try {
            setAddingUser(true);
            await api.post(`/admin/businesses/${id}/users`, userForm);
            setShowUserModal(false);
            setUserForm({ full_name: '', email: '', password: '', role: 'staff' });
            await loadBusiness();
            alert('User added successfully!');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to add user');
        } finally {
            setAddingUser(false);
        }
    };

    const handleToggleUser = async (userId, currentActive) => {
        try {
            await api.patch(`/admin/users/${userId}/toggle`, {
                is_active: !currentActive,
            });
            await loadBusiness();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to toggle user');
        }
    };

    // ✅ Toggle Business Active/Inactive
    const handleToggleBusiness = async () => {
        const action = business.is_active ? 'deactivate' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} this business?`)) return;

        try {
            await api.patch(`/admin/businesses/${id}/toggle-active`, {
                is_active: !business.is_active,
            });
            await loadBusiness();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    };

    if (loading) {
        return (
            <div className="workspace-card p-12 text-center text-ink-500">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Link
                    to="/admin/businesses"
                    className="inline-flex items-center gap-1 text-primary-700 text-sm font-medium hover:text-primary-900"
                >
                    <ArrowLeft size={15} /> Back
                </Link>
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mt-4">
                    {error}
                </div>
            </div>
        );
    }

    const sub = getSubscriptionStatus(
        business.subscription_status,
        business.subscription_expiry
    );
    const daysLeft = getDaysRemaining(business.subscription_expiry);

    const subColorMap = {
        green: { bg: 'bg-emerald-50', border: 'border-emerald-500', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
        yellow: { bg: 'bg-amber-50', border: 'border-amber-500', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-500', badge: 'bg-orange-50 text-orange-800 border-orange-200' },
        red: { bg: 'bg-red-50', border: 'border-red-500', badge: 'bg-red-50 text-red-800 border-red-200' },
        gray: { bg: 'bg-ink-50', border: 'border-ink-400', badge: 'bg-ink-50 text-ink-700 border-ink-200' },
        blue: { bg: 'bg-primary-50', border: 'border-primary-500', badge: 'bg-primary-50 text-primary-800 border-primary-200' },
    };
    const colors = subColorMap[sub.color] || subColorMap.gray;

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <Link
                    to="/admin/businesses"
                    className="inline-flex items-center gap-1 text-primary-700 text-sm font-medium hover:text-primary-900"
                >
                    <ArrowLeft size={15} /> Back to Businesses
                </Link>
                <div className="flex justify-between items-start mt-2">
                    <div>
                        <h1 className="workspace-title">
                            {business.business_name}
                        </h1>
                        <p className="workspace-copy">
                            Business ID: #{business.id}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            to={`/admin/businesses/${id}/edit`}
                            className="btn btn-secondary"
                        >
                            <Pencil size={15} /> Edit
                        </Link>
                        {parseInt(id) !== 1 && (
                            <button
                                onClick={handleToggleBusiness}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                    business.is_active
                                        ? 'bg-red-50 hover:bg-red-100 text-red-600'
                                        : 'bg-green-50 hover:bg-green-100 text-green-600'
                                }`}
                            >
                                {business.is_active ? <><Ban size={15} /> Deactivate</> : <><Check size={15} /> Activate</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Subscription Card */}
            <div
                className={`rounded-lg border border-ink-200 border-l-4 p-5 sm:p-6 mb-6 ${colors.border} ${colors.bg}`}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                            Subscription
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                            <span
                                className={`inline-flex px-2.5 py-1 rounded-md border text-sm font-semibold ${colors.badge}`}
                            >
                                {sub.label}
                            </span>
                            <span className="text-sm text-ink-600 capitalize">
                                Plan: {business.subscription_status}
                            </span>
                        </div>
                        <div className="mt-3 text-sm text-ink-600">
                            {business.subscription_expiry ? (
                                <>
                                    <strong>Expires:</strong>{' '}
                                    {new Date(
                                        business.subscription_expiry
                                    ).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                    {daysLeft !== null && (
                                        <span className="ml-2 text-xs text-ink-500">
                                            ({daysLeft >= 0
                                                ? `${daysLeft} days left`
                                                : `expired ${Math.abs(daysLeft)} days ago`})
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span>No expiry set</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowRenewModal(true)}
                        className="btn btn-primary"
                    >
                        <RefreshCw size={16} /> Renew / Extend
                    </button>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Company Info */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <Building2 size={18} className="text-primary-700" /> Company Info
                    </h2>
                    <div className="space-y-3 text-sm">
                        <InfoRow label="Legal Name" value={business.legal_name} />
                        <InfoRow label="NIF/CIF" value={business.nif_cif} />
                        <InfoRow label="Address" value={business.address} />
                        <InfoRow
                            label="Location"
                            value={[business.city, business.province, business.country]
                                .filter(Boolean)
                                .join(', ')}
                        />
                        <InfoRow label="Postal Code" value={business.postal_code} />
                        <InfoRow label="Phone" value={business.phone} />
                        <InfoRow label="Email" value={business.email} />
                    </div>
                </div>

                {/* Bank & Tax */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <Landmark size={18} className="text-primary-700" /> Bank & Tax
                    </h2>
                    <div className="space-y-3 text-sm">
                        <InfoRow
                            label="Bank 1"
                            value={
                                business.bank1_name
                                    ? `${business.bank1_name} — ${business.bank1_iban || ''}`
                                    : null
                            }
                        />
                        <InfoRow
                            label="Bank 2"
                            value={
                                business.bank2_name
                                    ? `${business.bank2_name} — ${business.bank2_iban || ''}`
                                    : null
                            }
                        />
                        <InfoRow
                            label="Default IVA"
                            value={
                                business.default_iva_percent
                                    ? `${business.default_iva_percent}%`
                                    : null
                            }
                        />
                        <InfoRow
                            label="Payment"
                            value={business.default_payment_method}
                        />
                        <InfoRow
                            label="Observations"
                            value={business.default_observations}
                        />
                    </div>
                </div>
            </div>

            {/* Users */}
            <div className="workspace-card overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-ink-100 flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <h2 className="workspace-section-title">
                            <UsersRound size={18} className="text-primary-700" /> Users ({business.users?.length || 0})
                        </h2>
                        <p className="text-xs text-ink-500 mt-0.5">
                            Owner + Staff accounts
                        </p>
                    </div>
                    <button
                        onClick={() => setShowUserModal(true)}
                        className="btn btn-secondary btn-sm"
                    >
                        <Plus size={15} /> Add User
                    </button>
                </div>

                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                                Name
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                                Email
                            </th>
                            <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                                Role
                            </th>
                            <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                                Status
                            </th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {business.users?.map((u) => (
                            <tr key={u.id} className="border-b border-slate-100">
                                <td className="px-6 py-3 text-sm text-slate-800 font-medium">
                                    {u.full_name}
                                </td>
                                <td className="px-6 py-3 text-sm text-slate-600">
                                    {u.email}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            u.role === 'owner'
                                                ? 'bg-primary-50 text-primary-800'
                                                : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            u.is_active
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}
                                    >
                                        {u.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button
                                        onClick={() => handleToggleUser(u.id, u.is_active)}
                                        className={`text-xs font-medium ${
                                            u.is_active
                                                ? 'text-red-600 hover:text-red-700'
                                                : 'text-green-600 hover:text-green-700'
                                        }`}
                                    >
                                        {u.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Owner Password */}
            <div className="workspace-card p-5 sm:p-6">
                <h2 className="workspace-section-title mb-2">
                    <KeyRound size={18} className="text-primary-700" /> Owner Password
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                    Reset the owner's password if they forgot it.
                </p>
                <button
                    onClick={() => setShowPasswordModal(true)}
                    className="btn btn-secondary"
                >
                    Reset Owner Password
                </button>
            </div>

            {/* ========== RENEW MODAL ========== */}
            {showRenewModal && (
                <Modal onClose={() => setShowRenewModal(false)} title="Renew Subscription">
                    <p className="text-sm text-slate-600 mb-4">
                        Select a plan to renew/extend this business's subscription.
                    </p>
                    <div className="space-y-2 mb-6">
                        {SUBSCRIPTION_PLANS.map((plan) => (
                            <label
                                key={plan.code}
                                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition ${
                                    selectedPlan === plan.code
                                        ? 'border-primary-600 bg-primary-50'
                                        : 'border-ink-200 hover:border-ink-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="plan"
                                        value={plan.code}
                                        checked={selectedPlan === plan.code}
                                        onChange={(e) => setSelectedPlan(e.target.value)}
                                        className="accent-primary-700"
                                    />
                                    <span className="font-medium text-ink-800">
                                        {plan.label}
                                    </span>
                                </div>
                                <span className="text-sm text-ink-500">
                                    {plan.days} days
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowRenewModal(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRenew}
                            disabled={renewing}
                            className="btn btn-primary disabled:opacity-50"
                        >
                            {renewing ? 'Renewing...' : 'Renew Now'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ========== PASSWORD MODAL ========== */}
            {showPasswordModal && (
                <Modal onClose={() => setShowPasswordModal(false)} title="Reset Owner Password">
                    <p className="text-sm text-slate-600 mb-4">
                        Enter a new password for the owner account.
                    </p>
                    <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        autoFocus
                        className="input mb-6 font-mono"
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

            {/* ========== ADD USER MODAL ========== */}
            {showUserModal && (
                <Modal onClose={() => setShowUserModal(false)} title="Add User">
                    <div className="space-y-3 mb-6">
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={userForm.full_name}
                            onChange={(e) =>
                                setUserForm({ ...userForm, full_name: e.target.value })
                            }
                            className="input"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={userForm.email}
                            onChange={(e) =>
                                setUserForm({ ...userForm, email: e.target.value })
                            }
                            className="input"
                        />
                        <input
                            type="text"
                            placeholder="Password (min 6 chars)"
                            value={userForm.password}
                            onChange={(e) =>
                                setUserForm({ ...userForm, password: e.target.value })
                            }
                            className="input font-mono"
                        />
                        <select
                            value={userForm.role}
                            onChange={(e) =>
                                setUserForm({ ...userForm, role: e.target.value })
                            }
                            className="input"
                        >
                            <option value="staff">Staff</option>
                            <option value="owner">Owner</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowUserModal(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddUser}
                            disabled={addingUser}
                            className="btn btn-primary disabled:opacity-50"
                        >
                            {addingUser ? 'Adding...' : 'Add User'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ============================================
// Helper: Info Row
// ============================================
function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">{label}:</span>
            <span className="text-slate-800 font-medium text-right">
                {value || '—'}
            </span>
        </div>
    );
}

// ============================================
// Helper: Modal
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