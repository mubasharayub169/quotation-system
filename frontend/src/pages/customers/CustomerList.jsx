import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Plus, Search, UsersRound } from 'lucide-react';

export default function CustomerList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ total: 0 });

    const loadCustomers = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/customers', {
                params: { search, limit: 100 },
            });
            setCustomers(data.data);
            setPagination(data.pagination || { total: 0 });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load customers');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadCustomers();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadCustomers]);

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete customer "${name}"?\n\nThis cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/customers/${id}`);
            await loadCustomers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete customer');
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="workspace-page-head mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-700">CUSTOMER RECORDS</p>
                    <h1 className="text-2xl font-bold text-ink-900 sm:text-[28px]">Customers</h1>
                    <p className="mt-1 text-sm text-ink-500">
                        Manage your customer database
                    </p>
                </div>
                <Link
                    to="/customers/new"
                    className="btn btn-primary"
                >
                    <Plus size={17} /> New Customer
                </Link>
            </div>

            {/* Search */}
            <div className="workspace-toolbar mb-4 rounded-lg border border-ink-200 bg-white p-3 shadow-soft sm:p-4">
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true">
                        <Search size={17} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by name, NIF, phone, or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input pl-10"
                    />
                </div>
                {!loading && (
                    <p className="text-xs text-ink-500 mt-2">
                        {pagination.total} customer{pagination.total !== 1 ? 's' : ''} found
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
            ) : customers.length === 0 ? (
                <div className="bg-white border border-ink-200 rounded-lg shadow-soft p-12 text-center">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center mx-auto mb-4">
                        <UsersRound size={22} />
                    </div>
                    <p className="text-ink-500 mb-4">
                        {search
                            ? 'No customers match your search'
                            : 'No customers yet'}
                    </p>
                    {!search && (
                        <Link
                            to="/customers/new"
                            className="text-primary-700 hover:text-primary-900 text-sm font-semibold"
                        >
                            Add your first customer →
                        </Link>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white shadow-soft">
                    <table className="w-full min-w-[720px]">
                        <thead className="bg-ink-50/80 border-b border-ink-200">
                            <tr>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Contact
                                </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Location
                                </th>
                                    <th className="text-right px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c) => (
                                <tr
                                    key={c.id}
                                    className="border-b border-ink-100 hover:bg-primary-50/30 transition-colors"
                                >
                                    {/* Customer */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-800 font-semibold">
                                                {c.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-ink-900">
                                                    {c.name}
                                                </p>
                                                {c.customer_code && (
                                                    <p className="text-xs text-ink-400">
                                                        {c.customer_code}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Contact */}
                                    <td className="px-5 py-4">
                                        <p className="text-sm text-ink-700">
                                            {c.nif_cif || '—'}
                                        </p>
                                        <p className="text-xs text-ink-500">
                                            {c.phone || c.mobile || c.email || 'No contact'}
                                        </p>
                                    </td>

                                    {/* Location */}
                                    <td className="px-5 py-4">
                                        <p className="text-sm text-ink-700">
                                            {c.city || '—'}
                                        </p>
                                        <p className="text-xs text-ink-500">
                                            {c.province || c.country || ''}
                                        </p>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-5 py-4 text-right whitespace-nowrap">
                                        <Link
                                            to={`/customers/${c.id}`}
                                            className="text-primary-700 hover:text-primary-900 text-sm font-semibold mr-3"
                                        >
                                            View
                                        </Link>
                                        <Link
                                            to={`/customers/${c.id}/edit`}
                                            className="text-ink-600 hover:text-ink-900 text-sm font-medium mr-3"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(c.id, c.name)}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium"
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