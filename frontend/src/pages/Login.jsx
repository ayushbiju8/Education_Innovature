import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, Loader } from 'lucide-react';
import gsap from 'gsap';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const titleRef = useRef(null);
  const formRef = useRef(null);

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    // GSAP load animation
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      gsap.fromTo(cardRef.current, 
        { y: 50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      );
      gsap.fromTo(titleRef.current, 
        { scale: 0.9, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.8, delay: 0.2, ease: 'back.out(1.7)' }
      );
      gsap.fromTo(formRef.current.children, 
        { y: 20, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.3, ease: 'power2.out' }
      );
    });
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Invalid username or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-darkBg px-4 py-12"
    >
      <div 
        ref={cardRef} 
        className="w-full max-w-md glass rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-accent-blue/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-accent-violet/10 blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <h2 
            ref={titleRef} 
            className="text-3xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white via-slate-100 to-accent-indigo bg-clip-text text-transparent"
          >
            Welcome Back
          </h2>
          <p className="text-sm text-slate-400">
            Sign in to continue your learning journey
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-2xl text-xs font-medium animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue transition-colors focus:ring-1 focus:ring-accent-blue/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue transition-colors focus:ring-1 focus:ring-accent-blue/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-accent-blue to-accent-indigo hover:from-blue-600 hover:to-indigo-600 active:scale-97 text-white font-semibold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="premium-spinner-sm"></div>
            ) : 'Sign In'}
          </button>

          <p className="text-center text-xs text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-blue hover:underline font-semibold">
              Register here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
