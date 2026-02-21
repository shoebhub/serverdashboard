'use client';
import { useState, useEffect, useCallback } from 'react';
import { getMe, getMyPermissions } from '../lib/api';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        Promise.all([getMe(), getMyPermissions()])
            .then(([userData, perms]) => {
                setUser(userData);
                setPermissions(perms);
            })
            .catch(() => {
                localStorage.removeItem('token');
            })
            .finally(() => setLoading(false));
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
        setPermissions(null);
        window.location.href = '/login';
    }, []);

    return { user, permissions, loading, logout };
}
