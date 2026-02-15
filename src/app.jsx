import React, { useState, useEffect, createContext, useContext } from 'react';
import { Menu as MenuIcon, Search, X, Plus, Trash2, Edit3, LogOut, LogIn } from 'lucide-react';
import { supabase } from './supabaseClient';

// Context for global state
const AppContext = createContext();

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// Main App Component
export default function MinimalBlog() {
  const [currentPage, setCurrentPage] = useState('feed');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [accentColor, setAccentColor] = useState('#000000');
  const [selectedStory, setSelectedStory] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  // Check for password reset in URL hash
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const type = hashParams.get('type');
  
  if (type === 'recovery') {
    setCurrentPage('resetPassword');
  }

  // Check for existing session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    setLoading(false);
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setUser(session?.user ?? null);
    
    // Detect password recovery event
    if (event === 'PASSWORD_RECOVERY') {
      setCurrentPage('resetPassword');
    }
  });

  // Load settings
  loadSettings();

  return () => subscription.unsubscribe();
}, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('accent_color')
      .single();
    
    if (data) {
      setAccentColor(data.accent_color);
    }
  };

  const handleLogin = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      alert('Login failed: ' + error.message);
    } else {
      setMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentPage('feed');
    setMenuOpen(false);
  };

  const updateAccentColor = async (color) => {
    setAccentColor(color);
    await supabase
      .from('settings')
      .update({ accent_color: color })
      .eq('id', 1);
  };

  const contextValue = {
    currentPage,
    setCurrentPage,
    isLoggedIn: !!user,
    user,
    accentColor,
    updateAccentColor,
    searchQuery,
    setSearchQuery,
    selectedStory,
    setSelectedStory
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Crimson Pro, serif'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div style={{ '--accent': accentColor }} className="app">
        <Header 
          menuOpen={menuOpen} 
          setMenuOpen={setMenuOpen}
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
        />
        
        <MenuComponent 
          isOpen={menuOpen} 
          onClose={() => setMenuOpen(false)}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />

        <SearchOverlay 
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />

        <main className="main-content">
          {currentPage === 'feed' && <FeedPage />}
          {currentPage === 'about' && <AboutPage />}
          {currentPage === 'contact' && <ContactPage />}
          {currentPage === 'documents' && <DocumentsPage />}
          {currentPage === 'gallery' && <GalleryPage />}
          {currentPage === 'tools' && <ToolsPage />}
          {currentPage === 'stories' && <StoriesPage />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'resetPassword' && <ResetPasswordPage />}
        </main>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=JetBrains+Mono:wght@400;500&display=swap');

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Crimson Pro', serif;
            background: #ffffff;
            color: #000000;
            line-height: 1.6;
          }

          .app {
            min-height: 100vh;
            position: relative;
          }

          /* Header */
          .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 64px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 24px;
            background: #ffffff;
            border-bottom: 1px solid #f0f0f0;
            z-index: 100;
          }

          .icon-btn {
            width: 40px;
            height: 40px;
            border-radius: 20px;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .icon-btn:hover {
            background: #f5f5f5;
            transform: scale(1.05);
          }

          .icon-btn:active {
            transform: scale(0.95);
          }

          /* Menu Sidebar */
          .menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 200;
          }

          .menu-overlay.open {
            opacity: 1;
            pointer-events: all;
          }

          .menu-sidebar {
            position: fixed;
            top: 0;
            left: -320px;
            width: 320px;
            height: 100vh;
            background: #ffffff;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 201;
            display: flex;
            flex-direction: column;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
          }

          .menu-sidebar.open {
            transform: translateX(320px);
          }

          .menu-header {
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            border-bottom: 1px solid #f0f0f0;
          }

          .menu-title {
            font-size: 18px;
            font-weight: 600;
            letter-spacing: -0.02em;
          }

          .menu-items {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
          }

          .menu-item {
            width: 100%;
            padding: 14px 16px;
            margin-bottom: 4px;
            border: none;
            background: transparent;
            text-align: left;
            font-family: 'Crimson Pro', serif;
            font-size: 16px;
            cursor: pointer;
            border-radius: 12px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .menu-item:hover {
            background: #f8f8f8;
          }

          .menu-item.active {
            background: var(--accent);
            color: #ffffff;
          }

          .menu-footer {
            padding: 16px;
            border-top: 1px solid #f0f0f0;
          }

          /* Login Form */
          .login-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .login-form input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-family: 'Crimson Pro', serif;
            font-size: 14px;
            outline: none;
            transition: border 0.2s ease;
          }

          .login-form input:focus {
            border-color: var(--accent);
          }

          /* Search Overlay */
          .search-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.98);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 300;
            display: flex;
            flex-direction: column;
            padding: 80px 24px 24px;
          }

          .search-overlay.open {
            opacity: 1;
            pointer-events: all;
          }

          .search-input {
            width: 100%;
            max-width: 600px;
            margin: 0 auto 40px;
            padding: 16px 0;
            border: none;
            border-bottom: 2px solid #000000;
            font-family: 'Crimson Pro', serif;
            font-size: 32px;
            background: transparent;
            outline: none;
          }

          .search-results {
            max-width: 600px;
            margin: 0 auto;
            width: 100%;
          }

          .search-result-item {
            padding: 20px;
            margin-bottom: 12px;
            border-radius: 16px;
            background: #fafafa;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .search-result-item:hover {
            background: #f0f0f0;
            transform: translateX(4px);
          }

          .search-result-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .search-result-excerpt {
            font-size: 16px;
            color: #666;
            line-height: 1.5;
          }

          /* Main Content */
          .main-content {
            padding-top: 64px;
            min-height: 100vh;
          }

          .page-container {
            max-width: 680px;
            margin: 0 auto;
            padding: 60px 24px;
          }

          .page-title {
            font-size: 48px;
            font-weight: 600;
            margin-bottom: 40px;
            letter-spacing: -0.03em;
          }

          /* Feed/Post Cards */
          .post-card {
            margin-bottom: 32px;
            padding: 32px;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            animation: fadeInUp 0.6s ease;
            border: 1px solid #f0f0f0;
          }

          .post-card:last-child {
            margin-bottom: 0;
          }

          .post-date {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            color: #999;
            margin-bottom: 12px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }

          .post-title {
            font-size: 36px;
            font-weight: 600;
            margin-bottom: 20px;
            letter-spacing: -0.02em;
            line-height: 1.2;
            // color: var(--accent);
          }

          .post-content {
            font-size: 18px;
            line-height: 1.8;
            color: #333;
          }

          /* Back Button */
          .back-button {
            background: transparent;
            border: none;
            font-family: 'Crimson Pro', serif;
            font-size: 16px;
            color: #666;
            cursor: pointer;
            padding: 8px 0;
            margin-bottom: 32px;
            transition: color 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }

          .back-button:hover {
            color: var(--accent);
          }

          /* Clickable Posts */
          .clickable-post {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .clickable-post:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
          }

          /* Story Editor */
          .story-list {
            display: grid;
            gap: 16px;
            margin-bottom: 40px;
          }

          .story-item {
            padding: 24px;
            border-radius: 16px;
            background: #fafafa;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s ease;
          }

          .story-item:hover {
            background: #f0f0f0;
          }

          .story-info h3 {
            font-size: 20px;
            margin-bottom: 8px;
          }

          .story-info p {
            font-size: 14px;
            color: #666;
          }

          .story-actions {
            display: flex;
            gap: 8px;
          }

          .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 20px;
            font-family: 'Crimson Pro', serif;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .btn-primary {
            background: var(--accent);
            color: #ffffff;
          }

          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .btn-secondary {
            background: #f0f0f0;
            color: #000000;
          }

          .btn-secondary:hover {
            background: #e0e0e0;
          }

          .btn-danger {
            background: #ff4444;
            color: #ffffff;
          }

          .btn-danger:hover {
            background: #cc0000;
          }

          /* Editor */
          .editor {
            background: #fafafa;
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
          }

          .editor input,
          .editor textarea {
            width: 100%;
            padding: 16px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-family: 'Crimson Pro', serif;
            font-size: 16px;
            margin-bottom: 16px;
            outline: none;
            transition: border 0.2s ease;
          }

          .editor input:focus,
          .editor textarea:focus {
            border-color: var(--accent);
          }

          .editor textarea {
            min-height: 300px;
            resize: vertical;
            font-size: 18px;
            line-height: 1.8;
          }

          /* Settings */
          .setting-group {
            margin-bottom: 32px;
          }

          .setting-label {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
            display: block;
          }

          .color-picker-wrapper {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .color-picker {
            width: 60px;
            height: 60px;
            border-radius: 30px;
            border: 3px solid #000000;
            cursor: pointer;
            transition: transform 0.2s ease;
          }

          .color-picker:hover {
            transform: scale(1.1);
          }

          .color-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 16px;
            padding: 12px 20px;
            background: #f0f0f0;
            border-radius: 12px;
          }

          /* Animations */
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .fade-in {
            animation: fadeInUp 0.6s ease;
          }

          /* Responsive */
          @media (max-width: 768px) {
            .page-title {
              font-size: 36px;
            }

            .post-title {
              font-size: 28px;
            }

            .search-input {
              font-size: 24px;
            }
          }
        `}</style>
      </div>
    </AppContext.Provider>
  );
}

// Header Component
function Header({ menuOpen, setMenuOpen, searchOpen, setSearchOpen }) {
  return (
    <header className="header">
      <button 
        className="icon-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
      >
        <MenuIcon size={20} />
      </button>
      
      <button 
        className="icon-btn"
        onClick={() => setSearchOpen(!searchOpen)}
        aria-label="Search"
      >
        <Search size={20} />
      </button>
    </header>
  );
}

// Menu Component
function MenuComponent({ isOpen, onClose, onLogin, onLogout }) {
  const { currentPage, setCurrentPage, isLoggedIn } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const menuItems = [
    { id: 'feed', label: 'Feed' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
    { id: 'documents', label: 'Documents' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'tools', label: 'Tools' },
    ...(isLoggedIn ? [{ id: 'stories', label: 'Stories' }] : []),
    ...(isLoggedIn ? [{ id: 'settings', label: 'Settings' }] : []),
  ];

  const handleNavigation = (pageId) => {
    setCurrentPage(pageId);
    onClose();
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
    setEmail('');
    setPassword('');
  };

  return (
    <>
      <div 
        className={`menu-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      <nav className={`menu-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <div className="menu-title">Menu</div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="menu-items">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`menu-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavigation(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="menu-footer">
          {isLoggedIn ? (
            <button className="btn btn-secondary" onClick={onLogout}>
              <LogOut size={16} />
              Logout
            </button>
          ) : (
            <form onSubmit={handleLoginSubmit} className="login-form">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                <LogIn size={16} />
                Login
              </button>
            </form>
          )}
        </div>
      </nav>
    </>
  );
}

// Search Overlay Component
function SearchOverlay({ isOpen, onClose }) {
  const { searchQuery, setSearchQuery, setSelectedStory, setCurrentPage } = useApp();
  const [results, setResults] = useState([]);

  useEffect(() => {
    const searchStories = async () => {
      if (searchQuery.trim()) {
        const { data, error } = await supabase
          .from('stories')
          .select('*')
          .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
          .order('date', { ascending: false });
        
        if (data) {
          setResults(data);
        }
      } else {
        setResults([]);
      }
    };

    if (isOpen) {
      searchStories();
    }
  }, [searchQuery, isOpen]);

  const handleResultClick = (story) => {
    setSelectedStory(story);
    setCurrentPage('feed');
    onClose();
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className={`search-overlay ${isOpen ? 'open' : ''}`}>
      <button 
        className="icon-btn" 
        onClick={onClose}
        style={{ position: 'absolute', top: '16px', right: '24px' }}
      >
        <X size={24} />
      </button>

      <input
        type="text"
        className="search-input"
        placeholder="Search stories..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
      />

      <div className="search-results">
        {results.map(story => (
          <div 
            key={story.id} 
            className="search-result-item" 
            onClick={() => handleResultClick(story)}
          >
            <div className="search-result-title">{story.title}</div>
            <div className="search-result-excerpt">{story.excerpt}</div>
          </div>
        ))}
        {searchQuery && results.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
            No results found
          </div>
        )}
      </div>
    </div>
  );
}

// Feed Page Component
function FeedPage() {
  const [stories, setStories] = useState([]);
  const { selectedStory, setSelectedStory } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('date', { ascending: false });
    
    if (data) {
      setStories(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="page-container">Loading...</div>;
  }

  // If a story is selected, show detail view
  if (selectedStory) {
    return (
      <div className="page-container">
        <button 
          className="back-button"
          onClick={() => setSelectedStory(null)}
        >
          ← Back to Feed
        </button>
        <article className="post-card" style={{ paddingBottom: '40px' }}>
          <div className="post-date">
            {new Date(selectedStory.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
          <h1 className="post-title" style={{ fontSize: '48px', marginBottom: '32px' }}>
            {selectedStory.title}
          </h1>
          <div className="post-excerpt" style={{ fontSize: '20px', lineHeight: '1.8', marginBottom: '32px' }}>
            {selectedStory.excerpt}
          </div>
          <div className="post-content" style={{ fontSize: '20px', lineHeight: '1.8' }}>
            {selectedStory.content}
          </div>
        </article>
      </div>
    );
  }

  // Otherwise show the feed
  return (
    <div className="page-container">
      {stories.map((story, index) => (
        <article 
          key={story.id} 
          className="post-card clickable-post"
          style={{ animationDelay: `${index * 0.1}s`, cursor: 'pointer' }}
          onClick={() => setSelectedStory(story)}
        >
          <div className="post-date">
            {new Date(story.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
          <h2 className="post-title">{story.title}</h2>
          <div className="post-content">{story.content}</div>
        </article>
      ))}
    </div>
  );
}

// About Page
function AboutPage() {
  return (
    <div className="page-container fade-in">
      <h1 className="page-title">About</h1>
      <div className="post-content">
        <p style={{ marginBottom: '24px' }}>
          My name is Tyler Kotlowski. I am 31 years old. I live in Minneapolis.
        </p>
        <p style={{ marginBottom: '24px' }}>
          Building with intention, crafting with care, and focusing on clean design.
        </p>
        <p>
          Every element serves a purpose. Every interaction feels natural.
        </p>
      </div>
    </div>
  );
}

// Contact Page
function ContactPage() {
  return (
    <div className="page-container fade-in">
      <h1 className="page-title">Contact</h1>
      <div className="post-content">
        <p style={{ marginBottom: '24px' }}>
          Get in touch at <strong>tyjkot@proton.me</strong>
        </p>
        <p>
          Or at <strong>(239) 484-4749</strong>
        </p>
      </div>
    </div>
  );
}

// Documents Page
function DocumentsPage() {
  return (
    <div className="page-container fade-in">
      <h1 className="page-title">Documents</h1>
      <div className="post-content">
        <p>Document library coming soon.</p>
      </div>
    </div>
  );
}

// Gallery Page
function GalleryPage() {
  return (
    <div className="page-container fade-in">
      <h1 className="page-title">Gallery</h1>
      <div className="post-content">
        <p>Image gallery coming soon.</p>
      </div>
    </div>
  );
}

// Tools Page
function ToolsPage() {
  return (
    <div className="page-container fade-in">
      <h1 className="page-title">Tools</h1>
      <div className="post-content">
        <p>Helpful tools and utilities coming soon.</p>
      </div>
    </div>
  );
}

// Stories Page (Admin Only)
function StoriesPage() {
  const { isLoggedIn } = useApp();
  const [stories, setStories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({ title: '', content: '', excerpt: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn) {
      loadStories();
    }
  }, [isLoggedIn]);

  const loadStories = async () => {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('date', { ascending: false });
    
    if (data) {
      setStories(data);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditing('new');
    setEditData({ title: '', content: '', excerpt: '' });
  };

  const handleEdit = (story) => {
    setEditing(story.id);
    setEditData({ title: story.title, content: story.content, excerpt: story.excerpt });
  };

  const handleSave = async () => {
    if (!editData.title || !editData.content) return;

    if (editing === 'new') {
      const { error } = await supabase
        .from('stories')
        .insert([{
          id: `story-${Date.now()}`,
          title: editData.title,
          content: editData.content,
          excerpt: editData.excerpt || editData.content.substring(0, 120),
          date: new Date().toISOString(),
          author: 'Admin'
        }]);
      
      if (error) {
        alert('Error creating story: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('stories')
        .update({
          title: editData.title,
          content: editData.content,
          excerpt: editData.excerpt || editData.content.substring(0, 120)
        })
        .eq('id', editing);
      
      if (error) {
        alert('Error updating story: ' + error.message);
        return;
      }
    }

    setEditing(null);
    setEditData({ title: '', content: '', excerpt: '' });
    loadStories();
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this story?')) {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id);
      
      if (error) {
        alert('Error deleting story: ' + error.message);
        return;
      }
      
      loadStories();
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setEditData({ title: '', content: '', excerpt: '' });
  };

  if (!isLoggedIn) {
    return (
      <div className="page-container fade-in">
        <h1 className="page-title">Stories</h1>
        <p>Please log in to manage stories.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="page-container">Loading...</div>;
  }

  return (
    <div className="page-container fade-in">
      <h1 className="page-title">Stories</h1>

      {editing ? (
        <div className="editor">
          <input
            type="text"
            placeholder="Story Title"
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          />
          <input
            type="text"
            placeholder="Excerpt (optional)"
            value={editData.excerpt}
            onChange={(e) => setEditData({ ...editData, excerpt: e.target.value })}
          />
          <textarea
            placeholder="Write your story..."
            value={editData.content}
            onChange={(e) => setEditData({ ...editData, content: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Story
            </button>
            <button className="btn btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <button className="btn btn-primary" onClick={handleCreate} style={{ marginBottom: '32px' }}>
            <Plus size={16} />
            New Story
          </button>

          <div className="story-list">
            {stories.map(story => (
              <div key={story.id} className="story-item">
                <div className="story-info">
                  <h3>{story.title}</h3>
                  <p>{new Date(story.date).toLocaleDateString()}</p>
                </div>
                <div className="story-actions">
                  <button 
                    className="icon-btn" 
                    onClick={() => handleEdit(story)}
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    className="icon-btn" 
                    onClick={() => handleDelete(story.id)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Settings Page (Admin Only)
function SettingsPage() {
  const { isLoggedIn, accentColor, updateAccentColor } = useApp();

  if (!isLoggedIn) {
    return (
      <div className="page-container fade-in">
        <h1 className="page-title">Settings</h1>
        <p>Please log in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      <h1 className="page-title">Settings</h1>

      <div className="setting-group">
        <label className="setting-label">Accent Color</label>
        <div className="color-picker-wrapper">
          <input
            type="color"
            className="color-picker"
            value={accentColor}
            onChange={(e) => updateAccentColor(e.target.value)}
          />
          <div className="color-value">{accentColor}</div>
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label">Theme</label>
        <p style={{ color: '#666' }}>
          This minimal blog uses a clean white background with black text. 
          The accent color can be customized above.
        </p>
      </div>
    </div>
  );
}

// Reset Password Page
function ResetPasswordPage() {
  const { setCurrentPage } = useApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);

    if (updateError) {
      setError('Error updating password: ' + updateError.message);
    } else {
      setMessage('Password updated successfully! Redirecting...');
      
      // Clear hash from URL
      window.history.replaceState(null, '', window.location.pathname);
      
      setTimeout(() => {
        setCurrentPage('feed');
      }, 2000);
    }
  };

  return (
    <div className="page-container fade-in">
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1 className="page-title">Reset Password</h1>
        <p style={{ marginBottom: '32px', color: '#666' }}>Enter your new password below</p>
        
        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontFamily: 'Crimson Pro, serif'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontFamily: 'Crimson Pro, serif'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#fee',
              color: '#c00',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#efe',
              color: '#060',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}