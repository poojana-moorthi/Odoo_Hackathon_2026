import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Download, Printer, AlertCircle } from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend
);

const Reports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports');
      setReports(res.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading || !reports) {
    return (
      <div className="p-6 space-y-6">
        <LoadingSkeleton rows={4} className="h-10 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-6">
            <LoadingSkeleton rows={4} className="h-8 mb-4" />
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-6">
            <LoadingSkeleton rows={4} className="h-8 mb-4" />
          </div>
        </div>
      </div>
    );
  }

  const { fuelEfficiency, vehicleCosts, monthlyTrips, monthlyFuel, monthlyExpenses, vehicleROI } = reports;

  // Chart 1: Fuel Efficiency (Bar Chart)
  const efficiencyData = {
    labels: fuelEfficiency.map(f => f.vehicle_name),
    datasets: [{
      label: 'Efficiency (km / Liter)',
      data: fuelEfficiency.map(f => parseFloat(f.efficiency)),
      backgroundColor: 'rgba(0, 160, 157, 0.75)',
      borderColor: '#00A09D',
      borderWidth: 1
    }]
  };

  // Chart 2: Operational Cost Breakdown (Stacked Bar)
  const costBreakdownData = {
    labels: vehicleCosts.map(vc => vc.vehicle_name),
    datasets: [
      {
        label: 'Fuel Spend',
        data: vehicleCosts.map(vc => vc.fuelCost),
        backgroundColor: '#714B67',
      },
      {
        label: 'Expense Spend',
        data: vehicleCosts.map(vc => vc.expenseCost),
        backgroundColor: '#00A09D',
      }
    ]
  };

  // Chart 3: Return on Investment (ROI) Percent (Horizontal Bar / standard Bar)
  const roiData = {
    labels: vehicleROI.map(vr => vr.vehicle_name),
    datasets: [{
      label: 'ROI % (Revenue vs Purchase)',
      data: vehicleROI.map(vr => parseFloat(vr.roiPercent)),
      backgroundColor: 'rgba(16, 185, 129, 0.75)',
      borderColor: '#10b981',
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#1F2937' }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(0, 0, 0, 0.06)' }, ticks: { color: '#6b7280' } },
      y: { grid: { color: 'rgba(0, 0, 0, 0.06)' }, ticks: { color: '#6b7280' } }
    }
  };

  // CSV Exporter handler
  const exportToCSV = (dataset, filename) => {
    if (!dataset || dataset.length === 0) return;
    const headers = Object.keys(dataset[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...dataset.map(row => 
        headers.map(fieldName => 
          JSON.stringify(row[fieldName] === null ? '' : row[fieldName])
        ).join(',')
      )
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Fleet Reports & Analytics</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Deep-dive audits, fuel efficiencies, cost breakdowns, and ROI summaries.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => exportToCSV(vehicleCosts, 'transitops_fleet_cost_report')}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-slate-100 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#714B67] to-[#00A09D] hover:from-[#623f58] hover:to-[#008381] rounded-xl text-xs font-bold text-white shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Analysis */}
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl shadow-md card">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Operational Cost Breakdown (₹)</h3>
          <div className="h-72">
            <Bar 
              data={costBreakdownData} 
              options={{
                ...chartOptions,
                scales: {
                  x: { ...chartOptions.scales.x, stacked: true },
                  y: { ...chartOptions.scales.y, stacked: true }
                }
              }} 
            />
          </div>
        </div>

        {/* Fuel Efficiency */}
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl shadow-md card">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Fuel Efficiency Rank (km / Liter)</h3>
          <div className="h-72">
            <Bar data={efficiencyData} options={chartOptions} />
          </div>
        </div>

        {/* ROI Breakdown */}
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl shadow-md card lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Estimated Fleet Asset Return-on-Investment (%)</h3>
          <div className="h-72">
            <Bar data={roiData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Printable detail list */}
      <div className="hidden print-only mt-12 space-y-6">
        <h3 className="text-lg font-bold text-slate-950">Fleet Expenses List</h3>
        <table className="w-full text-left text-xs border border-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-2 border">Vehicle Name</th>
              <th className="p-2 border">Plate</th>
              <th className="p-2 border">Fuel Costs</th>
              <th className="p-2 border">Other Costs</th>
              <th className="p-2 border">ROI Score</th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            {vehicleCosts.map((vc, i) => (
              <tr key={i} className="border-b">
                <td className="p-2 border">{vc.vehicle_name}</td>
                <td className="p-2 border font-bold">{vc.registration_number}</td>
                <td className="p-2 border">₹{vc.fuelCost.toFixed(2)}</td>
                <td className="p-2 border">₹{vc.expenseCost.toFixed(2)}</td>
                <td className="p-2 border font-semibold">{vehicleROI[i]?.roiPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
