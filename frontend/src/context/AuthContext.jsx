import { useState } from 'react';
import AuthContext from './auth-context';
import api from '../api/client';

export function AuthProvider({ children }) {
    const hasStoredSession = Boolean(localStorage.getItem('token') && localStorage.getItem('user'));
    const [user, setUser] = useState(() => (
        hasStoredSession ? JSON.parse(localStorage.getItem('user')) : null
    ));
    const [business, setBusiness] = useState(() => (
        hasStoredSession && localStorage.getItem('business')
            ? JSON.parse(localStorage.getItem('business'))
            : null
    ));

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.business) {
            localStorage.setItem('business', JSON.stringify(data.business));
        }

        setUser(data.user);
        setBusiness(data.business);
        return data.user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('business');
        setUser(null);
        setBusiness(null);
    };

    const isSuperAdmin = () => user?.role === 'superadmin';
    const isOwner = () => user?.role === 'owner';
    const isStaff = () => user?.role === 'staff';

    return (
        <AuthContext.Provider
            value={{
                user,
                business,
                loading: false,
                login,
                logout,
                isSuperAdmin,
                isOwner,
                isStaff,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}