import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, StickyNote, UserRound } from 'lucide-react';
import api from '../../api/client';

export default function CustomerForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        name: '',
        nif_cif: '',
        address: '',
        city: '',
        postal_code: '',
        province: '',
        country: 'España',
        phone: '',
        mobile: '',
        email: '',
        notes: '',
    });

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const loadCustomer = useCallback(async () => {
        try {
            const { data } = await api.get(`/customers/${id}`);
            const c = data.data;
            setFormData({
                name: c.name || '',
                nif_cif: c.nif_cif || '',
                address: c.address || '',
                city: c.city || '',
                postal_code: c.postal_code || '',
                province: c.province || '',
                country: c.country || 'España',
                phone: c.phone || '',
                mobile: c.mobile || '',
                email: c.email || '',
                notes: c.notes || '',
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load customer');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isEdit) void Promise.resolve().then(loadCustomer);
    }, [isEdit, loadCustomer]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('Customer name is required');
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                await api.put(`/customers/${id}`, formData);
            } else {
                await api.post('/customers', formData);
            }
            navigate('/customers');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save customer');
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

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <Link
                    to="/customers"
                    className="inline-flex items-center gap-1 text-primary-700 text-sm font-medium hover:text-primary-900"
                >
                    <ArrowLeft size={15} /> Back to Customers
                </Link>
                <h1 className="workspace-title mt-2">
                    {isEdit ? 'Edit Customer' : 'New Customer'}
                </h1>
                <p className="workspace-copy">
                    {isEdit
                        ? 'Update customer details'
                        : 'Add a new customer to your database'}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Basic Info */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <UserRound size={18} className="text-primary-700" /> Basic Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="label">
                                Customer Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                autoFocus
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                placeholder="e.g., Construcciones García S.L."
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
                                placeholder="B12345678"
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
                                placeholder="info@customer.com"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Address */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <MapPin size={18} className="text-primary-700" /> Address
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Street Address
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Calle Mayor 15"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                City
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Barcelona"
                            />
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
                                placeholder="08001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Province
                            </label>
                            <input
                                type="text"
                                name="province"
                                value={formData.province}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Barcelona"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Country
                            </label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Contact */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <Phone size={18} className="text-primary-700" /> Contact
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                placeholder="934567890"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Mobile
                            </label>
                            <input
                                type="text"
                                name="mobile"
                                value={formData.mobile}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="600 123 456"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 4: Notes */}
                <div className="workspace-card p-5 sm:p-6">
                    <h2 className="workspace-section-title mb-4">
                        <StickyNote size={18} className="text-primary-700" /> Notes
                    </h2>

                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="Any additional notes about this customer..."
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pb-8">
                    <Link
                        to="/customers"
                        className="btn btn-secondary"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary px-6"
                    >
                        {saving ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
                    </button>
                </div>
            </form>
        </div>
    );
}