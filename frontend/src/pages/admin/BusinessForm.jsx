import { useCallback, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, CircleDollarSign, Landmark, UserRound } from 'lucide-react';
import api from '../../api/client';
import {
    getCountriesCached,
    getStatesCached,
    getCitiesCached,
} from '../../api/locationApi';

export default function BusinessForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        business_name: '',
        legal_name: '',
        nif_cif: '',
        address: '',
        city: '',
        postal_code: '',
        province: '',
        country: '',
        phone: '',
        email: '',
        primary_color: '#1e40af',
        bank1_name: '',
        bank1_iban: '',
        bank2_name: '',
        bank2_iban: '',
        default_iva_percent: 21.00,
        default_payment_method: 'CONTADO',
        default_observations: '',
        owner_name: '',
        owner_email: '',
        owner_password: '',
    });

    // Location data
    const [countries, setCountries] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const [showCustomCityInput, setShowCustomCityInput] = useState(false);

    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [existingLogo, setExistingLogo] = useState(null);

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const loadCountries = useCallback(async () => {
        try {
            const data = await getCountriesCached();
            setCountries(data);
        } catch (err) {
            console.error('Failed to load countries:', err);
        }
    }, []);

    const loadBusiness = useCallback(async () => {
        try {
            const { data } = await api.get(`/admin/businesses/${id}`);
            const b = data.data;

            setFormData({
                business_name: b.business_name || '',
                legal_name: b.legal_name || '',
                nif_cif: b.nif_cif || '',
                address: b.address || '',
                city: b.city || '',
                postal_code: b.postal_code || '',
                province: b.province || '',
                country: b.country || '',
                phone: b.phone || '',
                email: b.email || '',
                primary_color: b.primary_color || '#1e40af',
                bank1_name: b.bank1_name || '',
                bank1_iban: b.bank1_iban || '',
                bank2_name: b.bank2_name || '',
                bank2_iban: b.bank2_iban || '',
                default_iva_percent: b.default_iva_percent ?? 21.00,
                default_payment_method: b.default_payment_method || 'CONTADO',
                default_observations: b.default_observations || '',
            });

            if (b.logo_path) setExistingLogo(b.logo_path);

            // Load provinces for existing business
            if (b.country) {
                try {
                    const provincesList = await getStatesCached(b.country);
                    setProvinces(provincesList);
                } catch (e) {
                    console.error('Failed to load provinces:', e);
                }
            }
            // Load cities for existing business
            if (b.country && b.province) {
                try {
                    const citiesList = await getCitiesCached(b.country, b.province);
                    setCities(citiesList);
                } catch (e) {
                    console.error('Failed to load cities:', e);
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void Promise.resolve().then(loadCountries);
    }, [loadCountries]);

    useEffect(() => {
        if (isEdit) void Promise.resolve().then(loadBusiness);
    }, [isEdit, loadBusiness]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Country change → load provinces
    const handleCountryChange = async (e) => {
        const country = e.target.value;
        setFormData((prev) => ({
            ...prev,
            country,
            province: '',
            city: '',
        }));
        setProvinces([]);
        setCities([]);
        setShowCustomCityInput(false);

        if (!country) return;

        setLoadingLocations(true);
        try {
            const states = await getStatesCached(country);
            setProvinces(states);
        } catch (err) {
            console.error('Failed to load provinces:', err);
        } finally {
            setLoadingLocations(false);
        }
    };

    // Province change → load cities
    const handleProvinceChange = async (e) => {
        const province = e.target.value;
        setFormData((prev) => ({
            ...prev,
            province,
            city: '',
        }));
        setCities([]);
        setShowCustomCityInput(false);

        if (!province || !formData.country) return;

        setLoadingLocations(true);
        try {
            const citiesList = await getCitiesCached(formData.country, province);
            setCities(citiesList);
        } catch (err) {
            console.error('Failed to load cities:', err);
        } finally {
            setLoadingLocations(false);
        }
    };

    // City select change
    const handleCitySelect = (e) => {
        const val = e.target.value;
        if (val === '__other__') {
            setShowCustomCityInput(true);
            setFormData((prev) => ({ ...prev, city: '' }));
        } else {
            setShowCustomCityInput(false);
            setFormData((prev) => ({ ...prev, city: val }));
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert('File too large (max 2MB)');
            return;
        }
        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            let businessId = id;

            if (isEdit) {
                await api.put(`/admin/businesses/${id}`, formData);
            } else {
                const { data } = await api.post('/admin/businesses', formData);
                businessId = data.data.id;
            }

            if (logoFile) {
                const fd = new FormData();
                fd.append('logo', logoFile);
                await api.post(`/admin/businesses/${businessId}/logo`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            navigate('/admin/businesses');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="workspace-card p-12 text-center text-ink-500">Loading...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <Link to="/admin/businesses" className="inline-flex items-center gap-1 text-primary-700 text-sm font-medium hover:text-primary-900">
                    <ArrowLeft size={15} /> Back to Businesses
                </Link>
                <h1 className="workspace-title mt-2">
                    {isEdit ? 'Edit Business' : 'New Business'}
                </h1>
                <p className="workspace-copy">
                    {isEdit ? 'Update business details' : 'Create a new business with owner account'}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Company Info */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <Building2 size={18} className="text-primary-700" /> Company Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Business Name *
                            </label>
                            <input
                                type="text"
                                name="business_name"
                                value={formData.business_name}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Legal Name
                            </label>
                            <input
                                type="text"
                                name="legal_name"
                                value={formData.legal_name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                NIF / CIF
                            </label>
                            <input
                                type="text"
                                name="nif_cif"
                                value={formData.nif_cif}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Address
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>

                        {/* Country */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Country
                            </label>
                            <select
                                name="country"
                                value={formData.country}
                                onChange={handleCountryChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="">— Select Country —</option>
                                {countries.map((c) => (
                                    <option key={c.iso2} value={c.country}>
                                        {c.country}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Province */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Province / State
                                {loadingLocations && (
                                    <span className="text-xs text-slate-400 ml-2">loading...</span>
                                )}
                            </label>
                            <select
                                name="province"
                                value={formData.province}
                                onChange={handleProvinceChange}
                                disabled={!formData.country}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {formData.country
                                        ? '— Select Province —'
                                        : '— Select Country First —'}
                                </option>
                                {provinces.map((p) => (
                                    <option key={p.state_code || p.name} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* City - Clean Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                City
                                {loadingLocations && (
                                    <span className="text-xs text-slate-400 ml-2">loading...</span>
                                )}
                            </label>
                            <select
                                value={
                                    showCustomCityInput
                                        ? '__other__'
                                        : formData.city && cities.includes(formData.city)
                                        ? formData.city
                                        : formData.city && !cities.includes(formData.city)
                                        ? '__other__'
                                        : ''
                                }
                                onChange={handleCitySelect}
                                disabled={!formData.province || cities.length === 0}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {!formData.country
                                        ? '— Select Country First —'
                                        : !formData.province
                                        ? '— Select Province First —'
                                        : cities.length === 0
                                        ? '— No cities available —'
                                        : '— Select City —'}
                                </option>
                                {cities.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                                {cities.length > 0 && (
                                    <option value="__other__">
                                        — Other (type manually) —
                                    </option>
                                )}
                            </select>

                            {/* Custom city input — only if "Other" selected */}
                            {showCustomCityInput && (
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) =>
                                        setFormData({ ...formData, city: e.target.value })
                                    }
                                    placeholder="Type your city name..."
                                    autoFocus
                                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            )}

                            {formData.province && cities.length > 0 && !showCustomCityInput && (
                                <p className="text-xs text-slate-400 mt-1">
                                    {cities.length} cities available
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Postal Code
                            </label>
                            <input
                                type="text"
                                name="postal_code"
                                value={formData.postal_code}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Phone
                            </label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Branding */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">
                        🎨 Branding
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Logo (max 2MB)
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                                    ) : existingLogo ? (
                                        <img src={`/${existingLogo}`} alt="Current" className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-slate-400">No logo</span>
                                    )}
                                </div>
                                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                                    Choose File
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Primary Color (PDF theme)
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    name="primary_color"
                                    value={formData.primary_color}
                                    onChange={handleChange}
                                    className="w-14 h-10 rounded border border-slate-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    name="primary_color"
                                    value={formData.primary_color}
                                    onChange={handleChange}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Tax & Payment */}
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
                                Default Observations (PDF footer)
                            </label>
                            <textarea
                                name="default_observations"
                                value={formData.default_observations}
                                onChange={handleChange}
                                rows="2"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="e.g., Presupuesto válido 30 días..."
                            />
                        </div>
                    </div>
                </div>

                {/* Section 4: Bank Details */}
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
                                placeholder="CAIXABANK"
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
                                Bank 2 - Name
                            </label>
                            <input
                                type="text"
                                name="bank2_name"
                                value={formData.bank2_name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="BBVA"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Bank 2 - IBAN
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

                {/* Section 5: Owner (only on create) */}
                {!isEdit && (
                    <div className="workspace-card p-5 sm:p-6 border-l-4 border-l-primary-600">
                        <h2 className="workspace-section-title mb-1">
                            <UserRound size={18} className="text-primary-700" /> Owner Account
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            The owner will be able to log in and manage this business.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Owner Full Name *
                                </label>
                                <input
                                    type="text"
                                    name="owner_name"
                                    value={formData.owner_name}
                                    onChange={handleChange}
                                    required={!isEdit}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Owner Email *
                                </label>
                                <input
                                    type="email"
                                    name="owner_email"
                                    value={formData.owner_email}
                                    onChange={handleChange}
                                    required={!isEdit}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Owner Password * (min 6 chars)
                                </label>
                                <input
                                    type="text"
                                    name="owner_password"
                                    value={formData.owner_password}
                                    onChange={handleChange}
                                    required={!isEdit}
                                    minLength={6}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                    placeholder="e.g., Owner@123"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pb-8">
                    <Link
                        to="/admin/businesses"
                        className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary px-6 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : isEdit ? 'Update Business' : 'Create Business'}
                    </button>
                </div>
            </form>
        </div>
    );
}