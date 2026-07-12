import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from 'chart.js';
import { 
  Truck, 
  Users, 
  Compass, 
  DollarSign, 
  Clock, 
  Activity, 
  Bell, 
  ShieldAlert, 
  Wrench, 
  CheckCircle2, 
  TrendingUp, 
  Search
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartTitle,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [kpis, setKpis] = useState({
    activeVehicles: 0,
    availableVehicles: 0,
    inMaintenance: 0,
    activeTrips: 0,
    pendingTrips: 0,
    driversOnDuty: 0,
    fleetUtilization: 0,
    totalFuelCost: 0,
    totalMaintenanceCost: 0,
    totalOperationalCost: 0
  });

  const [charts, setCharts] = useState({
    tripStatus: [],
    vehicleStatus: [],
    fuelUsage: []
  });

  const [latestTrips, setLatestTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Fetch Dashboard aggregate statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      setKpis(res.data.kpis);
      setCharts(res.data.charts);
      setLatestTrips(res.data.latestTrips || []);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Filter latest trips table client-side
  const filteredLatestTrips = latestTrips.filter(t => {
    const matchesRegion = !selectedRegion || 
      t.source.toLowerCase().includes(selectedRegion.toLowerCase()) || 
      t.destination.toLowerCase().includes(selectedRegion.toLowerCase());
    const matchesStatus = !selectedStatus || t.status === selectedStatus;
    return matchesRegion && matchesStatus;
  });

  // Chart configuration: Refueling History (Liters)
  const fuelLineData = {
    labels: charts.fuelUsage.map(x => x.label),
    datasets: [{
      label: 'Fuel Liters Refuelled',
      data: charts.fuelUsage.map(x => x.fuel),
      fill: false,
      borderColor: '#00A09D', // Odoo Teal
      tension: 0.3,
      pointBackgroundColor: '#00A09D'
    }]
  };

  const fuelLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 10 } } },
      y: { grid: { color: 'rgba(0, 0, 0, 0.06)' }, ticks: { color: '#6b7280', font: { size: 10 } } }
    }
  };

  // Chart configuration: Trip Status doughnut
  const tripPieData = {
    labels: charts.tripStatus.map(x => x.status),
    datasets: [{
      data: charts.tripStatus.map(x => x.count),
      backgroundColor: ['#00A09D', '#3B82F6', '#64748B', '#EF4444'], // Teal, Blue, Grey, Red
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  // Chart configuration: Vehicle status doughnut
  const vehDoughnutData = {
    labels: charts.vehicleStatus.map(x => x.status),
    datasets: [{
      data: charts.vehicleStatus.map(x => x.count),
      backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'], // Green, Blue, Amber, Red
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#1F2937', font: { size: 10, weight: 'bold' }, boxWidth: 12 }
      }
    }
  };

  // Mock notifications array
  const alertNotifications = [
    { id: 1, title: 'Safety Violation alert', desc: 'Driver sathish exceeded 90 km/h threshold.', type: 'critical', time: '10 mins ago' },
    { id: 2, title: 'Expired License', desc: 'Safety alert: Sathish Kumar\'s driving license has expired.', type: 'critical', time: '1 hour ago' },
    { id: 3, title: 'Maintenance Pending', desc: 'Scheduled servicing for MH-12-PQ-9981 is due today.', type: 'warning', time: '3 hours ago' },
  ];

  // Mock Recent Activities timeline
  const recentActivities = [
    { id: 1, text: 'MH-12-PQ-9981 completed dispatch Mumbai → Pune', time: '15 mins ago', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
    { id: 2, text: 'Vehicle MH-12-RS-5432 assigned to Maintenance Shop', time: '1 hour ago', icon: <Wrench className="w-4 h-4 text-amber-400" /> },
    { id: 3, text: 'Driver sathish logged a refueling sheet (₹2,500)', time: '2 hours ago', icon: <DollarSign className="w-4 h-4 text-blue-400" /> },
    { id: 4, text: 'New dispatch trip MH-12-PQ-9981 scheduled', time: '4 hours ago', icon: <Compass className="w-4 h-4 text-purple-400" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
        <div>
          <h2 className="text-sm font-extrabold text-[#00A09D] uppercase tracking-wider">Fleet Executive Hub</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-500"><Search className="w-3.5 h-3.5" /></span>
            <input
              type="text"
              placeholder="Search Region/City..."
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3.5 py-1.5 pl-8 bg-slate-950/60 border border-slate-850 hover:border-slate-750 focus:border-[#714B67] rounded-xl text-xs font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-950/60 border border-slate-850 hover:border-slate-750 focus:border-[#714B67] rounded-xl text-xs font-bold text-slate-200 focus:outline-none font-semibold"
          >
            <option value="">All Trip Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Draft">Draft</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* 6 Top KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-xl h-36">
              <LoadingSkeleton rows={3} className="h-5 mb-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard 
            title="Total Vehicles" 
            value={kpis.activeVehicles + kpis.availableVehicles + kpis.inMaintenance} 
            icon={<Truck className="w-5 h-5 text-blue-400" />} 
            color="blue"
            trend="+4.2%"
            trendDirection="up"
            statusDot="bg-blue-500"
          />
          <StatCard 
            title="Active Trips" 
            value={kpis.activeTrips} 
            icon={<Compass className="w-5 h-5 text-indigo-400" />} 
            color="indigo"
            trend="+12.8%"
            trendDirection="up"
            statusDot="bg-indigo-500"
          />
          <StatCard 
            title="Drivers On Duty" 
            value={kpis.driversOnDuty} 
            icon={<Users className="w-5 h-5 text-emerald-450" />} 
            color="emerald"
            trend="+2.4%"
            trendDirection="up"
            statusDot="bg-emerald-500"
          />
          <StatCard 
            title="Fleet Utilization" 
            value={`${kpis.fleetUtilization}%`} 
            icon={<Activity className="w-5 h-5 text-amber-450" />} 
            color="amber"
            trend="+0.5%"
            trendDirection="up"
            statusDot="bg-amber-500"
          />
          <StatCard 
            title="Operational Cost" 
            value={`₹${Math.round(kpis.totalOperationalCost).toLocaleString('en-IN')}`} 
            icon={<DollarSign className="w-5 h-5 text-purple-300" />} 
            color="brand"
            trend="-1.5%"
            trendDirection="down"
            statusDot="bg-[#714B67]"
          />
          <StatCard 
            title="Fuel Costs" 
            value={`₹${Math.round(kpis.totalFuelCost).toLocaleString('en-IN')}`} 
            icon={<Clock className="w-5 h-5 text-red-400" />} 
            color="red"
            trend="+3.1%"
            trendDirection="up"
            statusDot="bg-red-500"
          />
        </div>
      )}

      {/* Main Charts & Timeline Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Charts and activities) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Fuel line chart */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm flex flex-col justify-between h-80">
              <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Refueling History (L)</span>
                <TrendingUp className="w-4 h-4 text-[#00A09D]" />
              </h3>
              <div className="h-56">
                <Line data={fuelLineData} options={fuelLineOptions} />
              </div>
            </div>

            {/* Trip status doughnut */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm flex flex-col justify-between h-80">
              <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-4">Trip Summaries</h3>
              <div className="h-56 relative flex items-center justify-center">
                <Doughnut data={tripPieData} options={donutOptions} />
              </div>
            </div>

            {/* Vehicle registry doughnut */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm flex flex-col justify-between h-80">
              <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-4">Vehicle Status</h3>
              <div className="h-56 relative flex items-center justify-center">
                <Doughnut data={vehDoughnutData} options={donutOptions} />
              </div>
            </div>
          </div>

          {/* Recent activities timeline */}
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
            <h3 className="text-[10px] font-bold text-[#00A09D] uppercase tracking-wider mb-5 flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-[#714B67]" />
              <span>Recent System Activity Log</span>
            </h3>
            <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6">
              {recentActivities.map((act) => (
                <div key={act.id} className="relative">
                  {/* Timeline icon */}
                  <span className="absolute top-0.5 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm flex items-center justify-center" style={{ left: '-38px' }}>
                    {act.icon}
                  </span>
                  <div>
                    <p className="text-xs text-slate-300 font-semibold">{act.text}</p>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-1">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Notifications list, Latest trips table) */}
        <div className="space-y-6">
          {/* Active warnings and alerts */}
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
            <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center space-x-1.5">
              <Bell className="w-4 h-4 text-red-500" />
              <span>Critical Operations Alerts</span>
            </h3>
            <div className="space-y-3">
              {alertNotifications.map((notif) => (
                <div 
                  key={notif.id}
                  className="p-3.5 rounded-xl border border-red-900/40 bg-red-950/20 flex items-start space-x-3 text-xs"
                >
                  <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold text-red-300">{notif.title}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">{notif.desc}</p>
                    <span className="text-[9px] text-red-500/70 font-bold block mt-1.5 uppercase">{notif.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Table - Latest Dispatched Trips */}
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg backdrop-blur-sm">
            <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-4">Latest Dispatched Trips</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-2">Trip</th>
                    <th className="py-2.5 px-2">Route</th>
                    <th className="py-2.5 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-400 font-semibold">
                  {filteredLatestTrips.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500 font-semibold">
                        No active dispatches found.
                      </td>
                    </tr>
                  ) : (
                    filteredLatestTrips.map((t) => (
                      <tr key={t.trip_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-2 text-slate-200 font-bold">#{t.trip_id}</td>
                        <td className="py-3 px-2">
                          <p className="text-[11px] truncate text-slate-300">{t.source} → {t.destination}</p>
                          <span className="text-[9px] text-slate-500 font-bold">{t.vehicle_name}</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            t.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' :
                            t.status === 'Dispatched' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' :
                            t.status === 'Draft' ? 'bg-slate-950/60 text-slate-400 border border-slate-800' :
                            'bg-red-950/40 text-red-400 border border-red-900/30'
                          }`}>
                            {t.status === 'Dispatched' ? 'In Transit' : t.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
