import React, { useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const typeClasses = {
    success: 'bg-emerald-50 border-emerald-250 text-emerald-850',
    error: 'bg-red-50 border-red-250 text-red-850',
    warning: 'bg-amber-50 border-amber-250 text-amber-850',
    info: 'bg-blue-50 border-blue-250 text-blue-850'
  };

  const icons = {
    success: <FiCheckCircle className="w-5 h-5 text-emerald-600" />,
    error: <FiAlertCircle className="w-5 h-5 text-red-600" />,
    warning: <FiAlertCircle className="w-5 h-5 text-amber-600" />,
    info: <FiInfo className="w-5 h-5 text-blue-600" />
  };

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center p-4 space-x-3 border rounded-lg shadow-xl backdrop-blur-md ${typeClasses[type]} transition-transform duration-300 translate-y-0`}>
      <span>{icons[type]}</span>
      <div className="text-sm font-medium pr-6">{message}</div>
      <button 
        onClick={onClose} 
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-650 transition-colors"
      >
        <FiX className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
