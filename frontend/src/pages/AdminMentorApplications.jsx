import React, { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, CheckCircle2, XCircle, Clock, Calendar, Mail, 
  User, FileText, AlertCircle, Loader, ShieldAlert, ArrowLeft
} from 'lucide-react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';

const AdminMentorApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  const containerRef = useRef(null);
  const listRef = useRef(null);

  const fetchApplications = async () => {
    try {
      setError('');
      const res = await client.get('/auth/admin/mentor-applications/');
      setApplications(res.data);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to fetch mentor application requests from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchApplications();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && applications.length > 0) {
      const ctx = gsap.context(() => {
        gsap.fromTo(containerRef.current, 
          { opacity: 0, y: 20 }, 
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
        );
        if (listRef.current) {
          gsap.fromTo(listRef.current.children, 
            { opacity: 0, scale: 0.95, y: 15 }, 
            { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out' }
          );
        }
      });
      return () => ctx.revert();
    }
  }, [loading, filter, applications]);

  const handleDecision = async (appId, decision) => {
    try {
      setError('');
      await client.post(`/auth/admin/mentor-applications/${appId}/decide/`, {
        status: decision
      });
      
      // Update local state smoothly
      setApplications(prev => 
        prev.map(app => 
          app.id === appId 
            ? { ...app, status: decision, reviewed_at: new Date().toISOString() } 
            : app
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to update application decision.');
    }
  };

  const filteredApps = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-73px)] items-center justify-center bg-darkBg text-white">
        <div className="premium-spinner"></div>
      </div>
    );
  }

  // Double check admin role
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-darkBg flex flex-col items-center justify-center text-white px-6">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-400 mb-6 text-sm text-center max-w-sm">
          You must be logged in as an Administrator to view and moderate mentor requests.
        </p>
        <Link to="/" className="text-xs font-semibold text-accent-blue hover:underline">
          Return to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-darkBg text-white px-6 py-10 max-w-5xl mx-auto w-full">
      {/* Back to Catalog / Dashboard */}
      <Link 
        to="/mentor/courses" 
        className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider mb-6"
      >
        <ArrowLeft className="h-4.5 w-4.5" /> Back to Admin Console
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white to-accent-blue bg-clip-text text-transparent">
            Mentor Candidate Applications
          </h1>
          <p className="text-sm text-slate-400">
            Review applicant biographies and decide to grant mentor teaching access.
          </p>
        </div>

        {/* Tab / Filter selection */}
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                filter === status
                  ? 'bg-gradient-to-r from-accent-blue to-accent-indigo text-white border-transparent shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white border-transparent'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-lg mx-auto text-center mb-8 flex items-center justify-center gap-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {filteredApps.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl border border-white/5 max-w-lg mx-auto">
          <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium text-sm">No mentor requests found under this category.</p>
        </div>
      ) : (
        <div ref={listRef} className="space-y-6">
          {filteredApps.map((app) => (
            <div 
              key={app.id} 
              className="glass rounded-3xl p-6 border border-white/5 hover:border-white/10 shadow-md relative overflow-hidden transition-all flex flex-col justify-between"
            >
              {/* Top Banner indicating status */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-white/5 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-extrabold uppercase border border-white/5">
                    {app.user?.username?.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      {app.user?.username} 
                      <span className="text-[10px] text-slate-500 font-normal">Candidate ID #{app.user?.id}</span>
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {app.user?.email}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Applied: {new Date(app.applied_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {app.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock className="h-3.5 w-3.5" /> Pending Review
                    </span>
                  ) : app.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                      <XCircle className="h-3.5 w-3.5" /> Rejected
                    </span>
                  )}
                </div>
              </div>

              {/* Justification details */}
              <div className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl mb-6">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-accent-blue" />
                  Candidate Background & Justification:
                </p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                  {app.bio}
                </p>
              </div>

              {/* Decide Buttons (if pending) */}
              {app.status === 'pending' && (
                <div className="flex gap-3 justify-end pt-2 border-t border-white/5 mt-auto">
                  <button
                    onClick={() => handleDecision(app.id, 'rejected')}
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-red-500/15 transition-all"
                  >
                    <XCircle className="h-4 w-4" /> Reject Candidate
                  </button>
                  <button
                    onClick={() => handleDecision(app.id, 'approved')}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve Mentor Access
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMentorApplications;
