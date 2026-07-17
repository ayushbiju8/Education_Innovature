import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Edit3, Eye, PlusCircle, CheckCircle, FileText, ArrowRight, DollarSign, Calendar, Loader } from 'lucide-react';
import gsap from 'gsap';

const MyCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const listRef = useRef(null);

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        setError('');
        const res = await client.get('/courses/');
        if (user?.role === 'admin') {
          setCourses(res.data);
        } else {
          // Filter courses created by this mentor
          const myFiltered = res.data.filter(
            (course) => Number(course.mentor) === Number(user?.id)
          );
          setCourses(myFiltered);
        }
      } catch (err) {
        console.error('Error fetching my courses:', err);
        setError('Failed to fetch courses. Please check connection.');
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchMyCourses();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && courses.length > 0) {
      const ctx = gsap.context(() => {
        gsap.fromTo(listRef.current.children, 
          { y: 30, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out' }
        );
      });
      return () => ctx.revert();
    }
  }, [loading, courses]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-73px)] items-center justify-center bg-darkBg text-white">
        <Loader className="h-10 w-10 animate-spin text-accent-violet" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkBg text-white px-6 py-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white to-accent-violet bg-clip-text text-transparent">
            My Created Courses
          </h1>
          <p className="text-sm text-slate-400">
            Manage your catalog, edit materials, and monitor draft configurations.
          </p>
        </div>

        <Link
          to="/courses/create"
          className="flex items-center gap-2 bg-gradient-to-r from-accent-violet to-accent-indigo hover:from-violet-600 hover:to-indigo-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg transition-all border border-violet-400/20"
        >
          <PlusCircle className="h-4 w-4" />
          Create New Course
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-lg mx-auto text-center mb-8">
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl border border-white/5 max-w-lg mx-auto">
          <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4 animate-bounce" />
          <p className="text-slate-400 font-medium mb-6">You haven't created any courses yet.</p>
          <Link
            to="/courses/create"
            className="text-xs font-semibold text-accent-violet hover:underline inline-flex items-center gap-1"
          >
            Create your first course <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div 
          ref={listRef} 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {courses.map((course) => (
            <div 
              key={course.id}
              className="glass rounded-3xl p-6 border border-white/5 shadow-md flex flex-col justify-between hover:border-accent-violet/30 transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent-violet/5 blur-2xl pointer-events-none"></div>
              
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                    {course.category_name || 'Subject'}
                  </span>
                  
                  {course.is_published ? (
                    <span className="flex items-center gap-1 text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle className="h-2.5 w-2.5" /> Published
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Draft
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-accent-violet transition-colors">
                  {course.title}
                </h3>
                
                <p className="text-sm text-slate-400 mb-6 line-clamp-3 leading-relaxed">
                  {course.description}
                </p>

                <div className="space-y-2 mb-6 text-xs text-slate-400 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <span>Price: <strong className="text-white">${course.price}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span>Created: {new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 border-t border-white/5 pt-4 mt-auto">
                <Link
                  to={`/courses/${course.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </Link>
                
                <Link
                  to={`/courses/edit/${course.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl bg-accent-violet/10 hover:bg-accent-violet hover:text-white text-accent-violet border border-accent-violet/20 transition-all"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Syllabus
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
