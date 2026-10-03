import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, ChartNoAxesCombined, Eye, EyeOff, FileText, LockKeyhole, Mail, ReceiptText, ShieldCheck, UsersRound } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(
                err.response?.data?.error ||
                    err.response?.data?.message ||
                    'Login failed. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#f3f5f7]">
            <header className="h-16 shrink-0 border-b border-ink-200 bg-white px-5 sm:px-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary-700 text-white flex items-center justify-center text-base font-bold">Q</div>
                    <span className="text-sm font-semibold text-ink-900">Quotation System</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
                    <ShieldCheck size={16} className="text-primary-700" />
                    <span className="hidden sm:inline">Secure workspace</span>
                </div>
            </header>

            <main className="flex flex-1 items-center justify-center px-5 py-10">
                <section className="w-full max-w-[960px] overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card lg:grid lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="h-1 bg-amber-400 lg:col-span-2" />

                    <aside className="hidden border-r border-[#214d9c] bg-[#285ab8] p-9 lg:flex lg:flex-col lg:justify-center xl:p-12">
                        <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-lg font-bold text-primary-800 shadow-soft">Q</div>
                        <p className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-50">Business workspace</p>
                        <h1 className="mt-4 text-3xl font-bold leading-tight text-white">Everything in its right place.</h1>
                        <p className="mt-3 text-sm leading-6 text-blue-100">
                            Keep your daily business documents and client work organized in one place.
                        </p>

                        <div className="mt-8 space-y-5">
                            <WorkspaceItem icon={FileText} label="Quotations" detail="Prepare and track proposals" />
                            <WorkspaceItem icon={UsersRound} label="Customers" detail="Keep client details close" />
                            <WorkspaceItem icon={ReceiptText} label="Invoices" detail="Follow work through to billing" />
                            <WorkspaceItem icon={ChartNoAxesCombined} label="Business overview" detail="See activity at a glance" />
                        </div>
                    </aside>

                    <div className="p-6 sm:p-8 lg:p-10">
                        <div className="mb-7">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-700">Account access</p>
                            <h2 className="text-2xl font-bold text-ink-900">Welcome back</h2>
                            <p className="mt-2 text-sm leading-6 text-ink-500">Sign in to continue to your business workspace.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-semibold">Sign-in failed</p>
                                        <p className="mt-0.5 text-xs leading-5">{error}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="label">Email address</label>
                                <div className="relative">
                                    <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input pl-10"
                                        placeholder="you@company.com"
                                        required
                                        autoFocus
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="label">Password</label>
                                <div className="relative">
                                    <LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input pl-10 pr-12"
                                        placeholder="Enter your password"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 transition hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
                                {loading ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                                        Signing in...
                                    </>
                                ) : (
                                    <>Sign in <ArrowRight size={17} /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-7 border-t border-ink-100 pt-5">
                            <p className="text-sm font-medium text-ink-800">Need an account?</p>
                            <p className="mt-1 text-sm leading-6 text-ink-500">Contact your platform administrator to get access.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="px-5 pb-5 text-center text-xs text-ink-400">
                © 2026 Quotation System · by Future Technologies
            </footer>
        </div>
    );
}

function WorkspaceItem({ icon: Icon, label, detail }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white">
                <Icon size={17} strokeWidth={1.8} />
            </div>
            <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-0.5 text-xs text-blue-100">{detail}</p>
            </div>
        </div>
    );
}