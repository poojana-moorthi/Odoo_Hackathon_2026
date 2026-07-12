import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Shield } from 'lucide-react'; // Fallback icon

const Login = () => {
  const { setToken, setUser, user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  // Success Toast trigger
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successUsername, setSuccessUsername] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  // Redirect if user session already exists
  useEffect(() => {
    if (user) {
      window.location.href = '/';
    }
  }, [user]);

  // Load and apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('transitops_theme') || 'dark';
    document.body.classList.toggle('light-theme', savedTheme === 'light');
  }, []);

  const onSubmit = async (data) => {
    if (failedAttempts >= 5) return;

    try {
      setSubmitting(true);
      setErrorMsg('');

      // Perform auth login request directly
      const res = await api.post('/auth/login', { email: data.email, password: data.password });
      const { token: receivedToken, user: receivedUser } = res.data;

      // Verify that the user's role matches the selected role
      if (Number(receivedUser.role_id) !== Number(data.role)) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        
        if (nextAttempts >= 5) {
          setErrorMsg('Account locked after 5 failed login attempts. Please contact the administrator or wait until the lock period expires.');
        } else {
          const attemptsLeft = 5 - nextAttempts;
          setErrorMsg(`Invalid username, password, or selected role. Attempts remaining: ${attemptsLeft}`);
        }
        return;
      }

      // Successful login! Trigger toast notification
      setSuccessUsername(receivedUser.username);
      setShowSuccessToast(true);

      // Delay global context state updates to let the toast display
      setTimeout(() => {
        localStorage.setItem('transitops_token', receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
      }, 1200);

    } catch (err) {
      const status = err.response?.status;
      const backendMsg = err.response?.data?.message || '';

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (status === 403 && backendMsg.toLowerCase().includes('locked')) {
        // Backend account locked
        setFailedAttempts(5);
        setErrorMsg(backendMsg);
      } else if (nextAttempts >= 5) {
        setErrorMsg('Account locked after 5 failed login attempts. Please contact the administrator or wait until the lock period expires.');
      } else {
        if (status === 401 || status === 403) {
          const attemptsLeft = 5 - nextAttempts;
          setErrorMsg(`Invalid username, password, or selected role. Attempts remaining: ${attemptsLeft}`);
        } else {
          setErrorMsg('Unable to connect to the server. Please try again.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid p-0 login-page-container">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="position-fixed bottom-0 end-0 p-3 z-50">
          <div className="toast show align-items-center text-white bg-success border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true" style={{ borderRadius: '12px' }}>
            <div className="d-flex p-3">
              <div className="toast-body d-flex align-items-center gap-2 font-semibold">
                <i className="bi bi-check-circle-fill fs-5"></i>
                <span>Welcome back, {successUsername}! Authenticating session...</span>
              </div>
              <button 
                type="button" 
                className="btn-close btn-close-white me-2 m-auto" 
                onClick={() => setShowSuccessToast(false)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="row g-0 min-vh-100">
        {/* Left Side: Welcome Panel (45% width on large viewports) */}
        <div className="col-12 col-lg-5 d-none d-lg-flex flex-column justify-content-between p-5 min-vh-100 position-relative border-end bg-light" style={{ borderRightColor: 'var(--odoo-border)' }}>
          {/* Animated Background Shapes */}
          <div className="position-absolute bg-purple bg-opacity-5 rounded-circle floating-shape-1" style={{ width: '150px', height: '150px', top: '8%', left: '10%', filter: 'blur(10px)' }} />
          <div className="position-absolute bg-teal bg-opacity-5 rounded-circle floating-shape-2" style={{ width: '240px', height: '240px', bottom: '12%', right: '8%', filter: 'blur(15px)' }} />

          {/* Logo brand */}
          <div className="d-flex align-items-center gap-2.5 z-3">
            <div 
              className="d-flex align-items-center justify-content-center rounded-3 text-white fw-bold shadow" 
              style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #714B67, #00A09D)' }}
            >
              T
            </div>
            <span className="fw-extrabold fs-5 tracking-wider login-text-primary">TransitOps</span>
          </div>

          {/* Central Illustrations & Value pitch */}
          <div className="my-auto py-4 z-3 text-start">
            <h1 className="fw-black display-6 login-text-primary mb-2 leading-tight">Welcome to TransitOps</h1>
            <p className="login-text-secondary fs-6 mb-4 font-semibold">Enterprise Fleet & Transport Management System</p>
            
            {/* Minimal Fleet Illustration */}
            <div className="my-4 py-3 text-center">
              <svg className="w-75 max-h-200" viewBox="0 0 24 24" fill="none" stroke="#714B67" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ height: '140px' }}>
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C20.3 11 19 10.3 17 10h-3v7h5z" />
                <path d="M14 17H5c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h9v10z" />
                <circle cx="7.5" cy="18.5" r="2.5" />
                <circle cx="16.5" cy="18.5" r="2.5" />
              </svg>
            </div>

            {/* Enterprise Feature Cards List */}
            <div className="d-flex flex-wrap gap-2 pt-3">
              <span className="feature-badge-item"><i className="bi bi-activity text-purple"></i> Fleet Monitoring</span>
              <span className="feature-badge-item"><i className="bi bi-geo-alt text-teal"></i> Vehicle Tracking</span>
              <span className="feature-badge-item"><i className="bi bi-people text-purple"></i> Driver Management</span>
              <span className="feature-badge-item"><i className="bi bi-fuel-pump text-teal"></i> Fuel Analytics</span>
              <span className="feature-badge-item"><i className="bi bi-tools text-purple"></i> Maintenance Scheduler</span>
              <span className="feature-badge-item"><i className="bi bi-bar-chart-line text-teal"></i> Reports & Analytics</span>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-muted small fw-semibold z-3">
            © {new Date().getFullYear()} TransitOps ERP. All rights reserved.
          </div>
        </div>

        {/* Right Side: Centered Authentication Card (55% width on large viewports) */}
        <div className="col-12 col-lg-7 d-flex flex-column align-items-center justify-content-center p-4 p-md-5">
          {/* Mobile Welcome Title (visible only on md/sm viewports) */}
          <div className="d-flex flex-column align-items-center d-lg-none text-center mb-4">
            <div 
              className="d-flex align-items-center justify-content-center rounded-3 text-white fw-bold shadow mb-2" 
              style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #714B67, #00A09D)' }}
            >
              T
            </div>
            <h1 className="fw-bold fs-3 mb-1 login-text-primary">Welcome to TransitOps</h1>
            <p className="text-muted small">Enterprise Fleet & Transport Management System</p>
          </div>

          {/* Authentication Card */}
          <div className="card login-glass-card w-100" style={{ maxWidth: '460px' }}>
            <div className="card-body p-4 p-md-5">
              <h2 className="fw-bold fs-4 mb-2 login-text-primary">Sign in to your account</h2>
              <p className="login-text-secondary small mb-4">Enter your credentials to continue</p>

              {/* Danger lockout/error alerts */}
              {errorMsg && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 text-xs font-semibold py-3 border-0" role="alert" style={{ borderRadius: '12px' }}>
                  <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form definition */}
              <form className="needs-validation" onSubmit={handleSubmit(onSubmit)} noValidate>
                
                {/* 1. Username/Email Input with Floating Label & Icon */}
                <div className="mb-3.5">
                  <label htmlFor="email" className="small fw-bold login-text-secondary text-uppercase mb-1.5" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0 border-slate-300" style={{ borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                      <i className="bi bi-envelope text-slate-500"></i>
                    </span>
                    <input 
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      disabled={failedAttempts >= 5}
                      className={`form-control border-start-0 py-2.5 text-xs font-semibold login-input-glow ${errors.email ? 'is-invalid' : ''}`}
                      style={{ borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}
                      {...register('email', { 
                        required: 'Email address is required',
                        pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address format' }
                      })}
                    />
                    {errors.email && (
                      <div className="invalid-feedback d-block mt-1 font-semibold text-xs text-danger">{errors.email.message}</div>
                    )}
                  </div>
                </div>

                {/* 2. Password Input with Floating Label & Visiblity Toggle Icon */}
                <div className="mb-3.5">
                  <label htmlFor="password" className="small fw-bold login-text-secondary text-uppercase mb-1.5" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0 border-slate-300" style={{ borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                      <i className="bi bi-lock text-slate-500"></i>
                    </span>
                    <input 
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      disabled={failedAttempts >= 5}
                      className={`form-control border-start-0 border-end-0 py-2.5 text-xs font-semibold login-input-glow ${errors.password ? 'is-invalid' : ''}`}
                      {...register('password', { required: 'Password is required' })}
                    />
                    <button
                      type="button"
                      disabled={failedAttempts >= 5}
                      onClick={() => setShowPassword(!showPassword)}
                      className="input-group-text bg-white border-start-0 border-slate-300 text-slate-400 hover:text-slate-700"
                      style={{ borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                    {errors.password && (
                      <div className="invalid-feedback d-block mt-1 font-semibold text-xs text-danger">{errors.password.message}</div>
                    )}
                  </div>
                </div>

                {/* 3. Role select dropdown */}
                <div className="mb-4">
                  <label htmlFor="role" className="small fw-bold login-text-secondary text-uppercase mb-1.5" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>Workspace Role</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0 border-slate-300" style={{ borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                      <i className="bi bi-shield-check text-slate-500"></i>
                    </span>
                    <select
                      id="role"
                      disabled={failedAttempts >= 5}
                      className={`form-select border-start-0 py-2.5 text-xs font-bold login-input-glow ${errors.role ? 'is-invalid' : ''}`}
                      style={{ borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}
                      {...register('role', { required: 'Selected workspace role is required' })}
                    >
                      <option value="">-- Choose Access Role --</option>
                      <option value="1">Fleet Manager</option>
                      <option value="2">Dispatcher</option>
                      <option value="3">Safety Officer</option>
                      <option value="4">Financial Analyst</option>
                    </select>
                    {errors.role && (
                      <div className="invalid-feedback d-block mt-1 font-semibold text-xs text-danger">{errors.role.message}</div>
                    )}
                  </div>
                </div>

                {/* Extra Options: Remember Me & Forgot Password */}
                <div className="d-flex align-items-center justify-content-between mb-4 font-semibold text-xs">
                  <div className="form-check">
                    <input 
                      id="remember"
                      type="checkbox"
                      disabled={failedAttempts >= 5}
                      className="form-check-input border-slate-350"
                      style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                    />
                    <label htmlFor="remember" className="form-check-label login-text-secondary select-none cursor-pointer" style={{ paddingLeft: '4px' }}>
                      Remember me
                    </label>
                  </div>
                  <button 
                    type="button"
                    className="btn btn-link p-0 text-decoration-none fw-bold"
                    style={{ color: 'var(--odoo-secondary)', fontSize: '12px' }}
                    onClick={() => alert('Demo account credentials:\n\n- Fleet Manager: manager@transitops.com\n- Dispatcher: driver@transitops.com\n- Safety Officer: safety@transitops.com\n- Financial Analyst: finance@transitops.com\n\nPassword: Password123')}
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={submitting || failedAttempts >= 5}
                  className="btn btn-odoo-gradient w-100 rounded-pill d-flex align-items-center justify-content-center gap-2 text-white fw-bold"
                  style={{ height: '52px' }}
                >
                  {submitting && (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  )}
                  <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
