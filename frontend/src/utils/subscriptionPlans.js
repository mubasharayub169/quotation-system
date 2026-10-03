// ============================================
// SUBSCRIPTION PLANS (4 plans only)
// ============================================
export const SUBSCRIPTION_PLANS = [
    { code: 'trial',     label: 'Trial',      days: 7,   color: 'yellow' },
    { code: 'monthly',   label: 'Monthly',    days: 30,  color: 'blue' },
    { code: 'quarterly', label: 'Quarterly',  days: 90,  color: 'blue' },
    { code: 'yearly',    label: 'Yearly',     days: 365, color: 'green' },
];

export const getPlanByCode = (code) =>
    SUBSCRIPTION_PLANS.find((p) => p.code === code);

export const calculateExpiryDate = (planCode, startDate = new Date()) => {
    const plan = getPlanByCode(planCode);
    if (!plan) return null;
    const expiry = new Date(startDate);
    expiry.setDate(expiry.getDate() + plan.days);
    return expiry.toISOString().split('T')[0];
};

export const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
};

export const getSubscriptionStatus = (status, expiryDate) => {
    if (status === 'inactive') return { label: 'Inactive', color: 'gray' };
    if (!expiryDate) return { label: 'No Expiry', color: 'gray' };

    const days = getDaysRemaining(expiryDate);

    if (days < 0) return { label: 'Expired', color: 'red' };
    if (days === 0) return { label: 'Expires Today', color: 'orange' };
    if (days <= 7) return { label: `${days}d left`, color: 'orange' };
    if (days <= 30) return { label: `${days}d left`, color: 'yellow' };
    return { label: `${days}d left`, color: 'green' };
};