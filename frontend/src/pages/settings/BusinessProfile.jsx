import { useCallback, useEffect, useState } from 'react';
import { Building2, CalendarDays, CircleDollarSign, Landmark, LockKeyhole, Phone, StickyNote } from 'lucide-react';
import api from '../../api/client';
import { getSubscriptionStatus, getDaysRemaining } from '../../utils/subscriptionPlans';

export default function BusinessProfile() {
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadProfile = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/business/me');
            setBusiness(data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(loadProfile);
    }, [loadProfile]);

    if (loading) {
        return (
            <div className="workspace-card p-12 text-center text-ink-500">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
            </div>
        );
    }

    const sub = getSubscriptionStatus(
        business.subscription_status,
        business.subscription_expiry
    );
    const daysLeft = getDaysRemaining(business.subscription_expiry);

    const subColorMap = {
        green: { bg: 'bg-green-50', border: 'border-green-500', badge: 'bg-green-100 text-green-700' },
        yellow: { bg: 'bg-yellow-50', border: 'border-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-500', badge: 'bg-orange-100 text-orange-700' },
        red: { bg: 'bg-red-50', border: 'border-red-500', badge: 'bg-red-100 text-red-700' },
        gray: { bg: 'bg-slate-50', border: 'border-slate-400', badge: 'bg-slate-100 text-slate-700' },
        blue: { bg: 'bg-primary-50', border: 'border-primary-500', badge: 'bg-primary-50 text-primary-800' },
    };
    const colors = subColorMap[sub.color] || subColorMap.gray;

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <p className="workspace-kicker">COMPANY</p>
                <h1 className="workspace-title">Business Profile</h1>
                <p className="workspace-copy">
                    View your business information
                </p>
            </div>

            {/* Read-only Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <LockKeyhole size={18} className="mt-0.5 text-amber-700" />
                <div className="text-sm">
                    <p className="font-medium text-yellow-800">
                        Read-only information
                    </p>
                    <p className="text-yellow-700 mt-0.5">
                        To update any information below, please contact your platform administrator.
                    </p>
                </div>
            </div>

            {/* Company Header Card */}
            <div className="workspace-card p-5 sm:p-6 mb-6">
                <div className="flex items-center gap-5">
                    {business.logo_path ? (
                        <img
                            src={`/${business.logo_path}`}
                            alt={business.business_name}
                            className="w-20 h-20 rounded-xl object-contain bg-slate-50 p-2 border border-slate-200"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-lg bg-primary-50 flex items-center justify-center text-primary-800 font-bold text-2xl">
                            {business.business_name?.charAt(0)}
                        </div>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {business.business_name}
                        </h2>
                        {business.legal_name && (
                            <p className="text-slate-500 text-sm mt-1">
                                {business.legal_name}
                            </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-slate-500">
                                ID: #{business.id}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    business.is_active
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                }`}
                            >
                                {business.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subscription Card */}
            <div
                className={`rounded-xl shadow-sm p-6 mb-6 border-l-4 ${colors.border} ${colors.bg}`}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            Subscription
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                            <span
                                className={`px-3 py-1 rounded-lg text-sm font-semibold ${colors.badge}`}
                            >
                                {sub.label}
                            </span>
                            <span className="text-sm text-slate-600 capitalize">
                                Plan: {business.subscription_status}
                            </span>
                        </div>
                        <div className="mt-3 text-sm text-slate-600">
                            {business.subscription_expiry ? (
                                <>
                                    <strong>Expires:</strong>{' '}
                                    {new Date(
                                        business.subscription_expiry
                                    ).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                    {daysLeft !== null && (
                                        <span className="ml-2 text-xs text-slate-500">
                                            ({daysLeft >= 0
                                                ? `${daysLeft} days left`
                                                : `expired ${Math.abs(daysLeft)} days ago`})
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span>No expiry set</span>
                            )}
                        </div>
                    </div>
                    <CalendarDays size={25} className="text-primary-700" />
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Company Info */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <Building2 size={18} className="text-primary-700" /> Company Information
                    </h2>
                    <div className="space-y-3 text-sm">
                        <InfoRow label="Business Name" value={business.business_name} />
                        <InfoRow label="Legal Name" value={business.legal_name} />
                        <InfoRow label="NIF / CIF" value={business.nif_cif} />
                        <InfoRow label="Address" value={business.address} />
                        <InfoRow label="City" value={business.city} />
                        <InfoRow label="Postal Code" value={business.postal_code} />
                        <InfoRow label="Province" value={business.province} />
                        <InfoRow label="Country" value={business.country} />
                    </div>
                </div>

                {/* Contact Info */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <Phone size={18} className="text-primary-700" /> Contact Information
                    </h2>
                    <div className="space-y-3 text-sm">
                        <InfoRow label="Phone" value={business.phone} />
                        <InfoRow label="Email" value={business.email} />
                        <InfoRow
                            label="Website"
                            value={business.website}
                        />
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-ink-800 mb-3">
                            <CircleDollarSign size={16} className="text-primary-700" /> Tax Settings
                        </h3>
                        <div className="space-y-3 text-sm">
                            <InfoRow
                                label="Default IVA"
                                value={
                                    business.default_iva_percent
                                        ? `${business.default_iva_percent}%`
                                        : null
                                }
                            />
                            <InfoRow
                                label="Payment Method"
                                value={business.default_payment_method}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank Details */}
            <div className="workspace-card p-5 sm:p-6 mb-6">
                <h2 className="workspace-section-title mb-4">
                    <Landmark size={18} className="text-primary-700" /> Bank Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Bank 1
                        </p>
                        {business.bank1_name ? (
                            <div className="space-y-1 text-sm">
                                <p className="font-medium text-slate-800">
                                    {business.bank1_name}
                                </p>
                                <p className="font-mono text-slate-600 text-xs break-all">
                                    {business.bank1_iban || '—'}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">Not set</p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Bank 2
                        </p>
                        {business.bank2_name ? (
                            <div className="space-y-1 text-sm">
                                <p className="font-medium text-slate-800">
                                    {business.bank2_name}
                                </p>
                                <p className="font-mono text-slate-600 text-xs break-all">
                                    {business.bank2_iban || '—'}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">Not set</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Default Observations */}
            {business.default_observations && (
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-3">
                        <StickyNote size={18} className="text-primary-700" /> Default Observations
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {business.default_observations}
                    </p>
                </div>
            )}
        </div>
    );
}

// ============================================
// Helper: Info Row
// ============================================
function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">{label}:</span>
            <span className="text-slate-800 font-medium text-right">
                {value || '—'}
            </span>
        </div>
    );
}