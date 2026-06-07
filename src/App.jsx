import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bookmark, Library, LogOut, Search, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { onAuthStateChange, signInWithEmail, signOut, signUpWithEmail, getMyProfile } from './services/auth';
import { listBooks } from './services/books';
import { borrowBook, getMyLibrary, returnBook } from './services/library';
import { listMyBookmarks, createBookmark } from './services/bookmarks';
import { getAdminDashboardStats } from './services/analytics';
import './styles.css';

const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const demoBooks = [
  {
    id: 'demo-ai',
    title: 'AI for Education',
    author: 'ThanConnect Research Team',
    category: 'Technology',
    pages: 120,
    description: 'แนวคิดและตัวอย่างการใช้ AI เพื่อออกแบบการเรียนรู้ยุคใหม่',
    cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80',
    flipbook_url: './production-status.html',
  },
  {
    id: 'demo-library',
    title: 'Digital Library Playbook',
    author: 'Library Innovation Unit',
    category: 'Library',
    pages: 96,
    description: 'คู่มือออกแบบคลังหนังสือดิจิทัลและประสบการณ์ผู้อ่าน',
    cover_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80',
    flipbook_url: './production-status.html',
  },
  {
    id: 'demo-design',
    title: 'Learning Design Toolkit',
    author: 'TEG Learning Lab',
    category: 'Education',
    pages: 144,
    description: 'เครื่องมือสำหรับออกแบบบทเรียน กิจกรรม และการประเมินผล',
    cover_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=80',
    flipbook_url: './production-status.html',
  },
];

export default function App() {
  if (!hasSupabaseConfig) return <DemoApp />;
  return <ProductionApp />;
}

function ProductionApp() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('gallery');
  const [books, setBooks] = useState([]);
  const [library, setLibrary] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        try {
          setProfile(await getMyProfile());
        } catch (error) {
          setMessage(error.message);
        }
      } else {
        setProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (session) refreshData();
  }, [session]);

  async function refreshData() {
    setLoading(true);
    try {
      const [bookRows, libraryRows, bookmarkRows] = await Promise.all([
        listBooks({ query }),
        getMyLibrary(),
        listMyBookmarks(),
      ]);
      setBooks(bookRows);
      setLibrary(libraryRows);
      setBookmarks(bookmarkRows);
      if (profile?.role === 'admin' || profile?.role === 'librarian') {
        setStats(await getAdminDashboardStats());
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBorrow(bookId) {
    try {
      await borrowBook(bookId);
      await refreshData();
      setMessage('ยืมหนังสือแล้ว');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleReturn(bookId) {
    try {
      await returnBook(bookId);
      await refreshData();
      setMessage('คืนหนังสือแล้ว');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleBookmark(bookId) {
    try {
      await createBookmark(bookId, { page: 1 });
      await refreshData();
      setMessage('บันทึก Bookmark แล้ว');
    } catch (error) {
      setMessage(error.message);
    }
  }

  const borrowedIds = useMemo(() => new Set(library.map((item) => item.book_id)), [library]);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'librarian';

  if (!session) return <AuthScreen message={message} setMessage={setMessage} />;

  return (
    <Shell view={view} setView={setView} profile={profile} onLogout={signOut} admin={isAdmin} message={message}>
      {view === 'gallery' && (
        <Gallery
          books={books}
          borrowedIds={borrowedIds}
          query={query}
          setQuery={setQuery}
          refreshData={refreshData}
          onBorrow={handleBorrow}
          onBookmark={handleBookmark}
          loading={loading}
        />
      )}
      {view === 'library' && <MyLibrary library={library} onReturn={handleReturn} />}
      {view === 'profile' && <Profile profile={profile} bookmarks={bookmarks} library={library} />}
      {view === 'admin' && <Admin stats={stats} />}
    </Shell>
  );
}

function DemoApp() {
  const [view, setView] = useState('gallery');
  const [library, setLibrary] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('Demo Mode: ตั้งค่า .env เพื่อเชื่อม Supabase จริง');
  const profile = {
    full_name: 'Demo Reader',
    email: 'demo@thanconnect.local',
    role: 'admin',
    avatar_url: 'https://api.dicebear.com/8.x/initials/svg?seed=Demo',
  };

  const filtered = demoBooks.filter((book) =>
    `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(query.toLowerCase())
  );
  const borrowedIds = new Set(library.map((item) => item.book_id));
  const borrow = (bookId) => {
    if (borrowedIds.has(bookId)) return;
    const book = demoBooks.find((item) => item.id === bookId);
    setLibrary([{ id: `loan-${bookId}`, book_id: bookId, status: 'reading', book }, ...library]);
    setMessage('Demo: ยืมหนังสือแล้ว');
  };
  const ret = (bookId) => {
    setLibrary(library.filter((item) => item.book_id !== bookId));
    setMessage('Demo: คืนหนังสือแล้ว');
  };
  const mark = (bookId) => {
    const book = demoBooks.find((item) => item.id === bookId);
    setBookmarks([{ id: `bm-${Date.now()}`, book_id: bookId, book, page: 1 }, ...bookmarks]);
    setMessage('Demo: บันทึก Bookmark แล้ว');
  };
  const stats = { totalBooks: demoBooks.length, totalUsers: 1, activeLoans: library.length, averageProgress: 35 };

  return (
    <Shell view={view} setView={setView} profile={profile} onLogout={() => setMessage('Demo Mode ยังไม่ต้อง Logout')} admin message={message}>
      {view === 'gallery' && (
        <Gallery
          books={filtered}
          borrowedIds={borrowedIds}
          query={query}
          setQuery={setQuery}
          refreshData={() => {}}
          onBorrow={borrow}
          onBookmark={mark}
          loading={false}
          demo
        />
      )}
      {view === 'library' && <MyLibrary library={library} onReturn={ret} />}
      {view === 'profile' && <Profile profile={profile} bookmarks={bookmarks} library={library} />}
      {view === 'admin' && <Admin stats={stats} demo />}
    </Shell>
  );
}

function Shell({ view, setView, profile, onLogout, admin, message, children }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><BookOpen /> <span>ThanConnect Library</span></div>
        <button className={view === 'gallery' ? 'active' : ''} onClick={() => setView('gallery')}><Library /> หนังสือ</button>
        <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}><Bookmark /> ชั้นของฉัน</button>
        <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}><UserRound /> โปรไฟล์</button>
        {admin && <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}><ShieldCheck /> Admin</button>}
        <button onClick={onLogout}><LogOut /> ออกจากระบบ</button>
        <div className="userbox"><UserRound /><div><b>{profile?.full_name || 'User'}</b><small>{profile?.email}</small></div></div>
      </aside>
      <main className="content">
        {message && <div className="notice">{message} <a href="./production-status.html">Production Status</a></div>}
        {children}
      </main>
    </div>
  );
}

function AuthScreen({ message, setMessage }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  async function submit(event) {
    event.preventDefault();
    try {
      if (mode === 'login') await signInWithEmail(form.email, form.password);
      else await signUpWithEmail(form.email, form.password, form.name);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="content authPage">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Production Auth</p>
          <h1>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h1>
          <p>ใช้ Supabase Auth จริง พร้อม session และ profile</p>
        </div>
        <Sparkles className="heroIcon" />
      </section>
      <form className="panel form" onSubmit={submit}>
        <div className="formGrid">
          {mode === 'signup' && <div className="field full"><label>ชื่อ</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>}
          <div className="field full"><label>Email</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field full"><label>Password</label><input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <button className="btn" type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
          <button className="btn secondary" type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'สร้างบัญชีใหม่' : 'มีบัญชีแล้ว'}</button>
        </div>
      </form>
      {message && <div className="notice">{message}</div>}
    </main>
  );
}

function Gallery({ books, borrowedIds, query, setQuery, refreshData, onBorrow, onBookmark, loading, demo }) {
  const categories = useMemo(() => ['ทั้งหมด', ...new Set(books.map((book) => book.category).filter(Boolean))], [books]);
  const [category, setCategory] = useState('ทั้งหมด');
  const visibleBooks = useMemo(() => {
    if (category === 'ทั้งหมด') return books;
    return books.filter((book) => book.category === category);
  }, [books, category]);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">{demo ? 'Demo Preview' : 'Production Library'}</p>
          <h1>คลังหนังสือดิจิทัล</h1>
          <p>{demo ? 'ดูหน้าเว็บได้ทันที และพร้อมสลับเป็น Supabase เมื่อเพิ่ม .env' : 'ข้อมูลมาจาก Supabase จริง'}</p>
        </div>
        <BookOpen className="heroIcon" />
      </section>

      <section className="summaryGrid">
        <div className="summaryCard"><b>{books.length}</b><span>หนังสือทั้งหมด</span></div>
        <div className="summaryCard"><b>{borrowedIds.size}</b><span>อยู่ในชั้นของฉัน</span></div>
        <div className="summaryCard"><b>{categories.length - 1}</b><span>หมวดหมู่</span></div>
      </section>

      <div className="toolbar">
        <Search size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && refreshData()} placeholder="ค้นหาหนังสือ ผู้แต่ง หรือหมวดหมู่" />
        <button className="btn" onClick={refreshData}>ค้นหา</button>
      </div>

      <div className="chips" aria-label="ตัวกรองหมวดหมู่">
        {categories.map((item) => <button key={item} className={item === category ? 'chip active' : 'chip'} onClick={() => setCategory(item)}>{item}</button>)}
      </div>

      {loading && <p className="muted">Loading...</p>}
      {!loading && visibleBooks.length === 0 && <div className="empty">ไม่พบหนังสือที่ตรงกับเงื่อนไข</div>}
      <section className="grid">
        {visibleBooks.map((book) => <BookCard key={book.id} book={book} borrowed={borrowedIds.has(book.id)} onBorrow={onBorrow} onBookmark={onBookmark} />)}
      </section>
    </>
  );
}

function BookCard({ book, borrowed, onBorrow, onBookmark }) {
  return (
    <article className="card">
      <img src={book.cover_url || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80'} alt={book.title} />
      <div className="body">
        <span className="pill">{book.category || 'General'}</span>
        <h3>{book.title}</h3>
        <p>{book.description || 'ไม่มีคำอธิบาย'}</p>
        <p className="muted">{book.author || 'ไม่ระบุผู้แต่ง'} • {book.pages || 0} หน้า</p>
      </div>
      <div className="actions">
        <button className="btn" disabled={borrowed} onClick={() => onBorrow(book.id)}>{borrowed ? 'อยู่ในชั้น' : 'ยืม'}</button>
        <a className="btn secondary" href={book.flipbook_url || './production-status.html'} target="_blank" rel="noreferrer">อ่าน</a>
        <button className="btn secondary" onClick={() => onBookmark(book.id)}>Bookmark</button>
      </div>
    </article>
  );
}

function MyLibrary({ library, onReturn }) {
  return (
    <section>
      <h1>ชั้นหนังสือของฉัน</h1>
      {library.length === 0 && <div className="empty">ยังไม่มีหนังสือในชั้น</div>}
      <div className="list">
        {library.map((item) => (
          <div className="row" key={item.id}>
            <img src={item.book?.cover_url || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80'} alt={item.book?.title || ''} />
            <div className="grow"><h3>{item.book?.title}</h3><p className="muted">สถานะ: {item.status}</p></div>
            <a className="btn secondary" href={item.book?.flipbook_url || './production-status.html'} target="_blank" rel="noreferrer">อ่าน</a>
            <button className="btn danger" onClick={() => onReturn(item.book_id)}>คืน</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Profile({ profile, bookmarks, library }) {
  return (
    <section>
      <h1>โปรไฟล์</h1>
      <div className="row profileRow">
        <img className="avatar" src={profile?.avatar_url || 'https://api.dicebear.com/8.x/initials/svg?seed=User'} alt="" />
        <div className="grow"><h3>{profile?.full_name}</h3><p className="muted">{profile?.email} • {profile?.role}</p></div>
      </div>
      <div className="stats">
        <div className="stat"><b>{library.length}</b><span>หนังสือในชั้น</span></div>
        <div className="stat"><b>{bookmarks.length}</b><span>Bookmarks</span></div>
      </div>
    </section>
  );
}

function Admin({ stats, demo }) {
  if (!stats) return <section><h1>Admin</h1><div className="empty">ไม่มีข้อมูลหรือคุณไม่มีสิทธิ์</div></section>;

  return (
    <section>
      <h1>Admin Dashboard</h1>
      {demo && <div className="notice">Demo dashboard — เชื่อมข้อมูลจริงเมื่อเพิ่ม Supabase .env</div>}
      <div className="stats">
        <div className="stat"><b>{stats.totalBooks}</b><span>หนังสือ</span></div>
        <div className="stat"><b>{stats.totalUsers}</b><span>ผู้ใช้</span></div>
        <div className="stat"><b>{stats.activeLoans}</b><span>กำลังยืม</span></div>
        <div className="stat"><b>{stats.averageProgress}%</b><span>อ่านเฉลี่ย</span></div>
      </div>
    </section>
  );
}
