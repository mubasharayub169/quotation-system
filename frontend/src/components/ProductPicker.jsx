import { useEffect, useState } from 'react';
import api from '../api/client';

export default function ProductPicker({ onSelect }) {
    const [search, setSearch] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await api.get('/products', { params: { search, limit: 50 } });
                if (active) setResult(data);
            } catch (err) {
                if (active) setError(err.response?.data?.error || 'Failed to load products');
            } finally {
                if (active) setLoading(false);
            }
        }, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [search, retry]);

    return (
        <div className="mb-3 rounded-lg border border-ink-200 bg-white p-3">
            <label className="block text-xs font-medium text-ink-600 mb-1">
                Saved product (optional)
                <input
                    type="search" value={search} placeholder="Search description or article code"
                    onChange={(e) => { setSearch(e.target.value); setLoading(true); }}
                    className="mt-1 w-full border border-ink-200 rounded px-2 py-1.5 text-sm"
                />
            </label>
            {error ? (
                <p role="alert" className="text-sm text-red-600">
                    {error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline">Retry</button>
                </p>
            ) : (
                <select
                    aria-label="Choose saved product" value="" disabled={loading}
                    onChange={(e) => {
                        const product = result?.data.find((entry) => String(entry.id) === e.target.value);
                        if (product) onSelect(product);
                    }}
                    className="w-full border border-ink-200 rounded px-2 py-1.5 text-sm"
                >
                    <option value="">{loading ? 'Loading products...' : 'Select a product to fill this item'}</option>
                    {result?.data.map((product) => (
                        <option key={product.id} value={product.id}>
                            {product.article_code ? `${product.article_code} - ` : ''}{product.description} ({Number(product.unit_price).toFixed(2)} EUR)
                        </option>
                    ))}
                </select>
            )}
            {!loading && !error && result && (
                <p className="text-xs text-ink-500 mt-1">
                    {result.pagination.total === 0
                        ? 'No matching products. You can still enter an item manually.'
                        : result.pagination.total > result.data.length
                            ? 'Showing 50 matches. Refine your search to find more products.'
                            : 'Selecting a product replaces its details below; quantity and discount stay unchanged.'}
                </p>
            )}
        </div>
    );
}
