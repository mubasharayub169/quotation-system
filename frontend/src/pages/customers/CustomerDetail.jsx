import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function CustomerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState(null);
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('quotations');

    const loadCustomer = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/customers/${id}`);
            setCustomer(data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load customer');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const loadHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const { data } = await api.get(`/customers/${id}/history`);
            setHistory(data.data);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void Promise.resolve().then(() => {
            loadCustomer();
            loadHistory();
        });
    }, [loadCustomer, loadHistory]);

    const handleDelete = async () => {
        if (!window.confirm(`Delete customer "${customer.name}"?\n\nThis cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/customers/${id}`);
            navigate('/customers');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete customer');
        }
    };

    if (loading) {
        return (
            <div className="bg-white border border-ink-200 rounded-xl p-12 text-center text-ink-500 shadow-sm">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Link to="/customers" className="text-sm font-medium text-primary-700 hover:text-primary-900">
                    ← Back
                </Link>
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mt-4">
                    {error}
                </div>
            </div>
        );
    }

    const initials = customer.name
        ?.split(' ')
        .map((n) => n.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const fmt = (n) =>
        parseFloat(n || 0).toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const quotationStatusColors = {
        draft: 'gray',
        sent: 'blue',
        accepted: 'emerald',
        rejected: 'red',
        invoiced: 'violet',
    };

    const quotationStatusLabels = {
        draft: 'Draft',
        sent: 'Sent',
        accepted: 'Accepted',
        rejected: 'Rejected',
        invoiced: 'Invoiced',
    };

    const paymentLabels = {
        unpaid: 'Unpaid',
        partial: 'Partial',
        paid: 'Paid',
    };

    const paymentColors = {
        unpaid: 'red',
        partial: 'amber',
        paid: 'emerald',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    to="/customers"
                    className="text-sm font-medium text-primary-700 hover:text-primary-900 transition"
                >
                    ← Back to Customers
                </Link>

                <div className="flex flex-wrap justify-between items-start gap-4 mt-2">
                    <div>
                        <h1 className="text-2xl font-bold text-ink-900 mb-1">
                            {customer.name}
                        </h1>
                        {customer.customer_code && (
                            <p className="text-sm text-ink-500 font-mono">
                                {customer.customer_code}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link
                            to={`/customers/${id}/edit`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-ink-200 hover:border-ink-300 text-ink-700 rounded-xl text-sm font-semibold transition-all shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                        </Link>
                        <button
                            onClick={handleDelete}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl text-sm font-semibold transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Customer Header Card */}
            <div className="bg-white border border-ink-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-bold text-2xl shadow-md flex-shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold text-ink-900 mb-1">
                            {customer.name}
                        </h2>
                        {customer.nif_cif && (
                            <p className="text-sm text-ink-600">
                                NIF/CIF:{' '}
                                <span className="font-mono font-semibold">{customer.nif_cif}</span>
                            </p>
                        )}
                        {!customer.is_active && (
                            <span className="inline-block mt-2 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md text-xs font-medium">
                                Inactive
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            {history && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        label="Total Quoted"
                        value={`${fmt(history.summary.total_quoted)} €`}
                        subtitle={`${history.summary.quotations_count} quotations`}
                        accent="primary"
                    />
                    <SummaryCard
                        label="Total Invoiced"
                        value={`${fmt(history.summary.total_invoiced)} €`}
                        subtitle={`${history.summary.invoices_count} invoices`}
                        accent="violet"
                    />
                    <SummaryCard
                        label="Total Paid"
                        value={`${fmt(history.summary.total_paid)} €`}
                        subtitle="Received"
                        accent="emerald"
                    />
                    <SummaryCard
                        label="Pending"
                        value={`${fmt(history.summary.total_pending)} €`}
                        subtitle="Outstanding"
                        accent="amber"
                    />
                </div>
            )}

            {/* Contact Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">
                            Contact Information
                        </p>
                    </div>
                    <div className="space-y-3 text-sm">
                        <InfoRow label="Phone" value={customer.phone} />
                        <InfoRow label="Mobile" value={customer.mobile} />
                        <InfoRow label="Email" value={customer.email} />
                    </div>
                </div>

                <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">
                            Address
                        </p>
                    </div>
                    <div className="space-y-3 text-sm">
                        <InfoRow label="Street" value={customer.address} />
                        <InfoRow label="City" value={customer.city} />
                        <InfoRow label="Postal Code" value={customer.postal_code} />
                        <InfoRow label="Province" value={customer.province} />
                        <InfoRow label="Country" value={customer.country} />
                    </div>
                </div>
            </div>

            {/* Notes */}
            {customer.notes && (
                <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-ink-900 mb-3">Notes</h2>
                    <p className="text-sm text-ink-600 whitespace-pre-wrap leading-relaxed">
                        {customer.notes}
                    </p>
                </div>
            )}

            {/* ============================================
                HISTORY TABS
                ============================================ */}
            <div className="bg-white border border-ink-200 rounded-xl shadow-sm overflow-hidden">
                {/* Tab Headers */}
                <div className="border-b border-ink-100 px-2 pt-2">
                    <div className="flex gap-1">
                        <TabButton
                            active={activeTab === 'quotations'}
                            onClick={() => setActiveTab('quotations')}
                            label="Quotations"
                            count={history?.summary?.quotations_count || 0}
                        />
                        <TabButton
                            active={activeTab === 'invoices'}
                            onClick={() => setActiveTab('invoices')}
                            label="Invoices"
                            count={history?.summary?.invoices_count || 0}
                        />
                    </div>
                </div>

                {/* Tab Content */}
                <div>
                    {historyLoading ? (
                        <div className="p-12 text-center text-ink-500 text-sm">
                            Loading history...
                        </div>
                    ) : activeTab === 'quotations' ? (
                        <QuotationsTab
                            quotations={history?.quotations || []}
                            statusColors={quotationStatusColors}
                            statusLabels={quotationStatusLabels}
                            fmt={fmt}
                        />
                    ) : (
                        <InvoicesTab
                            invoices={history?.invoices || []}
                            paymentColors={paymentColors}
                            paymentLabels={paymentLabels}
                            fmt={fmt}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// TAB BUTTON
// ============================================
function TabButton({ active, onClick, label, count }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
                active
                    ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                    : 'border-transparent text-ink-500 hover:text-ink-700 hover:bg-ink-50'
            }`}
        >
            <span>{label}</span>
            <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md text-xs font-bold ${
                    active
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-ink-100 text-ink-500'
                }`}
            >
                {count}
            </span>
        </button>
    );
}

// ============================================
// QUOTATIONS TAB
// ============================================
function QuotationsTab({ quotations, statusColors, statusLabels, fmt }) {
    if (quotations.length === 0) {
        return (
            <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-xl bg-ink-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p className="text-sm text-ink-500">No quotations yet</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-ink-50/70 border-b border-ink-200">
                    <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Number</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Date</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Total</th>
                        <th className="text-center px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {quotations.map((q) => (
                        <tr key={q.id} className="hover:bg-ink-50/50 transition-colors">
                            <td className="px-6 py-3.5">
                                <Link
                                    to={`/quotations/${q.id}`}
                                    className="text-sm font-mono font-semibold text-primary-700 hover:text-primary-900 transition"
                                >
                                    {q.quotation_number}
                                </Link>
                            </td>
                            <td className="px-6 py-3.5 text-sm text-ink-600">
                                {new Date(q.quotation_date).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </td>
                            <td className="px-6 py-3.5 text-right text-sm font-semibold text-ink-900 tabular-nums">
                                {fmt(q.grand_total)} €
                            </td>
                            <td className="px-6 py-3.5 text-center">
                                <StatusBadge color={statusColors[q.status]}>
                                    {statusLabels[q.status]}
                                </StatusBadge>
                            </td>
                            <td className="px-6 py-3.5 text-right">
                                <Link
                                    to={`/quotations/${q.id}`}
                                    className="text-sm font-medium text-primary-700 hover:text-primary-900"
                                >
                                    View
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ============================================
// INVOICES TAB
// ============================================
function InvoicesTab({ invoices, paymentColors, paymentLabels, fmt }) {
    if (invoices.length === 0) {
        return (
            <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-xl bg-ink-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p className="text-sm text-ink-500">No invoices yet</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-ink-50/70 border-b border-ink-200">
                    <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Number</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Date</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Total</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Paid</th>
                        <th className="text-center px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-ink-50/50 transition-colors">
                            <td className="px-6 py-3.5">
                                <Link
                                    to={`/invoices/${inv.id}`}
                                    className="text-sm font-mono font-semibold text-primary-700 hover:text-primary-900 transition"
                                >
                                    {inv.invoice_number}
                                </Link>
                            </td>
                            <td className="px-6 py-3.5 text-sm text-ink-600">
                                {new Date(inv.invoice_date).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </td>
                            <td className="px-6 py-3.5 text-right text-sm font-semibold text-ink-900 tabular-nums">
                                {fmt(inv.grand_total)} €
                            </td>
                            <td className="px-6 py-3.5 text-right text-sm text-ink-600 tabular-nums">
                                {fmt(inv.amount_paid)} €
                            </td>
                            <td className="px-6 py-3.5 text-center">
                                <StatusBadge color={paymentColors[inv.payment_status]}>
                                    {paymentLabels[inv.payment_status]}
                                </StatusBadge>
                            </td>
                            <td className="px-6 py-3.5 text-right">
                                <Link
                                    to={`/invoices/${inv.id}`}
                                    className="text-sm font-medium text-primary-700 hover:text-primary-900"
                                >
                                    View
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ============================================
// SUMMARY CARD
// ============================================
function SummaryCard({ label, value, subtitle, accent = 'primary' }) {
    const accentStyles = {
        primary: 'from-primary-500 to-primary-700',
        violet: 'from-violet-500 to-violet-700',
        emerald: 'from-emerald-500 to-emerald-700',
        amber: 'from-amber-500 to-amber-700',
    };

    return (
        <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${accentStyles[accent]}`}></div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                    {label}
                </p>
            </div>
            <p className="text-xl font-bold text-ink-900 tabular-nums">{value}</p>
            {subtitle && (
                <p className="text-xs text-ink-400 mt-1">{subtitle}</p>
            )}
        </div>
    );
}

// ============================================
// INFO ROW
// ============================================
function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between border-b border-ink-100 pb-2">
            <span className="text-ink-500">{label}:</span>
            <span className="font-medium text-ink-900 text-right">{value || '—'}</span>
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
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        gray: 'bg-ink-50 text-ink-600 border-ink-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        violet: 'bg-violet-50 text-violet-700 border-violet-200',
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[color] || colors.gray}`}>
            {children}
        </span>
    );
}