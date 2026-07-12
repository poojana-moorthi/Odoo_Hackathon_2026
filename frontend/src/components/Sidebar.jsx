import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutGrid, 
  Truck, 
  Users, 
  Compass, 
  Wrench, 
  DollarSign, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  ChevronLeft 
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Sidebar navigation configuration with role ID mappings
  // 1: Fleet Manager, 2: Driver, 3: Safety Officer, 4: Financial Analyst
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-5 h-5" />, roles: [1, 2] },
    { path: '/vehicles', label: 'Vehicles', icon: <Truck className="w-5 h-5" />, roles: [1] },
    { path: '/drivers', label: 'Drivers', icon: <Users className="w-5 h-5" />, roles: [1, 3] },
    { path: '/trips', label: 'Trips', icon: <Compass className="w-5 h-5" />, roles: [1, 2] },
    { path: '/maintenance', label: 'Maintenance', icon: <Wrench className="w-5 h-5" />, roles: [1] },
    { path: '/expenses', label: 'Fuel & Expense', icon: <DollarSign className="w-5 h-5" />, roles: [1, 4] },
    { path: '/reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, roles: [1, 3, 4] },
    { path: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, roles: [1, 2, 3, 4] },
  ];

  // Filter menu items by user's role
  const visibleItems = menuItems.filter(item => item.roles.includes(user.role_id));

  return (
    <aside 
      className={`fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-slate-200 text-slate-600 flex flex-col justify-between transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          {!isCollapsed && (
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00A09D] flex items-center justify-center font-black text-white text-base shadow-md">
                T
              </div>
              <span className="font-extrabold text-base tracking-wider text-slate-800">
                TransitOps
              </span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-[#00A09D] flex items-center justify-center font-black text-white text-base shadow-md">
                T
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-800 text-slate-400 transition-colors"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6 px-3 space-y-1.5 font-sans">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#714B67] to-[#00A09D] text-white shadow-md shadow-[#00A09D]/10' 
                    : 'hover:bg-slate-100 hover:text-[#714B67] text-slate-650'
                }`
              }
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60">
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800">{user.username}</p>
                <p className="text-[10px] text-slate-500 font-semibold truncate">{user.role_name}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <button 
              onClick={logout}
              title="Logout"
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
