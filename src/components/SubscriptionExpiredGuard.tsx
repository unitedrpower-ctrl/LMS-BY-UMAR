import React from 'react';
import { User, Company } from '../types';

interface SubscriptionExpiredGuardProps {
  currentUser: User;
  company?: Company;
  onRefreshStatus?: () => void;
  children: React.ReactNode;
}

export const SubscriptionExpiredGuard: React.FC<SubscriptionExpiredGuardProps> = ({
  children
}) => {
  return <>{children}</>;
};
