import { useEffect, useState } from 'react';
import api from '../api/client';

export default function ProductPicker({ onSelect }) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [retry, setRetry] = useState(0);
    const [added, setAdded] = useState('');

    useEffect(() => {
        let active = true;
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await api.get('/products', { params: { search: search.trim(), page, limit: 10 } });
                if (active) setResult(data);
            } catch (err) {
                if (active) setError(err.response?.data?.error || 'Failed to load products');
            } finally {
                if (active) setLoading(false);
            }
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [search, page, retry]);

    const changePage = (next) => { setPage(next); setLoading(true); setError(''); };

    return (
        <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-3">
            <label className="block text-sm font-semibold text-primary-900">
                Search saved products
                <input
                    type="search" value={search} maxLength={200}
                    placeholder="Search by product name or article code..."
                    onChange={(e) => { setSearch(e.target.value); setPage(1); setLoading(true); setError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    className="mt-2 w-full border border-primary-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
            </label>
            <p role="status" className="text-xs text-primary-800 mt-1">{added || 'Find a product, then click Add to quotation.'}</p>
            {loading ? <p role="status" className="p-3 text-sm">Searching products...</p> : error ? (
                <p role="alert" className="text-sm text-red-600 p-3">
                    {error} <button type="button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }} className="underline">Retry</button>
                </p>
            ) : (
                <div className="mt-3">
                    <ul className="divide-y divide-ink-100 bg-white rounded-lg">
                        {result?.data.map((product) => (
                            <li key={product.id} className="flex items-center justify-between gap-3 p-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-ink-900 whitespace-pre-wrap break-words">{product.description}</p>
                                    <p className="text-xs text-ink-500">{product.article_code || 'No code'} · {product.unit_type} · IVA {Number(product.iva_percent)}%</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-semibold mb-1">{Number(product.unit_price).toFixed(2)} EUR</p>
                                    <button type="button" aria-label={`Add ${product.description} to quotation`} className="btn btn-primary btn-sm"
                                        onClick={() => { onSelect(product); setAdded(`${product.description} added to quotation.`); }}>
                                        Add to quotation
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {result?.data.length === 0 && <p className="py-3 text-sm">No matching products. Try another name/code or use Add manual item below.</p>}
                    {result && result.pagination.total > 10 && (
                        <div className="flex items-center gap-3 mt-2 text-xs">
                            <button type="button" disabled={page === 1} onClick={() => changePage(page - 1)} className="btn btn-secondary btn-sm">Previous products</button>
                            <span>Page {page} of {Math.ceil(result.pagination.total / 10)}</span>
                            <button type="button" disabled={page * 10 >= result.pagination.total} onClick={() => changePage(page + 1)} className="btn btn-secondary btn-sm">Next products</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
