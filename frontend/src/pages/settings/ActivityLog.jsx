import { useEffect, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/client';

const PAGE_SIZE = 50;

function entrySummary(entry) {
    const data = entry.summary || {};
    const reference = data.invoice_number
        || data.quotation_number
        || data.customer_code
        || data.article_code
        || data.email
        || data.business_name
        || data.name;
    const total = data.grand_total !== undefined
        ? ` · ${Number(data.grand_total).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
        : '';
    return `${reference || `Record #${entry.record_id || '—'}`}${total}`;
}

export default function ActivityLog() {
    const [loadedPage, setLoadedPage] = useState(0);
    const [entries, setEntries] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [failedPage, setFailedPage] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let active = true;

        api.get('/business/audit-log', { params: { page, limit: PAGE_SIZE } })
            .then(({ data }) => {
                if (!active) return;
                setEntries(data.data || []);
                setTotal(Number(data.pagination?.total) || 0);
                setLoadedPage(page);
                setFailedPage(null);
            })
            .catch((requestError) => {
                if (!active) return;
                console.error('Failed to load activity log:', requestError);
                setFailedPage(page);
            });

        return () => {
            active = false;
        };
    }, [page, reloadKey]);

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const loading = loadedPage !== page && failedPage !== page;
    const error = failedPage === page;
    const retry = () => {
        setFailedPage(null);
        setReloadKey((key) => key + 1);
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-ink-900">Activity log</h1>
                        <p className="text-sm text-ink-500 mt-1">Recent changes made by your business users.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-ink-200 rounded-xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-sm text-ink-500">Loading activity…</div>
                ) : error ? (
                    <div className="p-12 text-center text-sm text-red-700" role="alert">
                        <p>Could not load activity.</p>
                        <button type="button" onClick={retry} className="btn btn-secondary mt-3">
                            Retry
                        </button>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="p-12 text-center text-sm text-ink-500">No activity has been recorded yet.</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px]">
                                <thead className="bg-ink-50/70 border-b border-ink-200">
                                    <tr>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">When</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Who</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Action</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Record</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {entries.map((entry) => (
                                        <tr key={entry.id}>
                                            <td className="px-5 py-4 text-sm text-ink-600 whitespace-nowrap">
                                                {new Date(entry.created_at).toLocaleString('es-ES')}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-ink-800">
                                                {entry.actor_name || 'Former user'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-xs font-semibold text-ink-700 bg-ink-100 rounded-full px-2.5 py-1">
                                                    {entry.action.replaceAll('_', ' ')}
                                                </span>
                                                <p className="text-xs text-ink-500 mt-1">{entry.table_name}</p>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-ink-700">
                                                {entrySummary(entry)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3">
                            <p className="text-xs text-ink-500">
                                {total === 0 ? '0 entries' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                    disabled={page <= 1 || loading}
                                    className="btn btn-secondary px-3 py-2 disabled:opacity-50"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs text-ink-500">{page} / {pageCount}</span>
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                                    disabled={page >= pageCount || loading}
                                    className="btn btn-secondary px-3 py-2 disabled:opacity-50"
                                    aria-label="Next page"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
