import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { 
  Plus, 
  Search, 
  Check, 
  X, 
  MapPin, 
  Truck, 
  User, 
  Scale, 
  Navigation, 
  Trash2, 
  Info,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Available resource listings for creation
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);

  // Modal controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);

  // Selected item states
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);

  // Toast
  const [toast, setToast] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { 
    register: registerComplete, 
    handleSubmit: handleSubmitComplete, 
    reset: resetComplete, 
    formState: { errors: errorsComplete } 
  } = useForm();

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trips', {
        params: {
          search,
          status: filterStatus,
          page: currentPage,
          limit: 6
        }
      });
      setTrips(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast('Failed to load trips.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableResources = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        api.get('/vehicles?limit=100'),
        api.get('/drivers?limit=100')
      ]);

      setAvailableVehicles(vRes.data.data.filter(v => v.status === 'Available'));
      setAvailableDrivers(dRes.data.data.filter(d => {
        const isAvailable = d.status === 'Available';
        const isExpired = new Date(d.license_expiry) < new Date();
        return isAvailable && !isExpired;
      }));
    } catch (err) {
      console.error('Failed to load available dispatch resources:', err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [search, filterStatus, currentPage]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleOpenCreateModal = async () => {
    await fetchAvailableResources();
    reset({
      source: '',
      destination: '',
      vehicle_id: '',
      driver_id: '',
      cargo_weight: '',
      planned_distance: '',
      status: 'Draft'
    });
    setIsCreateOpen(true);
  };

  const handleOpenDetailsModal = async (trip) => {
    try {
      setLoading(true);
      const res = await api.get(`/trips/${trip.trip_id}`);
      setSelectedTrip(res.data);
      setTripHistory(res.data.history || []);
      setIsDetailsOpen(true);
    } catch (err) {
      showToast('Failed to load trip history details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCompleteModal = (trip) => {
    setSelectedTrip(trip);
    resetComplete({
      actual_distance: trip.planned_distance,
      fuel_used: (trip.planned_distance / 6).toFixed(1), // estimate 6km per liter
      notes: 'Delivery completed successfully.'
    });
    setIsCompleteOpen(true);
  };

  const onSubmitCreate = async (data) => {
    try {
      await api.post('/trips', data);
      showToast(`Trip created successfully ${data.status === 'Dispatched' ? 'and dispatched' : 'as draft'}.`);
      setIsCreateOpen(false);
      fetchTrips();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to dispatch trip.', 'error');
    }
  };

  const onSubmitComplete = async (data) => {
    try {
      await api.put(`/trips/${selectedTrip.trip_id}`, {
        status: 'Completed',
        actual_distance: data.actual_distance,
        fuel_used: data.fuel_used,
        notes: data.notes
      });
      showToast('Trip completed. Vehicle and driver set to available.');
      setIsCompleteOpen(false);
      fetchTrips();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete trip.', 'error');
    }
  };

  const handleDispatchDraft = async (id) => {
    try {
      await api.put(`/trips/${id}`, { status: 'Dispatched', notes: 'Dispatched draft trip.' });
      showToast('Trip successfully dispatched!');
      fetchTrips();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to dispatch.', 'error');
    }
  };

  const handleCancelTrip = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this trip dispatch?')) return;
    try {
      await api.put(`/trips/${id}`, { status: 'Cancelled', notes: 'Trip cancelled by operations.' });
      showToast('Trip dispatch cancelled.');
      fetchTrips();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel trip.', 'error');
    }
  };

  const handleDeleteTrip = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trip record?')) return;
    try {
      await api.delete(`/trips/${id}`);
      showToast('Trip record deleted.');
      fetchTrips();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete trip.', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Trip Dispatch & Management</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Route operations, dispatch vehicles, and track active transits.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#714B67] to-[#00A09D] hover:from-[#623f58] hover:to-[#008381] rounded-xl text-xs font-bold text-white shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Dispatch New Route</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
        <div className="relative w-full md:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search source, destination..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="block w-full rounded-xl bg-slate-950/60 border border-slate-850 hover:border-slate-755 focus:border-[#00A09D] py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00A09D] transition-all"
          />
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2 bg-slate-950/60 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none font-semibold text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Draft">Draft</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Card List Layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl h-64">
              <LoadingSkeleton rows={4} className="h-6 mb-2" />
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg">
          <Navigation className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <h3 className="font-bold text-slate-350 text-sm">No Dispatched Routes</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Create a draft route planning or dispatch a truck on a route to get started.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {trips.map((t) => {
              // Status steps mapping
              const isDraft = t.status === 'Draft';
              const isDispatched = t.status === 'Dispatched';
              const isCompleted = t.status === 'Completed';
              const isCancelled = t.status === 'Cancelled';

              const cargoPercent = t.maximum_load_capacity 
                ? Math.min(Math.round((t.cargo_weight / t.maximum_load_capacity) * 100), 100)
                : 0;

              return (
                <div 
                  key={t.trip_id}
                  className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 hover:shadow-lg hover:shadow-purple-950/10 transition-all duration-300 flex flex-col justify-between backdrop-blur-sm text-slate-200"
                >
                  <div>
                    {/* Header Route Info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-100 font-extrabold text-sm flex items-center">
                            <MapPin className="w-4 h-4 text-[#714B67] mr-1" />
                            {t.source}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-655" />
                          <span className="text-slate-100 font-extrabold text-sm flex items-center">
                            <MapPin className="w-4 h-4 text-[#00A09D] mr-1" />
                            {t.destination}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1.5">Trip ID: #{t.trip_id}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isCompleted ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' :
                        isDispatched ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' :
                        isDraft ? 'bg-slate-950/60 text-slate-400 border border-slate-800' :
                        'bg-red-955/40 text-red-400 border border-red-900/30'
                      }`}>
                        {isDispatched ? 'In Transit' : t.status}
                      </span>
                    </div>

                    {/* Resources Info grid */}
                    <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800/60 text-xs text-slate-400 font-semibold">
                      <div className="flex items-center space-x-2.5">
                        <Truck className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="font-bold text-slate-200 text-[11px] leading-tight">{t.vehicle_name}</p>
                          <p className="text-[9px] text-slate-500">{t.registration_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <User className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="font-bold text-slate-200 text-[11px] leading-tight">{t.driver_name}</p>
                          <p className="text-[9px] text-slate-500">Driver Profile</p>
                        </div>
                      </div>
                    </div>

                    {/* Cargo capacity progress bar */}
                    <div className="mt-4 pt-3.5 border-t border-slate-800/30 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center"><Scale className="w-3.5 h-3.5 mr-1 text-slate-500" /> Cargo payload weight:</span>
                        <span className="text-slate-300">{t.cargo_weight.toLocaleString()} kg / {t.maximum_load_capacity?.toLocaleString()} kg ({cargoPercent}%)</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${cargoPercent > 90 ? 'bg-amber-500' : 'bg-[#00A09D]'}`}
                          style={{ width: `${cargoPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Horizontal Timeline Tracker */}
                    <div className="mt-6 p-3 bg-slate-950/20 border border-slate-850 rounded-2xl">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                        <span>Transit Milestones</span>
                        <span>Distance: {t.planned_distance} km</span>
                      </div>
                      <div className="flex items-center justify-between relative px-6 py-2.5">
                        {/* Connecting Line */}
                        <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 z-0">
                          <div 
                            className="h-full bg-[#00A09D] transition-all duration-300"
                            style={{ width: isCompleted ? '100%' : isDispatched ? '50%' : '0%' }}
                          />
                        </div>

                        {/* Steps */}
                        <div className="flex flex-col items-center z-10 relative">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 bg-slate-900 flex items-center justify-center ${
                            isDraft || isDispatched || isCompleted ? 'border-[#00A09D] text-[#00A09D]' : 'border-slate-700'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Draft</span>
                        </div>

                        <div className="flex flex-col items-center z-10 relative">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 bg-slate-900 flex items-center justify-center ${
                            isDispatched || isCompleted ? 'border-[#00A09D] text-[#00A09D]' : 'border-slate-700'
                          }`}>
                            {(isDispatched || isCompleted) && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Dispatched</span>
                        </div>

                        <div className="flex flex-col items-center z-10 relative">
                          {isCancelled ? (
                            <>
                              <span className="w-3.5 h-3.5 rounded-full border-2 bg-slate-900 border-red-500 text-red-500 flex items-center justify-center">
                                <X className="w-2.5 h-2.5" />
                              </span>
                              <span className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider">Cancelled</span>
                            </>
                          ) : (
                            <>
                              <span className={`w-3.5 h-3.5 rounded-full border-2 bg-slate-900 flex items-center justify-center ${
                                isCompleted ? 'border-emerald-500 text-emerald-500' : 'border-slate-700'
                              }`}>
                                {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Completed</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3.5 border-t border-slate-800/60 flex items-center justify-between">
                    <button
                      onClick={() => handleOpenDetailsModal(t)}
                      className="flex items-center space-x-1.5 text-slate-400 hover:text-[#00A09D] font-bold text-xs"
                    >
                      <Info className="w-4 h-4" />
                      <span>Audit Logs</span>
                    </button>

                    <div className="flex space-x-2">
                      {isDraft && (
                        <>
                          <button
                            onClick={() => handleDispatchDraft(t.trip_id)}
                            className="px-3.5 py-1.5 bg-[#00A09D] hover:bg-[#008381] text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                          >
                            Dispatch Route
                          </button>
                          <button
                            onClick={() => handleDeleteTrip(t.trip_id)}
                            className="p-2 border border-slate-800 hover:bg-red-950/20 text-red-400 hover:text-red-300 rounded-lg transition-all"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {isDispatched && (
                        <>
                          <button
                            onClick={() => handleOpenCompleteModal(t)}
                            className="px-3.5 py-1.5 bg-[#714B67] hover:bg-[#623f58] text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                          >
                            Complete Delivery
                          </button>
                          <button
                            onClick={() => handleCancelTrip(t.trip_id)}
                            className="px-3.5 py-1.5 border border-slate-800 hover:bg-slate-850 text-slate-400 rounded-lg font-bold text-xs transition-all"
                          >
                            Cancel Route
                          </button>
                        </>
                      )}

                      {(isCompleted || isCancelled) && (
                        <span className="text-[10px] text-slate-500 font-bold uppercase py-1.5">Closed Record</span>
                      )}
                    </div>
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

      {/* Modal: Dispatch New Trip */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Dispatch New Route">
        <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Source Depot / City</label>
              <input
                type="text"
                placeholder="Mumbai Depot"
                {...register('source', { required: 'Required' })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Destination Hub / City</label>
              <input
                type="text"
                placeholder="Delhi Hub"
                {...register('destination', { required: 'Required' })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Assign Fleet Vehicle (Available)</label>
            <select
              {...register('vehicle_id', { required: 'Required' })}
              className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-300 focus:outline-none font-semibold"
            >
              <option value="">-- Select Available Truck --</option>
              {availableVehicles.map(v => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.vehicle_name} ({v.registration_number}) - Cap: {v.maximum_load_capacity} kg
                </option>
              ))}
            </select>
            {availableVehicles.length === 0 && (
              <p className="text-amber-500 mt-1 font-semibold flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1" /> No available vehicles in depot registry.</p>
            )}
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Assign Operator / Driver (Available & Unexpired)</label>
            <select
              {...register('driver_id', { required: 'Required' })}
              className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-300 focus:outline-none font-semibold"
            >
              <option value="">-- Select Active Driver --</option>
              {availableDrivers.map(d => (
                <option key={d.driver_id} value={d.driver_id}>
                  {d.driver_name} - Safety Score: {d.safety_score}/100
                </option>
              ))}
            </select>
            {availableDrivers.length === 0 && (
              <p className="text-amber-500 mt-1 font-semibold flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1" /> No available drivers with valid licenses.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Cargo Payload Weight (kg)</label>
              <input
                type="number"
                placeholder="4500"
                {...register('cargo_weight', { required: 'Required', min: 1 })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Planned Route Distance (km)</label>
              <input
                type="number"
                placeholder="350"
                {...register('planned_distance', { required: 'Required', min: 1 })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Dispatch Mode</label>
            <select
              {...register('status', { required: 'Required' })}
              className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-300 focus:outline-none font-semibold"
            >
              <option value="Draft">Draft (Save only)</option>
              <option value="Dispatched">Dispatched (Lock vehicle and driver to active route)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-800 hover:bg-slate-855 rounded-xl font-bold text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#714B67] hover:bg-[#623f58] text-white rounded-xl font-bold shadow-sm"
            >
              Confirm Dispatch
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Complete Delivery */}
      <Modal isOpen={isCompleteOpen} onClose={() => setIsCompleteOpen(false)} title="Close Delivery Record">
        {selectedTrip && (
          <form onSubmit={handleSubmitComplete(onSubmitComplete)} className="space-y-4 text-xs">
            <div className="p-3 border border-slate-800 rounded-xl bg-slate-950/40 font-semibold text-slate-300">
              <span className="font-bold text-[#00A09D]">Trip #{selectedTrip.trip_id} Route Details:</span>
              <p className="mt-1">{selectedTrip.source} → {selectedTrip.destination}</p>
              <p className="text-[10px] text-slate-500 mt-1">Vehicle: {selectedTrip.vehicle_name} • Driver: {selectedTrip.driver_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Actual Distance Covered (km)</label>
                <input
                  type="number"
                  {...registerComplete('actual_distance', { required: 'Required', min: 1 })}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Actual Fuel Consumed (Liters)</label>
                <input
                  type="number"
                  step="0.1"
                  {...registerComplete('fuel_used', { required: 'Required', min: 1 })}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Operational Notes / Remarks</label>
              <input
                type="text"
                {...registerComplete('notes')}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsCompleteOpen(false)}
                className="px-4 py-2 border border-slate-800 hover:bg-slate-855 rounded-xl font-bold text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#714B67] hover:bg-[#623f58] text-white rounded-xl font-bold shadow-sm"
              >
                Complete Delivery
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Audit Log Details */}
      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Trip Audit History">
        {selectedTrip && (
          <div className="space-y-4 text-xs text-slate-200">
            <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/40 space-y-1.5 text-slate-300">
              <p className="font-black text-slate-100 text-sm">{selectedTrip.source} → {selectedTrip.destination}</p>
              <p className="font-semibold">Odo Distance: {selectedTrip.actual_distance || selectedTrip.planned_distance} km</p>
              <p className="font-semibold">Status: <span className="font-bold text-[#00A09D]">{selectedTrip.status}</span></p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-[#00A09D] uppercase tracking-wider text-[10px]">Transition Logs</h4>
              {tripHistory.length === 0 ? (
                <p className="text-slate-500 italic py-2">No historical milestone logs found.</p>
              ) : (
                <div className="relative border-l border-slate-800 ml-3 pl-4 space-y-4">
                  {tripHistory.map((h) => (
                    <div key={h.history_id} className="relative">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#00A09D]" />
                      <div>
                        <p className="font-bold text-slate-255">{h.status}</p>
                        <p className="text-slate-450 text-[11px] mt-0.5">{h.notes}</p>
                        <span className="text-[9px] text-slate-500 font-bold block mt-1 uppercase">{h.changed_at.slice(0, 19).replace('T', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl font-bold"
              >
                Close Audit
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast alert */}
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

export default Trips;
