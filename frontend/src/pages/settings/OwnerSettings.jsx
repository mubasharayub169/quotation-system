import { useCallback, useEffect, useState } from 'react';
import { CircleDollarSign, Info, KeyRound, Landmark, Phone } from 'lucide-react';
import api from '../../api/client';

export default function OwnerSettings() {
    const [formData, setFormData] = useState({
        default_iva_percent: 21.00,
        default_payment_method: 'CONTADO',
        default_observations: '',
        bank1_name: '',
        bank1_iban: '',
        bank2_name: '',
        bank2_iban: '',
        phone: '',
        email: '',
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Password change state
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const loadSettings = useCallback(async () => {
        try {
            const { data } = await api.get('/business/me');
            const b = data.data;
            setFormData({
                default_iva_percent: b.default_iva_percent ?? 21.00,
                default_payment_method: b.default_payment_method || 'CONTADO',
                default_observations: b.default_observations || '',
                bank1_name: b.bank1_name || '',
                bank1_iban: b.bank1_iban || '',
                bank2_name: b.bank2_name || '',
                bank2_iban: b.bank2_iban || '',
                phone: b.phone || '',
                email: b.email || '',
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(loadSettings);
    }, [loadSettings]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            await api.put('/business/settings', formData);
            setSuccess('Settings saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!passwordData.current_password || !passwordData.new_password) {
            setPasswordError('All fields required');
            return;
        }
        if (passwordData.new_password.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordError('New passwords do not match');
            return;
        }

        setChangingPassword(true);
        try {
            await api.post('/auth/change-password', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password,
            });
            setPasswordSuccess('Password changed successfully!');
            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: '',
            });
            setTimeout(() => setPasswordSuccess(''), 4000);
        } catch (err) {
            setPasswordError(err.response?.data?.error || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-12 text-center text-slate-500">
                Loading...
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <p className="workspace-kicker">PREFERENCES</p>
                <h1 className="workspace-title">Business Settings</h1>
                <p className="workspace-copy">
                    Manage your operational preferences and bank details
                </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Info size={18} className="mt-0.5 text-primary-700" />
                <div className="text-sm">
                    <p className="font-medium text-blue-800">
                        Some fields are managed by the platform admin
                    </p>
                    <p className="text-primary-800 mt-0.5">
                        Business name, NIF, address, logo, and subscription are controlled by Super Admin. Here you can update your operational settings below.
                    </p>
                </div>
            </div>

            {/* ============================================
                MAIN SETTINGS FORM
                ============================================ */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
                        {success}
                    </div>
                )}

                {/* Section 1: Tax & Payment */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <CircleDollarSign size={18} className="text-primary-700" /> Tax & Payment
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Default IVA %
                            </label>
                            <select
                                name="default_iva_percent"
                                value={formData.default_iva_percent}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="21.00">21% (Standard)</option>
                                <option value="10.00">10% (Reduced)</option>
                                <option value="4.00">4% (Super-reduced)</option>
                            </select>
                            <p className="text-xs text-slate-400 mt-1">
                                Default IVA rate for new quotations
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Default Payment Method
                            </label>
                            <select
                                name="default_payment_method"
                                value={formData.default_payment_method}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="CONTADO">CONTADO</option>
                                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                                <option value="TARJETA">TARJETA</option>
                                <option value="CHEQUE">CHEQUE</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Default Observations (shown on PDF footer)
                            </label>
                            <textarea
                                name="default_observations"
                                value={formData.default_observations}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="e.g., Presupuesto válido 30 días. No incluye trabajos de albañilería..."
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Bank Details */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <Landmark size={18} className="text-primary-700" /> Bank Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Bank 1 - Name
                            </label>
                            <input
                                type="text"
                                name="bank1_name"
                                value={formData.bank1_name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="e.g., CAIXABANK"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Bank 1 - IBAN
                            </label>
                            <input
                                type="text"
                                name="bank1_iban"
                                value={formData.bank1_iban}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                placeholder="ES59 2100 0039 9902 0129 3128"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Bank 2 - Name (optional)
                            </label>
                            <input
                                type="text"
                                name="bank2_name"
                                value={formData.bank2_name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="e.g., BBVA"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Bank 2 - IBAN (optional)
                            </label>
                            <input
                                type="text"
                                name="bank2_iban"
                                value={formData.bank2_iban}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                placeholder="ES60 0182 0815 8102 0188 4425"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Contact Info */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <Phone size={18} className="text-primary-700" /> Contact Info
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Business Phone
                            </label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="632 203 529"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Business Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="info@yourcompany.com"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={loadSettings}
                        className="btn btn-secondary"
                    >
                        Reset
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>

            {/* ============================================
                PASSWORD CHANGE (Outside main form)
                ============================================ */}
            <div className="workspace-card p-5 sm:p-6 mt-6">
                <h2 className="workspace-section-title mb-1">
                    <KeyRound size={18} className="text-primary-700" /> Change Password
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                    Update your account password. Minimum 6 characters.
                </p>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    {passwordError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
                            {passwordError}
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">
                            ✅ {passwordSuccess}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Current Password
                            </label>
                            <input
                                type="password"
                                value={passwordData.current_password}
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        current_password: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={passwordData.new_password}
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        new_password: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={passwordData.confirm_password}
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        confirm_password: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={changingPassword}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                        >
                            {changingPassword ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}