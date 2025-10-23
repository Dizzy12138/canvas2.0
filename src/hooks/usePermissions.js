import { useState, useEffect } from 'react';

const usePermissions = () => {
  const [userRole, setUserRole] = useState('admin'); // Default role

  // In a real application, you would fetch the user's role from an API
  // useEffect(() => {
  //   fetchUserRole().then(role => setUserRole(role));
  // }, []);

  const isBizUser = userRole === 'biz';
  const isAdmin = userRole === 'admin';

  const hasPermission = (permission) => {
    // Implement your permission logic here
    // For example:
    if (isAdmin) return true;
    if (isBizUser && permission === 'view_reports') return true;
    return false;
  };

  const canAccessComponent = (componentType) => {
    // Example: only admins can use 'custom_component'
    if (componentType === 'custom_component' && !isAdmin) return false;
    return true;
  };

  return { userRole, isBizUser, isAdmin, hasPermission, canAccessComponent };
};

export default usePermissions;

