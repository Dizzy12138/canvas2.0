import { useState, useEffect } from 'react';

// 模拟用户权限数据
const usePermissions = () => {
  const [userPermissions, setUserPermissions] = useState([]);
  const [isBizUser, setIsBizUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('free'); // 用户角色: free, pro, enterprise

  useEffect(() => {
    // 模拟获取用户权限
    const fetchUserPermissions = async () => {
      try {
        // 这里应该调用实际的API获取用户权限
        // 暂时使用模拟数据
        const mockPermissions = [
          'basic_components',
          'workflow_management',
          'app_deployment'
        ];
        
        // 模拟商业版用户
        const mockIsBizUser = true;
        const mockUserRole = 'pro'; // pro用户
        
        setUserPermissions(mockPermissions);
        setIsBizUser(mockIsBizUser);
        setUserRole(mockUserRole);
        setLoading(false);
      } catch (error) {
        console.error('获取用户权限失败:', error);
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, []);

  // 检查是否有特定权限
  const hasPermission = (permission) => {
    if (isBizUser) return true; // 商业版用户拥有所有权限
    return userPermissions.includes(permission);
  };

  // 检查组件访问权限
  const canAccessComponent = (componentType) => {
    // 免费用户只能访问基础组件
    if (userRole === 'free') {
      const freeComponents = [
        'upload_image',
        'text_input',
        'select',
        'slider',
        'textarea',
        'checkbox',
        'number_input',
        'color_picker'
      ];
      return freeComponents.includes(componentType);
    }
    
    // Pro用户可以访问提示词组件和选择组件
    if (userRole === 'pro') {
      const proComponents = [
        'upload_image',
        'text_input',
        'select',
        'slider',
        'textarea',
        'checkbox',
        'number_input',
        'color_picker',
        'positive_prompt',
        'negative_prompt',
        'model_select',
        'lora_select'
      ];
      return proComponents.includes(componentType);
    }
    
    // 企业版用户可以访问所有组件
    return true;
  };

  return {
    userPermissions,
    isBizUser,
    userRole,
    loading,
    hasPermission,
    canAccessComponent
  };
};

export default usePermissions;