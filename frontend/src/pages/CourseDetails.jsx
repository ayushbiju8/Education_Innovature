import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import client, { API_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, User, DollarSign, Calendar, ChevronDown, ChevronRight, 
  Video, FileText, CheckCircle, ArrowLeft, PlayCircle, Loader, 
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, 
  Sparkles, Eye, Download, Image as ImageIcon, Star, Trash2, Award
} from 'lucide-react';
import gsap from 'gsap';

const CourseDetails = () => {
  const { id } = useParams();
  const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${API_URL}${path}`;
  };

  const { user } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Interaction states
  const [expandedModules, setExpandedModules] = useState({});
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('lessons');
  
  // Chat Discussion states
  const [discussionQuestions, setDiscussionQuestions] = useState([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [replyTexts, setReplyTexts] = useState({});
  const socketRef = useRef(null);
  const discussionEndRef = useRef(null);

  // Dynamic progress & checkmarks (DB-driven)
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [certificateData, setCertificateData] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Reviews states
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Dynamic assets display
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [activeVideoTitle, setActiveVideoTitle] = useState('');
  const [textFileContents, setTextFileContents] = useState({});
  const [expandedImage, setExpandedImage] = useState(null);

  // Custom Video Player controls state
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const isAccessAllowed = isEnrolled || user?.role === 'mentor' || user?.role === 'admin';

  const detailsRef = useRef(null);
  const syllabusRef = useRef(null);

  const fetchProgress = async () => {
    if (!user) return;
    try {
      const progressRes = await client.get(`/courses/${id}/progress/`);
      setProgressPercent(progressRes.data.progress || 0);
      setCompletedLessonIds(progressRes.data.completed_lesson_ids || []);
      setCertificateData(progressRes.data.certificate || null);
    } catch (progressErr) {
      // If 403 Forbidden is returned, it means the user is not enrolled yet.
      setIsEnrolled(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const reviewsRes = await client.get(`/courses/${id}/reviews/`);
      setReviews(reviewsRes.data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const fetchCourseDetails = async () => {
    try {
      setError('');
      const res = await client.get(`/courses/${id}/`);
      setCourse(res.data);
      
      // Fetch modules and lessons
      const modulesRes = await client.get(`/courses/${id}/modules/`);
      setModules(modulesRes.data);

      // Pre-expand first module
      if (modulesRes.data.length > 0) {
        setExpandedModules({ [modulesRes.data[0].id]: true });
        if (modulesRes.data[0].lessons?.length > 0) {
          setSelectedLesson(modulesRes.data[0].lessons[0]);
        }
      }

      // Check enrollment from DB
      if (user && user.role === 'student') {
        try {
          const enrollmentsRes = await client.get('/my-courses/');
          const enrolled = enrollmentsRes.data.some(
            (enrollment) => Number(enrollment.course) === Number(id)
          );
          setIsEnrolled(enrolled);
          if (enrolled) {
            await fetchProgress();
          }
        } catch (enrollErr) {
          console.error("Error checking student enrollment:", enrollErr);
        }
      } else if (user && (user.role === 'mentor' || user.role === 'admin')) {
        setIsEnrolled(true);
      }

      // Fetch reviews
      await fetchReviews();

    } catch (err) {
      console.error('Error fetching course details:', err);
      setError('Failed to load course details. It may be unpublished or offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseDetails();
  }, [id, user]);

  // Load text file contents inline
  useEffect(() => {
    if (selectedLesson) {
      // Find first video attachment if exist
      const videoAttach = selectedLesson.attachments?.find(
        (a) => a.file.toLowerCase().endsWith('.mp4') || a.file.toLowerCase().endsWith('.webm')
      );
      if (videoAttach) {
        setActiveVideoUrl(getMediaUrl(videoAttach.file));
        setActiveVideoTitle(videoAttach.title);
      } else {
        setActiveVideoUrl('');
        setActiveVideoTitle('');
      }

      selectedLesson.attachments?.forEach(async (attach) => {
        if (attach.file.toLowerCase().endsWith('.txt')) {
          try {
            const res = await fetch(getMediaUrl(attach.file));
            const text = await res.text();
            setTextFileContents(prev => ({ ...prev, [attach.id]: text }));
          } catch (err) {
            console.error("Error fetching text attachment:", err);
          }
        }
      });
    }
  }, [selectedLesson]);

  useEffect(() => {
    if (!loading && course) {
      const ctx = gsap.context(() => {
        gsap.fromTo(detailsRef.current, 
          { x: -30, opacity: 0 }, 
          { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
        );
        gsap.fromTo(syllabusRef.current, 
          { x: 30, opacity: 0 }, 
          { x: 0, opacity: 1, duration: 0.6, delay: 0.1, ease: 'power2.out' }
        );
      });
      return () => ctx.revert();
    }
  }, [loading, course]);

  // Custom Video Player functions
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleSkip = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        Math.max(0, videoRef.current.currentTime + seconds),
        duration
      );
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen(); // Safari
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen(); // IE11
      }
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleEnroll = async () => {
    if (!user) {
      setError('Please log in to purchase or enroll in this course.');
      return;
    }
    setEnrollLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Step 1: Create Order on backend
      const orderRes = await client.post('/payments/create-order/', {
        course_id: Number(id)
      });
      
      const orderData = orderRes.data;
      
      // Step 2: Handle Free Courses
      if (orderData.is_free) {
        setIsEnrolled(true);
        await fetchProgress();
        setSuccess('Successfully enrolled in this free course!');
        setTimeout(() => setSuccess(''), 4000);
        return;
      }
      
      // Step 3: Load Razorpay SDK script dynamically
      let scriptLoaded = false;
      try {
        scriptLoaded = await loadRazorpayScript();
      } catch (err) {
        console.error("Failed to load Razorpay SDK:", err);
      }

      if (!scriptLoaded || orderData.is_mock) {
        // Fallback: Simulation mode for offline or mock testing
        const confirmPay = window.confirm(
          `[Development Mode] Simulated Checkout\n\nCourse: ${course.title}\nPrice: $${course.price}\n\nClick OK to simulate successful payment.`
        );
        if (confirmPay) {
          try {
            await client.post('/payments/verify/', {
              razorpay_order_id: orderData.order_id,
              razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(7)}`,
              razorpay_signature: 'sig_mock_signature'
            });
            setIsEnrolled(true);
            await fetchProgress();
            setSuccess('Payment verification simulated successfully! Welcome to the course.');
            setTimeout(() => setSuccess(''), 5000);
          } catch (verifyErr) {
            console.error(verifyErr);
            setError(verifyErr.response?.data?.detail || 'Payment verification failed.');
          } finally {
            setEnrollLoading(false);
          }
        } else {
          setEnrollLoading(false);
        }
        return;
      }
      
      // Step 4: Open Razorpay checkout options popup
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Innovature E-Learning",
        description: `Purchase Course: ${course.title}`,
        order_id: orderData.order_id,
        prefill: {
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
          email: user.email,
          contact: user.phone_number || ''
        },
        theme: {
          color: "#6366f1"
        },
        handler: async function (paymentResponse) {
          setEnrollLoading(true);
          try {
            // Step 5: Verify Payment Signature on backend
            await client.post('/payments/verify/', {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature
            });
            
            setIsEnrolled(true);
            await fetchProgress();
            setSuccess('Payment verification successful! Welcome to the course.');
            setTimeout(() => setSuccess(''), 5000);
          } catch (verifyErr) {
            console.error(verifyErr);
            setError(verifyErr.response?.data?.detail || 'Payment verification failed.');
          } finally {
            setEnrollLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setEnrollLoading(false);
          }
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.non_field_errors?.[0] || 
        'Failed to initiate enrollment checkout.'
      );
      setEnrollLoading(false);
    }
  };

  // Toggle lesson completion state (DB-driven)
  const handleToggleLessonCompleted = async (lessonId) => {
    try {
      // Call backend POST /api/lessons/{id}/complete/
      await client.post(`/lessons/${lessonId}/complete/`);
      await fetchProgress();
    } catch (err) {
      console.error(err);
      // Already completed or validation error
    }
  };

  // Submit course review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');
    try {
      await client.post(`/courses/${id}/reviews/`, {
        rating: reviewRating,
        comment: reviewComment
      });
      setReviewSuccess('Review posted successfully!');
      setReviewComment('');
      await fetchReviews();
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      setReviewError(
        data?.non_field_errors?.[0] || 
        data?.detail || 
        'Failed to save review. Mentors cannot review their own course, and students must be enrolled.'
      );
    }
  };

  // Delete review
  const handleDeleteReview = async (reviewId) => {
    try {
      await client.delete(`/reviews/${reviewId}/`);
      await fetchReviews();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChatHistory = async () => {
    setDiscussionLoading(true);
    try {
      const res = await client.get(`/courses/${id}/chat-history/`);
      setDiscussionQuestions(res.data);
      setTimeout(() => discussionEndRef.current?.scrollIntoView({ behavior: 'auto' }), 200);
    } catch (err) {
      console.error("Error fetching chat history:", err);
    } finally {
      setDiscussionLoading(false);
    }
  };

  const handleSendQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !socketRef.current) return;
    
    const payload = {
      type: 'question',
      content: newQuestionText.trim()
    };
    socketRef.current.send(JSON.stringify(payload));
    setNewQuestionText('');
  };

  const handleSendReply = (e, questionId) => {
    e.preventDefault();
    const replyText = replyTexts[questionId];
    if (!replyText || !replyText.trim() || !socketRef.current) return;

    const payload = {
      type: 'answer',
      question_id: questionId,
      content: replyText.trim()
    };
    socketRef.current.send(JSON.stringify(payload));
    
    setReplyTexts(prev => ({
      ...prev,
      [questionId]: ''
    }));
  };

  useEffect(() => {
    if (activeTab === 'discussion' && isAccessAllowed) {
      fetchChatHistory();

      const token = localStorage.getItem('token') || '';
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      
      const backendHost = API_URL ? API_URL.replace(/^https?:\/\//, '') : 'localhost:8000';
      const wsUrl = `${protocol}://${backendHost}/ws/chat/course/${id}/?token=${token}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected to discussion room.");
      };

      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === 'question') {
          setDiscussionQuestions(prev => {
            if (prev.some(q => q.id === payload.id)) return prev;
            return [...prev, {
              id: payload.id,
              sender: payload.sender,
              title: payload.content.substring(0, 50),
              content: payload.content,
              answers: [],
              created_at: payload.timestamp
            }];
          });
          setTimeout(() => discussionEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } else if (payload.type === 'answer') {
          setDiscussionQuestions(prev => {
            return prev.map(q => {
              if (q.id === payload.question_id) {
                if (q.answers.some(a => a.id === payload.id)) return q;
                return {
                  ...q,
                  answers: [...q.answers, {
                    id: payload.id,
                    sender: payload.sender,
                    content: payload.content,
                    created_at: payload.timestamp
                  }]
                };
              }
              return q;
            });
          });
          setTimeout(() => discussionEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket discussion room error:", err);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed.");
      };

      return () => {
        if (ws) {
          ws.close();
        }
      };
    }
  }, [activeTab, id, isAccessAllowed]);

  // Determine lesson icon based on its contents
  const getLessonIcon = (lesson) => {
    if (completedLessonIds.includes(lesson.id)) {
      return <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />;
    }

    const hasVideo = 
      lesson.video_url || 
      lesson.attachments?.some(a => a.file.toLowerCase().endsWith('.mp4') || a.file.toLowerCase().endsWith('.webm'));
    
    if (hasVideo) {
      return <Video className="h-4 w-4 shrink-0 text-accent-blue" />;
    }

    const hasText = lesson.attachments?.some(a => a.file.toLowerCase().endsWith('.txt'));
    if (hasText) {
      return <FileText className="h-4 w-4 shrink-0 text-accent-violet" />;
    }

    return <PlayCircle className="h-4 w-4 shrink-0 text-slate-400" />;
  };
  

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-73px)] items-center justify-center bg-darkBg text-white">
        <Loader className="h-10 w-10 animate-spin text-accent-blue" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-darkBg text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-400 font-semibold text-lg mb-4">{error || 'Course not found'}</p>
        <Link to="/" className="flex items-center gap-2 text-accent-blue hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  // Group files by type
  const attachments = selectedLesson?.attachments || [];
  const imageAttachments = attachments.filter(a => 
    a.file.toLowerCase().endsWith('.png') || 
    a.file.toLowerCase().endsWith('.jpg') || 
    a.file.toLowerCase().endsWith('.jpeg') || 
    a.file.toLowerCase().endsWith('.gif')
  );
  const textAttachments = attachments.filter(a => a.file.toLowerCase().endsWith('.txt'));
  const videoAttachments = attachments.filter(a => 
    a.file.toLowerCase().endsWith('.mp4') || 
    a.file.toLowerCase().endsWith('.webm')
  );
  const otherAttachments = attachments.filter(a => 
    !a.file.toLowerCase().endsWith('.png') && 
    !a.file.toLowerCase().endsWith('.jpg') && 
    !a.file.toLowerCase().endsWith('.jpeg') && 
    !a.file.toLowerCase().endsWith('.gif') && 
    !a.file.toLowerCase().endsWith('.txt') && 
    !a.file.toLowerCase().endsWith('.mp4') && 
    !a.file.toLowerCase().endsWith('.webm')
  );

  return (
    <div className="min-h-screen bg-darkBg text-white px-6 py-10 max-w-7xl mx-auto w-full">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6 uppercase tracking-wider font-semibold">
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: General details & enrollment panel */}
        <div ref={detailsRef} className="lg:col-span-1 space-y-6">
          <div className="glass rounded-3xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent-blue/10 blur-2xl pointer-events-none"></div>

            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue border border-accent-blue/20 mb-4 inline-block">
              {course.category_name || 'Category'}
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 leading-tight">
              {course.title}
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {course.description}
            </p>

            <div className="space-y-3.5 border-t border-white/5 pt-5 mb-6 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-slate-500" />
                <span>Mentor: <strong className="text-white">{course.mentor_name || 'Instructor'}</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Created: {new Date(course.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-slate-500" />
                <span>Structure: {modules.length} Modules</span>
              </div>
            </div>

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-xs font-semibold mb-4">
                {success}
              </div>
            )}

            {/* Price / Enrollment Box */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 flex flex-col items-center">
              <div className="flex items-center text-emerald-400 font-extrabold text-3xl mb-4">
                <DollarSign className="h-7 w-7" />
                <span>{course.price}</span>
              </div>

              {isAccessAllowed ? (
                <div className="w-full text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold py-2">
                    <CheckCircle className="h-5 w-5 animate-pulse" />
                    <span>Enrolled & Active</span>
                  </div>

                  {/* Course Wide Progress Bar */}
                  <div className="w-full text-left">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      <span>Course Progress</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-accent-blue to-accent-violet h-full rounded-full transition-all duration-500" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Certificate Button if 100% */}
                  {certificateData && (
                    <button
                      onClick={() => setShowCertificateModal(true)}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg border border-yellow-400/20"
                    >
                      <Award className="h-4 w-4 animate-bounce" />
                      View Certificate
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrollLoading}
                  className="w-full bg-gradient-to-r from-accent-blue to-accent-indigo hover:from-blue-600 hover:to-indigo-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {enrollLoading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    course.price > 0 ? `Buy Course ($${course.price})` : 'Enroll for Free'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Curriculum and Media Player / Discussions */}
        <div ref={syllabusRef} className="lg:col-span-2 space-y-6">
          
          {/* Tab Selection */}
          <div className="flex gap-2 border-b border-white/5 pb-2">
            <button
              onClick={() => setActiveTab('lessons')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'lessons'
                  ? 'bg-gradient-to-r from-accent-blue to-accent-indigo text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900 border border-white/5'
              }`}
            >
              Lessons & Study Material
            </button>
            {isAccessAllowed && (
              <button
                onClick={() => setActiveTab('discussion')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === 'discussion'
                    ? 'bg-gradient-to-r from-accent-violet to-accent-indigo text-white shadow-md'
                    : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900 border border-white/5'
                }`}
              >
                Live Course Discussions
              </button>
            )}
          </div>

          {activeTab === 'lessons' ? (
            <>
              {/* Syllabus Curriculum Accordion */}
              <div className="glass rounded-3xl p-6 border border-white/5 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent-violet" />
                Syllabus Curriculum
              </h2>
              {isAccessAllowed && (
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                  Progress: {progressPercent}%
                </span>
              )}
            </div>

            {modules.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm">No modules have been uploaded for this course yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((mod) => (
                  <div key={mod.id} className="border border-white/5 rounded-2xl overflow-hidden bg-slate-950/20">
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex justify-between items-center px-5 py-4 hover:bg-white/5 transition-colors text-left"
                    >
                      <span className="font-bold text-slate-200 text-sm">
                        {mod.title}
                      </span>
                      {expandedModules[mod.id] ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {expandedModules[mod.id] && (
                      <div className="px-5 pb-4 pt-1 border-t border-white/5 space-y-2">
                        {mod.lessons?.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-2 pl-2">No lessons in this module.</p>
                        ) : (
                          mod.lessons?.map((lesson) => (
                            <button
                              key={lesson.id}
                              onClick={() => {
                                if (isAccessAllowed) {
                                  setSelectedLesson(lesson);
                                } else {
                                  setError('Enroll in this course to view the lessons.');
                                }
                              }}
                              className={`w-full flex items-center justify-between text-left p-2.5 rounded-xl transition-all ${
                                selectedLesson?.id === lesson.id
                                  ? 'bg-accent-indigo/10 text-accent-blue border border-accent-indigo/20'
                                  : 'hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 text-xs font-semibold">
                                {getLessonIcon(lesson)}
                                <span className={completedLessonIds.includes(lesson.id) ? 'line-through text-slate-500 font-medium' : ''}>
                                  {lesson.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {lesson.duration} mins
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Lesson Display Section */}
          {selectedLesson && isAccessAllowed && (
            <div className="glass rounded-3xl p-6 border border-white/5 shadow-xl animate-fadeIn space-y-6">
              
              {/* Title & Metadata & Progress toggle */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    {completedLessonIds.includes(selectedLesson.id) ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400 animate-pulse" />
                    ) : (
                      <Video className="h-5 w-5 text-accent-blue" />
                    )}
                    {selectedLesson.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Lesson Notes & Syllabus Resources • {selectedLesson.duration} Minutes
                  </p>
                </div>

                <button
                  onClick={() => handleToggleLessonCompleted(selectedLesson.id)}
                  disabled={completedLessonIds.includes(selectedLesson.id)}
                  className={`text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl border transition-all ${
                    completedLessonIds.includes(selectedLesson.id)
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 opacity-80 cursor-default'
                      : 'bg-white/5 text-slate-300 border-white/5 hover:border-accent-blue hover:bg-white/10'
                  }`}
                >
                  {completedLessonIds.includes(selectedLesson.id) ? '✓ Completed' : 'Mark Completed'}
                </button>
              </div>

              {/* VIDEO PLAYER COMPONENT (Custom Premium Controls) */}
              {activeVideoUrl ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent-violet" />
                    Now Watching: <span className="text-white">{activeVideoTitle}</span>
                  </p>
                  
                  {/* Video & Controls Container */}
                  <div className="relative group rounded-2xl overflow-hidden border border-white/5 bg-black/90 shadow-2xl">
                    <video
                      ref={videoRef}
                      src={activeVideoUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      className="w-full aspect-video object-contain"
                      onClick={handlePlayPause}
                    />

                    {/* Styled Overlay Custom Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-3">
                      
                      {/* Timeline Slider */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-300">{formatTime(currentTime)}</span>
                        <input
                          type="range"
                          min="0"
                          max={duration || 0}
                          value={currentTime}
                          onChange={handleSeek}
                          className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-blue"
                        />
                        <span className="text-[10px] font-bold text-slate-300">{formatTime(duration)}</span>
                      </div>

                      {/* Controls Buttons */}
                      <div className="flex items-center justify-between text-white">
                        {/* Play, Back, Forward */}
                        <div className="flex items-center gap-4">
                          <button onClick={() => handleSkip(-10)} className="text-slate-400 hover:text-white transition-colors" title="Backward 10s">
                            <RotateCcw className="h-4.5 w-4.5" />
                          </button>
                          
                          <button onClick={handlePlayPause} className="bg-accent-blue hover:bg-blue-600 text-white p-2 rounded-full transition-transform hover:scale-105" title={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 pl-0.5" />}
                          </button>

                          <button onClick={() => handleSkip(10)} className="text-slate-400 hover:text-white transition-colors" title="Forward 10s">
                            <RotateCw className="h-4.5 w-4.5" />
                          </button>
                        </div>

                        {/* Volume controls */}
                        <div className="flex items-center gap-2">
                          <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors">
                            {isMuted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-blue"
                          />
                        </div>

                        {/* Speed dropdown & Fullscreen */}
                        <div className="flex items-center gap-3">
                          <select
                            value={playbackSpeed}
                            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                            className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                          >
                            <option value="0.5">0.5x</option>
                            <option value="1">1.0x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2.0x</option>
                          </select>

                          <button onClick={handleFullscreen} className="text-slate-400 hover:text-white transition-colors" title="Fullscreen">
                            <Maximize className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ) : selectedLesson.video_url ? (
                <div className="aspect-video w-full bg-slate-900 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-slate-500 mb-6 overflow-hidden relative group">
                  <PlayCircle className="h-12 w-12 text-accent-blue/80 group-hover:scale-110 transition-transform cursor-pointer" />
                  <span className="absolute bottom-4 left-4 text-xs font-medium text-slate-400">
                    External link: {selectedLesson.video_url}
                  </span>
                </div>
              ) : null}

              {/* Multiple Videos Playlist Switcher */}
              {videoAttachments.length > 1 && (
                <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Syllabus Video Playlist</p>
                  <div className="flex flex-wrap gap-2">
                    {videoAttachments.map((video, idx) => (
                      <button
                        key={video.id}
                        onClick={() => {
                          setActiveVideoUrl(getMediaUrl(video.file));
                          setActiveVideoTitle(video.title);
                          setIsPlaying(false);
                        }}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          activeVideoUrl === getMediaUrl(video.file)
                            ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/30'
                            : 'bg-white/5 text-slate-400 hover:text-white border-transparent'
                        }`}
                      >
                        Part {idx + 1}: {video.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lesson Description Content */}
              {selectedLesson.content && (
                <div className="bg-slate-900/30 border border-white/5 p-4 rounded-2xl text-sm text-slate-300 leading-relaxed">
                  <p className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-1.5">Lesson Context</p>
                  {selectedLesson.content}
                </div>
              )}

              {/* IMAGE GRAPHICS VIEWER */}
              {imageAttachments.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" /> Lesson Diagrams & Visuals
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {imageAttachments.map((img) => (
                      <div 
                        key={img.id} 
                        className="group relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950 flex flex-col cursor-zoom-in"
                        onClick={() => setExpandedImage(getMediaUrl(img.file))}
                      >
                        <img 
                          src={getMediaUrl(img.file)} 
                          alt={img.title} 
                          className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="p-3 bg-slate-900/80 border-t border-white/5 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200 truncate">{img.title}</span>
                          <Eye className="h-4 w-4 text-slate-400 group-hover:text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* INLINE TEXT FILE NOTES LOADER */}
              {textAttachments.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Document Notes & Lecture Reading
                  </p>
                  <div className="space-y-4">
                    {textAttachments.map((txt) => (
                      <div key={txt.id} className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 text-xs space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <span className="font-bold text-accent-violet">{txt.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Plaintext notes</span>
                        </div>
                        {textFileContents[txt.id] ? (
                          <pre className="font-mono text-slate-300 bg-black/35 p-4 rounded-xl leading-relaxed whitespace-pre-wrap select-text">
                            {textFileContents[txt.id]}
                          </pre>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500 py-2">
                            <Loader className="h-3 w-3 animate-spin" />
                            <span>Reading file content...</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OTHER DOWNLOADABLE FILE ATTACHMENTS */}
              {otherAttachments.length > 0 && (
                <div className="border-t border-white/5 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Download className="h-4 w-4" /> Supporting Materials
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {otherAttachments.map((attach) => (
                      <a
                        key={attach.id}
                        href={getMediaUrl(attach.file)}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5 hover:border-accent-blue/30 transition-colors text-slate-300 hover:text-white"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-4 w-4 text-accent-violet shrink-0" />
                          <span className="text-xs truncate">{attach.title}</span>
                        </div>
                        <span className="text-[10px] bg-white/5 text-slate-400 px-2 py-0.5 rounded uppercase font-semibold">
                          Download
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </>
      ) : (
        <div className="glass rounded-3xl p-6 border border-white/5 shadow-xl space-y-6 relative overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <div>
              <h3 className="text-lg font-bold text-white">Live Discussion Room</h3>
              <p className="text-xs text-slate-400">Ask questions and collaborate in real-time with classmates and your mentor.</p>
            </div>
          </div>

          {/* Discussion List */}
          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-6 pr-2 py-2 select-text">
            {discussionLoading ? (
              <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
                <Loader className="h-5 w-5 animate-spin text-accent-violet" />
                <span>Loading discussion history...</span>
              </div>
            ) : discussionQuestions.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl">
                <BookOpen className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No discussions yet. Be the first to ask a question!</p>
              </div>
            ) : (
              discussionQuestions.map((q) => (
                <div key={q.id} className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
                  {/* Question Header & Content */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-extrabold text-accent-violet bg-accent-violet/10 px-2 py-0.5 rounded border border-accent-violet/20">
                        {q.sender}
                      </span>
                      <span className="text-slate-500 text-[10px]">{new Date(q.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-200">{q.content}</p>
                  </div>

                  {/* Replies List */}
                  {q.answers && q.answers.length > 0 && (
                    <div className="pl-6 border-l border-white/10 space-y-3">
                      {q.answers.map((ans) => (
                        <div key={ans.id} className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 space-y-1">
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="font-bold text-accent-blue bg-accent-blue/15 px-1.5 py-0.5 rounded border border-accent-blue/20">
                              {ans.sender}
                            </span>
                            <span className="text-slate-500">{new Date(ans.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-300">{ans.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input Form */}
                  <form 
                    onSubmit={(e) => handleSendReply(e, q.id)} 
                    className="flex gap-2 items-center pl-6"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Write a reply..."
                      value={replyTexts[q.id] || ''}
                      onChange={(e) => setReplyTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                      className="flex-1 bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-violet transition-colors"
                    />
                    <button
                      type="submit"
                      className="bg-accent-violet/15 hover:bg-accent-violet text-accent-violet hover:text-white border border-accent-violet/20 hover:border-accent-violet text-xs font-bold px-3 py-2 rounded-xl transition-all"
                    >
                      Reply
                    </button>
                  </form>
                </div>
              ))
            )}
            <div ref={discussionEndRef} />
          </div>

          {/* Ask a Question Input */}
          <form onSubmit={handleSendQuestion} className="border-t border-white/5 pt-4 flex gap-3 items-center">
            <input
              type="text"
              required
              placeholder="Ask a new question in the discussion room..."
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              className="flex-1 bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-accent-violet transition-colors"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-accent-violet to-accent-indigo hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition-all whitespace-nowrap"
            >
              Ask Question
            </button>
          </form>
        </div>
      )}

      {/* REVIEWS & FEEDBACK SYSTEM CONTAINER */}
      <div className="glass rounded-3xl p-6 border border-white/5 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400 animate-pulse" />
              Student Reviews & Feedback ({reviews.length})
            </h3>

            {/* List Reviews */}
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No reviews have been posted for this course yet.</p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-slate-950/30 border border-white/5 space-y-2 relative group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-200">{rev.student_name}</span>
                        <div className="flex text-yellow-400">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      
                      {/* Delete review triggers (Admin or Review author) */}
                      {user && (user.role === 'admin' || Number(rev.student) === Number(user.id)) && (
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-slate-400 hover:text-white transition-all border border-red-500/15"
                          title="Delete Review"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">{rev.comment}</p>
                    <span className="text-[9px] text-slate-500 block">
                      Posted: {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Write a review form */}
            {isEnrolled && user?.role === 'student' && (
              <form onSubmit={handleReviewSubmit} className="border-t border-white/5 pt-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Submit Course Rating</h4>
                
                {reviewError && (
                  <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                    {reviewError}
                  </div>
                )}
                
                {reviewSuccess && (
                  <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    {reviewSuccess}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Rating:</span>
                  <div className="flex gap-1.5 cursor-pointer">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className={`h-5 w-5 ${
                          star <= reviewRating 
                            ? 'fill-yellow-400 text-yellow-400 scale-105' 
                            : 'text-slate-600'
                        } transition-all`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Review comment</label>
                  <textarea
                    required
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Write your honest feedback..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-accent-blue hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Submit Review
                </button>
              </form>
            )}
          </div>

        </div>
      </div>

      {/* Dynamic Certificate Modal Pop-Up */}
      {showCertificateModal && certificateData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-950/95 border-2 border-yellow-500/35 rounded-3xl p-8 text-center shadow-2xl relative">
            <button
              onClick={() => setShowCertificateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold"
            >
              &times;
            </button>

            {/* Glowing borders */}
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-yellow-500/5 blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-amber-600/5 blur-3xl pointer-events-none"></div>

            <div className="border border-yellow-500/20 p-6 rounded-2xl space-y-6">
              <div className="flex justify-center mb-2 text-yellow-500 animate-pulse">
                <Award className="h-16 w-16" />
              </div>

              <h2 className="text-2xl font-serif text-white tracking-widest uppercase font-bold">
                Certificate of Completion
              </h2>
              
              <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">
                Innovature E-Learning Academy
              </p>

              <div className="py-4">
                <p className="text-xs text-slate-400 italic">This document certifies that</p>
                <p className="text-2xl font-bold text-white font-sans tracking-wide mt-1.5 uppercase">
                  {user?.username}
                </p>
              </div>

              <div className="py-2">
                <p className="text-xs text-slate-400 italic">has successfully completed the course curriculum requirements for</p>
                <p className="text-lg font-bold text-yellow-500 mt-1.5">
                  {course.title}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/5 pt-6 text-[10px] text-slate-500 font-mono">
                <div className="text-left sm:text-left">
                  <span>Certificate Code:</span>
                  <p className="text-slate-300 font-semibold mt-0.5">{certificateData.certificate_code}</p>
                </div>
                <div className="text-right sm:text-right">
                  <span>Date Issued:</span>
                  <p className="text-slate-300 font-semibold mt-0.5">
                    {new Date(certificateData.issued_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Expanded Image Modal overlay */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <img 
              src={expandedImage} 
              alt="expanded view" 
              className="max-w-full max-h-[85vh] object-contain"
            />
            <button 
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 text-sm font-bold w-10 h-10 hover:bg-black/90"
              onClick={() => setExpandedImage(null)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;
