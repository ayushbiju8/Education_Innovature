import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { Search, Tag, BookOpen, User, DollarSign, Filter, Sparkles, ArrowUpDown } from 'lucide-react';
import gsap from 'gsap';

const Home = () => {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedOrdering, setSelectedOrdering] = useState('-created_at'); // default: newest
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [deepSearch, setDeepSearch] = useState(false);

  const gridRef = useRef(null);
  const heroRef = useRef(null);

  // Fetch static categories and tags once
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
        console.error('Error fetching categories/tags:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch courses dynamically based on filters/ordering/tag/prices (Backend-driven)
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (search.trim()) params.search = search;
        if (selectedCategory) params.category = selectedCategory;
        if (selectedOrdering) params.ordering = selectedOrdering;
        if (selectedTag) params.tag = selectedTag;
        if (minPrice) params.min_price = minPrice;
        if (maxPrice) params.max_price = maxPrice;
        if (deepSearch) params.deep_search = 'true';
        
        // Fetch from backend CourseViewSet using advanced search/filter query parameters
        const res = await client.get('/courses/', { params });
        setCourses(res.data);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to fetch courses. Please verify if your backend server is online.');
      } finally {
        setLoading(false);
      }
    };
    
    // Simple debounce/delay for search and price inputs
    const delayDebounce = setTimeout(() => {
      fetchCourses();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, selectedCategory, selectedOrdering, selectedTag, minPrice, maxPrice, deepSearch]);

  // Animate elements once loading finishes and courses display
  useEffect(() => {
    if (!loading && courses.length > 0) {
      const ctx = gsap.context(() => {
        // Hero entrance
        gsap.fromTo(heroRef.current, 
          { y: -30, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
        );
        // Staggered grid cards
        if (gridRef.current) {
          gsap.fromTo(gridRef.current.children, 
            { y: 40, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out' }
          );
        }
      });
      return () => ctx.revert();
    }
  }, [loading, courses]);

  // Backend already handles tag filtering, tags are queried directly server-side
  const filteredCourses = courses;

  return (
    <div className="min-h-screen bg-darkBg text-white px-6 py-10 max-w-7xl mx-auto w-full">
      {/* Hero Section */}
      <div 
        ref={heroRef} 
        className="text-center max-w-3xl mx-auto mb-16 relative py-8"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-accent-indigo/10 blur-3xl pointer-events-none"></div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-xs font-semibold text-accent-blue tracking-wide uppercase mb-4">
          <Sparkles className="h-3 w-3" />
          Interactive Learning Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white leading-tight">
          Unlock Skills With{' '}
          <span className="bg-gradient-to-r from-accent-blue via-accent-violet to-accent-indigo bg-clip-text text-transparent">
            Expert-Led
          </span>{' '}
          Courses
        </h1>
        <p className="text-slate-400 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
          Access specialized modules, hands-on syllabus materials, and get certified. Join thousands of students elevating their careers today.
        </p>

        {/* Search & Filters Controls */}
        <div className="glass p-5 rounded-2xl border border-white/5 shadow-2xl flex flex-col gap-4 max-w-3xl mx-auto backdrop-blur-md">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={deepSearch ? "Deep search lessons and syllabus..." : "Search course titles..."}
                className="w-full bg-slate-900 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-blue transition-colors text-white placeholder-slate-500"
              />
            </div>

            {/* Deep Search Toggle */}
            <button
              type="button"
              onClick={() => setDeepSearch(prev => !prev)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-97 cursor-pointer ${
                deepSearch 
                  ? 'bg-accent-indigo/25 border-accent-indigo text-accent-indigo shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                  : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Deep Search</span>
            </button>

            {/* Sort/Ordering Select */}
            <div className="relative min-w-[160px]">
              <select
                value={selectedOrdering}
                onChange={(e) => setSelectedOrdering(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-accent-blue transition-colors appearance-none pr-8 cursor-pointer"
              >
                <option value="-created_at">Newest Courses</option>
                <option value="created_at">Oldest Courses</option>
                <option value="price">Price: Low to High</option>
                <option value="-price">Price: High to Low</option>
              </select>
              <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center pt-3 border-t border-white/5 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Filter className="h-3.5 w-3.5" /> Filter:
              </span>

              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-accent-blue transition-colors appearance-none pr-6 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag Dropdown */}
              <div className="relative">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="bg-slate-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-accent-blue transition-colors appearance-none pr-6 cursor-pointer"
                >
                  <option value="">All Tags</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price range input filters */}
            <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-white/5 pt-2.5 sm:pt-0 sm:pl-4">
              <span className="font-semibold text-slate-300">Price:</span>
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-16 bg-slate-900 border border-white/5 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-accent-blue placeholder-slate-600 transition-colors"
              />
              <span className="text-slate-600">—</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-16 bg-slate-900 border border-white/5 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-accent-blue placeholder-slate-600 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content / Grid */}
      {error && (
        <div className="glass max-w-xl mx-auto p-6 border-red-500/10 text-center rounded-2xl">
          <p className="text-red-400 font-semibold mb-2">Service Offline</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      )}

      {loading ? (
        // Skeleton cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass rounded-3xl p-6 border border-white/5 animate-pulse space-y-4">
              <div className="h-6 w-2/3 bg-slate-800 rounded-lg"></div>
              <div className="h-4 w-1/3 bg-slate-800 rounded-lg"></div>
              <div className="h-16 w-full bg-slate-800 rounded-lg"></div>
              <div className="flex justify-between items-center pt-4">
                <div className="h-6 w-1/4 bg-slate-800 rounded-lg"></div>
                <div className="h-8 w-1/3 bg-slate-800 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {filteredCourses.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No courses found matching filters.</p>
            </div>
          ) : (
            <div 
              ref={gridRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredCourses.map((course) => (
                <div 
                  key={course.id}
                  className="glass glass-hover rounded-3xl p-6 flex flex-col justify-between border border-white/5 shadow-lg group relative overflow-hidden"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                        {course.category_name || 'Subject'}
                      </span>
                      {!course.is_published && (
                        <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Draft
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-accent-blue transition-colors">
                      {course.title}
                    </h3>
                    
                    <p className="text-xs text-slate-400 flex items-center gap-1 mb-4">
                      <User className="h-3.5 w-3.5" />
                      <span>By {course.mentor_name || 'Expert Mentor'}</span>
                    </p>

                    <p className="text-sm text-slate-400 mb-6 line-clamp-3 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {/* Pricing and Action */}
                  <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-auto">
                    <div className="flex items-center text-emerald-400 font-bold text-lg">
                      <DollarSign className="h-4.5 w-4.5 -mr-0.5" />
                      <span>{course.price}</span>
                    </div>

                    <Link
                      to={`/courses/${course.id}`}
                      className="text-xs font-semibold bg-white/5 group-hover:bg-accent-blue group-hover:text-white text-slate-300 border border-white/5 group-hover:border-accent-blue px-4 py-2 rounded-xl transition-all shadow-md"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
