import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Plus, Check, Wrench, Calendar, AlertCircle } from 'lucide-react';

const Maintenance = () => {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchMaintenance = async () => {
    try {
      setLoading(true);
      const [maintRes, vehRes] = await Promise.all([
        api.get('/maintenance?limit=100'),
        api.get('/vehicles?limit=100')
      ]);
      setLogs(maintRes.data.data);
      setVehicles(vehRes.data.data.filter(v => v.status !== 'Retired'));
    } catch (err) {
      showToast('Failed to load maintenance records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleOpenAddModal = () => {
    reset({
      vehicle_id: '',
      maintenance_type: 'Preventative',
      issue: '',
      start_date: new Date().toISOString().slice(0, 10),
      expected_completion: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      await api.post('/maintenance', data);
      showToast('Maintenance entry logged. Vehicle status set to In Shop.');
      setIsModalOpen(false);
      fetchMaintenance();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to schedule maintenance.', 'error');
    }
  };

  const handleCompleteMaintenance = async (log) => {
    if (!window.confirm('Mark this maintenance event as completed?')) return;
    try {
      await api.put(`/maintenance/${log.maintenance_id}`, {
        status: 'Completed',
        completion_date: new Date().toISOString().slice(0, 10)
      });
      showToast('Maintenance completed. Vehicle is now Available.');
      fetchMaintenance();
    } catch (err) {
      showToast('Failed to complete maintenance event.', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Maintenance & Shop Logs</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Audit preventative service history, repairs, and depot down-times.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#714B67] to-[#00A09D] hover:from-[#623f58] hover:to-[#008381] rounded-xl text-xs font-bold text-white shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Maintenance Event</span>
        </button>
      </div>

      {/* Listings Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl h-56">
              <LoadingSkeleton rows={3} className="h-6 mb-2" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg">
          <AlertCircle className="w-10 h-10 mx-auto text-slate-500 mb-3" />
          <h3 className="font-bold text-slate-350">No Servicing Logs Found</h3>
          <p className="text-xs text-slate-500 mt-1">Add a servicing record to track down-times.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {logs.map((log) => (
            <div 
              key={log.maintenance_id} 
              className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300 backdrop-blur-sm text-slate-200"
            >
              <div>
                {/* Header status */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                    log.status === 'Completed' 
                      ? 'bg-emerald-955/40 text-emerald-450 border-emerald-900/35' 
                      : 'bg-amber-955/40 text-amber-450 border-amber-900/35'
                  }`}>
                    {log.status}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Log #{log.maintenance_id}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-200 mt-3 flex items-center justify-between">
                  <span>{log.vehicle_name} ({log.registration_number})</span>
                </h3>
                <p className="text-xs text-slate-300 mt-2 font-medium bg-slate-950/20 p-2.5 rounded-lg border border-slate-850">
                  <Wrench className="inline mr-1.5 text-slate-500 w-4 h-4" />
                  {log.issue}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-semibold bg-slate-950/10 py-1 px-2 border border-slate-850 rounded-lg">
                  <span className="flex items-center"><Calendar className="mr-1 w-3.5 h-3.5" /> {log.start_date.slice(0, 10)}</span>
                  <span className="text-slate-600">→</span>
                  <span className="flex items-center"><Calendar className="mr-1 w-3.5 h-3.5" /> Exp: {log.expected_completion.slice(0, 10)}</span>
                </div>
              </div>

              {/* Complete Action Button */}
              <div className="mt-5 pt-3.5 border-t border-slate-800/60 flex items-center justify-end">
                {log.status === 'In Shop' && (
                  <button 
                    onClick={() => handleCompleteMaintenance(log)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-emerald-900/30 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 text-xs font-bold transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Complete</span>
                  </button>
                )}
                {log.status === 'Completed' && (
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Finished: {log.completion_date?.slice(0, 10)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Log Maintenance Event */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Maintenance Event">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 font-bold mb-1">Select Fleet Asset (Vehicle)</label>
            <select
              {...register('vehicle_id', { required: 'Required' })}
              className="w-full bg-slate-955 border border-slate-850 hover:border-slate-755 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
            >
              <option value="">-- Select Vehicle --</option>
              {vehicles.map(v => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.vehicle_name} ({v.registration_number}) - Odo: {v.current_odometer.toLocaleString()} km
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Service Type</label>
            <select
              {...register('maintenance_type', { required: 'Required' })}
              className="w-full bg-slate-950 border border-slate-850 hover:border-slate-755 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
            >
              <option value="Preventative">Routine / Preventative (Oil change, Filters)</option>
              <option value="Repair">Emergency Repair (Engine, Brakes)</option>
              <option value="Inspection">Annual Fitness / Emission Inspection</option>
              <option value="Tires">Tire Rotation / Alignment Replacement</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Service Start Date</label>
              <input
                type="date"
                {...register('start_date', { required: 'Required' })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Expected Completion</label>
              <input
                type="date"
                {...register('expected_completion', { required: 'Required' })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Detailed Description of Issue</label>
            <input
              type="text"
              placeholder="Airbrake pressure leakage, replacing compression valves"
              {...register('issue', { required: 'Required' })}
              className="w-full bg-slate-955 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
            />
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
              Assign to Maintenance
            </button>
          </div>
        </form>
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

export default Maintenance;
