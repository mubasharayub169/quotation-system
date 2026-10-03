import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Search } from 'lucide-react';
import api from '../../api/client';

export default function QuotationList() {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ total: 0 });

    const loadQuotations = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/quotations', {
                params: {
                    search,
                    status: statusFilter,
                    limit: 100,
                },
            });
            setQuotations(data.data);
            setPagination(data.pagination || { total: 0 });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load quotations');
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadQuotations();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadQuotations]);

    const handleDelete = async (id, number) => {
        if (!window.confirm(`Delete quotation "${number}"?\n\nThis cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/quotations/${id}`);
            await loadQuotations();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete quotation');
        }
    };

    const statusColors = {
        draft: 'bg-ink-50 text-ink-600 border-ink-200',
        sent: 'bg-primary-50 text-primary-800 border-primary-200',
        accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        rejected: 'bg-red-50 text-red-700 border-red-200',
        invoiced: 'bg-amber-50 text-amber-800 border-amber-200',
    };

    const statusLabels = {
        draft: 'Draft',
        sent: 'Sent',
        accepted: 'Accepted',
        rejected: 'Rejected',
        invoiced: 'Invoiced',
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-700">SALES DOCUMENTS</p>
                    <h1 className="text-2xl font-bold text-ink-900 sm:text-[28px]">Quotations</h1>
                    <p className="text-ink-500 text-sm mt-1">
                        Manage customer quotations
                    </p>
                </div>
                <Link
                    to="/quotations/new"
                    className="btn btn-primary"
                >
                    <Plus size={17} /> New Quotation
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white border border-ink-200 rounded-lg shadow-soft p-3 sm:p-4 mb-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
                            <Search size={17} />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by quotation number or customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input md:w-48"
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="invoiced">Invoiced</option>
                    </select>
                </div>
                {!loading && (
                    <p className="text-xs text-ink-500 mt-2">
                        {pagination.total} quotation{pagination.total !== 1 ? 's' : ''} found
                    </p>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
                    {error}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="bg-white border border-ink-200 rounded-lg shadow-soft p-12 text-center text-ink-500">
                    Loading...
                </div>
            ) : quotations.length === 0 ? (
                <div className="bg-white border border-ink-200 rounded-lg shadow-soft p-12 text-center">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center mx-auto mb-4">
                        <FileText size={22} />
                    </div>
                    <p className="text-ink-500 mb-4">
                        {search || statusFilter
                            ? 'No quotations match your filters'
                            : 'No quotations yet'}
                    </p>
                    {!search && !statusFilter && (
                        <Link
                            to="/quotations/new"
                            className="text-primary-700 hover:text-primary-900 text-sm font-semibold"
                        >
                            Create your first quotation →
                        </Link>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white shadow-soft">
                    <table className="w-full min-w-[760px]">
                        <thead className="bg-ink-50/80 border-b border-ink-200">
                            <tr>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Quotation #
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Total
                                </th>
                                <th className="text-center px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotations.map((q) => {
                                const canEdit = q.status !== 'invoiced';
                                const canDelete = q.status !== 'invoiced';

                                return (
                                    <tr
                                        key={q.id}
                                        className="border-b border-ink-100 hover:bg-primary-50/30 transition-colors"
                                    >
                                        <td className="px-5 py-4">
                                            <Link
                                                to={`/quotations/${q.id}`}
                                                className="font-mono font-semibold text-primary-700 hover:text-primary-900"
                                            >
                                                {q.quotation_number}
                                            </Link>
                                        </td>

                                        <td className="px-5 py-4">
                                                <p className="font-semibold text-ink-900">
                                                {q.customer_name}
                                            </p>
                                            {q.nif_cif && (
                                                    <p className="text-xs text-ink-500">
                                                    {q.nif_cif}
                                                </p>
                                            )}
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-sm text-ink-700">
                                                {new Date(q.quotation_date).toLocaleDateString(
                                                    'es-ES',
                                                    {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    }
                                                )}
                                            </p>
                                            <p className="text-xs text-ink-400">
                                                Valid until{' '}
                                                {new Date(q.valid_until).toLocaleDateString(
                                                    'es-ES',
                                                    {
                                                        day: '2-digit',
                                                        month: 'short',
                                                    }
                                                )}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <p className="font-semibold text-ink-900">
                                                €{' '}
                                                {parseFloat(q.grand_total || 0).toLocaleString(
                                                    'es-ES',
                                                    {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    }
                                                )}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4 text-center">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-semibold ${
                                                    statusColors[q.status] ||
                                                    statusColors.draft
                                                }`}
                                            >
                                                {statusLabels[q.status] || q.status}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4 text-right whitespace-nowrap">
                                            <Link
                                                to={`/quotations/${q.id}`}
                                                className="text-primary-700 hover:text-primary-900 text-sm font-semibold mr-3"
                                            >
                                                View
                                            </Link>
                                            {canEdit && (
                                                <Link
                                                    to={`/quotations/${q.id}/edit`}
                                                    className="text-ink-600 hover:text-ink-900 text-sm font-medium mr-3"
                                                >
                                                    Edit
                                                </Link>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() =>
                                                        handleDelete(q.id, q.quotation_number)
                                                    }
                                                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                            {!canEdit && (
                                                <span className="text-xs text-slate-400">
                                                    Locked
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
        </div>
    );
}