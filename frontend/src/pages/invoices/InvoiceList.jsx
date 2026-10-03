import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';
import api from '../../api/client';

export default function InvoiceList() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');
    const [pagination, setPagination] = useState({ total: 0 });

    const loadInvoices = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/invoices', {
                params: {
                    search,
                    payment_status: paymentFilter,
                    limit: 100,
                },
            });
            setInvoices(data.data);
            setPagination(data.pagination || { total: 0 });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }, [paymentFilter, search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadInvoices();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadInvoices]);

    const handleDelete = async (id, number) => {
        if (!window.confirm(`Delete invoice "${number}"?\n\nThe related quotation will return to "Accepted" status.`)) {
            return;
        }

        try {
            await api.delete(`/invoices/${id}`);
            await loadInvoices();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete invoice');
        }
    };

    // Payment status badges
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
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="workspace-kicker">BILLING</p>
                    <h1 className="workspace-title">Invoices</h1>
                    <p className="workspace-copy">
                        Manage customer invoices
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="workspace-toolbar rounded-lg p-3 sm:p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                        <input
                            type="text"
                            placeholder="Search by invoice number or customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="input md:w-48"
                    >
                        <option value="">All Payment Status</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
                {!loading && (
                    <p className="text-xs text-ink-500 mt-2">
                        {pagination.total} {pagination.total === 1 ? 'invoice' : 'invoices'} found
                    </p>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg" role="alert">
                    {error}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="workspace-card p-12 text-center text-ink-500">
                    Loading...
                </div>
            ) : invoices.length === 0 ? (
                <div className="workspace-card p-12 text-center">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center mx-auto mb-4">
                        <FileText size={22} />
                    </div>
                    <p className="text-sm text-ink-500 mb-4">
                        {search || paymentFilter
                            ? 'No invoices match your filters'
                            : 'No invoices yet'}
                    </p>
                    {!search && !paymentFilter && (
                        <p className="text-xs text-ink-400">
                            Create invoices from accepted quotations
                        </p>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white shadow-soft">
                    <table className="w-full min-w-[900px]">
                            <thead className="bg-ink-50/70 border-b border-ink-200">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Invoice #</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Customer</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Date</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Total</th>
                                    <th className="text-center px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Payment</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-ink-50/50 transition-colors">
                                        {/* Number */}
                                        <td className="px-6 py-4">
                                            <Link
                                                to={`/invoices/${inv.id}`}
                                                className="text-sm font-mono font-semibold text-primary-700 hover:text-primary-900 transition"
                                            >
                                                {inv.invoice_number}
                                            </Link>
                                        </td>

                                        {/* Customer */}
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-ink-900 truncate max-w-xs">
                                                {inv.customer_name}
                                            </p>
                                            {inv.nif_cif && (
                                                <p className="text-xs text-ink-400">
                                                    {inv.nif_cif}
                                                </p>
                                            )}
                                        </td>

                                        {/* Date */}
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-ink-700">
                                                {new Date(inv.invoice_date).toLocaleDateString('es-ES', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                            {inv.due_date && (
                                                <p className="text-xs text-ink-400">
                                                    Due {new Date(inv.due_date).toLocaleDateString('es-ES', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                    })}
                                                </p>
                                            )}
                                        </td>

                                        {/* Total */}
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-sm font-bold text-ink-900">
                                                € {parseFloat(inv.grand_total || 0).toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </p>
                                        </td>

                                        {/* Payment */}
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge color={paymentColors[inv.payment_status]}>
                                                {paymentLabels[inv.payment_status] || inv.payment_status}
                                            </StatusBadge>
                                            {inv.payment_status === 'partial' && parseFloat(inv.amount_paid) > 0 && (
                                                <p className="text-[10px] text-ink-400 mt-1">
                                                    Paid: € {parseFloat(inv.amount_paid).toLocaleString('es-ES')}
                                                </p>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <Link
                                                to={`/invoices/${inv.id}`}
                                                className="text-sm font-medium text-primary-700 hover:text-primary-900 transition mr-4"
                                            >
                                                View
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(inv.id, inv.invoice_number)}
                                                className="text-sm font-medium text-red-600 hover:text-red-700 transition"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                    </table>
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
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
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