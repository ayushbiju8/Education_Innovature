import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Save, AlertCircle, Sparkles, BookOpen, Loader } from 'lucide-react';
import gsap from 'gsap';

const CreateCourse = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const formRef = useRef(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          client.get('/categories/'),
          client.get('/tags/'),
        ]);
        setCategories(categoriesRes.data);
        setTags(tagsRes.data);
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Failed to fetch categories or tags from backend.');
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo(formRef.current, 
        { y: 30, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title || !description || !category || !price) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitLoading(true);
    // Generate a unique slug from title
    const cleanSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 100000);

    try {
      const res = await client.post('/courses/', {
        title,
        slug: cleanSlug,
        description,
        category: Number(category),
        price: parseFloat(price),
        is_published: isPublished,
      });

      // Redirect directly to the Edit/Syllabus builder page
      navigate(`/courses/edit/${res.data.id}`);
    } catch (err) {
      console.error(err);
      const details = err.response?.data;
      if (details) {
        setError(JSON.stringify(details));
      } else {
        setError('Failed to create course. Please review price or titles.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-73px)] items-center justify-center bg-darkBg text-white">
        <div className="premium-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkBg text-white px-6 py-10 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
        <div className="bg-accent-emerald/10 border border-accent-emerald/20 p-2.5 rounded-xl text-accent-emerald shadow-lg">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Create a New Course</h1>
          <p className="text-xs text-slate-400">Establish basic course descriptors, category mapping, and pricing tier.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 glass rounded-3xl p-6 border border-white/5 shadow-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Course Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master React and GSAP from Scratch"
              className="w-full bg-slate-900 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-emerald transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a compelling outline for your students..."
              className="w-full bg-slate-900 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-emerald transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Category *
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-slate-300 focus:outline-none focus:border-accent-emerald transition-colors"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 49.99"
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-emerald transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/50 p-4 border border-white/5 rounded-2xl">
            <input
              type="checkbox"
              id="is_published"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-white/10 text-accent-emerald focus:ring-accent-emerald bg-slate-950"
            />
            <div className="text-left">
              <label htmlFor="is_published" className="block text-xs font-bold text-slate-200 cursor-pointer">
                Publish immediately
              </label>
              <span className="text-[10px] text-slate-400">
                If checked, students will see this course in the catalog instantly.
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-t border-white/5 pt-6 justify-end">
          <button
            type="submit"
            disabled={submitLoading}
            className="flex items-center gap-1.5 bg-gradient-to-r from-accent-emerald to-accent-blue hover:from-emerald-600 hover:to-blue-600 active:scale-97 text-white font-semibold text-sm px-6 py-3 rounded-2xl shadow-lg hover:shadow-accent-emerald/20 transition-all duration-200 disabled:opacity-50"
          >
            {submitLoading ? (
              <div className="premium-spinner-sm"></div>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save & Build Syllabus
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCourse;
