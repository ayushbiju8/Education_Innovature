import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { 
  BookOpen, User, PlusCircle, LogOut, Compass, FileText, Send, 
  Sparkles, LayoutDashboard, Settings, Mail, Phone, Info, Loader,
  Bell, Check
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, applyForMentor, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mentor Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyBio, setApplyBio] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState({ type: '', text: '' });

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await client.get('/notifications/');
      setNotifications(res.data);
      const unread = res.data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 30 seconds for dynamic updates
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkNotificationRead = async (id) => {
    try {
      await client.patch(`/notifications/${id}/read/`);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleOpenProfileModal = () => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setProfileEmail(user.email || '');
      setPhoneNumber(user.phone_number || '');
      setBio(user.bio || '');
      setIsEditingProfile(false);
      setProfileMessage({ type: '', text: '' });
      setShowProfileModal(true);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage({ type: '', text: '' });
    try {
      await client.put('/auth/profile/', {
        first_name: firstName,
        last_name: lastName,
        email: profileEmail,
        phone_number: phoneNumber,
        bio: bio
      });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      await fetchProfile(); // refresh auth context user details
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileMessage({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      console.error(err);
      setProfileMessage({
        type: 'error',
        text: err.response?.data?.email?.[0] || err.response?.data?.detail || 'Failed to update profile.'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyBio.trim()) return;
    setApplyLoading(true);
    setApplyMessage({ type: '', text: '' });
    try {
      await applyForMentor(applyBio);
      setApplyMessage({ type: 'success', text: 'Application submitted successfully! Wait for Admin approval.' });
      setApplyBio('');
      await fetchProfile();
      setTimeout(() => {
        setShowApplyModal(false);
        setApplyMessage({ type: '', text: '' });
      }, 3000);
    } catch (err) {
      setApplyMessage({
        type: 'error',
        text: err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to submit application. You may already have a pending/approved application.'
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl tracking-wider">
          <div className="bg-gradient-to-tr from-accent-blue to-accent-violet p-2 rounded-lg text-white shadow-md shadow-accent-indigo/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="bg-gradient-to-r from-white via-slate-200 to-accent-indigo bg-clip-text text-transparent">
            Innovature
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            to="/"
            className={`flex items-center gap-1.5 transition-colors ${
              isActive('/') ? 'text-accent-blue' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="h-4 w-4" />
            Explore Courses
          </Link>

          {user && (
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/dashboard') ? 'text-accent-blue' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          )}

          {user && user.role === 'mentor' && (
            <>
              <Link
                to="/mentor/courses"
                className={`flex items-center gap-1.5 transition-colors ${
                  isActive('/mentor/courses') ? 'text-accent-violet' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4" />
                My Courses
              </Link>
              <Link
                to="/courses/create"
                className={`flex items-center gap-1.5 transition-colors ${
                  isActive('/courses/create') ? 'text-accent-emerald' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                Create Course
              </Link>
            </>
          )}

          {user && user.role === 'student' && (
            <button
              onClick={() => setShowApplyModal(true)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-accent-violet transition-colors font-medium text-sm"
            >
              <Sparkles className="h-4 w-4" />
              Apply as Mentor
            </button>
          )}
        </div>

        {/* User Info / Notifications / Auth CTA */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4 relative">
              
              {/* Notifications Icon */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-all relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[9px] h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown menu */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 glass border border-white/10 rounded-2xl p-4 shadow-2xl z-50 text-left space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="text-xs font-bold text-slate-300">Notifications</span>
                      <span className="text-[10px] text-slate-500 font-mono">{unreadCount} Unread</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-[11px] text-slate-500 py-4 text-center">No alerts recorded.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-2.5 rounded-xl border transition-all text-xs flex justify-between items-start gap-2 ${
                              notif.is_read
                                ? 'bg-slate-950/20 border-white/5 opacity-60'
                                : 'bg-accent-blue/5 border-accent-blue/25'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <p className="font-semibold text-white text-[11px]">{notif.title}</p>
                              <p className="text-[10px] text-slate-400 leading-normal">{notif.message}</p>
                            </div>
                            {!notif.is_read && (
                              <button
                                onClick={() => handleMarkNotificationRead(notif.id)}
                                className="p-1 rounded bg-accent-blue/15 hover:bg-accent-blue/30 text-accent-blue transition-colors"
                                title="Mark read"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User settings clickable */}
              <button 
                onClick={handleOpenProfileModal}
                className="text-right hidden sm:block hover:opacity-85 transition-opacity text-left"
              >
                <p className="text-sm font-semibold text-white">{user.username}</p>
                <span className={`text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded border ${
                  user.role === 'admin'
                    ? 'text-accent-blue bg-accent-blue/10 border-accent-blue/20'
                    : user.role === 'mentor'
                    ? 'text-accent-violet bg-accent-violet/10 border-accent-violet/20'
                    : 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20'
                }`}>
                  {user.role}
                </span>
              </button>

              {/* Avatar Clickable */}
              <button 
                onClick={handleOpenProfileModal}
                className="h-10 w-10 rounded-full border border-white/10 overflow-hidden bg-slate-800 flex items-center justify-center text-slate-300 font-bold uppercase hover:border-accent-blue/50 transition-colors"
                title="View Profile Details"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-slate-300 hover:text-white px-4 py-2 text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-accent-blue to-accent-indigo hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all border border-blue-400/20"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Profile Details & Editing Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg glass rounded-2xl p-6 border border-white/10 shadow-2xl relative">
            <button
              onClick={() => {
                setShowProfileModal(false);
                setIsEditingProfile(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              &times;
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-accent-blue/20 p-2.5 rounded-lg text-accent-blue">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Profile Settings</h2>
                <p className="text-xs text-slate-400">View and customize your account parameters.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 disabled:opacity-60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 disabled:opacity-60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-blue transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="email"
                    required
                    disabled={!isEditingProfile}
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 disabled:opacity-60 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-accent-blue transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +1 555-0199"
                    className="w-full bg-slate-900 border border-white/5 disabled:opacity-60 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-accent-blue transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Biographical Bio</label>
                <div className="relative">
                  <span className="absolute top-2.5 left-3.5 text-slate-500">
                    <Info className="h-3.5 w-3.5" />
                  </span>
                  <textarea
                    rows={3}
                    disabled={!isEditingProfile}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="w-full bg-slate-900 border border-white/5 disabled:opacity-60 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-accent-blue transition-all resize-none"
                  />
                </div>
              </div>

              {profileMessage.text && (
                <div className={`p-3 rounded-xl text-xs font-semibold border ${
                  profileMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {profileMessage.text}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                  Role: {user.role}
                </span>

                <div className="flex gap-2">
                  {isEditingProfile ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="bg-accent-blue hover:bg-blue-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition-all flex items-center gap-1"
                      >
                        {profileLoading && <Loader className="h-3 w-3 animate-spin" />}
                        Save Details
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-4 py-2 rounded-lg border border-white/10 transition-all"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mentor Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg glass rounded-2xl p-6 border border-white/10 shadow-2xl relative">
            <button
              onClick={() => {
                setShowApplyModal(false);
                setApplyMessage({ type: '', text: '' });
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              &times;
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-violet/20 p-2 rounded-lg text-accent-violet">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-white">Apply to become a Mentor</h2>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Share your teaching credentials, expertise, or background. Once submitted, an administrator will review your application to grant you access to course creation.
            </p>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Application Bio / Details
                </label>
                <textarea
                  required
                  rows={5}
                  value={applyBio}
                  onChange={(e) => setApplyBio(e.target.value)}
                  placeholder="Tell us about your background, subjects you want to teach, and why you should be approved..."
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-violet transition-colors resize-none"
                />
              </div>

              {applyMessage.text && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  applyMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {applyMessage.text}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplyModal(false);
                    setApplyMessage({ type: '', text: '' });
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLoading}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-accent-violet to-accent-indigo hover:from-violet-600 hover:to-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg transition-all disabled:opacity-50"
                >
                  {applyLoading ? 'Submitting...' : 'Submit Application'}
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
