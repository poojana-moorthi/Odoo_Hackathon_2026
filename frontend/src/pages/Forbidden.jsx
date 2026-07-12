import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSlash, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Forbidden = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    if (user) {
      if (user.role_id === 3) navigate('/drivers');
      else if (user.role_id === 4) navigate('/expenses');
      else navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full mb-6">
        <FiSlash className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-2">403 Forbidden</h2>
      <p className="text-slate-400 max-w-md font-medium text-sm mb-8">
        You do not have the required permissions to view this page. Access is restricted by Role-Based Access Control (RBAC) rules.
      </p>
      <button 
        onClick={handleBack}
        className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-xl text-sm font-semibold transition-all"
      >
        <FiArrowLeft className="w-4 h-4" />
        <span>Return to Safety</span>
      </button>
    </div>
  );
};

export default Forbidden;
