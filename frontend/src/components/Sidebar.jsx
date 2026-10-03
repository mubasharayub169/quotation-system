import { NavLink } from 'react-router-dom';
import { Activity, BarChart3, Building2, FileText, ReceiptText, Settings, ShieldCheck, Users, UserRound } from 'lucide-react';
import { useAuth } from '../context/useAuth';

export default function Sidebar() {
    const { user, business, isSuperAdmin, isOwner } = useAuth();

    const linkClass = ({ isActive }) =>
        `flex items-center justify-center md:justify-start gap-3 px-2 md:px-3.5 py-2.5 rounded-lg transition-colors duration-150 text-sm font-medium group relative ${
            isActive
                ? 'bg-primary-50 text-primary-800 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r before:bg-primary-600'
                : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
        }`;

    const sectionLabelClass = 'hidden md:block pt-6 pb-2 px-3.5 text-[10px] font-bold text-ink-400 uppercase tracking-wider';

    return (
        <aside className="w-16 md:w-56 lg:w-64 bg-white text-ink-800 min-h-screen flex flex-col border-r border-ink-200 shrink-0">
            {/* Brand */}
            <div className="p-3 md:p-5 border-b border-ink-100">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-700 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-lg">Q</span>
                    </div>
                    <div className="hidden md:block flex-1 min-w-0">
                        <h1 className="text-sm font-bold text-ink-900 truncate">
                            Quotation System
                        </h1>
                        {business && (
                            <p className="text-[11px] text-ink-500 mt-0.5 truncate">
                                {business.business_name}
                            </p>
                        )}
                    </div>
                </div>

                {isSuperAdmin() && (
                    <div className="hidden md:flex mt-3 items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                        <ShieldCheck size={14} className="text-amber-600" />
                        <span className="text-[11px] font-bold text-amber-700 tracking-wide uppercase">
                            Super Admin
                        </span>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 p-2 md:p-3 space-y-1 overflow-y-auto">
                <NavLink to="/dashboard" className={linkClass} title="Dashboard" aria-label="Dashboard">
                    <BarChart3 size={18} strokeWidth={1.8} />
                    <span className="hidden md:inline">Dashboard</span>
                </NavLink>

                {/* Super Admin only */}
                {isSuperAdmin() && (
                    <>
                        <div className={sectionLabelClass}>Admin</div>
                        <NavLink to="/admin/businesses" className={linkClass} title="Businesses" aria-label="Businesses">
                            <Building2 size={18} strokeWidth={1.8} />
                            <span className="hidden md:inline">Businesses</span>
                        </NavLink>
                    </>
                )}

                {/* Owner + Staff */}
                {(isOwner() || user?.role === 'staff') && (
                    <>
                        <div className={sectionLabelClass}>Business</div>
                        <NavLink to="/customers" className={linkClass} title="Customers" aria-label="Customers">
                            <UserRound size={18} strokeWidth={1.8} />
                            <span className="hidden md:inline">Customers</span>
                        </NavLink>
                        <NavLink to="/quotations" className={linkClass} title="Quotations" aria-label="Quotations">
                            <FileText size={18} strokeWidth={1.8} />
                            <span className="hidden md:inline">Quotations</span>
                        </NavLink>
                        <NavLink to="/invoices" className={linkClass} title="Invoices" aria-label="Invoices">
                            <ReceiptText size={18} strokeWidth={1.8} />
                            <span className="hidden md:inline">Invoices</span>
                        </NavLink>
                    </>
                )}

                {/* Owner only */}
                {isOwner() && (
                    <>
                        <div className={sectionLabelClass}>Management</div>
                        <NavLink to="/staff" className={linkClass} title="Staff" aria-label="Staff">
                            <Users size={18} strokeWidth={1.8} />
                            <span className="hidden md:inline">Staff</span>
                        </NavLink>

                        <div className={sectionLabelClass}>Settings</div>
                        <NavLink to="/business-profile" className={linkClass} title="Business Profile" aria-label="Business Profile">
                            <Building2 size={18} strokeWidth={1.8} />
                            <span className="hidden md:inline">Business Profile</span>
                        </NavLink>
                        <NavLink to="/settings" className={linkClass} title="Business Settings" aria-label="Business Settings">
                            <Settings size={18} strokeWidth={1.8} />
                            <span className="hidden md:inline">Business Settings</span>
                        </NavLink>
                        <NavLink to="/activity" className={linkClass} title="Activity Log" aria-label="Activity Log">
                            <Activity size={18} strokeWidth={1.8} />
                            <span className="hidden md:inline">Activity Log</span>
                        </NavLink>
                    </>
                )}

                {/* Staff */}
                {user?.role === 'staff' && (
                    <>
                        <div className={sectionLabelClass}>Company</div>
                        <NavLink to="/business-profile" className={linkClass} title="Business Profile" aria-label="Business Profile">
                            <Building2 size={18} strokeWidth={1.8} />
                            <span className="hidden md:inline">Business Profile</span>
                        </NavLink>
                    </>
                )}
            </nav>

            {/* User footer */}
            <div className="p-2 md:p-4 border-t border-ink-100">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-bold text-sm flex-shrink-0">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="hidden md:block flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink-800 truncate">
                            {user?.name}
                        </p>
                        <p className="text-[10px] text-ink-500 truncate">
                            {user?.email}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}