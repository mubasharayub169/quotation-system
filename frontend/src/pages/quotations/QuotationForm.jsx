import { useCallback, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calculator, FileText, Package, Plus, Truck } from 'lucide-react';
import api from '../../api/client';
import ProductPicker from '../../components/ProductPicker';
import { applyProduct, IVA_RATES, UNIT_TYPES } from '../../utils/productOptions';

const PAYMENT_METHODS = ['CONTADO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE'];

const emptyItem = () => ({
    article_code: '',
    description: '',
    unit_type: 'unit',
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    iva_percent: 21,
});

export default function QuotationForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        customer_id: '',
        payment_method: 'CONTADO',
        reference_person: '',
        valid_days: 30,
        transport_charge: 0,
        observations: '',
        items: [emptyItem()],
    });

    const loadCustomers = useCallback(async () => {
        try {
            const { data } = await api.get('/customers?limit=500');
            setCustomers(data.data);
        } catch (err) {
            console.error('Failed to load customers:', err);
        }
    }, []);

    const loadQuotation = useCallback(async () => {
        try {
            const { data } = await api.get(`/quotations/${id}`);
            const q = data.data;

            if (q.status === 'invoiced') {
                setError('This quotation is invoiced and cannot be edited');
                setLoading(false);
                return;
            }

            setFormData({
                customer_id: q.customer_id || '',
                payment_method: q.payment_method || 'CONTADO',
                reference_person: q.reference_person || '',
                valid_days: 30,
                transport_charge: parseFloat(q.transport_charge || 0),
                observations: q.observations || '',
                items:
                    q.items?.map((item) => ({
                        article_code: item.article_code || '',
                        description: item.description || '',
                        unit_type: item.unit_type || 'unit',
                        quantity: parseFloat(item.quantity) || 0,
                        unit_price: parseFloat(item.unit_price) || 0,
                        discount_percent: parseFloat(item.discount_percent) || 0,
                        iva_percent: parseFloat(item.iva_percent) || 21,
                    })) || [emptyItem()],
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load quotation');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void Promise.resolve().then(() => {
            loadCustomers();
            if (isEdit) loadQuotation();
        });
    }, [isEdit, loadCustomers, loadQuotation]);

    // ============================================
    // FORM HANDLERS
    // ============================================
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, emptyItem()],
        });
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) {
            alert('At least one item is required');
            return;
        }
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    // ============================================
    // CALCULATIONS (real-time)
    // ============================================
    const calculateItem = (item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const discPct = parseFloat(item.discount_percent) || 0;
        const ivaPct = parseFloat(item.iva_percent) || 21;

        const subtotal = qty * price;
        const discountAmount = subtotal * (discPct / 100);
        const baseAfterDiscount = subtotal - discountAmount;
        const ivaAmount = baseAfterDiscount * (ivaPct / 100);
        const lineTotal = baseAfterDiscount + ivaAmount;

        return {
            subtotal,
            discountAmount,
            baseAfterDiscount,
            ivaAmount,
            lineTotal,
        };
    };

    const calculateTotals = () => {
        let totalSubtotal = 0;
        let totalDiscount = 0;
        let totalBase = 0;
        let totalIva = 0;
        const ivaBuckets = {
            21: { base: 0, iva: 0 },
            10: { base: 0, iva: 0 },
            4: { base: 0, iva: 0 },
        };

        formData.items.forEach((item) => {
            const c = calculateItem(item);
            totalSubtotal += c.subtotal;
            totalDiscount += c.discountAmount;
            totalBase += c.baseAfterDiscount;
            totalIva += c.ivaAmount;

            const rate = parseFloat(item.iva_percent) || 21;
            if (ivaBuckets[rate]) {
                ivaBuckets[rate].base += c.baseAfterDiscount;
                ivaBuckets[rate].iva += c.ivaAmount;
            }
        });

        // Transport (added to 21% base)
        const transport = parseFloat(formData.transport_charge) || 0;
        if (transport > 0) {
            totalBase += transport;
            const transportIva = transport * 0.21;
            totalIva += transportIva;
            ivaBuckets[21].base += transport;
            ivaBuckets[21].iva += transportIva;
        }

        return {
            totalSubtotal,
            totalDiscount,
            totalBase,
            totalIva,
            grandTotal: totalBase + totalIva,
            iva21Base: ivaBuckets[21].base,
            iva21Amount: ivaBuckets[21].iva,
            iva10Base: ivaBuckets[10].base,
            iva10Amount: ivaBuckets[10].iva,
            iva4Base: ivaBuckets[4].base,
            iva4Amount: ivaBuckets[4].iva,
        };
    };

    const totals = calculateTotals();

    const fmt = (n) =>
        (parseFloat(n) || 0).toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    // ============================================
    // SUBMIT
    // ============================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.customer_id) {
            setError('Please select a customer');
            return;
        }

        const invalidItems = formData.items.some(
            (item) => !item.description.trim() || parseFloat(item.quantity) <= 0
        );
        if (invalidItems) {
            setError('All items must have a description and quantity > 0');
            return;
        }

        // Clean payload
        const payload = {
            customer_id: parseInt(formData.customer_id),
            payment_method: formData.payment_method,
            reference_person: formData.reference_person || null,
            valid_days: parseInt(formData.valid_days) || 30,
            transport_charge: parseFloat(formData.transport_charge) || 0,
            observations: formData.observations || null,
            items: formData.items.map((item) => ({
                article_code: item.article_code || null,
                description: item.description.trim(),
                unit_type: item.unit_type,
                quantity: parseFloat(item.quantity),
                unit_price: parseFloat(item.unit_price),
                discount_percent: parseFloat(item.discount_percent) || 0,
                iva_percent: parseFloat(item.iva_percent) || 21,
            })),
        };

        setSaving(true);
        try {
            let result;
            if (isEdit) {
                result = await api.put(`/quotations/${id}`, payload);
            } else {
                result = await api.post('/quotations', payload);
            }
            navigate(`/quotations/${result.data.data.id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save quotation');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="workspace-card p-12 text-center text-ink-500">
                Loading...
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <Link
                    to="/quotations"
                    className="inline-flex items-center gap-1 text-primary-700 text-sm font-medium hover:text-primary-900"
                >
                    <ArrowLeft size={15} /> Back to Quotations
                </Link>
                <h1 className="workspace-title mt-2">
                    {isEdit ? 'Edit Quotation' : 'New Quotation'}
                </h1>
                <p className="workspace-copy">
                    {isEdit
                        ? 'Update quotation details and items'
                        : 'Create a new quotation with items'}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* SECTION 1: BASIC INFO */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <FileText size={18} className="text-primary-700" /> Quotation Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Customer *
                            </label>
                            <select
                                name="customer_id"
                                value={formData.customer_id}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="">— Select Customer —</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                        {c.nif_cif ? ` (${c.nif_cif})` : ''}
                                    </option>
                                ))}
                            </select>
                            {customers.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">
                                    No customers yet.{' '}
                                    <Link to="/customers/new" className="underline">
                                        Add one first
                                    </Link>
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Payment Method
                            </label>
                            <select
                                name="payment_method"
                                value={formData.payment_method}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                {PAYMENT_METHODS.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Valid Days
                            </label>
                            <input
                                type="number"
                                name="valid_days"
                                value={formData.valid_days}
                                onChange={handleChange}
                                min="1"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Reference Person
                            </label>
                            <input
                                type="text"
                                name="reference_person"
                                value={formData.reference_person}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="e.g., Sr. Hussein"
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 2: LINE ITEMS */}
                <div className="workspace-card p-5 sm:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="workspace-section-title">
                            <Package size={18} className="text-primary-700" /> Items
                        </h2>
                        <button
                            type="button"
                            onClick={addItem}
                            className="btn btn-secondary btn-sm"
                        >
                            <Plus size={15} /> Add Item
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formData.items.map((item, index) => {
                            const calc = calculateItem(item);
                            return (
                                <div
                                    key={index}
                                    className="border border-ink-200 rounded-lg p-4 bg-ink-50"
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-semibold text-slate-500 uppercase">
                                            Item #{index + 1}
                                        </span>
                                        {formData.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                                            >
                                                ✕ Remove
                                            </button>
                                        )}
                                    </div>

                                    <ProductPicker onSelect={(product) => setFormData((current) => ({
                                        ...current,
                                        items: current.items.map((entry, itemIndex) => (
                                            itemIndex === index ? applyProduct(entry, product) : entry
                                        )),
                                    }))} />
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Article Code
                                            </label>
                                            <input
                                                type="text"
                                                value={item.article_code}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        'article_code',
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="5120017"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Description *
                                            </label>
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        'description',
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Caja extractora ventilador s.o.18/9..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Qty *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        'quantity',
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Unit
                                            </label>
                                            <select
                                                value={item.unit_type}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        'unit_type',
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            >
                                                {UNIT_TYPES.map((u) => (
                                                    <option key={u.value} value={u.value}>
                                                        {u.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Unit Price (€)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={item.unit_price}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        'unit_price',
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Discount %
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={item.discount_percent}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        'discount_percent',
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                IVA %
                                            </label>
                                            <select
                                                value={item.iva_percent}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        'iva_percent',
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            >
                                                {IVA_RATES.map((r) => (
                                                    <option key={r.value} value={r.value}>
                                                        {r.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Line Total
                                            </label>
                                            <div className="px-2 py-1.5 bg-primary-50 border border-primary-200 rounded text-sm font-bold text-primary-800 text-right">
                                                {fmt(calc.lineTotal)} €
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                        <div className="text-slate-500">
                                            Subtotal:{' '}
                                            <span className="font-medium text-slate-700">
                                                {fmt(calc.subtotal)} €
                                            </span>
                                        </div>
                                        <div className="text-slate-500">
                                            Discount:{' '}
                                            <span className="font-medium text-red-600">
                                                − {fmt(calc.discountAmount)} €
                                            </span>
                                        </div>
                                        <div className="text-slate-500">
                                            Base:{' '}
                                            <span className="font-medium text-slate-700">
                                                {fmt(calc.baseAfterDiscount)} €
                                            </span>
                                        </div>
                                        <div className="text-slate-500">
                                            IVA:{' '}
                                            <span className="font-medium text-slate-700">
                                                {fmt(calc.ivaAmount)} €
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SECTION 3: TRANSPORT + OBSERVATIONS */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <Truck size={18} className="text-primary-700" /> Transport & Notes
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Transport Charge (€)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="transport_charge"
                                value={formData.transport_charge}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Added to base (21% IVA)
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Observations
                            </label>
                            <textarea
                                name="observations"
                                value={formData.observations}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="e.g., Presupuesto válido 30 días. No incluye trabajos de albañilería..."
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 4: TOTALS PREVIEW */}
                <div className="workspace-card p-5 sm:p-6 border-l-4 border-l-primary-600">
                    <h2 className="workspace-section-title mb-4">
                        <Calculator size={18} className="text-primary-700" /> Totals Preview
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                                IVA Breakdown
                            </p>
                            <table className="w-full text-sm">
                                <thead className="border-b border-slate-200">
                                    <tr>
                                        <th className="text-left py-1 text-xs text-slate-500">
                                            Rate
                                        </th>
                                        <th className="text-right py-1 text-xs text-slate-500">
                                            Base
                                        </th>
                                        <th className="text-right py-1 text-xs text-slate-500">
                                            IVA
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[21, 10, 4].map((rate) => {
                                        const base = totals[`iva${rate}Base`];
                                        const iva = totals[`iva${rate}Amount`];
                                        if (base === 0 && iva === 0) return null;
                                        return (
                                            <tr key={rate} className="border-b border-slate-100">
                                                <td className="py-1 font-medium text-slate-700">
                                                    {rate}%
                                                </td>
                                                <td className="py-1 text-right text-slate-700">
                                                    {fmt(base)} €
                                                </td>
                                                <td className="py-1 text-right text-slate-700">
                                                    {fmt(iva)} €
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Subtotal:</span>
                                <span className="font-medium">
                                    {fmt(totals.totalSubtotal)} €
                                </span>
                            </div>
                            {totals.totalDiscount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Discount:</span>
                                    <span className="font-medium text-red-600">
                                        − {fmt(totals.totalDiscount)} €
                                    </span>
                                </div>
                            )}
                            {parseFloat(formData.transport_charge) > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Transport:</span>
                                    <span className="font-medium">
                                        {fmt(formData.transport_charge)} €
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-slate-200">
                                <span className="text-slate-500">Base Imponible:</span>
                                <span className="font-medium">
                                    {fmt(totals.totalBase)} €
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">IVA:</span>
                                <span className="font-medium">
                                    {fmt(totals.totalIva)} €
                                </span>
                            </div>
                            <div className="flex justify-between pt-3 border-t-2 border-slate-300">
                                <span className="font-bold text-slate-800 text-base">
                                    TOTAL:
                                </span>
                                <span className="font-bold text-primary-800 text-xl">
                                    {fmt(totals.grandTotal)} €
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pb-8">
                    <Link
                        to="/quotations"
                        className="btn btn-secondary"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary px-6"
                    >
                        {saving
                            ? 'Saving...'
                            : isEdit
                            ? 'Update Quotation'
                            : 'Create Quotation'}
                    </button>
                </div>
            </form>
        </div>
    );
}