import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/useAuth';
import { IVA_RATES, UNIT_TYPES } from '../../utils/productOptions';

const emptyProduct = {
    article_code: '',
    description: '',
    unit_type: 'unit',
    unit_price: '0',
    iva_percent: 21,
};

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

    // ✅ Image state
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [existingImage, setExistingImage] = useState(null);
    const [removeExistingImage, setRemoveExistingImage] = useState(false);

    useEffect(() => {
        let active = true;
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await api.get('/products', {
                    params: { search, page, limit: 50 },
                });
                if (active) setResult(data);
            } catch (err) {
                if (active)
                    setError(err.response?.data?.error || 'Failed to load products');
            } finally {
                if (active) setLoading(false);
            }
        }, 300);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [search, page, reload]);

    const refresh = () => {
        setLoading(true);
        setReload((value) => value + 1);
    };

    // ✅ Reset form + image state
    const resetFormState = () => {
        setEditing(null);
        setForm(emptyProduct);
        setFormError('');
        setImageFile(null);
        setImagePreview(null);
        setExistingImage(null);
        setRemoveExistingImage(false);
    };

    // ✅ Open edit form with image
    const openEdit = (product) => {
        setEditing(product);
        setForm(product);
        setFormError('');
        setImageFile(null);
        setImagePreview(null);
        setExistingImage(product.image_path || null);
        setRemoveExistingImage(false);
    };

    // ✅ Handle image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('File too large (max 2MB)');
            return;
        }

        setImageFile(file);
        setRemoveExistingImage(false);

        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    // ✅ Remove image (local preview + flag for existing)
    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (existingImage) {
            setRemoveExistingImage(true);
        }
    };

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        setFormError('');

        try {
            let productId = editing.id;

            // 1. Save product
            if (editing.id) {
                await api.put(`/products/${editing.id}`, form);
            } else {
                const { data } = await api.post('/products', form);
                productId = data.data.id;
            }

            // 2. Remove existing image (if flagged)
            if (removeExistingImage && editing.id) {
                try {
                    await api.delete(`/products/${productId}/image`);
                } catch (err) {
                    console.warn('Remove image failed:', err.message);
                }
            }

            // 3. Upload new image
            if (imageFile) {
                const fd = new FormData();
                fd.append('image', imageFile);
                await api.post(`/products/${productId}/image`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            resetFormState();
            refresh();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    const remove = async (product) => {
        if (
            !window.confirm(
                'Delete this product from the catalog? Existing quotations and invoices will not change.'
            )
        )
            return;
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
                    <p className="text-sm text-ink-500">
                        Saved products for quotation items. Catalog changes do not
                        alter existing documents.
                    </p>
                </div>
                {canManage && (
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditing({});
                            setForm(emptyProduct);
                            setFormError('');
                            setImageFile(null);
                            setImagePreview(null);
                            setExistingImage(null);
                            setRemoveExistingImage(false);
                        }}
                    >
                        Add Product
                    </button>
                )}
            </div>

            {/* ============================================
                Product Form (Modal-style card)
                ============================================ */}
            {editing && canManage && (
                <form onSubmit={save} className="workspace-card p-4 space-y-3">
                    <h2 className="font-semibold">
                        {editing.id ? 'Edit Product' : 'New Product'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-sm">
                            Article code
                            <input
                                maxLength={50}
                                value={form.article_code || ''}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        article_code: e.target.value,
                                    })
                                }
                                className="block w-full border rounded px-3 py-2"
                            />
                        </label>

                        <label className="text-sm">
                            Description *
                            <textarea
                                required
                                value={form.description}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        description: e.target.value,
                                    })
                                }
                                className="block w-full border rounded px-3 py-2"
                            />
                        </label>

                        <label className="text-sm">
                            Unit
                            <select
                                value={form.unit_type}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        unit_type: e.target.value,
                                    })
                                }
                                className="block w-full border rounded px-3 py-2"
                            >
                                {UNIT_TYPES.map((unit) => (
                                    <option key={unit.value} value={unit.value}>
                                        {unit.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="text-sm">
                            Unit price (EUR) *
                            <input
                                required
                                type="number"
                                min="0"
                                max="9999999999.99"
                                step="0.01"
                                value={form.unit_price}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        unit_price: e.target.value,
                                    })
                                }
                                className="block w-full border rounded px-3 py-2"
                            />
                        </label>

                        <label className="text-sm">
                            IVA
                            <select
                                value={form.iva_percent}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        iva_percent: e.target.value,
                                    })
                                }
                                className="block w-full border rounded px-3 py-2"
                            >
                                {IVA_RATES.map((rate) => (
                                    <option key={rate.value} value={rate.value}>
                                        {rate.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {/* ============================================
                        IMAGE UPLOAD SECTION
                        ============================================ */}
                    <div className="border-t border-ink-100 pt-3">
                        <p className="text-sm font-medium text-ink-700 mb-2">
                            Product Image
                        </p>
                        <div className="flex items-start gap-4">
                            {/* Preview */}
                            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-ink-300 flex items-center justify-center overflow-hidden bg-ink-50 flex-shrink-0">
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-full object-contain"
                                    />
                                ) : existingImage && !removeExistingImage ? (
                                    <img
                                        src={`/${existingImage}`}
                                        alt="Current"
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="text-center text-ink-400">
                                        <svg
                                            className="w-6 h-6 mx-auto"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <p className="text-[10px] mt-1">No image</p>
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-white border border-ink-200 hover:border-ink-300 text-ink-700 rounded-lg text-sm font-medium transition shadow-sm">
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                            />
                                        </svg>
                                        {imagePreview || (existingImage && !removeExistingImage)
                                            ? 'Change'
                                            : 'Choose File'}
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>

                                    {(imagePreview || (existingImage && !removeExistingImage)) && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="inline-flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm font-medium transition"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>

                                <p className="text-xs text-ink-500">
                                    PNG, JPG, SVG, or WebP. Max 2MB.
                                </p>
                            </div>
                        </div>
                    </div>

                    {formError && (
                        <p role="alert" className="text-red-600 text-sm">
                            {formError}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <button disabled={saving} className="btn btn-primary">
                            {saving ? 'Saving...' : 'Save Product'}
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={resetFormState}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* ============================================
                Search
                ============================================ */}
            <input
                aria-label="Search products"
                type="search"
                placeholder="Search description or code..."
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                    setLoading(true);
                }}
                className="w-full border border-ink-200 rounded-lg px-3 py-2"
            />

            {error && (
                <p role="alert" className="text-red-600">
                    {error}{' '}
                    <button onClick={refresh} className="underline">
                        Retry
                    </button>
                </p>
            )}

            {/* ============================================
                Table
                ============================================ */}
            {loading ? (
                <p>Loading products...</p>
            ) : (
                !error && (
                    <div className="workspace-card overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-3">Image</th>
                                    <th className="p-3">Code</th>
                                    <th>Description</th>
                                    <th>Unit</th>
                                    <th>Price</th>
                                    <th>IVA</th>
                                    {canManage && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {result?.data.map((product) => (
                                    <tr key={product.id} className="border-b">
                                        {/* ✅ Thumbnail */}
                                        <td className="p-3">
                                            {product.image_path ? (
                                                <img
                                                    src={`/${product.image_path}`}
                                                    alt={product.description}
                                                    className="w-12 h-12 rounded object-contain bg-ink-50 border border-ink-100"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded bg-ink-100 flex items-center justify-center text-ink-400">
                                                    <svg
                                                        className="w-5 h-5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={1.5}
                                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {product.article_code || '-'}
                                        </td>
                                        <td className="whitespace-pre-wrap">
                                            {product.description}
                                        </td>
                                        <td>{product.unit_type}</td>
                                        <td>
                                            {Number(product.unit_price).toFixed(2)} EUR
                                        </td>
                                        <td>{Number(product.iva_percent)}%</td>
                                        {canManage && (
                                            <td className="space-x-3">
                                                <button
                                                    onClick={() => openEdit(product)}
                                                    className="text-primary-700"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => remove(product)}
                                                    className="text-red-600"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {result?.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={canManage ? 7 : 6}
                                            className="p-6 text-center text-ink-500"
                                        >
                                            No products found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="p-3 flex items-center gap-3">
                            <button
                                disabled={page === 1}
                                onClick={() => {
                                    setPage(page - 1);
                                    setLoading(true);
                                }}
                                className="btn btn-secondary"
                            >
                                Previous
                            </button>
                            <span>
                                Page {page} /{' '}
                                {Math.max(
                                    1,
                                    Math.ceil((result?.pagination.total || 0) / 50)
                                )}
                            </span>
                            <button
                                disabled={
                                    page * 50 >= (result?.pagination.total || 0)
                                }
                                onClick={() => {
                                    setPage(page + 1);
                                    setLoading(true);
                                }}
                                className="btn btn-secondary"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}