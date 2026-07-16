import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Award, CheckSquare, Clock, ArrowRight, Activity, Smile, Loader } from 'lucide-react';
import gsap from 'gsap';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    enrolledCount: 0,
    completedCount: 0,
    certificatesCount: 0,
    totalTime: 0
  });

  const containerRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    if (user && (user.role === 'mentor' || user.role === 'admin')) {
      navigate('/mentor/courses');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setError('');
        // 1. Fetch user's enrollments from backend API
        const enrollmentsRes = await client.get('/my-courses/');
        const enrollments = enrollmentsRes.data;

        // 2. Fetch all courses to cross-reference general details (mentor name, category, etc.)
        const coursesRes = await client.get('/courses/');
        const allCourses = coursesRes.data;

        // 3. For each enrollment, fetch its progress dynamically from the progress API
        const courseProgressPromises = enrollments.map(async (enrollment) => {
          try {
            const progressRes = await client.get(`/courses/${enrollment.course}/progress/`);
            const courseDetails = allCourses.find(c => c.id === enrollment.course) || {};
            return {
              ...enrollment,
              ...progressRes.data,
              mentor_name: courseDetails.mentor_name || 'Expert Instructor',
              category_name: courseDetails.category_name || 'Syllabus',
            };
          } catch (progressErr) {
            console.error(`Error loading progress for course ${enrollment.course}:`, progressErr);
            return null;
          }
        });

        const completedCourseData = (await Promise.all(courseProgressPromises)).filter(Boolean);
        setEnrolledCourses(completedCourseData);

        // Calculate statistics
        const enrolledCount = completedCourseData.length;
        const completedCount = completedCourseData.reduce((acc, c) => acc + (c.completed_lessons || 0), 0);
        const certificatesCount = completedCourseData.filter(c => c.progress === 100).length;
        const totalTime = completedCount * 15; // Estimate 15 min per completed lesson

        setStats({
          enrolledCount,
          completedCount,
          certificatesCount,
          totalTime
        });

        // 4. Fetch purchase history
        try {
          const paymentsRes = await client.get('/payments/history/');
          setPayments(paymentsRes.data);
        } catch (payErr) {
          console.error('Error fetching payments history:', payErr);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to fetch enrolled courses from the database. Please ensure you are logged in as a student.');
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      const ctx = gsap.context(() => {
        gsap.fromTo(containerRef.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
        if (cardsRef.current) {
          gsap.fromTo(cardsRef.current.children, 
            { scale: 0.9, opacity: 0 }, 
            { scale: 1, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(1.2)' }
          );
        }
      });
      return () => ctx.revert();
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-73px)] items-center justify-center bg-darkBg text-white">
        <Loader className="h-10 w-10 animate-spin text-accent-blue" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-darkBg text-white px-6 py-10 max-w-7xl mx-auto w-full">
      
      {/* Header Profile Summary */}
      <div className="glass rounded-3xl p-8 border border-white/5 shadow-xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-accent-blue/10 blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-accent-blue to-accent-violet flex items-center justify-center font-bold text-2xl text-white uppercase border border-white/10 shadow-lg">
            {user?.username?.substring(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              Hello, {user?.username || 'Student'} <Smile className="h-6 w-6 text-yellow-400" />
            </h1>
            <p className="text-xs text-slate-400">
              Welcome back to your database classroom dashboard. Monitor your learning metrics and resume modules.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        
        <div className="glass p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-accent-blue/20 transition-all">
          <div className="bg-accent-blue/15 p-3 rounded-xl text-accent-blue">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold">{stats.enrolledCount}</p>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Courses</span>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-accent-violet/20 transition-all">
          <div className="bg-accent-violet/15 p-3 rounded-xl text-accent-violet">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold">{stats.completedCount}</p>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Completed Lessons</span>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-accent-emerald/20 transition-all">
          <div className="bg-accent-emerald/15 p-3 rounded-xl text-accent-emerald">
            <Award className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold">{stats.certificatesCount}</p>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Certificates Earned</span>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-accent-indigo/20 transition-all">
          <div className="bg-accent-indigo/15 p-3 rounded-xl text-accent-indigo">
            <Clock className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold">{stats.totalTime} min</p>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Study Time</span>
          </div>
        </div>

      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-lg mx-auto text-center mb-8">
          {error}
        </div>
      )}

      {/* Main Sections: Course Progression List */}
      <div>
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent-blue" />
          My Course Progression
        </h2>

        {enrolledCourses.length === 0 ? (
          <div className="text-center py-16 glass border-dashed border-white/5 rounded-3xl max-w-lg mx-auto">
            <BookOpen className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-4">You are not enrolled in any courses yet.</p>
            <Link
              to="/"
              className="bg-gradient-to-r from-accent-blue to-accent-indigo hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl"
            >
              Explore Course Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrolledCourses.map((course) => {
              return (
                <div 
                  key={course.id} 
                  className="glass rounded-3xl p-6 border border-white/5 shadow-md flex flex-col justify-between hover:border-accent-blue/30 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent-blue/5 blur-2xl pointer-events-none"></div>
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                        {course.category_name}
                      </span>
                      <span className="text-xs font-bold text-accent-blue flex items-center gap-1.5">
                        {course.progress === 100 && <Award className="h-4.5 w-4.5 text-yellow-400" />}
                        {course.progress}% Completed
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1.5">{course.course}</h3>
                    <p className="text-xs text-slate-400 mb-4">Instructor: {course.mentor_name}</p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-accent-blue to-accent-violet h-full rounded-full transition-all duration-500" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <Link
                    to={`/courses/${course.course}`}
                    className="w-full bg-slate-900 hover:bg-accent-blue hover:text-white border border-white/5 hover:border-accent-blue text-slate-300 text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all mt-auto"
                  >
                    <span>Continue Learning</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase Receipts & History Section */}
      <div className="mt-12 pt-10 border-t border-white/5">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Award className="h-5 w-5 text-emerald-400" />
          Purchase Receipts & History
        </h2>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No course purchases recorded yet.</p>
        ) : (
          <div className="glass rounded-3xl border border-white/5 overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  <th className="px-6 py-4">Course Name</th>
                  <th className="px-6 py-4">Transaction Ref</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{payment.course_title}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">#{payment.id}</td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">${payment.amount} {payment.currency}</td>
                    <td className="px-6 py-4">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
