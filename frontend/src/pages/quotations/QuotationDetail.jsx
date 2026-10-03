import { useCallback, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function QuotationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [converting, setConverting] = useState(false);
    const [duplicating, setDuplicating] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const loadQuotation = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/quotations/${id}`);
            setQuotation(data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load quotation');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void Promise.resolve().then(loadQuotation);
    }, [loadQuotation]);

    const handleStatusChange = async (newStatus) => {
        if (!window.confirm(`Change status to "${newStatus}"?`)) return;

        try {
            setUpdatingStatus(true);
            await api.patch(`/quotations/${id}/status`, { status: newStatus });
            await loadQuotation();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    // ============================================
    // PDF DOWNLOAD
    // ============================================
    const fetchPdfBlob = async () => {
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/pdf/quotation/${id}`, {
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

    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            const blob = await fetchPdfBlob();
            if (blob.size === 0) {
                alert('PDF is empty');
                return;
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Presupuesto-${quotation.quotation_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error('❌ PDF Error:', err);
            alert(err.message || 'Failed to download PDF');
        } finally {
            setDownloading(false);
        }
    };

    const handlePrintPdf = async () => {
        try {
            setPrinting(true);
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
        } catch (err) {
            console.error('❌ Print Error:', err);
            alert(err.message || 'Failed to open print preview');
        } finally {
            setPrinting(false);
        }
    };

    // ============================================
    // CONVERT TO INVOICE
    // ============================================
    const handleConvertToInvoice = async () => {
        if (
            !window.confirm(
                `Convert quotation "${quotation.quotation_number}" to an invoice?\n\nThis will create a new invoice and the quotation status will become "Invoiced".`
            )
        ) {
            return;
        }

        try {
            setConverting(true);
            const { data } = await api.post(`/invoices/from-quotation/${id}`, {
                due_days: 30,
            });

            const invoiceId = data.data.id;
            const invoiceNumber = data.data.invoice_number;

            alert(`✅ Invoice ${invoiceNumber} created successfully!`);
            navigate(`/invoices/${invoiceId}`);
        } catch (err) {
            console.error('❌ Convert Error:', err);
            alert(err.response?.data?.error || 'Failed to convert to invoice');
        } finally {
            setConverting(false);
        }
    };

    // ============================================
    // DUPLICATE QUOTATION
    // ============================================
    const handleDuplicate = async () => {
        if (
            !window.confirm(
                `Duplicate quotation "${quotation.quotation_number}"?\n\nA new draft quotation will be created with the same items.`
            )
        ) {
            return;
        }

        try {
            setDuplicating(true);
            const { data } = await api.post(`/quotations/${id}/duplicate`, {
                valid_days: 30,
            });

            const newId = data.data.id;
            const newNumber = data.data.quotation_number;

            alert(`✅ Quotation ${newNumber} created successfully!`);
            navigate(`/quotations/${newId}`);
        } catch (err) {
            console.error('❌ Duplicate Error:', err);
            alert(err.response?.data?.error || 'Failed to duplicate quotation');
        } finally {
            setDuplicating(false);
        }
    };

    const handleDelete = async () => {
        if (
            !window.confirm(
                `Delete quotation "${quotation.quotation_number}"?\n\nThis cannot be undone.`
            )
        ) {
            return;
        }

        try {
            await api.delete(`/quotations/${id}`);
            navigate('/quotations');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete quotation');
        }
    };

    if (loading) {
        return (
            <div className="bg-white border border-ink-200 rounded-xl p-12 text-center text-ink-500 shadow-sm">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Link to="/quotations" className="text-sm font-medium text-primary-700 hover:text-primary-900">
                    ← Back
                </Link>
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mt-4">
                    {error}
                </div>
            </div>
        );
    }

    const isInvoiced = quotation.status === 'invoiced';
    const isAccepted = quotation.status === 'accepted';
    const canConvert = isAccepted && !isInvoiced;
    const allowedStatusTransitions = {
        draft: ['sent'],
        sent: ['accepted', 'rejected'],
        accepted: [],
        rejected: [],
        invoiced: [],
    };
    const nextStatuses = allowedStatusTransitions[quotation.status] || [];

    const statusColors = {
        draft: 'gray',
        sent: 'blue',
        accepted: 'emerald',
        rejected: 'red',
        invoiced: 'violet',
    };

    const statusLabels = {
        draft: 'Draft',
        sent: 'Sent',
        accepted: 'Accepted',
        rejected: 'Rejected',
        invoiced: 'Invoiced',
    };

    const fmt = (n) =>
        parseFloat(n || 0).toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    to="/quotations"
                    className="text-sm font-medium text-primary-700 hover:text-primary-900 transition"
                >
                    ← Back to Quotations
                </Link>

                <div className="flex flex-wrap justify-between items-start gap-4 mt-2">
                    <div>
                        <h1 className="text-2xl font-bold text-ink-900 font-mono mb-1">
                            {quotation.quotation_number}
                        </h1>
                        <div className="flex items-center gap-3">
                            <StatusBadge color={statusColors[quotation.status]}>
                                {statusLabels[quotation.status]}
                            </StatusBadge>
                            <span className="text-sm text-ink-500">
                                {new Date(quotation.quotation_date).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {/* Convert to Invoice — Only when Accepted */}
                        {canConvert && (
                            <button
                                onClick={handleConvertToInvoice}
                                disabled={converting}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                            >
                                {converting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Converting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Convert to Invoice
                                    </>
                                )}
                            </button>
                        )}

                        {/* Duplicate Button */}
                        <button
                            onClick={handleDuplicate}
                            disabled={duplicating}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-ink-200 hover:border-ink-300 text-ink-700 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
                        >
                            {duplicating ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-ink-300 border-t-ink-700 rounded-full animate-spin"></span>
                                    Duplicating...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Duplicate
                                </>
                            )}
                        </button>

                        <button
                            onClick={handlePrintPdf}
                            disabled={printing || downloading}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-ink-200 hover:border-ink-300 text-ink-700 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
                        >
                            {printing ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-ink-300 border-t-ink-700 rounded-full animate-spin"></span>
                                    Opening...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print Preview
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleDownloadPdf}
                            disabled={downloading || printing}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-primary-600 to-primary-800 hover:from-primary-700 hover:to-primary-900 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                        >
                            {downloading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download PDF
                                </>
                            )}
                        </button>

                        {!isInvoiced && (
                            <Link
                                to={`/quotations/${id}/edit`}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-ink-200 hover:border-ink-300 text-ink-700 rounded-xl text-sm font-semibold transition-all shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                            </Link>
                        )}

                        {!isInvoiced && (
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl text-sm font-semibold transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Accepted info banner */}
            {canConvert && (
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-emerald-900">
                            This quotation is accepted
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                            Ready to convert to an invoice. Click <strong>Convert to Invoice</strong> to proceed.
                        </p>
                    </div>
                </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">Customer</p>
                    </div>
                    <p className="font-bold text-ink-900 text-lg mb-1">{quotation.customer_name}</p>
                    {quotation.nif_cif && (
                        <p className="text-sm text-ink-600">
                            NIF: <span className="font-mono">{quotation.nif_cif}</span>
                        </p>
                    )}
                    {quotation.customer_address && (
                        <p className="text-sm text-ink-600 mt-1">{quotation.customer_address}</p>
                    )}
                    {(quotation.customer_postal_code || quotation.customer_city) && (
                        <p className="text-sm text-ink-600">
                            {quotation.customer_postal_code} {quotation.customer_city}
                        </p>
                    )}
                </div>

                <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">Quotation Info</p>
                    </div>
                    <div className="space-y-2 text-sm">
                        <InfoRow label="Date" value={new Date(quotation.quotation_date).toLocaleDateString('es-ES')} />
                        <InfoRow label="Valid Until" value={new Date(quotation.valid_until).toLocaleDateString('es-ES')} />
                        <InfoRow label="Payment" value={quotation.payment_method || 'CONTADO'} />
                        {quotation.reference_person && (
                            <InfoRow label="Reference" value={quotation.reference_person} />
                        )}
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white border border-ink-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-ink-900">Items</h2>
                        <p className="text-xs text-ink-500">{quotation.items?.length || 0} items</p>
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
                            {quotation.items?.map((item) => (
                                <tr key={item.id} className="hover:bg-ink-50/50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-ink-500 font-mono">{item.article_code || '—'}</td>
                                    <td className="px-4 py-3 text-ink-800 max-w-md">{item.description}</td>
                                    <td className="px-4 py-3 text-right text-ink-700 tabular-nums">{fmt(item.quantity)}</td>
                                    <td className="px-4 py-3 text-right text-ink-700 tabular-nums">{fmt(item.unit_price)} €</td>
                                    <td className="px-4 py-3 text-right text-ink-700 tabular-nums">{fmt(item.subtotal)} €</td>
                                    <td className="px-4 py-3 text-center text-ink-700 tabular-nums">{fmt(item.iva_percent)}%</td>
                                    <td className="px-4 py-3 text-right text-ink-700 tabular-nums">{fmt(item.iva_amount)} €</td>
                                    <td className="px-4 py-3 text-right font-semibold text-ink-900 tabular-nums">{fmt(item.line_total)} €</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Totals + IVA Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-ink-900 mb-4">IVA Breakdown</h2>
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
                                const base = parseFloat(quotation[`iva_${rate}_base`] || 0);
                                const iva = parseFloat(quotation[`iva_${rate}_amount`] || 0);
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

                <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-ink-900 mb-4">Summary</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-ink-500">Subtotal</span>
                            <span className="font-medium text-ink-900 tabular-nums">{fmt(quotation.total_subtotal)} €</span>
                        </div>
                        {parseFloat(quotation.total_discount || 0) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-ink-500">Discount</span>
                                <span className="font-medium text-red-600 tabular-nums">− {fmt(quotation.total_discount)} €</span>
                            </div>
                        )}
                        {parseFloat(quotation.transport_charge || 0) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-ink-500">Transport</span>
                                <span className="font-medium text-ink-900 tabular-nums">{fmt(quotation.transport_charge)} €</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-ink-100">
                            <span className="text-ink-500">Base Imponible</span>
                            <span className="font-medium text-ink-900 tabular-nums">{fmt(quotation.total_base)} €</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ink-500">IVA</span>
                            <span className="font-medium text-ink-900 tabular-nums">{fmt(quotation.total_iva)} €</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t-2 border-ink-200">
                            <span className="font-bold text-ink-900 text-base">TOTAL</span>
                            <span className="font-bold text-primary-700 text-2xl tabular-nums">{fmt(quotation.grand_total)} €</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Observations */}
            {quotation.observations && (
                <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-ink-900 mb-3">Observations</h2>
                    <p className="text-sm text-ink-600 whitespace-pre-wrap leading-relaxed">
                        {quotation.observations}
                    </p>
                </div>
            )}

            {/* Status Management */}
            {!isInvoiced && (
                <div className="bg-white border border-ink-200 rounded-xl p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-ink-900 mb-3">Change Status</h2>
                    <p className="text-sm text-ink-500 mb-4">
                        Current: <strong className="text-ink-700">{statusLabels[quotation.status]}</strong>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {nextStatuses.map((s) => (
                            <button
                                key={s}
                                onClick={() => handleStatusChange(s)}
                                disabled={updatingStatus}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition bg-white border border-ink-200 hover:border-ink-300 text-ink-700 disabled:opacity-50"
                            >
                                {statusLabels[s]}
                            </button>
                        ))}
                        {nextStatuses.length === 0 && (
                            <p className="text-sm text-ink-500">
                                No further status changes are allowed. Convert accepted quotations to invoices or duplicate to start a new one.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {isInvoiced && (
                <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-violet-900">
                            This quotation has been invoiced
                        </p>
                        <p className="text-xs text-violet-700 mt-0.5">
                            Status cannot be changed. To view or manage the invoice, go to the Invoices section.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// INFO ROW
// ============================================
function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between border-b border-ink-100 pb-2">
            <span className="text-ink-500">{label}:</span>
            <span className="font-medium text-ink-900 text-right">{value || '—'}</span>
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
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        violet: 'bg-violet-50 text-violet-700 border-violet-200',
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[color] || colors.gray}`}>
            {children}
        </span>
    );
}