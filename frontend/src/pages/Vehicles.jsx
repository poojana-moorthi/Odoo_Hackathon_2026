import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast from '../components/Toast';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertCircle, 
  X, 
  Truck, 
  User, 
  Wrench, 
  Compass, 
  MoreVertical, 
  Gauge, 
  Fuel,
  ChevronDown
} from 'lucide-react';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('vehicle_id');
  const [sortOrder, setSortOrder] = useState('desc');

  // Slide-over Form Drawer state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Slide-over Details Drawer state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Sub-queries for selected vehicle details
  const [assignedDriver, setAssignedDriver] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [tripTimeline, setTripTimeline] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Action Menu Dropdown state
  const [activeActionMenu, setActiveActionMenu] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vehicles', {
        params: {
          search,
          type: filterType,
          status: filterStatus,
          page: currentPage,
          limit: 8
        }
      });
      setVehicles(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast('Failed to load vehicles.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, filterType, filterStatus, currentPage]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleOpenAddForm = () => {
    setEditingVehicle(null);
    reset({
      registration_number: '',
      vehicle_name: '',
      model: '',
      vehicle_type: 'Semi Truck',
      maximum_load_capacity: '',
      current_odometer: '',
      purchase_cost: '',
      status: 'Available'
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (vehicle) => {
    setEditingVehicle(vehicle);
    setValue('registration_number', vehicle.registration_number);
    setValue('vehicle_name', vehicle.vehicle_name);
    setValue('model', vehicle.model);
    setValue('vehicle_type', vehicle.vehicle_type);
    setValue('maximum_load_capacity', vehicle.maximum_load_capacity);
    setValue('current_odometer', vehicle.current_odometer);
    setValue('purchase_cost', vehicle.purchase_cost);
    setValue('status', vehicle.status);
    setIsFormOpen(true);
    setActiveActionMenu(null);
  };

  const onSubmit = async (data) => {
    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.vehicle_id}`, data);
        showToast('Vehicle updated successfully.');
      } else {
        await api.post('/vehicles', data);
        showToast('Vehicle added successfully.');
      }
      setIsFormOpen(false);
      fetchVehicles();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save vehicle details.', 'error');
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle from the registry?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      showToast('Vehicle removed successfully.');
      fetchVehicles();
      setActiveActionMenu(null);
      if (isDetailsOpen && selectedVehicle?.vehicle_id === id) {
        setIsDetailsOpen(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete vehicle.', 'error');
    }
  };

  // Open right slide-over drawer and query related sub-entities
  const handleOpenDetails = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailsOpen(true);
    setActiveTab('overview');
    setAssignedDriver(null);
    setMaintenanceHistory([]);
    setFuelLogs([]);
    setTripTimeline([]);
    setDetailsLoading(true);
    setActiveActionMenu(null);

    try {
      // 1. Fetch assigned driver
      const drRes = await api.get('/drivers?limit=100');
      const driver = drRes.data.data.find(d => d.driver_id === vehicle.driver_id || d.status === 'On Trip' && d.driver_name?.includes(vehicle.vehicle_name));
      setAssignedDriver(driver || null);

      // 2. Fetch maintenance logs
      const maintRes = await api.get('/maintenance?limit=100');
      const maintLogs = maintRes.data.data.filter(log => log.vehicle_id === vehicle.vehicle_id);
      setMaintenanceHistory(maintLogs);

      // 3. Fetch fuel logs
      const fuelRes = await api.get('/fuel?limit=100');
      const filteredFuel = fuelRes.data.data.filter(log => log.vehicle_id === vehicle.vehicle_id);
      setFuelLogs(filteredFuel);

      // 4. Fetch trip logs (timeline)
      const tripsRes = await api.get('/trips?limit=100');
      const filteredTrips = tripsRes.data.data.filter(trip => trip.vehicle_id === vehicle.vehicle_id);
      setTripTimeline(filteredTrips);

    } catch (err) {
      console.error('Failed to load vehicle logs details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Sorting Handler
  const handleSort = (field) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortField(field);
    setSortOrder(isAsc ? 'desc' : 'asc');
  };

  const sortedVehicles = [...vehicles].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Fleet Registry</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Maintain, search, and audit your organization\'s transport assets.</p>
        </div>
        <button 
          onClick={handleOpenAddForm}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#714B67] to-[#00A09D] hover:from-[#623f58] hover:to-[#008381] rounded-xl text-xs font-bold text-white shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Fleet Vehicle</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
        <div className="relative w-full md:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search registration, model, name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="block w-full rounded-xl bg-slate-950/60 border border-slate-850 hover:border-slate-755 focus:border-[#00A09D] py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00A09D] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2 bg-slate-950/60 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none"
          >
            <option value="">All Vehicle Types</option>
            <option value="Semi Truck">Semi Truck</option>
            <option value="Box Truck">Box Truck</option>
            <option value="Cargo Van">Cargo Van</option>
            <option value="Flatbed">Flatbed</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2 bg-slate-950/60 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Modern Data Table */}
      {loading ? (
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl h-96">
          <LoadingSkeleton rows={6} className="h-8 mb-4" />
        </div>
      ) : sortedVehicles.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg">
          <Truck className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <h3 className="font-bold text-slate-350 text-sm">No Fleet Assets Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Get started by registering a new commercial vehicle or truck to dispatcher pools.</p>
          <button 
            onClick={handleOpenAddForm}
            className="mt-4 px-4 py-2.5 bg-[#714B67] text-white hover:bg-[#623f58] rounded-xl text-xs font-bold shadow-sm"
          >
            Log First Vehicle
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider sticky top-0">
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800/50" onClick={() => handleSort('registration_number')}>Plate</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800/50" onClick={() => handleSort('vehicle_name')}>Vehicle Description</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800/50" onClick={() => handleSort('vehicle_type')}>Type</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800/50 text-right" onClick={() => handleSort('maximum_load_capacity')}>Max Load</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800/50 text-right" onClick={() => handleSort('current_odometer')}>Odometer</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800/50 text-right" onClick={() => handleSort('purchase_cost')}>Acquisition Cost</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-350 font-medium">
                {sortedVehicles.map((v, index) => (
                  <tr 
                    key={v.vehicle_id} 
                    className={`hover:bg-slate-800/30 cursor-pointer transition-colors ${index % 2 === 1 ? 'bg-slate-900/10' : ''}`}
                    onClick={() => handleOpenDetails(v)}
                  >
                    <td className="py-4 px-4 font-bold text-slate-100">
                      <span className="bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-lg text-[#00A09D]">
                        {v.registration_number}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-200">{v.vehicle_name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{v.model}</p>
                    </td>
                    <td className="py-4 px-4 font-semibold">{v.vehicle_type}</td>
                    <td className="py-4 px-4 text-right font-semibold">{parseFloat(v.maximum_load_capacity).toLocaleString()} kg</td>
                    <td className="py-4 px-4 text-right font-semibold">{v.current_odometer.toLocaleString()} km</td>
                    <td className="py-4 px-4 text-right font-bold text-slate-200">₹{parseFloat(v.purchase_cost).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        v.status === 'Available' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' :
                        v.status === 'On Trip' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' :
                        v.status === 'In Shop' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' :
                        'bg-slate-950/60 text-slate-400 border border-slate-800'
                      }`}>
                        {v.status === 'On Trip' ? 'In Transit' : v.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block text-left">
                        <button 
                          onClick={() => setActiveActionMenu(activeActionMenu === v.vehicle_id ? null : v.vehicle_id)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Action dropdown overlay */}
                        {activeActionMenu === v.vehicle_id && (
                          <div className="absolute right-0 mt-1 w-32 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden text-left py-1 text-xs text-slate-200">
                            <button 
                              onClick={() => handleOpenDetails(v)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-800/40 text-slate-300 font-semibold"
                            >
                              View Details
                            </button>
                            <button 
                              onClick={() => handleOpenEditForm(v)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-800/40 text-slate-300 font-semibold"
                            >
                              Edit Asset
                            </button>
                            <button 
                              onClick={() => handleDeleteVehicle(v.vehicle_id)}
                              className="w-full text-left px-4 py-2 hover:bg-red-950/20 text-red-400 font-bold border-t border-slate-850"
                            >
                              Delete Asset
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-500">
              <span>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} records total)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-bold disabled:opacity-50 hover:bg-slate-800 transition-colors text-slate-300"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === pagination.totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-bold disabled:opacity-50 hover:bg-slate-800 transition-colors text-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Right Slide-over Details Drawer */}
      {isDetailsOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDetailsOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-lg md:max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between transform transition-all duration-300 translate-x-0 text-slate-200">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="bg-slate-950 px-2 py-0.5 rounded text-xs font-bold text-[#00A09D] border border-slate-850">
                      {selectedVehicle.registration_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedVehicle.status === 'Available' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' :
                      selectedVehicle.status === 'On Trip' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' :
                      selectedVehicle.status === 'In Shop' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' :
                      'bg-slate-950/60 text-slate-400 border border-slate-800'
                    }`}>
                      {selectedVehicle.status === 'On Trip' ? 'In Transit' : selectedVehicle.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100 mt-2 truncate">{selectedVehicle.vehicle_name}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedVehicle.model}</p>
                </div>
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Tabs */}
              <div className="border-b border-slate-800 flex px-5 text-xs font-bold text-slate-450 overflow-x-auto scrollbar-none bg-slate-950/20">
                {['overview', 'driver', 'maintenance', 'fuel', 'timeline'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3.5 px-3 border-b-2 capitalize transition-all whitespace-nowrap ${
                      activeTab === tab 
                        ? 'border-[#00A09D] text-[#00A09D] font-black' 
                        : 'border-transparent hover:text-slate-200'
                    }`}
                  >
                    {tab === 'timeline' ? 'Trip Timeline' : tab}
                  </button>
                ))}
              </div>

              {/* Drawer Content */}
              <div className="flex-grow p-6 overflow-y-auto text-xs space-y-6">
                {detailsLoading ? (
                  <LoadingSkeleton rows={5} className="h-6 mb-3" />
                ) : (
                  <>
                    {/* Tab: Overview */}
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Vehicle Image Placeholder */}
                        <div className="h-44 bg-slate-950/40 border border-slate-850 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                          <Truck className="w-12 h-12 text-slate-650 stroke-[1.5]" />
                          <span className="text-[10px] font-bold uppercase tracking-wider mt-2.5">Asset image Placeholder</span>
                        </div>

                        {/* Specifications */}
                        <div className="bg-slate-950/20 border border-slate-850 rounded-2xl p-4 space-y-3.5">
                          <h4 className="font-bold text-[#00A09D] uppercase tracking-wider text-[10px]">Specifications</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-slate-500 font-semibold">Vehicle Type</p>
                              <p className="text-slate-300 font-bold mt-0.5">{selectedVehicle.vehicle_type}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-semibold">Max Cargo Capacity</p>
                              <p className="text-slate-300 font-bold mt-0.5">{parseFloat(selectedVehicle.maximum_load_capacity).toLocaleString()} kg</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-semibold">Current Odometer</p>
                              <p className="text-slate-300 font-bold mt-0.5">{selectedVehicle.current_odometer.toLocaleString()} km</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-semibold">Purchase Value</p>
                              <p className="text-slate-300 font-bold mt-0.5">₹{parseFloat(selectedVehicle.purchase_cost).toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Health status score indicator card */}
                        <div className="p-4 border border-emerald-900/30 bg-emerald-950/20 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 border border-emerald-800/20 bg-emerald-900/10 rounded-xl text-emerald-400">
                              <Gauge className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-emerald-300">Asset Health Score</p>
                              <p className="text-[10px] text-slate-400 font-medium">Excellent condition. Next maintenance in 4,500 km.</p>
                            </div>
                          </div>
                          <span className="text-lg font-black text-emerald-400">92%</span>
                        </div>
                      </div>
                    )}

                    {/* Tab: Driver */}
                    {activeTab === 'driver' && (
                      <div className="space-y-4">
                        {assignedDriver ? (
                          <div className="bg-slate-950/20 border border-slate-850 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center space-x-3.5">
                              <div className="w-12 h-12 rounded-full bg-[#714B67] text-white flex items-center justify-center font-bold text-sm">
                                {assignedDriver.driver_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-200 text-sm">{assignedDriver.driver_name}</h4>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase">{assignedDriver.license_category} Category License</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-xs">
                              <div>
                                <p className="text-slate-500 font-semibold">License Number</p>
                                <p className="text-slate-350 font-bold mt-0.5">{assignedDriver.license_number}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 font-semibold">Contact Mobile</p>
                                <p className="text-slate-350 font-bold mt-0.5">{assignedDriver.phone_number}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 font-semibold">Safety Score</p>
                                <p className="text-slate-350 font-bold mt-0.5 flex items-center">
                                  <span className={`w-2 h-2 rounded-full mr-1.5 ${assignedDriver.safety_score >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  {assignedDriver.safety_score}/100
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500 font-semibold">Active Status</p>
                                <p className="text-slate-350 font-bold mt-0.5">{assignedDriver.status}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-slate-950/20 border border-slate-850 rounded-2xl text-slate-550">
                            <User className="w-10 h-10 mx-auto text-slate-650 mb-2" />
                            <p className="font-semibold text-slate-400">No Driver Currently Assigned</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Assign this vehicle to a driver during trip dispatches.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab: Maintenance logs list */}
                    {activeTab === 'maintenance' && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-[#00A09D] uppercase tracking-wider text-[10px]">Service & Downtime History</h4>
                        {maintenanceHistory.length === 0 ? (
                          <p className="text-slate-500 italic py-4 text-center">No maintenance logs found for this vehicle.</p>
                        ) : (
                          <div className="space-y-3">
                            {maintenanceHistory.map((log) => (
                              <div key={log.maintenance_id} className="p-4 bg-slate-950/20 border border-slate-850 rounded-2xl flex items-center justify-between">
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-slate-200">{log.maintenance_type}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${log.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-450 border border-emerald-900/35' : 'bg-amber-950/40 text-amber-450 border border-amber-900/35'}`}>
                                      {log.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-450 mt-1 truncate">{log.issue}</p>
                                </div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">{log.start_date.slice(0,10)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab: Fuel History list */}
                    {activeTab === 'fuel' && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-[#00A09D] uppercase tracking-wider text-[10px]">Refueling Records</h4>
                        {fuelLogs.length === 0 ? (
                          <p className="text-slate-500 italic py-4 text-center">No refuel logs registered for this asset.</p>
                        ) : (
                          <div className="space-y-3">
                            {fuelLogs.map((log) => (
                              <div key={log.fuel_log_id} className="p-4 bg-slate-950/20 border border-slate-850 rounded-2xl flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-slate-200">{parseFloat(log.fuel_liters).toFixed(1)} Liters</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Odometer: {log.odometer.toLocaleString()} km</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-[#00A09D]">₹{parseFloat(log.fuel_cost).toLocaleString('en-IN')}</p>
                                  <span className="text-[9px] text-slate-500 font-semibold">{log.date.slice(0, 10)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab: Trip timeline */}
                    {activeTab === 'timeline' && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-[#00A09D] uppercase tracking-wider text-[10px]">Trip Dispatches timeline</h4>
                        {tripTimeline.length === 0 ? (
                          <p className="text-slate-500 italic py-4 text-center">No trip timeline records logged.</p>
                        ) : (
                          <div className="relative border-l border-slate-800 ml-3 pl-5 space-y-5">
                            {tripTimeline.map((trip) => (
                              <div key={trip.trip_id} className="relative">
                                <span className="absolute -left-7.5 top-0.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-[#714B67] flex items-center justify-center" />
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-slate-200">Trip #{trip.trip_id}</span>
                                    <span className={`px-2 py-0.2 rounded-full text-[8px] font-bold ${
                                      trip.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-450' : 'bg-blue-950/40 text-blue-450'
                                    }`}>
                                      {trip.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-450 mt-1">{trip.source} → {trip.destination}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Drawer Actions Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end space-x-3">
                <button
                  onClick={() => handleOpenEditForm(selectedVehicle)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-850 rounded-xl font-bold text-slate-350"
                >
                  Edit Vehicle Details
                </button>
                <button
                  onClick={() => handleDeleteVehicle(selectedVehicle.vehicle_id)}
                  className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/35 text-red-400 rounded-xl font-bold shadow-sm"
                >
                  Delete Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Slide-over Form Drawer (Add/Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-md bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-800 text-slate-200">
              {/* Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-955 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-100">
                  {editingVehicle ? 'Edit Vehicle Registry' : 'Register New Fleet Asset'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex-grow p-6 overflow-y-auto space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Registration Number (Plate)</label>
                  <input
                    type="text"
                    placeholder="MH-12-PQ-9981"
                    {...register('registration_number', { required: 'Required' })}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
                  />
                  {errors.registration_number && <p className="text-red-500 mt-1">Field is required</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Vehicle Name</label>
                    <input
                      type="text"
                      placeholder="Tata Signa 5530"
                      {...register('vehicle_name', { required: 'Required' })}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
                    />
                    {errors.vehicle_name && <p className="text-red-500 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Model Year</label>
                    <input
                      type="text"
                      placeholder="2023 Heavy Duty"
                      {...register('model', { required: 'Required' })}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
                    />
                    {errors.model && <p className="text-red-500 mt-1">Required</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Asset Category</label>
                  <select
                    {...register('vehicle_type', { required: 'Required' })}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
                  >
                    <option value="Semi Truck">Semi Truck (Heavy Duty)</option>
                    <option value="Box Truck">Box Truck (Medium Duty)</option>
                    <option value="Cargo Van">Cargo Van (Light Duty)</option>
                    <option value="Flatbed">Flatbed (Special Utility)</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Max Load (kg)</label>
                    <input
                      type="number"
                      placeholder="22000"
                      {...register('maximum_load_capacity', { required: 'Required', min: 1 })}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Odometer (km)</label>
                    <input
                      type="number"
                      placeholder="45000"
                      {...register('current_odometer', { required: 'Required', min: 0 })}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Cost (₹)</label>
                    <input
                      type="number"
                      placeholder="4500000"
                      {...register('purchase_cost', { required: 'Required', min: 1 })}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                {editingVehicle && (
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Asset Status</label>
                    <select
                      {...register('status', { required: 'Required' })}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
                    >
                      <option value="Available">Available</option>
                      <option value="On Trip">On Trip</option>
                      <option value="In Shop">In Shop</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-850 rounded-xl font-bold text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#714B67] hover:bg-[#623f58] text-white rounded-xl font-bold shadow-sm"
                  >
                    {editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
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

export default Vehicles;
