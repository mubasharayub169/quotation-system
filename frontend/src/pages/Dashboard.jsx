import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../api/client';
import { getSubscriptionStatus, getDaysRemaining } from '../utils/subscriptionPlans';

export default function Dashboard() {
    const { isSuperAdmin, isOwner } = useAuth();

    if (isSuperAdmin()) return <AdminDashboard />;
    if (isOwner()) return <OwnerDashboard />;
    return <StaffDashboard />;
}

// ============================================
// SUPER ADMIN DASHBOARD
// ============================================
function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentBusinesses, setRecentBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadStats = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/dashboard');
            setStats(data.data);
            setRecentBusinesses(data.recent_businesses || []);
        } catch (err) {
            console.error('Failed to load dashboard stats:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(loadStats);
    }, [loadStats]);

    const retryStats = () => {
        setLoading(true);
        setError(false);
        loadStats();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 text-ink-500">
                    <div className="w-5 h-5 border-2 border-ink-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <span className="text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return <DashboardLoadError onRetry={retryStats} />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-ink-900 mb-1">Dashboard</h1>
                <p className="text-sm text-ink-500">
                    Welcome back, <span className="font-medium text-ink-700">{user?.name}</span>
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="Active" value={stats?.active_subscriptions || 0} color="emerald" />
                <StatBox label="Trials" value={stats?.trial_subscriptions || 0} color="amber" />
                <StatBox label="Expiring soon" value={stats?.expiring_soon || 0} color="orange" subtitle="Within 7 days" />
                <StatBox label="Expired" value={stats?.expired_subscriptions || 0} color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <BigStatCard
                    label="Total businesses"
                    value={stats?.total_businesses || 0}
                    subtitle={`${stats?.inactive_businesses || 0} inactive`}
                    accent="primary"
                />
                <BigStatCard
                    label="Total users"
                    value={stats?.total_users || 0}
                    subtitle={`${stats?.total_owners || 0} owners · ${stats?.total_staff || 0} staff`}
                    accent="violet"
                />
                <BigStatCard
                    label="Pending renewals"
                    value={(Number(stats?.expiring_soon) || 0) + (Number(stats?.expired_subscriptions) || 0)}
                    subtitle="Needs attention"
                    accent="rose"
                />
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-semibold text-blue-900">Business data is private</p>
                    <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                        Individual business data (customers, quotations, invoices, revenue) is not visible to Super Admin.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-ink-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-ink-900">Recent businesses</h2>
                        <p className="text-xs text-ink-500 mt-0.5">Last 5 registered</p>
                    </div>
                    <Link
                        to="/admin/businesses"
                        className="text-sm font-medium text-primary-700 hover:text-primary-900 transition"
                    >
                        View all →
                    </Link>
                </div>

                {recentBusinesses.length === 0 ? (
                    <div className="p-12 text-center text-sm text-ink-500">
                        No businesses yet
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-ink-50/70 border-b border-ink-200">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Business</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Owner</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Subscription</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {recentBusinesses.map((biz) => {
                                    const sub = getSubscriptionStatus(
                                        biz.subscription_status,
                                        biz.subscription_expiry
                                    );
                                    return (
                                        <tr key={biz.id} className="hover:bg-ink-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0 shadow-sm">
                                                        {biz.business_name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-ink-900 truncate">
                                                            {biz.business_name}
                                                        </p>
                                                        <p className="text-xs text-ink-400">
                                                            Added {new Date(biz.created_at).toLocaleDateString('es-ES')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-ink-600 truncate max-w-xs">
                                                {biz.owner_email || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge color={sub.color}>{sub.label}</StatusBadge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge color={biz.is_active ? 'emerald' : 'red'}>
                                                    {biz.is_active ? 'Active' : 'Inactive'}
                                                </StatusBadge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    to={`/admin/businesses/${biz.id}`}
                                                    className="text-sm font-medium text-primary-700 hover:text-primary-900 transition"
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// OWNER DASHBOARD
// ============================================
function OwnerDashboard() {
    const { user, business } = useAuth();
    const [stats, setStats] = useState({
        customers: 0,
        quotations: 0,
        invoices: 0,
    });
    const [finStats, setFinStats] = useState({
        total_invoiced: 0,
        total_paid: 0,
        total_pending: 0,
        total_quoted: 0,
        total_invoices: 0,
        total_quotations: 0,
        total_customers: 0,
        unpaid_count: 0,
        partial_count: 0,
        paid_count: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadStats = useCallback(async () => {
        try {
            const [c, q, i, fin] = await Promise.all([
                api.get('/customers?limit=1'),
                api.get('/quotations?limit=1'),
                api.get('/invoices?limit=1'),
                api.get('/invoices/summary'),
            ]);
            setStats({
                customers: c.data.pagination?.total || 0,
                quotations: q.data.pagination?.total || 0,
                invoices: i.data.pagination?.total || 0,
            });
            setFinStats(fin.data.data);
        } catch (err) {
            console.error('Failed to load stats:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(loadStats);
    }, [loadStats]);

    const retryStats = () => {
        setLoading(true);
        setError(false);
        loadStats();
    };

    const sub = business
        ? getSubscriptionStatus(business.subscription_status, business.subscription_expiry)
        : null;
    const daysLeft = business?.subscription_expiry
        ? getDaysRemaining(business.subscription_expiry)
        : null;
    const showWarning = sub && (sub.color === 'red' || sub.color === 'orange' || sub.color === 'yellow');

    const fmt = (n) =>
        parseFloat(n || 0).toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    // ✅ Helper: Safe numeric conversion (MySQL returns strings)
    const num = (v) => Number(v) || 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 text-ink-500">
                    <div className="w-5 h-5 border-2 border-ink-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <span className="text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return <DashboardLoadError onRetry={retryStats} />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-ink-900 mb-1">
                        Dashboard
                    </h1>
                    <p className="text-sm text-ink-500">
                        Welcome back, <span className="font-medium text-ink-700">{user?.name}</span>
                    </p>
                </div>

                {business && sub && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-ink-200 rounded-xl shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${
                            sub.color === 'red' ? 'bg-red-500 animate-pulse' :
                            sub.color === 'orange' ? 'bg-orange-500 animate-pulse' :
                            sub.color === 'yellow' ? 'bg-amber-500' :
                            'bg-emerald-500'
                        }`}></span>
                        <div>
                            <p className="text-xs font-semibold text-ink-900 leading-tight">
                                {sub.label}
                            </p>
                            {business.subscription_expiry && (
                                <p className="text-[10px] text-ink-400 leading-tight mt-0.5">
                                    Expires {new Date(business.subscription_expiry).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Warning Bar */}
            {showWarning && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    sub.color === 'red' ? 'bg-red-50 border-red-200' :
                    sub.color === 'orange' ? 'bg-orange-50 border-orange-200' :
                    'bg-amber-50 border-amber-200'
                }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        sub.color === 'red' ? 'bg-red-100' :
                        sub.color === 'orange' ? 'bg-orange-100' :
                        'bg-amber-100'
                    }`}>
                        <svg className={`w-4 h-4 ${
                            sub.color === 'red' ? 'text-red-600' :
                            sub.color === 'orange' ? 'text-orange-600' :
                            'text-amber-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-sm flex-1 text-ink-700">
                        {sub.color === 'red'
                            ? 'Your subscription has expired. Contact your administrator to renew.'
                            : `Your subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Contact your administrator to renew.`}
                    </p>
                </div>
            )}

            {/* ============================================
                FINANCIAL SUMMARY
                ============================================ */}
            <section>
                <h2 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">
                    Financial Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FinancialCard
                        label="Total Invoiced"
                        value={loading ? '—' : `${fmt(finStats.total_invoiced)} €`}
                        subtitle={`${num(finStats.total_invoices)} ${num(finStats.total_invoices) === 1 ? 'invoice' : 'invoices'}`}
                        icon="invoice"
                        gradient="from-violet-500 to-violet-700"
                        bg="from-violet-50/50 to-white"
                    />
                    <FinancialCard
                        label="Total Paid"
                        value={loading ? '—' : `${fmt(finStats.total_paid)} €`}
                        subtitle={`${num(finStats.paid_count)} fully paid`}
                        icon="check"
                        gradient="from-emerald-500 to-emerald-700"
                        bg="from-emerald-50/50 to-white"
                    />
                    <FinancialCard
                        label="Pending Payment"
                        value={loading ? '—' : `${fmt(finStats.total_pending)} €`}
                        subtitle={`${num(finStats.unpaid_count) + num(finStats.partial_count)} outstanding`}
                        icon="clock"
                        gradient="from-amber-500 to-amber-700"
                        bg="from-amber-50/50 to-white"
                        highlight={parseFloat(finStats.total_pending) > 0}
                    />
                </div>
            </section>

            {/* General Stats */}
            <section>
                <h2 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">
                    Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <BigStatCard
                        label="Customers"
                        value={loading ? '—' : stats.customers}
                        link="/customers"
                        accent="primary"
                    />
                    <BigStatCard
                        label="Quotations"
                        value={loading ? '—' : stats.quotations}
                        subtitle={`${fmt(finStats.total_quoted)} € total value`}
                        link="/quotations"
                        accent="violet"
                    />
                    <BigStatCard
                        label="Invoices"
                        value={loading ? '—' : stats.invoices}
                        link="/invoices"
                        accent="emerald"
                    />
                </div>
            </section>

            {/* Quick Actions */}
            <section>
                <h2 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">
                    Quick actions
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <QuickAction
                        to="/quotations/new"
                        label="New quotation"
                        description="Create a quote"
                        accent="primary"
                    />
                    <QuickAction
                        to="/customers/new"
                        label="Add customer"
                        description="New client"
                        accent="emerald"
                    />
                    <QuickAction
                        to="/quotations"
                        label="All quotations"
                        description="View list"
                        accent="violet"
                    />
                    <QuickAction
                        to="/invoices"
                        label="All invoices"
                        description="Manage billing"
                        accent="amber"
                    />
                </div>
            </section>
        </div>
    );
}

// ============================================
// STAFF DASHBOARD
// ============================================
function StaffDashboard() {
    const { user, business } = useAuth();

    const sub = business
        ? getSubscriptionStatus(business.subscription_status, business.subscription_expiry)
        : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-ink-900 mb-1">
                        Dashboard
                    </h1>
                    <p className="text-sm text-ink-500">
                        Welcome back, <span className="font-medium text-ink-700">{user?.name}</span>
                    </p>
                </div>

                {business && sub && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-ink-200 rounded-xl shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${
                            sub.color === 'red' ? 'bg-red-500' :
                            sub.color === 'orange' ? 'bg-orange-500' :
                            sub.color === 'yellow' ? 'bg-amber-500' :
                            'bg-emerald-500'
                        }`}></span>
                        <p className="text-xs font-semibold text-ink-900">{sub.label}</p>
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">
                    Quick actions
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickAction to="/quotations/new" label="New quotation" description="Create a quote" accent="primary" />
                    <QuickAction to="/customers/new" label="Add customer" description="New client" accent="emerald" />
                    <QuickAction to="/quotations" label="All quotations" description="View list" accent="violet" />
                </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white border border-ink-200 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-ink-100 flex items-center justify-center text-ink-500 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <p className="text-sm text-ink-700">
                    Signed in as <strong className="text-ink-900">Staff</strong>
                    {business && <> at <strong className="text-ink-900">{business.business_name}</strong></>}
                </p>
            </div>
        </div>
    );
}

function DashboardLoadError({ onRetry }) {
    return (
        <div className="max-w-xl mx-auto py-16 text-center">
            <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm" role="alert">
                <h1 className="text-lg font-semibold text-ink-900">Dashboard data unavailable</h1>
                <p className="text-sm text-ink-600 mt-2">
                    We couldn’t load the dashboard. Check your connection and try again.
                </p>
                <button type="button" onClick={onRetry} className="btn btn-primary mt-5">
                    Retry
                </button>
            </div>
        </div>
    );
}

// ============================================
// FINANCIAL CARD
// ============================================
function FinancialCard({ label, value, subtitle, icon, gradient, bg, highlight }) {
    const icons = {
        invoice: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />,
        check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
        clock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    };

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${bg} border ${highlight ? 'border-amber-200' : 'border-ink-200'} rounded-xl p-5 shadow-sm`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {icons[icon]}
                    </svg>
                </div>
            </div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                {label}
            </p>
            <p className="text-2xl font-bold text-ink-900 leading-tight tabular-nums">
                {value}
            </p>
            {subtitle && (
                <p className="text-xs text-ink-400 mt-2">{subtitle}</p>
            )}
        </div>
    );
}

// ============================================
// STAT BOX (small)
// ============================================
function StatBox({ label, value, color, subtitle }) {
    const colorStyles = {
        emerald: { text: 'text-emerald-600', dot: 'bg-emerald-500' },
        amber: { text: 'text-amber-600', dot: 'bg-amber-500' },
        orange: { text: 'text-orange-600', dot: 'bg-orange-500' },
        red: { text: 'text-red-600', dot: 'bg-red-500' },
    };
    const style = colorStyles[color] || colorStyles.emerald;

    return (
        <div className="bg-white border border-ink-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                    {label}
                </p>
            </div>
            <p className={`text-2xl font-bold leading-none ${style.text}`}>
                {value}
            </p>
            {subtitle && (
                <p className="text-xs text-ink-400 mt-2">{subtitle}</p>
            )}
        </div>
    );
}

// ============================================
// BIG STAT CARD
// ============================================
function BigStatCard({ label, value, subtitle, link, accent = 'primary' }) {
    const accentStyles = {
        primary: 'from-primary-500 to-primary-700',
        violet: 'from-violet-500 to-violet-700',
        emerald: 'from-emerald-500 to-emerald-700',
        rose: 'from-rose-500 to-rose-700',
        amber: 'from-amber-500 to-amber-700',
    };

    const Wrapper = link ? Link : 'div';
    const wrapperProps = link ? { to: link } : {};

    return (
        <Wrapper
            {...wrapperProps}
            className={`group bg-white border border-ink-200 rounded-xl p-5 shadow-sm transition-all ${
                link ? 'hover:border-ink-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''
            }`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accentStyles[accent]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {accent === 'primary' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
                        {accent === 'violet' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
                        {accent === 'emerald' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
                        {accent === 'rose' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />}
                    </svg>
                </div>
                {link && (
                    <span className="text-ink-300 group-hover:text-ink-500 transition text-sm">→</span>
                )}
            </div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                {label}
            </p>
            <p className="text-3xl font-bold text-ink-900 leading-none">
                {value}
            </p>
            {subtitle && (
                <p className="text-xs text-ink-400 mt-2">{subtitle}</p>
            )}
        </Wrapper>
    );
}

// ============================================
// QUICK ACTION
// ============================================
function QuickAction({ to, label, description, accent = 'primary' }) {
    const accentStyles = {
        primary: 'from-primary-500 to-primary-700',
        emerald: 'from-emerald-500 to-emerald-700',
        violet: 'from-violet-500 to-violet-700',
        amber: 'from-amber-500 to-amber-700',
    };

    return (
        <Link
            to={to}
            className="group bg-white border border-ink-200 rounded-xl p-5 shadow-sm hover:border-ink-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentStyles[accent]} flex items-center justify-center shadow-sm mb-3 group-hover:scale-105 transition-transform`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </div>
            <p className="font-semibold text-ink-900 text-sm mb-0.5">{label}</p>
            <p className="text-xs text-ink-500">{description}</p>
        </Link>
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
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[color] || colors.gray}`}>
            {children}
        </span>
    );
}