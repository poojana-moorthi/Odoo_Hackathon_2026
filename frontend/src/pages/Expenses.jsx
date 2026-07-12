import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Plus, AlertCircle, Fuel, DollarSign, Wrench, Calendar, Trash2 } from 'lucide-react';

const Expenses = () => {
  const [activeTab, setActiveTab] = useState('fuel'); // 'fuel' or 'misc'
  const [fuelLogs, setFuelLogs] = useState([]);
  const [miscExpenses, setMiscExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const { register: regFuel, handleSubmit: submitFuel, reset: resetFuel, formState: { errors: errorsFuel } } = useForm();
  const { register: regExp, handleSubmit: submitExp, reset: resetExp, formState: { errors: errorsExp } } = useForm();

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      const [fuelRes, expRes, vehRes] = await Promise.all([
        api.get('/fuel?limit=100'),
        api.get('/expense?limit=100'),
        api.get('/vehicles?limit=100')
      ]);
      setFuelLogs(fuelRes.data.data);
      setMiscExpenses(expRes.data.data);
      setVehicles(vehRes.data.data.filter(v => v.status !== 'Retired'));
    } catch (err) {
      showToast('Failed to fetch financial records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Local aggregates calculations for instant feedback
  const totalFuelCost = fuelLogs.reduce((sum, log) => sum + parseFloat(log.fuel_cost || 0), 0);
  const totalMaintCost = miscExpenses
    .filter(e => e.expense_type === 'Maintenance' || e.expense_type === 'Repair')
    .reduce((sum, e) => sum + parseFloat(e.cost || 0), 0);
  const totalMiscCost = miscExpenses.reduce((sum, e) => sum + parseFloat(e.cost || 0), 0);
  const overallOperationalCost = totalFuelCost + totalMiscCost;

  const handleLogFuel = async (data) => {
    try {
      await api.post('/fuel', data);
      showToast('Refueling event logged successfully.');
      setIsFuelModalOpen(false);
      fetchFinancials();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save fuel log.', 'error');
    }
  };

  const handleLogExpense = async (data) => {
    try {
      await api.post('/expense', data);
      showToast('Operational expense recorded.');
      setIsExpenseModalOpen(false);
      fetchFinancials();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record expense.', 'error');
    }
  };

  const handleDeleteFuel = async (id) => {
    if (!window.confirm('Delete this refuel log?')) return;
    try {
      await api.delete(`/fuel/${id}`);
      showToast('Refuel log deleted.');
      fetchFinancials();
    } catch (err) {
      showToast('Failed to delete log.', 'error');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await api.delete(`/expense/${id}`);
      showToast('Expense record deleted.');
      fetchFinancials();
    } catch (err) {
      showToast('Failed to delete expense.', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header and buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Fuel & Expense Module</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Audit refueling sheets, track miscellaneous costs, and sum operations.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              resetFuel({
                vehicle_id: '',
                date: new Date().toISOString().slice(0, 10),
                fuel_liters: '',
                fuel_cost: '',
                odometer: ''
              });
              setIsFuelModalOpen(true);
            }}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-350 hover:text-slate-100 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Refuel Log</span>
          </button>
          <button 
            onClick={() => {
              resetExp({
                vehicle_id: '',
                expense_type: 'Toll',
                cost: '',
                description: '',
                date: new Date().toISOString().slice(0, 10)
              });
              setIsExpenseModalOpen(true);
            }}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#714B67] to-[#00A09D] hover:from-[#623f58] hover:to-[#008381] rounded-xl text-xs font-bold text-white shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Aggregates Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Fuel Costs</p>
              <h3 className="text-xl font-black text-slate-100 mt-1">₹{Math.round(totalFuelCost).toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Maintenance & Repairs</p>
              <h3 className="text-xl font-black text-slate-100 mt-1">₹{Math.round(totalMaintCost).toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-500/10 border border-purple-500/25 rounded-xl text-purple-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Misc Expenses</p>
              <h3 className="text-xl font-black text-slate-100 mt-1">₹{Math.round(totalMiscCost).toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 bg-[#714B67]/15 border border-[#714B67]/30 rounded-2xl shadow-lg backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#00A09D]/15 border border-[#00A09D]/30 rounded-xl text-[#00A09D]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#00A09D] uppercase tracking-wider">Overall Operational</p>
              <h3 className="text-xl font-black text-slate-100 mt-1">₹{Math.round(overallOperationalCost).toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs selectors */}
      <div className="border-b border-slate-800 flex text-xs font-bold text-slate-450 bg-slate-900/20 rounded-t-xl px-4 pt-2">
        <button
          onClick={() => setActiveTab('fuel')}
          className={`py-3.5 px-5 border-b-2 transition-all capitalize whitespace-nowrap ${
            activeTab === 'fuel' 
              ? 'border-[#00A09D] text-[#00A09D] font-black' 
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Refueling Sheets Logs
        </button>
        <button
          onClick={() => setActiveTab('misc')}
          className={`py-3.5 px-5 border-b-2 transition-all capitalize whitespace-nowrap ${
            activeTab === 'misc' 
              ? 'border-[#00A09D] text-[#00A09D] font-black' 
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Miscellaneous Operations Costs
        </button>
      </div>

      {/* Loading & listings */}
      {loading ? (
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-b-2xl h-80">
          <LoadingSkeleton rows={5} className="h-6 mb-3" />
        </div>
      ) : activeTab === 'fuel' ? (
        /* Fuel logs table */
        fuelLogs.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-b-2xl shadow-lg">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-500 mb-3" />
            <h3 className="font-bold text-slate-350">No Refuel Logs</h3>
            <p className="text-xs text-slate-500 mt-1">Log a refuel sheet to track consumption.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-slate-900/40 border border-slate-800/80 rounded-b-2xl shadow-lg backdrop-blur-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Refuel ID</th>
                  <th className="py-3 px-4">Vehicle name</th>
                  <th className="py-3 px-4">Plate</th>
                  <th className="py-3 px-4 text-right">Liters</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4 text-right">Odometer</th>
                  <th className="py-3 px-4">Date logged</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-350 font-medium">
                {fuelLogs.map((log) => (
                  <tr key={log.fuel_log_id} className="hover:bg-slate-800/20">
                    <td className="py-3.5 px-4 text-slate-200 font-bold">#{log.fuel_log_id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-200">{log.vehicle_name}</td>
                    <td className="py-3.5 px-4 text-[#00A09D] font-bold">{log.registration_number}</td>
                    <td className="py-3.5 px-4 text-right">{parseFloat(log.fuel_liters).toFixed(1)} L</td>
                    <td className="py-3.5 px-4 text-right">₹{parseFloat(log.fuel_cost / log.fuel_liters).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-slate-200 font-bold">₹{parseFloat(log.fuel_cost).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right">{log.odometer.toLocaleString()} km</td>
                    <td className="py-3.5 px-4">{log.date.slice(0, 10)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button 
                        onClick={() => handleDeleteFuel(log.fuel_log_id)}
                        className="p-1 rounded-lg border border-slate-800 hover:bg-red-950/20 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Expenses table */
        miscExpenses.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-b-2xl shadow-lg">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-500 mb-3" />
            <h3 className="font-bold text-slate-350">No Expenses Logged</h3>
            <p className="text-xs text-slate-500 mt-1">Log toll pass, routine shop fees or other costs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-slate-900/40 border border-slate-800/80 rounded-b-2xl shadow-lg backdrop-blur-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Expense ID</th>
                  <th className="py-3 px-4">Vehicle name</th>
                  <th className="py-3 px-4">Plate</th>
                  <th className="py-3 px-4">Expense Type</th>
                  <th className="py-3 px-4 text-right">Cost Value</th>
                  <th className="py-3 px-4">Description / Notes</th>
                  <th className="py-3 px-4">Date logged</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-350 font-medium">
                {miscExpenses.map((exp) => (
                  <tr key={exp.expense_id} className="hover:bg-slate-800/20">
                    <td className="py-3.5 px-4 text-slate-200 font-bold">#{exp.expense_id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-200">{exp.vehicle_name}</td>
                    <td className="py-3.5 px-4 text-[#00A09D] font-bold">{exp.registration_number}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                        exp.expense_type === 'Maintenance' || exp.expense_type === 'Repair' 
                          ? 'bg-amber-955/40 text-amber-450 border-amber-900/35' 
                          : 'bg-purple-955/40 text-purple-450 border-purple-900/35'
                      }`}>
                        {exp.expense_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-200 font-bold">₹{parseFloat(exp.cost).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 max-w-xs truncate">{exp.description}</td>
                    <td className="py-3.5 px-4">{exp.date.slice(0, 10)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button 
                        onClick={() => handleDeleteExpense(exp.expense_id)}
                        className="p-1 rounded-lg border border-slate-800 hover:bg-red-955/20 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal: Log Refuel Log */}
      <Modal isOpen={isFuelModalOpen} onClose={() => setIsFuelModalOpen(false)} title="Log Refuel Log Event">
        <form onSubmit={submitFuel(handleLogFuel)} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 font-bold mb-1">Select Fleet Asset (Truck / Van)</label>
            <select
              {...regFuel('vehicle_id', { required: 'Required' })}
              className="w-full bg-slate-955 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
            >
              <option value="">-- Select Vehicle --</option>
              {vehicles.map(v => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.vehicle_name} ({v.registration_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Fuel Volume (Liters)</label>
              <input
                type="number"
                step="0.01"
                placeholder="150"
                {...regFuel('fuel_liters', { required: 'Required', min: 1 })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Total Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="15000"
                {...regFuel('fuel_cost', { required: 'Required', min: 1 })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Current Odometer (km)</label>
              <input
                type="number"
                placeholder="46500"
                {...regFuel('odometer', { required: 'Required', min: 0 })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Refuel Date</label>
              <input
                type="date"
                {...regFuel('date', { required: 'Required' })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsFuelModalOpen(false)}
              className="px-4 py-2 border border-slate-800 hover:bg-slate-855 rounded-xl font-bold text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#714B67] hover:bg-[#623f58] text-white rounded-xl font-bold shadow-sm"
            >
              Save Refuel Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Expense */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Log Operational Expense">
        <form onSubmit={submitExp(handleLogExpense)} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 font-bold mb-1">Select Fleet Asset (Truck / Van)</label>
            <select
              {...regExp('vehicle_id', { required: 'Required' })}
              className="w-full bg-slate-955 border border-slate-850 hover:border-slate-755 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
            >
              <option value="">-- Select Vehicle --</option>
              {vehicles.map(v => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.vehicle_name} ({v.registration_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Expense Type</label>
              <select
                {...regExp('expense_type', { required: 'Required' })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-755 focus:border-[#00A09D] p-2.5 rounded-xl text-[#00A09D] focus:outline-none font-semibold text-slate-300"
              >
                <option value="Toll">Toll Fees</option>
                <option value="Maintenance">Maintenance Shop Cost</option>
                <option value="Repair">Emergency Repair Cost</option>
                <option value="Insurance">Insurance Renewal</option>
                <option value="Permit">State Permit Fees</option>
                <option value="Other">Other Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Total Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="4500"
                {...regExp('cost', { required: 'Required', min: 1 })}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Date Logged</label>
            <input
              type="date"
              {...regExp('date', { required: 'Required' })}
              className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none font-semibold text-slate-300"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Description / Memo Notes</label>
            <input
              type="text"
              placeholder="Fastag Toll pass refill, Mumbai-Pune expressway"
              {...regExp('description', { required: 'Required' })}
              className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-[#00A09D] p-2.5 rounded-xl text-slate-200 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 border border-slate-800 hover:bg-slate-855 rounded-xl font-bold text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#714B67] hover:bg-[#623f58] text-white rounded-xl font-bold shadow-sm"
            >
              Record Expense
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

export default Expenses;
