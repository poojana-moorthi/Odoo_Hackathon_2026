import React, { useState, useEffect } from 'react';
import { api, useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { FiLock, FiPlus, FiUsers, FiSearch, FiCheck, FiX, FiShield, FiAlertCircle } from 'react-icons/fi';

const Settings = () => {
  const { user, changePassword } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const { register: regPw, handleSubmit: submitPw, reset: resetPw, formState: { errors: errorsPw } } = useForm();
  const { register: regUser, handleSubmit: submitUser, reset: resetUser, formState: { errors: errorsUser } } = useForm();

  // Fleet Managers can manage users
  const isManager = user && user.role_id === 1;

  const fetchUsersAndRoles = async () => {
    if (!isManager) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [uRes, rRes] = await Promise.all([
        api.get('/auth/users'),
        api.get('/auth/roles')
      ]);
      setUsers(uRes.data);
      setRoles(rRes.data);
    } catch (err) {
      console.error('Failed to load user management details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handlePasswordChange = async (data) => {
    const res = await changePassword(data.currentPassword, data.newPassword);
    if (res.success) {
      showToast('Password changed successfully.');
      resetPw();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleCreateUser = async (data) => {
    try {
      await api.post('/auth/users', data);
      showToast('New user account created.');
      setIsUserModalOpen(false);
      fetchUsersAndRoles();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create user.', 'error');
    }
  };

  const handleRoleChange = async (targetUserId, roleId) => {
    try {
      await api.put('/auth/users/role', { target_user_id: targetUserId, role_id: roleId });
      showToast('User role updated successfully.');
      fetchUsersAndRoles();
    } catch (err) {
      showToast('Failed to update user role.', 'error');
    }
  };

  // Role Permissions Table schema
  const permissionsData = [
    { module: 'Dashboard KPI Stats', fm: true, dr: true, so: false, fa: false },
    { module: 'Vehicles CRUD Registry', fm: true, dr: false, so: false, fa: false },
    { module: 'Drivers CRUD Registry', fm: true, dr: false, so: true, fa: false },
    { module: 'Trips Dispatch CRUD', fm: true, dr: true, so: false, fa: false },
    { module: 'Maintenance Logs', fm: true, dr: false, so: false, fa: false },
    { module: 'Fuel Logging Sheets', fm: true, dr: false, so: false, fa: true },
    { module: 'Operational Expenses', fm: true, dr: false, so: false, fa: true },
    { module: 'Reports & Analytics Graphs', fm: true, dr: false, so: true, fa: true },
    { module: 'User Settings Panel', fm: true, dr: true, so: true, fa: true }
  ];

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    u.role_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Settings & Administration</h2>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage user credentials, audit system roles, and configure settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile and Password Settings */}
        <div className="space-y-6 lg:col-span-1">
          {/* User Profile Card */}
          {user && (
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl shadow-md space-y-3.5">
              <h3 className="text-sm font-bold text-slate-300">My Operational Profile</h3>
              <div className="flex items-center space-x-3.5 p-3 bg-slate-950/40 border border-slate-850 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center font-bold text-white text-sm shadow-md">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-200">{user.username}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{user.email}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                <p><span className="font-semibold text-slate-500">Security Clearance:</span> {user.role_name}</p>
                <p><span className="font-semibold text-slate-500">Role ID:</span> #{user.role_id}</p>
              </div>
            </div>
          )}

          {/* Password Change Form */}
          <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl shadow-md">
            <h3 className="text-sm font-bold text-slate-300 flex items-center mb-4"><FiLock className="mr-2 text-brand-400" /> Change Security Password</h3>
            <form onSubmit={submitPw(handlePasswordChange)} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Current Password</label>
                <input
                  type="password"
                  {...regPw('currentPassword', { required: 'Required' })}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 p-2.5 rounded-lg text-slate-200 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">New Password</label>
                <input
                  type="password"
                  {...regPw('newPassword', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 p-2.5 rounded-lg text-slate-200 focus:outline-none"
                  placeholder="Min 6 characters"
                />
                {errorsPw.newPassword && <p className="text-red-400 mt-1">{errorsPw.newPassword.message}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg font-bold text-slate-300 hover:text-slate-100 transition-all"
              >
                Change Password
              </button>
            </form>
          </div>
        </div>

        {/* System Permissions Table and User Administration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Permissions Table (RBAC matrix) */}
          <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl shadow-md">
            <h3 className="text-sm font-bold text-slate-300 flex items-center mb-4"><FiShield className="mr-2 text-indigo-400" /> Role-Based Access Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-2">Operational Module</th>
                    <th className="py-2.5 px-2 text-center">Fleet Manager</th>
                    <th className="py-2.5 px-2 text-center">Driver</th>
                    <th className="py-2.5 px-2 text-center">Safety Officer</th>
                    <th className="py-2.5 px-2 text-center">Financial Analyst</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300 font-medium">
                  {permissionsData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-850/20 transition-colors">
                      <td className="py-2.5 px-2">{row.module}</td>
                      <td className="py-2.5 px-2 text-center">
                        {row.fm ? <FiCheck className="inline w-4 h-4 text-emerald-400" /> : <FiX className="inline w-4 h-4 text-red-500" />}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {row.dr ? <FiCheck className="inline w-4 h-4 text-emerald-400" /> : <FiX className="inline w-4 h-4 text-red-500" />}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {row.so ? <FiCheck className="inline w-4 h-4 text-emerald-400" /> : <FiX className="inline w-4 h-4 text-red-500" />}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {row.fa ? <FiCheck className="inline w-4 h-4 text-emerald-400" /> : <FiX className="inline w-4 h-4 text-red-500" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Management Panel (Restricted to Fleet Manager) */}
          {isManager && (
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl shadow-md space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-bold text-slate-300 flex items-center"><FiUsers className="mr-2 text-brand-400" /> User Management</h3>
                <button 
                  onClick={() => {
                    resetUser({ username: '', email: '', password: '', role_id: 2 });
                    setIsUserModalOpen(true);
                  }}
                  className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-xs font-bold text-white shadow-md transition-all"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Create User Account</span>
                </button>
              </div>

              {/* Search user */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <FiSearch className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Filter users by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-full rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-brand-500 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {loading ? (
                <LoadingSkeleton rows={3} className="h-6" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2 px-1">User</th>
                        <th className="py-2 px-1">Clearance / Role</th>
                        <th className="py-2 px-1">Date Joined</th>
                        <th className="py-2 px-1 text-right">Modify Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300 font-semibold">
                      {filteredUsers.map((u) => (
                        <tr key={u.user_id} className="hover:bg-slate-850/10 transition-colors">
                          <td className="py-2.5 px-1">
                            <div>
                              <p className="text-slate-200">{u.username}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{u.email}</p>
                            </div>
                          </td>
                          <td className="py-2.5 px-1">
                            <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded font-bold text-slate-400">
                              {u.role_name}
                            </span>
                          </td>
                          <td className="py-2.5 px-1 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="py-2.5 px-1 text-right">
                            {u.user_id !== user.user_id ? (
                              <select
                                value={u.role_id}
                                onChange={(e) => handleRoleChange(u.user_id, parseInt(e.target.value))}
                                className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded px-2 py-1 text-[11px] font-bold text-slate-300 focus:outline-none"
                              >
                                {roles.map(r => (
                                  <option key={r.role_id} value={r.role_id}>{r.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-semibold">Self clearance lock</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Creation Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Create User Account">
        <form onSubmit={submitUser(handleCreateUser)} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1">Username</label>
            <input
              type="text"
              placeholder="operator_12"
              {...regUser('username', { required: 'Required' })}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg text-slate-200 focus:outline-none"
            />
            {errorsUser.username && <p className="text-red-400 mt-1">Required</p>}
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Email Address</label>
            <input
              type="email"
              placeholder="operator@company.com"
              {...regUser('email', { required: 'Required' })}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg text-slate-200 focus:outline-none"
            />
            {errorsUser.email && <p className="text-red-400 mt-1">Required</p>}
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Initial Password</label>
            <input
              type="password"
              placeholder="••••••••"
              {...regUser('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg text-slate-200 focus:outline-none"
            />
            {errorsUser.password && <p className="text-red-400 mt-1">{errorsUser.password.message}</p>}
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Security Role</label>
            <select
              {...regUser('role_id', { required: 'Required' })}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg text-slate-200 focus:outline-none"
            >
              {roles.map(r => (
                <option key={r.role_id} value={r.role_id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 rounded-xl font-bold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold text-white shadow-md shadow-brand-600/10"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default Settings;
