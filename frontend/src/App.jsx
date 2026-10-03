import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './context/useAuth';
import DashboardLayout from './layouts/DashboardLayout';

const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BusinessList = lazy(() => import('./pages/admin/BusinessList'));
const BusinessForm = lazy(() => import('./pages/admin/BusinessForm'));
const BusinessDetail = lazy(() => import('./pages/admin/BusinessDetail'));
const OwnerSettings = lazy(() => import('./pages/settings/OwnerSettings'));
const StaffList = lazy(() => import('./pages/settings/StaffList'));
const BusinessProfile = lazy(() => import('./pages/settings/BusinessProfile'));
const ActivityLog = lazy(() => import('./pages/settings/ActivityLog'));
const CustomerList = lazy(() => import('./pages/customers/CustomerList'));
const ProductList = lazy(() => import('./pages/products/ProductList'));
const CustomerForm = lazy(() => import('./pages/customers/CustomerForm'));
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail'));
const QuotationList = lazy(() => import('./pages/quotations/QuotationList'));
const QuotationForm = lazy(() => import('./pages/quotations/QuotationForm'));
const QuotationDetail = lazy(() => import('./pages/quotations/QuotationDetail'));
const InvoiceList = lazy(() => import('./pages/invoices/InvoiceList'));
const InvoiceDetail = lazy(() => import('./pages/invoices/InvoiceDetail'));

function RouteLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-slate-500">Loading...</div>
        </div>
    );
}

function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-slate-500">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

// Allowed roles for business operations
const BUSINESS_ROLES = ['owner', 'staff'];

function App() {
    return (
        <Suspense fallback={<RouteLoader />}>
        <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected */}
            <Route
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={
                    <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                        <ProductList />
                    </ProtectedRoute>
                } />

                {/* ============================================
                    SUPER ADMIN — Businesses
                    ============================================ */}
                <Route
                    path="/admin/businesses"
                    element={
                        <ProtectedRoute allowedRoles={['superadmin']}>
                            <BusinessList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/businesses/new"
                    element={
                        <ProtectedRoute allowedRoles={['superadmin']}>
                            <BusinessForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/businesses/:id/edit"
                    element={
                        <ProtectedRoute allowedRoles={['superadmin']}>
                            <BusinessForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/businesses/:id"
                    element={
                        <ProtectedRoute allowedRoles={['superadmin']}>
                            <BusinessDetail />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================
                    OWNER + STAFF — Business Profile
                    ============================================ */}
                <Route
                    path="/business-profile"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <BusinessProfile />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================
                    CUSTOMERS
                    ============================================ */}
                <Route
                    path="/customers"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <CustomerList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/customers/new"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <CustomerForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/customers/:id/edit"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <CustomerForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/customers/:id"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <CustomerDetail />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================
                    QUOTATIONS
                    ============================================ */}
                <Route
                    path="/quotations"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <QuotationList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/quotations/new"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <QuotationForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/quotations/:id/edit"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <QuotationForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/quotations/:id"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <QuotationDetail />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================
                    INVOICES
                    ============================================ */}
                <Route
                    path="/invoices"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <InvoiceList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/invoices/:id"
                    element={
                        <ProtectedRoute allowedRoles={BUSINESS_ROLES}>
                            <InvoiceDetail />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================
                    OWNER — Settings
                    ============================================ */}
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute allowedRoles={['owner']}>
                            <OwnerSettings />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/activity"
                    element={
                        <ProtectedRoute allowedRoles={['owner']}>
                            <ActivityLog />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================
                    OWNER — Staff Management
                    ============================================ */}
                <Route
                    path="/staff"
                    element={
                        <ProtectedRoute allowedRoles={['owner']}>
                            <StaffList />
                        </ProtectedRoute>
                    }
                />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
    );
}

export default App;