import React from 'react';
import { Star, Crown, Bell, User } from 'lucide-react';

/**
 * 顶部导航栏组件
 * @param {Object} props
 * @param {string} props.projectName - 项目名称
 * @param {Function} props.setProjectName - 设置项目名称
 * @param {boolean} props.isEditingName - 是否正在编辑名称
 * @param {Function} props.setIsEditingName - 设置编辑状态
 * @param {number} props.points - 积分
 * @param {string} props.memberStatus - 会员状态
 * @param {Function} props.onOpenMember - 打开会员页面回调
 * @param {Function} props.onNotificationClick - 通知点击回调
 * @param {Function} props.onProfileClick - 个人中心点击回调
 */
const TopNavbar = ({ 
  projectName, 
  setProjectName,
  isEditingName,
  setIsEditingName,
  points,
  memberStatus,
  onOpenMember,
  onNotificationClick,
  onProfileClick
}) => {
  return (
    <div className="flex items-center justify-between p-3 border-b bg-white">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-gray-900">欧智艺术平台</h1>
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div
              className="text-sm font-medium text-gray-900 cursor-text hover:bg-gray-100 px-2 py-1 rounded"
              onDoubleClick={() => setIsEditingName(true)}
            >
              {projectName}
            </div>
          )}
          <button className="text-xs text-blue-600 hover:text-blue-800">+ 新页面</button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* 积分与会员 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">{points}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Crown className="w-4 h-4 text-orange-500" />
            <span className="font-medium">{memberStatus}</span>
          </div>
          <button
            onClick={onOpenMember}
            className="px-3 py-1 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-md hover:from-orange-600 hover:to-red-600"
          >
            开通会员
          </button>
        </div>
        
        {/* 通知与个人中心 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNotificationClick}
            className="p-2 text-gray-600 hover:text-gray-900 relative"
          >
            <Bell className="w-5 h-5" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </button>
          <button
            onClick={onProfileClick}
            className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center"
          >
            <User className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;

