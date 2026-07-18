import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { Save, Plus, Trash2, FileText, CheckCircle, AlertCircle, ArrowLeft, Loader, ChevronDown, ChevronRight, Upload } from 'lucide-react';
import gsap from 'gsap';

const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form general info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Dynamic syllabus helpers
  const [expandedModules, setExpandedModules] = useState({});
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  // Lesson helper per module
  const [showAddLesson, setShowAddLesson] = useState({}); // { [moduleId]: boolean }
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonDuration, setLessonDuration] = useState('');

  // Attachment upload helper
  const [selectedLessonForFile, setSelectedLessonForFile] = useState(null);
  const [attachmentTitle, setAttachmentTitle] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const fileInputRef = useRef(null);
  const lessonFileInputRef = useRef(null);

  // Lesson creation attachment states
  const [lessonAttachmentTitle, setLessonAttachmentTitle] = useState('');
  const [lessonAttachmentFile, setLessonAttachmentFile] = useState(null);

  // Drag-and-drop states
  const [isDraggingLesson, setIsDraggingLesson] = useState(false);
  const [isDraggingModal, setIsDraggingModal] = useState(false);

  // Upload status tracking
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');

  // Handle local file selection and generates preview
  const handleFileChange = (file, isForLessonCreation = false) => {
    if (!file) {
      if (isForLessonCreation) {
        setLessonAttachmentFile(null);
        setPreviewUrl('');
      } else {
        setAttachmentFile(null);
        setPreviewUrl('');
      }
      return;
    }
    
    if (isForLessonCreation) {
      setLessonAttachmentFile(file);
      setLessonAttachmentTitle(file.name);
    } else {
      setAttachmentFile(file);
      setAttachmentTitle(file.name);
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl('');
    }
  };

  // Messaging
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const formRef = useRef(null);

  const fetchCourseData = async () => {
    try {
      const [categoriesRes, courseRes, modulesRes] = await Promise.all([
        client.get('/categories/'),
        client.get(`/courses/${id}/`),
        client.get(`/courses/${id}/modules/`),
      ]);
      
      setCategories(categoriesRes.data);
      setCourse(courseRes.data);
      setModules(modulesRes.data);

      setTitle(courseRes.data.title);
      setDescription(courseRes.data.description);
      setCategory(courseRes.data.category);
      setPrice(courseRes.data.price);
      setIsPublished(courseRes.data.is_published);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch course details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo(formRef.current, 
        { opacity: 0, y: 15 }, 
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [loading]);

  const handleUpdateCourseDetails = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaveLoading(true);

    try {
      await client.patch(`/courses/${id}/`, {
        title,
        description,
        category: Number(category),
        price: parseFloat(price),
        is_published: isPublished,
      });
      setSuccess('Course general information updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setError('Failed to update course info.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    setError('');
    try {
      const order = modules.length + 1;
      await client.post(`/courses/${id}/modules/`, {
        title: newModuleTitle,
        order
      });
      setNewModuleTitle('');
      setShowAddModule(false);
      await fetchCourseData();
    } catch (err) {
      console.error(err);
      setError('Failed to add module.');
    }
  };

  const handleAddLessonSubmit = async (e, moduleId) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;
    setError('');

    const targetModule = modules.find(m => m.id === moduleId);
    const nextOrder = (targetModule?.lessons?.length || 0) + 1;

    try {
      const lessonRes = await client.post(`/modules/${moduleId}/lessons/`, {
        title: lessonTitle,
        content: lessonContent.trim() || 'Lesson reading note content.',
        video_url: lessonVideoUrl,
        duration: Number(lessonDuration) || 0,
        order: nextOrder,
      });

      const newLesson = lessonRes.data;

      // Handle optional attachment upload immediately after lesson is created
      if (lessonAttachmentFile && lessonAttachmentTitle.trim()) {
        setIsUploading(true);
        setUploadProgress(0);
        
        const formData = new FormData();
        formData.append('title', lessonAttachmentTitle);
        formData.append('file', lessonAttachmentFile);

        await client.post(`/lessons/${newLesson.id}/attachments/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
      }

      setLessonTitle('');
      setLessonContent('');
      setLessonVideoUrl('');
      setLessonDuration('');
      setLessonAttachmentTitle('');
      setLessonAttachmentFile(null);
      setPreviewUrl('');
      setIsUploading(false);
      setUploadProgress(0);
      setShowAddLesson((prev) => ({ ...prev, [moduleId]: false }));
      
      await fetchCourseData();
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      setUploadProgress(0);
      setError(err.response?.data?.file?.[0] || err.response?.data?.detail || 'Failed to add lesson or upload attachment.');
    }
  };

  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!attachmentFile || !attachmentTitle) return;
    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('title', attachmentTitle);
    formData.append('file', attachmentFile);

    try {
      await client.post(`/lessons/${selectedLessonForFile.id}/attachments/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      setAttachmentTitle('');
      setAttachmentFile(null);
      setPreviewUrl('');
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedLessonForFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      await fetchCourseData();
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      setUploadProgress(0);
      setError(err.response?.data?.file?.[0] || err.response?.data?.detail || 'Failed to upload attachment.');
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-73px)] items-center justify-center bg-darkBg text-white">
        <div className="premium-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkBg text-white px-6 py-10 max-w-5xl mx-auto w-full">
      <Link to="/mentor/courses" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6 uppercase tracking-wider font-semibold">
        <ArrowLeft className="h-4 w-4" /> Back to My Courses
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Course Syllabus Editor</h1>
          <p className="text-xs text-slate-400">Alter course description parameters and layout chapter lessons.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-xs font-semibold">
          <CheckCircle className="h-4 w-4 shrink-0 animate-bounce" />
          <span>{success}</span>
        </div>
      )}

      <div ref={formRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Edit general parameters */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleUpdateCourseDetails} className="glass rounded-3xl p-6 border border-white/5 space-y-4 shadow-xl">
            <h3 className="text-md font-bold text-white mb-2">General Info</h3>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-violet transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-violet transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Category *
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-accent-violet transition-colors"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-violet transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                id="is_published_edit"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 text-accent-violet focus:ring-accent-violet bg-slate-950"
              />
              <label htmlFor="is_published_edit" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Course is Published
              </label>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-accent-violet to-accent-indigo hover:from-violet-600 hover:to-indigo-600 hover:shadow-lg hover:shadow-accent-violet/20 active:scale-97 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all duration-200"
            >
              {saveLoading ? <div className="premium-spinner-sm"></div> : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
            </button>
          </form>
        </div>

        {/* Right column: syllabus & dynamic lists editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-3xl p-6 border border-white/5 shadow-xl">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-md font-bold text-white">Course Curriculum Modules</h3>
              <button
                type="button"
                onClick={() => setShowAddModule(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-accent-violet hover:underline bg-accent-violet/10 border border-accent-violet/20 px-3 py-1.5 rounded-lg"
              >
                <Plus className="h-3 w-3" /> Add Module
              </button>
            </div>

            {/* Add module form */}
            {showAddModule && (
              <form onSubmit={handleAddModule} className="mb-6 p-4 bg-slate-900/50 border border-white/5 rounded-2xl flex gap-3 items-center">
                <input
                  type="text"
                  required
                  placeholder="Module Title (e.g. Introduction)"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="flex-1 bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent-violet"
                />
                <button
                  type="submit"
                  className="bg-accent-violet text-white text-xs font-bold px-3 py-2 rounded-xl"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModule(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* List modules */}
            {modules.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/5 rounded-2xl">
                <p className="text-xs text-slate-500">No modules exist. Build curriculum structure by clicking Add Module.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((mod) => (
                  <div key={mod.id} className="border border-white/5 rounded-2xl bg-slate-950/20">
                    <div className="flex justify-between items-center px-4 py-3 border-b border-white/5">
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="flex items-center gap-2 text-left font-bold text-xs text-slate-200"
                      >
                        {expandedModules[mod.id] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {mod.title}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAddLesson((prev) => ({ ...prev, [mod.id]: true }))}
                        className="flex items-center gap-0.5 text-[10px] font-bold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-2.5 py-1 rounded-lg"
                      >
                        <Plus className="h-2.5 w-2.5" /> Lesson
                      </button>
                    </div>

                    {expandedModules[mod.id] && (
                      <div className="p-4 space-y-4">
                        {/* Add lesson form */}
                        {showAddLesson[mod.id] && (
                          <form onSubmit={(e) => handleAddLessonSubmit(e, mod.id)} className="p-4 bg-slate-900/50 border border-white/5 rounded-xl space-y-3">
                            <h4 className="text-xs font-bold text-slate-300">New Lesson</h4>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                required
                                placeholder="Title"
                                value={lessonTitle}
                                onChange={(e) => setLessonTitle(e.target.value)}
                                className="bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white"
                              />
                              <input
                                type="number"
                                required
                                placeholder="Duration (min)"
                                value={lessonDuration}
                                onChange={(e) => setLessonDuration(e.target.value)}
                                className="bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white"
                              />
                            </div>

                            <input
                              type="url"
                              placeholder="Video URL (optional)"
                              value={lessonVideoUrl}
                              onChange={(e) => setLessonVideoUrl(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white"
                            />

                            <textarea
                              required
                              placeholder="Lesson written content/notes * (Required)"
                              rows={3}
                              value={lessonContent}
                              onChange={(e) => setLessonContent(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white resize-none"
                            />

                            {/* Lesson optional attachment uploads inline */}
                            <div className="border-t border-white/5 pt-3 space-y-3">
                              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Lesson Attachments (Optional)</p>

                              {/* Drag-and-drop zone for lesson attachment - uses label wrapping for reliable browser click */}
                              <label
                                htmlFor="lesson-file-input"
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingLesson(true); }}
                                onDragLeave={() => setIsDraggingLesson(false)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setIsDraggingLesson(false);
                                  const file = e.dataTransfer.files[0];
                                  if (file) handleFileChange(file, true);
                                }}
                                className={`relative flex flex-col items-center justify-center gap-1.5 w-full rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-5 px-3 ${
                                  isDraggingLesson
                                    ? 'border-accent-violet bg-accent-violet/10 drag-zone-active'
                                    : lessonAttachmentFile
                                    ? 'border-accent-violet/40 bg-accent-violet/5'
                                    : 'border-white/10 bg-slate-950/40 hover:border-accent-violet/40 hover:bg-accent-violet/5 hover:scale-[1.005]'
                                }`}
                              >
                                <input
                                  id="lesson-file-input"
                                  type="file"
                                  ref={lessonFileInputRef}
                                  onChange={(e) => handleFileChange(e.target.files[0], true)}
                                  className="sr-only"
                                />
                                {lessonAttachmentFile ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="text-[10px] font-bold text-accent-violet text-center truncate max-w-full px-2">{lessonAttachmentFile.name}</span>
                                    <span className="text-[9px] text-slate-500">Click to change file</span>
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isDraggingLesson ? 'text-accent-violet' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <span className={`text-[10px] font-bold transition-colors ${isDraggingLesson ? 'text-accent-violet' : 'text-slate-400'}`}>Drop file here or click to browse</span>
                                    <span className="text-[9px] text-slate-600">Any file type accepted</span>
                                  </>
                                )}
                              </label>

                              {lessonAttachmentFile && (
                                <div>
                                  <label className="block text-[8px] text-slate-500 mb-1.5 uppercase font-bold tracking-widest">
                                    Attachment Title
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Lecture Slides PDF"
                                    value={lessonAttachmentTitle}
                                    onChange={(e) => setLessonAttachmentTitle(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-white"
                                  />
                                </div>
                              )}

                              {previewUrl && lessonAttachmentFile && (
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 mt-2">
                                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                              )}

                              {isUploading && lessonAttachmentFile && (
                                <div className="space-y-1.5 mt-2">
                                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                    <span>Uploading attachment...</span>
                                    <span>{uploadProgress}%</span>
                                  </div>
                                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className="bg-accent-violet h-full transition-all duration-300" 
                                      style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end gap-2 text-xs pt-2">
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => {
                                  setLessonAttachmentFile(null);
                                  setLessonAttachmentTitle('');
                                  setPreviewUrl('');
                                  setShowAddLesson((prev) => ({ ...prev, [mod.id]: false }));
                                }}
                                className="text-slate-400 px-3 py-1.5 cursor-pointer hover:text-white transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isUploading}
                                className="bg-accent-blue text-white font-bold px-3 py-1.5 rounded-lg hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isUploading ? 'Uploading...' : 'Add Lesson'}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* List lessons */}
                        {mod.lessons?.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic">No lessons have been created for this module yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {mod.lessons?.map((lesson) => (
                              <div key={lesson.id} className="p-3 rounded-xl bg-slate-900/30 border border-white/5 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                  <p className="font-semibold text-slate-300">{lesson.title}</p>
                                  <span className="text-[10px] text-slate-500">{lesson.duration} mins</span>
                                </div>

                                {/* Attachments lists & add control */}
                                <div className="border-t border-white/5 pt-2 space-y-2">
                                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                                    <span>ATTACHMENTS ({lesson.attachments?.length || 0})</span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedLessonForFile(lesson)}
                                      className="text-accent-violet hover:underline flex items-center gap-0.5"
                                    >
                                      <Upload className="h-3 w-3" /> Add file
                                    </button>
                                  </div>

                                  {/* List attachment links */}
                                  {lesson.attachments?.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                                      {lesson.attachments.map((attach) => (
                                        <div key={attach.id} className="flex items-center gap-1.5 p-1.5 bg-slate-950/40 rounded border border-white/5">
                                          <FileText className="h-3.5 w-3.5 text-accent-violet shrink-0" />
                                          <span className="truncate text-slate-400">{attach.title}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attachment upload modal dialogue */}
      {selectedLessonForFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-md font-bold text-white mb-4">Upload Lesson Attachment</h3>
            <form onSubmit={handleUploadAttachment} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2 font-bold uppercase tracking-widest">Choose File</label>
                {/* Drag-and-drop zone for modal attachment - uses label wrapping for reliable browser click */}
                <label
                  htmlFor="modal-file-input"
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingModal(true); }}
                  onDragLeave={() => setIsDraggingModal(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingModal(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileChange(file, false);
                  }}
                  className={`relative flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-8 px-4 ${
                    isDraggingModal
                      ? 'border-accent-violet bg-accent-violet/10 drag-zone-active'
                      : attachmentFile
                      ? 'border-accent-violet/40 bg-accent-violet/5'
                      : 'border-white/10 bg-slate-900/50 hover:border-accent-violet/40 hover:bg-accent-violet/5 hover:scale-[1.005]'
                  }`}
                >
                  <input
                    id="modal-file-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileChange(e.target.files[0], false)}
                    className="sr-only"
                  />
                  {attachmentFile ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-accent-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs font-bold text-accent-violet text-center truncate max-w-full px-2">{attachmentFile.name}</span>
                      <span className="text-[10px] text-slate-500">Click to change file</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 transition-colors ${isDraggingModal ? 'text-accent-violet' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <div className="text-center">
                        <p className={`text-xs font-bold transition-colors ${isDraggingModal ? 'text-accent-violet' : 'text-slate-300'}`}>Drop your file here</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">or <span className="text-accent-violet underline">click to browse</span></p>
                      </div>
                      <p className="text-[9px] text-slate-600">Any file type accepted</p>
                    </>
                  )}
                </label>
              </div>

              {attachmentFile && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-bold uppercase tracking-widest">
                    Attachment Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lecture Slides PDF"
                    value={attachmentTitle}
                    onChange={(e) => setAttachmentTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              {previewUrl && attachmentFile && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 mt-2">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              {isUploading && attachmentFile && (
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Uploading attachment...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-accent-violet h-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setAttachmentTitle('');
                    setAttachmentFile(null);
                    setPreviewUrl('');
                    setSelectedLessonForFile(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white px-3 py-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="bg-accent-violet text-white text-xs font-bold px-4 py-2 rounded-xl hover:scale-102 active:scale-98 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditCourse;
