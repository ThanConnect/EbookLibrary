import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  Library,
  Search,
  User,
  RotateCcw,
  BarChart3,
  Bookmark,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'thanconnect-ebook-library-v1';

const sampleBooks = [
  {
    id: 'ai-education',
    title: 'AI for Education',
    author: 'ThanConnect Research Team',
    category: 'Technology',
    pages: 120,
    description: 'แนวคิดและตัวอย่างการใช้ AI เพื่อออกแบบการเรียนรู้ยุคใหม่',
    cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80',
    flipbookUrl: 'https://heyzine.com/flip-book/sample.pdf',
  },
  {
    id: 'digital-library',
    title: 'Digital Library Playbook',
    author: 'Library Innovation Unit',
    category: 'Library',
    pages: 96,
    description: 'คู่มือออกแบบคลังหนังสือดิจิทัลและประสบการณ์ผู้อ่าน',
    cover: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80',
    flipbookUrl: 'https://heyzine.com/flip-book/sample.pdf',
  },
  {
    id: 'learning-design',
    title: 'Learning Design Toolkit',
    author: 'TEG Learning Lab',
    category: 'Education',
    pages: 144,
    description: 'เครื่องมือสำหรับออกแบบบทเรียน กิจกรรม และการประเมินผล',
    cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=80',
    flipbookUrl: 'https://heyzine.com/flip-book/sample.pdf',
  },
];

const defaultState = {
  currentUser: { id: 'reader-1', name: 'Sanga Khaonu', email: 'appmigs@gmail.com', role: 'reader' },
  books: sampleBooks,
  library: [],
  progress: {},
  bookmarks: [],
  events: [],
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  } catch {
    return defaultState;
  }
}

function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('gallery');
  const [activeBookId, setActiveBookId] = useState(null);
  const [query, setQuery] = useState('');

  const save = (next) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const booksById = useMemo(() => Object.fromEntries(state.books.map((book) => [book.id, book])), [state.books]);
  const borrowedBookIds = new Set(state.library.filter((item) => item.status !== 'returned').map((item) => item.bookId));
  const filteredBooks = state.books.filter((book) => {
    const text = `${book.title} ${book.author} ${book.category}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const addEvent = (event) => ({ ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() });

  const borrowBook = (bookId) => {
    if (borrowedBookIds.has(bookId)) return;
    save({
      ...state,
      library: [...state.library, { id: crypto.randomUUID(), userId: state.currentUser.id, bookId, status: 'reading', addedAt: new Date().toISOString() }],
      events: [...state.events, addEvent({ type: 'borrow_book', userId: state.currentUser.id, bookId })],
    });
  };

  const returnBook = (bookId) => {
    save({
      ...state,
      library: state.library.map((item) => (item.bookId === bookId ? { ...item, status: 'returned', returnedAt: new Date().toISOString() } : item)),
      events: [...state.events, addEvent({ type: 'return_book', userId: state.currentUser.id, bookId })],
    });
  };

  const openReader = (bookId) => {
    borrowBook(bookId);
    setActiveBookId(bookId);
    setView('reader');
    save({ ...state, events: [...state.events, addEvent({ type: 'open_book', userId: state.currentUser.id, bookId })] });
  };

  const updateProgress = (bookId, percent) => {
    const book = booksById[bookId];
    const currentPage = Math.max(1, Math.round((percent / 100) * book.pages));
    const status = percent >= 100 ? 'completed' : 'reading';
    save({
      ...state,
      progress: {
        ...state.progress,
        [bookId]: { percent, currentPage, totalPages: book.pages, lastReadAt: new Date().toISOString() },
      },
      library: state.library.map((item) => (item.bookId === bookId ? { ...item, status } : item)),
      events: [...state.events, addEvent({ type: 'update_progress', userId: state.currentUser.id, bookId, percent, page: currentPage })],
    });
  };

  const addBookmark = (bookId) => {
    const progress = state.progress[bookId] || { currentPage: 1 };
    save({
      ...state,
      bookmarks: [...state.bookmarks, { id: crypto.randomUUID(), bookId, page: progress.currentPage, createdAt: new Date().toISOString() }],
      events: [...state.events, addEvent({ type: 'bookmark', userId: state.currentUser.id, bookId, page: progress.currentPage })],
    });
  };

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
    setView('gallery');
  };

  const activeBook = activeBookId ? booksById[activeBookId] : null;
  const myBooks = state.library.filter((item) => item.status !== 'returned').map((item) => ({ ...item, book: booksById[item.bookId], progress: state.progress[item.bookId] }));

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><BookOpen /> <span>ThanConnect Library</span></div>
        <button className={view === 'gallery' ? 'active' : ''} onClick={() => setView('gallery')}><Library /> แกลเลอรี</button>
        <button className={view === 'my-library' ? 'active' : ''} onClick={() => setView('my-library')}><Bookmark /> ชั้นหนังสือของฉัน</button>
        <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}><BarChart3 /> Dashboard</button>
        <button onClick={resetDemo}><RotateCcw /> ล้างข้อมูลตัวอย่าง</button>
        <div className="userbox"><User /> <div><b>{state.currentUser.name}</b><small>{state.currentUser.email}</small></div></div>
      </aside>

      <main className="content">
        {view === 'gallery' && (
          <>
            <header className="hero">
              <div><p className="eyebrow">Digital Ebook Library</p><h1>คลังหนังสือดิจิทัลสำหรับอ่านแบบพลิกหน้า</h1><p>ยืมหนังสือ เก็บเข้าชั้นส่วนตัว อ่านต่อจากจุดเดิม และติดตามความคืบหน้าของผู้อ่านได้</p></div>
              <ShieldCheck className="heroIcon" />
            </header>
            <div className="toolbar"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อหนังสือ ผู้แต่ง หรือหมวดหมู่" /></div>
            <section className="grid">
              {filteredBooks.map((book) => (
                <article className="card" key={book.id}>
                  <img src={book.cover} alt={book.title} />
                  <div className="cardBody"><span className="pill">{book.category}</span><h3>{book.title}</h3><p>{book.description}</p><small>{book.author} • {book.pages} หน้า</small></div>
                  <div className="actions">
                    <button onClick={() => borrowBook(book.id)} disabled={borrowedBookIds.has(book.id)}>{borrowedBookIds.has(book.id) ? 'อยู่ในชั้นแล้ว' : 'ยืมหนังสือ'}</button>
                    <button className="secondary" onClick={() => openReader(book.id)}>เปิดอ่าน</button>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}

        {view === 'my-library' && (
          <section><h1>ชั้นหนังสือของฉัน</h1><p className="muted">หนังสือที่ยืมไว้และความคืบหน้าการอ่าน</p>
            <div className="list">{myBooks.map(({ book, progress, status }) => (
              <div className="row" key={book.id}><img src={book.cover} alt="" /><div className="grow"><h3>{book.title}</h3><p>{status === 'completed' ? 'อ่านจบแล้ว' : 'กำลังอ่าน'} • หน้า {progress?.currentPage || 1}/{book.pages}</p><div className="bar"><span style={{ width: `${progress?.percent || 0}%` }} /></div></div><button onClick={() => openReader(book.id)}>อ่านต่อ</button><button className="danger" onClick={() => returnBook(book.id)}>คืนหนังสือ</button></div>
            ))}{myBooks.length === 0 && <div className="empty">ยังไม่มีหนังสือในชั้นส่วนตัว</div>}</div>
          </section>
        )}

        {view === 'reader' && activeBook && (
          <section className="reader"><div className="readerTop"><div><h1>{activeBook.title}</h1><p className="muted">อ่านผ่าน Flipbook URL และบันทึก progress แยกตามผู้ใช้</p></div><button onClick={() => addBookmark(activeBook.id)}><Bookmark /> Bookmark</button></div>
            <iframe title={activeBook.title} src={activeBook.flipbookUrl}></iframe>
            <div className="progressPanel"><label>ความคืบหน้า: {state.progress[activeBook.id]?.percent || 0}%</label><input type="range" min="0" max="100" value={state.progress[activeBook.id]?.percent || 0} onChange={(e) => updateProgress(activeBook.id, Number(e.target.value))} /><button onClick={() => updateProgress(activeBook.id, 100)}><CheckCircle2 /> อ่านจบแล้ว</button></div>
          </section>
        )}

        {view === 'admin' && <Dashboard state={state} booksById={booksById} />}
      </main>
    </div>
  );
}

function Dashboard({ state, booksById }) {
  const activeLoans = state.library.filter((item) => item.status !== 'returned').length;
  const completed = state.library.filter((item) => item.status === 'completed').length;
  const avg = Object.values(state.progress).length ? Math.round(Object.values(state.progress).reduce((sum, item) => sum + item.percent, 0) / Object.values(state.progress).length) : 0;
  return <section><h1>Dashboard ผู้ดูแล</h1><div className="stats"><div><b>{state.books.length}</b><span>หนังสือทั้งหมด</span></div><div><b>{activeLoans}</b><span>กำลังยืม</span></div><div><b>{completed}</b><span>อ่านจบ</span></div><div><b>{avg}%</b><span>ค่าเฉลี่ยการอ่าน</span></div></div><h2>กิจกรรมล่าสุด</h2><div className="list">{state.events.slice(-10).reverse().map((event) => <div className="event" key={event.id}><Upload /><div><b>{event.type}</b><p>{booksById[event.bookId]?.title || '-'} {event.percent ? `• ${event.percent}%` : ''}</p></div><small>{new Date(event.createdAt).toLocaleString('th-TH')}</small></div>)}</div></section>;
}

createRoot(document.getElementById('root')).render(<App />);
