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
      await client.post(`/modules/${moduleId}/lessons/`, {
        title: lessonTitle,
        content: lessonContent.trim() || 'Lesson reading note content.',
        video_url: lessonVideoUrl,
        duration: Number(lessonDuration) || 0,
        order: nextOrder,
      });

      setLessonTitle('');
      setLessonContent('');
      setLessonVideoUrl('');
      setLessonDuration('');
      setShowAddLesson((prev) => ({ ...prev, [moduleId]: false }));
      
      await fetchCourseData();
    } catch (err) {
      console.error(err);
      setError('Failed to add lesson.');
    }
  };

  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!attachmentFile || !attachmentTitle) return;
    setError('');

    const formData = new FormData();
    formData.append('title', attachmentTitle);
    formData.append('file', attachmentFile);

    try {
      await client.post(`/lessons/${selectedLessonForFile.id}/attachments/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAttachmentTitle('');
      setAttachmentFile(null);
      setSelectedLessonForFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      await fetchCourseData();
    } catch (err) {
      console.error(err);
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
        <Loader className="h-10 w-10 animate-spin text-accent-violet" />
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
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-accent-violet to-accent-indigo hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all"
            >
              {saveLoading ? <Loader className="h-3 w-3 animate-spin" /> : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
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

                            <div className="flex justify-end gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => setShowAddLesson((prev) => ({ ...prev, [mod.id]: false }))}
                                className="text-slate-400 px-3 py-1.5"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="bg-accent-blue text-white font-bold px-3 py-1.5 rounded-lg"
                              >
                                Add Lesson
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

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-bold uppercase tracking-widest">
                  Choose File
                </label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  onChange={(e) => setAttachmentFile(e.target.files[0])}
                  className="w-full text-xs text-slate-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedLessonForFile(null)}
                  className="text-xs text-slate-400 hover:text-white px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-accent-violet text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Upload File
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
