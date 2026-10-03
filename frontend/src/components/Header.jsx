import { useAuth } from '../context/useAuth';
import { LogOut } from 'lucide-react';

export default function Header() {
    const { user, logout } = useAuth();

    const roleColors = {
        superadmin: 'bg-amber-50 text-amber-800 border-amber-200',
        owner: 'bg-primary-50 text-primary-800 border-primary-100',
        staff: 'bg-ink-100 text-ink-700 border-ink-200',
    };

    return (
        <header className="bg-white border-b border-ink-200 px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-medium text-ink-500">
                        Online
                    </span>
                </div>
                <span className="hidden md:inline text-ink-300">·</span>
                <p className="text-sm text-ink-500 truncate">
                    Welcome back,
                    <span className="font-semibold text-ink-900 ml-1">
                        {user?.name}
                    </span>
                </p>
            </div>

            <div className="flex items-center gap-3">
                <span
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize ${
                        roleColors[user?.role] || roleColors.staff
                    }`}
                >
                    {user?.role}
                </span>
                    <button
                    onClick={logout}
                    className="flex items-center gap-2 bg-white hover:bg-red-50 text-ink-600 hover:text-red-700 border border-ink-200 hover:border-red-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150"
                    aria-label="Log out"
                    title="Log out"
                >
                    <span className="hidden sm:inline">Logout</span>
                    <LogOut size={15} />
                </button>
            </div>
        </header>
    );
}