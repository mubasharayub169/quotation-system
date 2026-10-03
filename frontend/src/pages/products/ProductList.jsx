import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/useAuth';
import { IVA_RATES, UNIT_TYPES } from '../../utils/productOptions';

const emptyProduct = { article_code: '', description: '', unit_type: 'unit', unit_price: '0', iva_percent: 21 };

export default function ProductList() {
    const { isOwner } = useAuth();
    const canManage = isOwner();
    const [result, setResult] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyProduct);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        let active = true;
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await api.get('/products', { params: { search, page, limit: 50 } });
                if (active) setResult(data);
            } catch (err) {
                if (active) setError(err.response?.data?.error || 'Failed to load products');
            } finally {
                if (active) setLoading(false);
            }
        }, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [search, page, reload]);

    const refresh = () => {
        setLoading(true);
        setReload((value) => value + 1);
    };
    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        setFormError('');
        try {
            if (editing.id) await api.put(`/products/${editing.id}`, form);
            else await api.post('/products', form);
            setEditing(null);
            refresh();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };
    const remove = async (product) => {
        if (!window.confirm('Delete this product from the catalog? Existing quotations and invoices will not change.')) return;
        try {
            await api.delete(`/products/${product.id}`);
            if (result.data.length === 1 && page > 1) setPage(page - 1);
            refresh();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete product');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-ink-900">Products</h1>
                    <p className="text-sm text-ink-500">Saved products for quotation items. Catalog changes do not alter existing documents.</p>
                </div>
                {canManage && <button className="btn btn-primary" onClick={() => { setEditing({}); setForm(emptyProduct); setFormError(''); }}>Add Product</button>}
            </div>
            {editing && canManage && (
                <form onSubmit={save} className="workspace-card p-4 space-y-3">
                    <h2 className="font-semibold">{editing.id ? 'Edit Product' : 'New Product'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-sm">Article code
                            <input maxLength={50} value={form.article_code || ''} onChange={(e) => setForm({ ...form, article_code: e.target.value })} className="block w-full border rounded px-3 py-2" />
                        </label>
                        <label className="text-sm">Description *
                            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="block w-full border rounded px-3 py-2" />
                        </label>
                        <label className="text-sm">Unit
                            <select value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value })} className="block w-full border rounded px-3 py-2">
                                {UNIT_TYPES.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                            </select>
                        </label>
                        <label className="text-sm">Unit price (EUR) *
                            <input required type="number" min="0" max="9999999999.99" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className="block w-full border rounded px-3 py-2" />
                        </label>
                        <label className="text-sm">IVA
                            <select value={form.iva_percent} onChange={(e) => setForm({ ...form, iva_percent: e.target.value })} className="block w-full border rounded px-3 py-2">
                                {IVA_RATES.map((rate) => <option key={rate.value} value={rate.value}>{rate.label}</option>)}
                            </select>
                        </label>
                    </div>
                    {formError && <p role="alert" className="text-red-600 text-sm">{formError}</p>}
                    <div className="flex gap-2">
                        <button disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : 'Save Product'}</button>
                        <button type="button" disabled={saving} onClick={() => setEditing(null)} className="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            )}
            <input aria-label="Search products" type="search" placeholder="Search description or code..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); setLoading(true); }} className="w-full border border-ink-200 rounded-lg px-3 py-2" />
            {error && <p role="alert" className="text-red-600">{error} <button onClick={refresh} className="underline">Retry</button></p>}
            {loading ? <p>Loading products...</p> : !error && (
                <div className="workspace-card overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead><tr className="border-b"><th className="p-3">Code</th><th>Description</th><th>Unit</th><th>Price</th><th>IVA</th>{canManage && <th>Actions</th>}</tr></thead>
                        <tbody>
                            {result?.data.map((product) => (
                                <tr key={product.id} className="border-b">
                                    <td className="p-3">{product.article_code || '-'}</td><td className="whitespace-pre-wrap">{product.description}</td><td>{product.unit_type}</td><td>{Number(product.unit_price).toFixed(2)} EUR</td><td>{Number(product.iva_percent)}%</td>
                                    {canManage && <td className="space-x-3"><button onClick={() => { setEditing(product); setForm(product); setFormError(''); }} className="text-primary-700">Edit</button><button onClick={() => remove(product)} className="text-red-600">Delete</button></td>}
                                </tr>
                            ))}
                            {result?.data.length === 0 && <tr><td colSpan={canManage ? 6 : 5} className="p-6 text-center text-ink-500">No products found.</td></tr>}
                        </tbody>
                    </table>
                    <div className="p-3 flex items-center gap-3">
                        <button disabled={page === 1} onClick={() => { setPage(page - 1); setLoading(true); }} className="btn btn-secondary">Previous</button>
                        <span>Page {page} / {Math.max(1, Math.ceil((result?.pagination.total || 0) / 50))}</span>
                        <button disabled={page * 50 >= (result?.pagination.total || 0)} onClick={() => { setPage(page + 1); setLoading(true); }} className="btn btn-secondary">Next</button>
                    </div>
                </div>
            )}
        </div>
    );
}
