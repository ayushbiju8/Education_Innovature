import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Mail, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import gsap from 'gsap';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const titleRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
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
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, delay: 0.3, ease: 'power2.out' }
      );
    });
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validations
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setError('Username must be alphanumeric (letters and numbers only).');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      if (data) {
        // Build readable error message from DRF validation dictionary
        const messages = [];
        for (const key in data) {
          if (Array.isArray(data[key])) {
            messages.push(`${key}: ${data[key].join(' ')}`);
          } else if (typeof data[key] === 'string') {
            messages.push(data[key]);
          }
        }
        setError(messages.join(' | ') || 'Registration failed. Try again.');
      } else {
        setError('Connection error. Please try again later.');
      }
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
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-accent-violet/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-accent-blue/10 blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <h2 
            ref={titleRef} 
            className="text-3xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white via-slate-100 to-accent-indigo bg-clip-text text-transparent"
          >
            Create Account
          </h2>
          <p className="text-sm text-slate-400">
            Sign up to begin custom learning experiences
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-2xl text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-2xl text-xs font-medium">
            <CheckCircle className="h-4 w-4 shrink-0 animate-bounce" />
            <span>{success}</span>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
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
                placeholder="Alphanumeric name"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-violet transition-colors focus:ring-1 focus:ring-accent-violet/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-violet transition-colors focus:ring-1 focus:ring-accent-violet/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
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
                placeholder="Min 8 characters"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-violet transition-colors focus:ring-1 focus:ring-accent-violet/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retype password"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-violet transition-colors focus:ring-1 focus:ring-accent-violet/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-accent-violet to-accent-indigo hover:from-violet-600 hover:to-indigo-600 text-white font-semibold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : 'Create Account'}
          </button>

          <p className="text-center text-xs text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-violet hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
