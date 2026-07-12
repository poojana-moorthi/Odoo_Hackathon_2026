import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Bell, 
  Search, 
  Sun,
  Moon,
  ChevronRight, 
  LogOut, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Building2
} from 'lucide-react';

const Header = ({ title = 'TransitOps Platform' }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize theme from localStorage (default dark)
  useEffect(() => {
    const savedTheme = localStorage.getItem('transitops_theme') || 'dark';
    const darkState = savedTheme === 'dark';
    setIsDarkMode(darkState);
    document.body.classList.toggle('light-theme', !darkState);
  }, []);

  const toggleTheme = () => {
    const nextDarkMode = !isDarkMode;
    setIsDarkMode(nextDarkMode);
    localStorage.setItem('transitops_theme', nextDarkMode ? 'dark' : 'light');
    document.body.classList.toggle('light-theme', !nextDarkMode);
  };

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'License Expiring Soon',
      desc: 'Driver Sathish Kumar\'s license expires in 5 days.',
      type: 'critical',
      time: '10 mins ago',
      read: false,
    },
    {
      id: 2,
      title: 'Maintenance Log Triggered',
      desc: 'Semi Truck (MH-12-PQ-9981) has been set to In Shop.',
      type: 'warning',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 3,
      title: 'Trip #22 Completed',
      desc: 'Completed Mumbai Hub to Pune Depot route successfully.',
      type: 'success',
      time: '2 hours ago',
      read: true,
    },
    {
      id: 4,
      title: 'New Refuel Added',
      desc: 'Fuel log logged: 120 Liters for MH-12-AB-1234.',
      type: 'info',
      time: '4 hours ago',
      read: true,
    }
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const pathnames = location.pathname.split('/').filter((x) => x);
  const getBreadcrumbLabel = (name) => {
    if (name === 'dashboard') return 'Dashboard';
    if (name === 'vehicles') return 'Fleet Registry';
    if (name === 'drivers') return 'Drivers';
    if (name === 'trips') return 'Dispatches';
    if (name === 'maintenance') return 'Maintenance';
    if (name === 'expenses') return 'Fuel & Expenses';
    if (name === 'reports') return 'Reports & Analytics';
    if (name === 'settings') return 'Settings';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 border-b border-slate-200 px-6 flex items-center justify-between no-print backdrop-blur-md shadow-sm">
      {/* Left: Branding & Breadcrumbs */}
      <div className="flex items-center space-x-3 truncate">
        <Building2 className="w-5 h-5 text-[#00A09D] hidden md:block" />
        <nav className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 truncate">
          <Link to="/" className="hover:text-[#00A09D] transition-colors">TransitOps</Link>
          {pathnames.map((value, index) => {
            const last = index === pathnames.length - 1;
            const to = `/${pathnames.slice(0, index + 1).join('/')}`;

            return (
              <React.Fragment key={to}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                {last ? (
                  <span className="text-slate-800 font-extrabold truncate">{getBreadcrumbLabel(value)}</span>
                ) : (
                  <Link to={to} className="hover:text-[#00A09D] transition-colors truncate">
                    {getBreadcrumbLabel(value)}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Center: Search input */}
      <div className="hidden lg:flex items-center relative w-64 xl:w-80">
        <span className="absolute left-3 text-slate-400">
          <Search className="w-4 h-4" />
        </span>
        <input 
          type="text"
          placeholder="Quick search (e.g. MH-12, Sathish)..."
          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#00A09D] rounded-xl py-1.5 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00A09D] transition-all"
        />
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center space-x-3">
        {/* Dark/Light mode toggle */}
        <button 
          onClick={toggleTheme}
          title="Toggle Theme"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            className={`relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors ${showNotifications ? 'bg-slate-100' : ''}`}
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden text-xs text-slate-700">
              <div className="flex items-center justify-between p-3.5 border-b border-slate-200 bg-slate-50">
                <span className="font-bold text-slate-800">Notifications ({unreadCount} new)</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-[#00A09D] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-3.5 transition-colors cursor-pointer hover:bg-slate-50 flex items-start space-x-2.5 ${!notif.read ? 'bg-blue-50/20' : ''}`}
                  >
                    <div className="mt-0.5">
                      {notif.type === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                       notif.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                       notif.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                       <Info className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className={`font-bold text-slate-800 ${!notif.read ? 'text-[#00A09D]' : ''}`}>{notif.title}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{notif.desc}</p>
                      <span className="text-[9px] text-slate-400 font-semibold block mt-1.5">{notif.time}</span>
                    </div>
                    {!notif.read && (
                      <span className="w-1.5 h-1.5 bg-[#00A09D] rounded-full mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <div className="p-2.5 border-t border-slate-200 text-center bg-slate-50">
                <Link 
                  to="/reports" 
                  onClick={() => setShowNotifications(false)}
                  className="font-bold text-[#714B67] hover:underline block"
                >
                  View Reports Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Card Dropdown */}
        <div className="relative border-l border-slate-250 pl-3 flex items-center" ref={profileRef}>
          {user && (
            <>
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center space-x-2.5 hover:opacity-90 focus:outline-none"
              >
                <div className="text-right hidden sm:block truncate max-w-28">
                  <p className="text-xs font-bold text-slate-800 truncate">{user.username}</p>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">{user.role_name}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-650 font-bold hover:border-[#00A09D] transition-all">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfile && (
                <div className="absolute right-0 top-10 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden text-xs py-1 text-slate-700">
                  <div className="p-3 border-b border-slate-200">
                    <p className="font-bold text-slate-800">{user.username}</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{user.role_name}</p>
                  </div>
                  <Link 
                    to="/settings" 
                    onClick={() => setShowProfile(false)}
                    className="flex items-center space-x-2 px-4 py-2.5 hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-semibold"
                  >
                    <Settings className="w-4 h-4" />
                    <span>My Settings</span>
                  </Link>
                  <button 
                    onClick={() => { setShowProfile(false); logout(); }}
                    className="w-full text-left flex items-center space-x-2 px-4 py-2.5 hover:bg-red-50 text-red-500 font-semibold border-t border-slate-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
