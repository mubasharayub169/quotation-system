import { useCallback, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, Download, FileText, Printer, Receipt, Trash2, UserRound } from 'lucide-react';
import api from '../../api/client';

export default function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [printing, setPrinting] = useState(false);

    // Payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        payment_status: 'unpaid',
        amount_paid: 0,
        payment_date: '',
    });
    const [updatingPayment, setUpdatingPayment] = useState(false);

    const loadInvoice = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/invoices/${id}`);
            setInvoice(data.data);
            setPaymentForm({
                payment_status: data.data.payment_status || 'unpaid',
                amount_paid: parseFloat(data.data.amount_paid) || 0,
                payment_date: data.data.payment_date
                    ? data.data.payment_date.split('T')[0]
                    : '',
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load invoice');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void Promise.resolve().then(loadInvoice);
    }, [loadInvoice]);

    // ============================================
    // Fetch PDF as Blob (base64 approach)
    // ============================================
    const fetchPdfBlob = async () => {
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/pdf/invoice/${id}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.data) {
            throw new Error('PDF data not returned');
        }

        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return new Blob([bytes], { type: 'application/pdf' });
    };

    // ============================================
    // PDF DOWNLOAD
    // ============================================
    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            console.log('📥 Downloading PDF for invoice:', id);

            const blob = await fetchPdfBlob();
            console.log('📦 Blob size:', blob.size, 'bytes');

            if (blob.size === 0) {
                alert('PDF is empty');
                return;
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute(
                'download',
                `Factura-${invoice.invoice_number}.pdf`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            console.log('✅ PDF downloaded');
        } catch (err) {
            console.error('❌ PDF Error:', err);
            alert(err.message || 'Failed to download PDF');
        } finally {
            setDownloading(false);
        }
    };

    // ============================================
    // PRINT PREVIEW
    // ============================================
    const handlePrintPdf = async () => {
        try {
            setPrinting(true);
            console.log('🖨️ Opening PDF for print preview:', id);

            const blob = await fetchPdfBlob();
            if (blob.size === 0) {
                alert('PDF is empty');
                return;
            }

            const url = window.URL.createObjectURL(blob);
            const printWindow = window.open(url, '_blank');

            if (!printWindow) {
                alert('Please allow popups to open PDF preview.');
                window.URL.revokeObjectURL(url);
                return;
            }

            printWindow.focus();
            setTimeout(() => window.URL.revokeObjectURL(url), 120000);
            console.log('✅ PDF opened for print');
        } catch (err) {
            console.error('❌ Print Error:', err);
            alert(err.message || 'Failed to open print preview');
        } finally {
            setPrinting(false);
        }
    };

    // ============================================
    // UPDATE PAYMENT
    // ============================================
    const handleUpdatePayment = async () => {
        try {
            setUpdatingPayment(true);
            await api.patch(`/invoices/${id}/payment`, paymentForm);
            setShowPaymentModal(false);
            await loadInvoice();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update payment');
        } finally {
            setUpdatingPayment(false);
        }
    };

    const handleDelete = async () => {
        if (
            !window.confirm(
                `Delete invoice "${invoice.invoice_number}"?\n\nThe related quotation will return to "Accepted" status.`
            )
        ) {
            return;
        }

        try {
            await api.delete(`/invoices/${id}`);
            navigate('/invoices');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete invoice');
        }
    };

    if (loading) {
        return (
            <div className="workspace-card p-12 text-center text-ink-500">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Link to="/invoices" className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-900">
                    <ArrowLeft size={15} /> Back
                </Link>
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mt-4" role="alert">
                    {error}
                </div>
            </div>
        );
    }

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

    const fmt = (n) =>
        parseFloat(n || 0).toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const remaining = parseFloat(invoice.grand_total || 0) - parseFloat(invoice.amount_paid || 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    to="/invoices"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-900 transition"
                >
                    <ArrowLeft size={15} /> Back to Invoices
                </Link>
                <div className="flex flex-wrap justify-between items-start gap-4 mt-2">
                    <div>
                        <p className="workspace-kicker">BILLING</p>
                        <h1 className="text-2xl sm:text-[28px] font-bold text-ink-900 font-mono mb-1">
                            {invoice.invoice_number}
                        </h1>
                        <div className="flex items-center gap-3">
                            <StatusBadge color={paymentColors[invoice.payment_status]}>
                                {paymentLabels[invoice.payment_status] || invoice.payment_status}
                            </StatusBadge>
                            <span className="text-sm text-ink-500">
                                {new Date(invoice.invoice_date).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={handlePrintPdf}
                            disabled={printing || downloading}
                            className="btn btn-secondary disabled:opacity-50"
                        >
                            {printing ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-ink-300 border-t-ink-700 rounded-full animate-spin"></span>
                                    Opening...
                                </>
                            ) : (
                                <>
                                    <Printer size={16} />
                                    Print Preview
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={downloading || printing}
                            className="btn btn-primary disabled:opacity-50"
                        >
                            {downloading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Download PDF
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                            <Trash2 size={15} />
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Customer */}
                <div className="workspace-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
                            <UserRound size={18} />
                        </div>
                        <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">
                            Customer
                        </p>
                    </div>
                    <p className="font-bold text-ink-900 text-lg mb-1">
                        {invoice.customer_name}
                    </p>
                    {invoice.nif_cif && (
                        <p className="text-sm text-ink-600">
                            NIF: <span className="font-mono">{invoice.nif_cif}</span>
                        </p>
                    )}
                    {invoice.customer_address && (
                        <p className="text-sm text-ink-600 mt-1">
                            {invoice.customer_address}
                        </p>
                    )}
                    {(invoice.customer_postal_code || invoice.customer_city) && (
                        <p className="text-sm text-ink-600">
                            {invoice.customer_postal_code} {invoice.customer_city}
                        </p>
                    )}
                </div>

                {/* Invoice Info */}
                <div className="workspace-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center">
                            <FileText size={18} />
                        </div>
                        <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">
                            Invoice Details
                        </p>
                    </div>
                    <div className="space-y-2 text-sm">
                        <InfoRow label="Invoice Date" value={new Date(invoice.invoice_date).toLocaleDateString('es-ES')} />
                        {invoice.due_date && (
                            <InfoRow label="Due Date" value={new Date(invoice.due_date).toLocaleDateString('es-ES')} />
                        )}
                        <InfoRow label="Payment Method" value={invoice.payment_method || 'CONTADO'} />
                        {invoice.quotation_number && (
                            <InfoRow label="From Quotation" value={invoice.quotation_number} mono />
                        )}
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="workspace-card overflow-hidden">
                <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Receipt size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-ink-900">
                            Items
                        </h2>
                        <p className="text-xs text-ink-500">
                            {invoice.items?.length || 0} items
                        </p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-ink-50/70 border-b border-ink-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Article</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Description</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Qty</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Unit Price</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Subtotal</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">IVA %</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">IVA €</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {invoice.items?.map((item) => (
                                <tr key={item.id} className="hover:bg-ink-50/50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-ink-500 font-mono">
                                        {item.article_code || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-ink-800 max-w-md">
                                        {item.description}
                                    </td>
                                    <td className="px-4 py-3 text-right text-ink-700 tabular-nums">
                                        {fmt(item.quantity)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-ink-700 tabular-nums">
                                        {fmt(item.unit_price)} €
                                    </td>
                                    <td className="px-4 py-3 text-right text-ink-700 tabular-nums">
                                        {fmt(item.subtotal)} €
                                    </td>
                                    <td className="px-4 py-3 text-center text-ink-700 tabular-nums">
                                        {fmt(item.iva_percent)}%
                                    </td>
                                    <td className="px-4 py-3 text-right text-ink-700 tabular-nums">
                                        {fmt(item.iva_amount)} €
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-ink-900 tabular-nums">
                                        {fmt(item.line_total)} €
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Totals + IVA Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* IVA Breakdown */}
                <div className="workspace-card p-5">
                    <h2 className="text-base font-semibold text-ink-900 mb-4">
                        <span className="inline-flex items-center gap-2"><Calculator size={17} className="text-primary-700" /> IVA Breakdown</span>
                    </h2>
                    <table className="w-full text-sm">
                        <thead className="border-b border-ink-200">
                            <tr>
                                <th className="text-left py-2 text-xs font-semibold text-ink-500 uppercase tracking-wider">Rate</th>
                                <th className="text-right py-2 text-xs font-semibold text-ink-500 uppercase tracking-wider">Base</th>
                                <th className="text-right py-2 text-xs font-semibold text-ink-500 uppercase tracking-wider">IVA</th>
                                <th className="text-right py-2 text-xs font-semibold text-ink-500 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {[21, 10, 4].map((rate) => {
                                const base = parseFloat(invoice[`iva_${rate}_base`] || 0);
                                const iva = parseFloat(invoice[`iva_${rate}_amount`] || 0);
                                if (base === 0 && iva === 0) return null;
                                return (
                                    <tr key={rate}>
                                        <td className="py-2 font-medium text-ink-700">{rate}%</td>
                                        <td className="py-2 text-right text-ink-700 tabular-nums">{fmt(base)} €</td>
                                        <td className="py-2 text-right text-ink-700 tabular-nums">{fmt(iva)} €</td>
                                        <td className="py-2 text-right font-semibold text-ink-900 tabular-nums">{fmt(base + iva)} €</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="workspace-card p-5">
                    <h2 className="text-base font-semibold text-ink-900 mb-4">
                        <span className="inline-flex items-center gap-2"><Receipt size={17} className="text-primary-700" /> Summary</span>
                    </h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-ink-500">Subtotal</span>
                            <span className="font-medium text-ink-900 tabular-nums">{fmt(invoice.total_subtotal)} €</span>
                        </div>
                        {parseFloat(invoice.total_discount || 0) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-ink-500">Discount</span>
                                <span className="font-medium text-red-600 tabular-nums">− {fmt(invoice.total_discount)} €</span>
                            </div>
                        )}
                        {parseFloat(invoice.transport_charge || 0) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-ink-500">Transport</span>
                                <span className="font-medium text-ink-900 tabular-nums">{fmt(invoice.transport_charge)} €</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-ink-100">
                            <span className="text-ink-500">Base Imponible</span>
                            <span className="font-medium text-ink-900 tabular-nums">{fmt(invoice.total_base)} €</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ink-500">IVA</span>
                            <span className="font-medium text-ink-900 tabular-nums">{fmt(invoice.total_iva)} €</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t-2 border-ink-200">
                            <span className="font-bold text-ink-900 text-base">TOTAL</span>
                            <span className="font-bold text-primary-700 text-2xl tabular-nums">{fmt(invoice.grand_total)} €</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Status Card */}
            <div className="workspace-card p-5">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${
                            invoice.payment_status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : invoice.payment_status === 'partial'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                        }`}>
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">
                                Payment Status
                            </p>
                            <p className="text-base font-semibold text-ink-900 mt-0.5">
                                {paymentLabels[invoice.payment_status]}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPaymentModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-ink-200 hover:border-ink-300 text-ink-700 rounded-xl text-sm font-semibold transition-all shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Update Payment
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-ink-50 rounded-lg">
                        <p className="text-xs text-ink-500 mb-1">Total Amount</p>
                        <p className="text-lg font-bold text-ink-900 tabular-nums">
                            {fmt(invoice.grand_total)} €
                        </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-600 mb-1">Amount Paid</p>
                        <p className="text-lg font-bold text-emerald-700 tabular-nums">
                            {fmt(invoice.amount_paid)} €
                        </p>
                    </div>
                    <div className={`p-3 rounded-lg ${remaining > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                        <p className={`text-xs mb-1 ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {remaining > 0 ? 'Remaining' : 'Fully Paid'}
                        </p>
                        <p className={`text-lg font-bold tabular-nums ${remaining > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                            {fmt(remaining)} €
                        </p>
                    </div>
                </div>

                {invoice.payment_date && (
                    <p className="text-xs text-ink-500 mt-4">
                        Last payment recorded on{' '}
                        <strong className="text-ink-700">
                            {new Date(invoice.payment_date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </strong>
                    </p>
                )}
            </div>

            {/* Observations */}
            {invoice.observations && (
                <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-ink-900 mb-3">
                        Observations
                    </h2>
                    <p className="text-sm text-ink-600 whitespace-pre-wrap leading-relaxed">
                        {invoice.observations}
                    </p>
                </div>
            )}

            {/* ============================================
                PAYMENT MODAL
                ============================================ */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg border border-ink-200 shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-ink-100 flex justify-between items-center">
                            <h3 className="text-base font-semibold text-ink-900">
                                Update Payment Status
                            </h3>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="text-ink-400 hover:text-ink-600 text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="label">
                                    Payment Status
                                </label>
                                <select
                                    value={paymentForm.payment_status}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            payment_status: e.target.value,
                                        })
                                    }
                                    className="input"
                                >
                                    <option value="unpaid">Unpaid</option>
                                    <option value="partial">Partial</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">
                                    Amount Paid (€)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={paymentForm.amount_paid}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            amount_paid: e.target.value,
                                        })
                                    }
                                    className="input"
                                />
                                <p className="text-xs text-ink-400 mt-1">
                                    Total: {fmt(invoice.grand_total)} €
                                </p>
                            </div>

                            <div>
                                <label className="label">
                                    Payment Date
                                </label>
                                <input
                                    type="date"
                                    value={paymentForm.payment_date}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            payment_date: e.target.value,
                                        })
                                    }
                                    className="input"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdatePayment}
                                    disabled={updatingPayment}
                                    className="btn btn-primary disabled:opacity-50"
                                >
                                    {updatingPayment ? 'Saving...' : 'Save Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// INFO ROW
// ============================================
function InfoRow({ label, value, mono }) {
    return (
        <div className="flex justify-between border-b border-ink-100 pb-2">
            <span className="text-ink-500">{label}:</span>
            <span className={`font-medium text-ink-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>
                {value || '—'}
            </span>
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