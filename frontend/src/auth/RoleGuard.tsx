import React from 'react';
import { UserRole } from '../services/api';
import { useAuth } from './AuthContext';

interface RoleGuardProps {
    roles: UserRole[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ roles, children, fallback = null }) => {
    const { hasRole } = useAuth();
    return <>{hasRole(roles) ? children : fallback}</>;
};

export default RoleGuard;
