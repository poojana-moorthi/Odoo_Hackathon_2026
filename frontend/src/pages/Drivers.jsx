import React, { useState, useEffect } from 'react';
import { api, useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserCheck, 
  Phone, 
  Calendar, 
  CreditCard 
} from 'lucide-react';

const Drivers = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  // Check authorization (Fleet Manager: 1, Safety Officer: 3)
  const canModify = user && (user.role_id === 1 || user.role_id === 3);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/drivers', {
        params: {
          search,
          status: filterStatus,
          page: currentPage,
          limit: 8
        }
      });
      setDrivers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast('Failed to load drivers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [search, filterStatus, currentPage]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleOpenAddModal = () => {
    if (!canModify) return;
    setEditingDriver(null);
    reset({
      driver_name: '',
      license_number: '',
      license_category: 'Class A CDL',
      license_expiry: '',
      phone_number: '',
      safety_score: 100,
      status: 'Available'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (driver) => {
    if (!canModify) return;
    setEditingDriver(driver);
    setValue('driver_name', driver.driver_name);
    setValue('license_number', driver.license_number);
    setValue('license_category', driver.license_category);
    const expiryStr = driver.license_expiry ? driver.license_expiry.slice(0, 10) : '';
    setValue('license_expiry', expiryStr);
    setValue('phone_number', driver.phone_number);
    setValue('safety_score', driver.safety_score);
    setValue('status', driver.status);
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingDriver) {
        await api.put(`/drivers/${editingDriver.driver_id}`, data);
        showToast('Driver profile updated successfully.');
      } else {
        await api.post('/drivers', data);
        showToast('Driver profile created successfully.');
      }
      setIsModalOpen(false);
      fetchDrivers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save driver profile.', 'error');
    }
  };

  const handleDeleteDriver = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver from the registry?')) return;
    try {
      await api.delete(`/drivers/${id}`);
      showToast('Driver profile removed successfully.');
      fetchDrivers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete driver.', 'error');
    }
  };

  const isLicenseExpired = (expiryStr) => {
    return new Date(expiryStr) < new Date();
  };

  const isLicenseExpiringSoon = (expiryStr) => {
    const diff = new Date(expiryStr) - new Date();
    const days = diff / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30; // within next 30 days
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Driver Directory</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Audit compliance credentials, safety records, and licensing deadlines.</p>
        </div>
        {canModify && (
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#714B67] to-[#00A09D] hover:from-[#623f58] hover:to-[#008381] rounded-xl text-xs font-bold text-white shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Driver Profile</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
        <div className="relative w-full md:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search driver name, license..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="block w-full rounded-xl bg-slate-950/60 border border-slate-850 hover:border-slate-755 focus:border-[#00A09D] py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00A09D] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2 bg-slate-950/60 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Profile Card Listing */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl h-80">
              <LoadingSkeleton rows={4} className="h-6 mb-2" />
            </div>
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg">
          <UserCheck className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <h3 className="font-bold text-slate-350 text-sm">No Drivers Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Try relaxing your search terms or filters to locate operators.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {drivers.map((d) => {
              const expired = isLicenseExpired(d.license_expiry);
              const expiringSoon = isLicenseExpiringSoon(d.license_expiry);

              const sparkPath = d.safety_score >= 90
                ? "M 2 15 Q 20 12 35 5 T 70 8 T 98 2"
                : "M 2 2 Q 20 6 35 15 T 70 12 T 98 20";

              return (
                <div 
                  key={d.driver_id}
                  className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 hover:shadow-lg hover:shadow-purple-950/10 transition-all duration-300 flex flex-col justify-between backdrop-blur-sm text-slate-200"
                >
                  <div>
                    {/* Header: Avatar and status */}
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-full bg-[#714B67]/20 border border-[#714B67]/30 flex items-center justify-center text-[#00A09D] font-black text-sm">
                        {d.driver_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        d.status === 'Available' ? 'bg-emerald-950/40 text-emerald-455 border border-emerald-900/30' :
                        d.status === 'On Trip' ? 'bg-blue-950/40 text-blue-455 border border-blue-900/30' :
                        d.status === 'Off Duty' ? 'bg-slate-950/60 text-slate-400 border border-slate-800' :
                        'bg-red-955/40 text-red-455 border border-red-900/30'
                      }`}>
                        {d.status === 'On Trip' ? 'In Transit' : d.status}
                      </span>
                    </div>

                    {/* Name & license category */}
                    <h3 className="text-sm font-black text-slate-200 mt-3.5">{d.driver_name}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{d.license_category}</p>

                    {/* Specifications List */}
                    <div className="mt-4 pt-3.5 border-t border-slate-800/60 space-y-2.5 text-xs">
                      {/* Safety score bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1 font-semibold">
                          <span className="text-slate-500">Safety Index:</span>
                          <span className="text-slate-200 font-bold">{d.safety_score}/100</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${d.safety_score >= 90 ? 'bg-emerald-500' : d.safety_score >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            style={{ width: `${d.safety_score}%` }}
                          />
                        </div>
                      </div>

                      {/* License details */}
                      <div className="flex items-center space-x-2 text-slate-350 font-semibold">
                        <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">{d.license_number}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-slate-350 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Expires: {d.license_expiry.slice(0, 10)}</span>
                        </div>
                        {expired && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-red-950/40 border border-red-900/30 text-red-400">Expired</span>
                        )}
                        {expiringSoon && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-955/40 border border-amber-900/30 text-amber-400">Near Expiry</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-slate-350 font-semibold">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{d.phone_number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Sparkline & Actions */}
                  <div className="mt-4 pt-3.5 border-t border-slate-800/60 flex items-center justify-between">
                    {/* SVG Sparkline */}
                    <div className="w-16 h-5 flex items-center">
                      <svg className={`w-full h-full ${d.safety_score >= 90 ? 'text-emerald-500' : 'text-amber-500'}`} viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d={sparkPath} />
                      </svg>
                    </div>

                    {canModify && (
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => handleOpenEditModal(d)}
                          className="p-1 rounded-lg border border-slate-800 hover:bg-slate-850 text-slate-450 hover:text-slate-200 transition-colors"
                          title="Edit Profile"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteDriver(d.driver_id)}
                          className="p-1 rounded-lg border border-slate-800 hover:bg-red-950/20 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border border-slate-800/80 rounded-2xl text-xs bg-slate-900/20 font-semibold text-slate-500 mt-6 shadow-lg">
              <span>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} records total)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-bold disabled:opacity-50 hover:bg-slate-800 transition-all text-slate-300"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === pagination.totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-bold disabled:opacity-50 hover:bg-slate-800 transition-all text-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Dialog Modal (CRUD) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDriver ? 'Edit Driver profile' : 'Add New Driver Profile'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 font-bold mb-1">Driver Name</label>
            <input
              type="text"
              placeholder="Sathish Kumar"
              {...register('driver_name', { required: 'Required' })}
              className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
            />
            {errors.driver_name && <p className="text-red-500 mt-1">Field is required</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">License Number</label>
              <input
                type="text"
                placeholder="DL-1420230099"
                {...register('license_number', { required: 'Required' })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
              {errors.license_number && <p className="text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">License Category</label>
              <select
                {...register('license_category', { required: 'Required' })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
              >
                <option value="Class A CDL">Class A CDL (Heavy Multi-axle)</option>
                <option value="Class B CDL">Class B CDL (Single-unit Truck)</option>
                <option value="Class C CDL">Class C CDL (Light Delivery)</option>
                <option value="Class D">Class D (Auxiliary/Support)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">License Expiration Date</label>
              <input
                type="date"
                {...register('license_expiry', { required: 'Required' })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
              {errors.license_expiry && <p className="text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Contact Phone</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                {...register('phone_number', { required: 'Required' })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
              {errors.phone_number && <p className="text-red-500 mt-1">Required</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Safety Rating Score (1-100)</label>
              <input
                type="number"
                placeholder="100"
                {...register('safety_score', { required: 'Required', min: 1, max: 100 })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
            {editingDriver && (
              <div>
                <label className="block text-slate-500 font-bold mb-1">Driver Status</label>
                <select
                  {...register('status', { required: 'Required' })}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
                >
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="Off Duty">Off Duty</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-800 hover:bg-slate-855 rounded-xl font-bold text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#714B67] hover:bg-[#623f58] text-white rounded-xl font-bold shadow-sm"
            >
              {editingDriver ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Toast alerts */}
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

export default Drivers;
