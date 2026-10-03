import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Search } from 'lucide-react';
import api from '../../api/client';
import { getSubscriptionStatus } from '../../utils/subscriptionPlans';

export default function BusinessList() {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const fetchBusinesses = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/admin/businesses');
            setBusinesses(data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load businesses');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(fetchBusinesses);
    }, [fetchBusinesses]);

    const handleToggleActive = async (id, currentActive, name) => {
        const action = currentActive ? 'deactivate' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} "${name}"?`)) return;

        try {
            await api.patch(`/admin/businesses/${id}/toggle-active`, {
                is_active: !currentActive,
            });
            fetchBusinesses();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update');
        }
    };

    const filtered = businesses.filter((b) =>
        b.business_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.nif_cif?.toLowerCase().includes(search.toLowerCase()) ||
        b.owner_email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-700">PLATFORM MANAGEMENT</p>
                    <h1 className="text-2xl sm:text-[28px] font-bold text-ink-900 mb-1">
                        Businesses
                    </h1>
                    <p className="text-sm text-ink-500">
                        Manage all registered businesses
                    </p>
                </div>
                <Link
                    to="/admin/businesses/new"
                    className="btn btn-primary"
                >
                    <Plus size={17} />
                    New Business
                </Link>
            </div>

            {/* Search */}
            <div className="bg-white border border-ink-200 rounded-lg p-3 sm:p-4 shadow-soft">
                <div className="relative">
                    <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                        type="text"
                        placeholder="Search by name, NIF, or owner email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input pl-10"
                    />
                </div>
                {!loading && (
                    <p className="text-xs text-ink-500 mt-2">
                        {filtered.length} {filtered.length === 1 ? 'business' : 'businesses'} found
                    </p>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                    {error}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="bg-white border border-ink-200 rounded-lg p-12 text-center text-ink-500 shadow-soft">
                    Loading...
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white border border-ink-200 rounded-lg p-12 text-center shadow-soft">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center mx-auto mb-4">
                        <Building2 size={22} />
                    </div>
                    <p className="text-sm text-ink-500 mb-4">
                        {search ? 'No businesses match your search' : 'No businesses yet'}
                    </p>
                    {!search && (
                        <Link
                            to="/admin/businesses/new"
                            className="text-sm font-semibold text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
                        >
                            Create your first business <span>→</span>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="bg-white border border-ink-200 rounded-lg overflow-hidden shadow-soft">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-ink-50/70 border-b border-ink-200">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Business</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Owner</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Users</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Quotes</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Subscription</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {filtered.map((biz) => {
                                    const sub = getSubscriptionStatus(
                                        biz.subscription_status,
                                        biz.subscription_expiry
                                    );

                                    return (
                                        <tr key={biz.id} className="hover:bg-ink-50/50 transition-colors">
                                            {/* Business */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {biz.logo_path ? (
                                                        <img
                                                            src={`/${biz.logo_path}`}
                                                            alt={biz.business_name}
                                                            className="w-9 h-9 rounded-lg object-contain bg-ink-50 p-1 flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                                            {biz.business_name?.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-ink-900 truncate">
                                                            {biz.business_name}
                                                        </p>
                                                        <p className="text-xs text-ink-400">
                                                            NIF: {biz.nif_cif || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Owner */}
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-ink-700 truncate max-w-xs">
                                                    {biz.owner_name || 'N/A'}
                                                </p>
                                                <p className="text-xs text-ink-400 truncate max-w-xs">
                                                    {biz.owner_email || 'N/A'}
                                                </p>
                                            </td>

                                            {/* Users */}
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-ink-100 text-ink-700 text-xs font-semibold">
                                                    {biz.user_count || 0}
                                                </span>
                                            </td>

                                            {/* Quotes */}
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-ink-100 text-ink-700 text-xs font-semibold">
                                                    {biz.quotation_count || 0}
                                                </span>
                                            </td>

                                            {/* Subscription */}
                                            <td className="px-6 py-4 text-center">
                                                <div>
                                                    <StatusBadge color={sub.color}>{sub.label}</StatusBadge>
                                                    {biz.subscription_expiry && (
                                                        <p className="text-[10px] text-ink-400 mt-1">
                                                            {new Date(biz.subscription_expiry).toLocaleDateString('es-ES')}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge color={biz.is_active ? 'emerald' : 'red'}>
                                                    {biz.is_active ? 'Active' : 'Inactive'}
                                                </StatusBadge>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <Link
                                                    to={`/admin/businesses/${biz.id}`}
                                                    className="text-sm font-medium text-primary-700 hover:text-primary-900 transition mr-4"
                                                >
                                                    View
                                                </Link>
                                                {biz.id !== 1 ? (
                                                    <button
                                                        onClick={() =>
                                                            handleToggleActive(
                                                                biz.id,
                                                                biz.is_active === 1,
                                                                biz.business_name
                                                            )
                                                        }
                                                        className={`text-sm font-medium transition ${
                                                            biz.is_active === 1
                                                                ? 'text-red-600 hover:text-red-700'
                                                                : 'text-emerald-600 hover:text-emerald-700'
                                                        }`}
                                                    >
                                                        {biz.is_active === 1 ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-ink-400">
                                                        Primary
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// STATUS BADGE
// ============================================
function StatusBadge({ color, children }) {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        yellow: 'bg-amber-50 text-amber-700 border-amber-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        gray: 'bg-ink-50 text-ink-600 border-ink-200',
        blue: 'bg-primary-50 text-primary-700 border-primary-200',
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[color] || colors.gray}`}>
            {children}
        </span>
    );
}