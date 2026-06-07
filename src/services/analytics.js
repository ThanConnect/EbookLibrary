import { supabase } from '../lib/supabase';

export async function logReaderEvent({ bookId = null, eventType, page = null, percent = null, metadata = {} }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('reader_events')
    .insert({
      user_id: user.id,
      book_id: bookId,
      event_type: eventType,
      page,
      percent,
      metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAdminDashboardStats() {
  const [books, profiles, loans, events, progress] = await Promise.all([
    supabase.from('books').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('user_library').select('id,status,book_id,user_id,borrowed_at'),
    supabase.from('reader_events').select('id,event_type,book_id,user_id,created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('reading_progress').select('percent'),
  ]);

  for (const result of [books, profiles, loans, events, progress]) {
    if (result.error) throw result.error;
  }

  const progressRows = progress.data || [];
  const averageProgress = progressRows.length
    ? Math.round(progressRows.reduce((sum, row) => sum + Number(row.percent || 0), 0) / progressRows.length)
    : 0;

  return {
    totalBooks: books.count || 0,
    totalUsers: profiles.count || 0,
    activeLoans: (loans.data || []).filter((item) => item.status !== 'returned').length,
    completedLoans: (loans.data || []).filter((item) => item.status === 'completed').length,
    averageProgress,
    recentEvents: events.data || [],
  };
}

export async function getPopularBooks(limit = 10) {
  const { data, error } = await supabase
    .from('reader_events')
    .select('book_id,event_type,book:books(id,title,author,category,cover_url)')
    .not('book_id', 'is', null);

  if (error) throw error;

  const scores = new Map();
  for (const event of data || []) {
    if (!event.book_id || !event.book) continue;
    const current = scores.get(event.book_id) || {
      book: event.book,
      opens: 0,
      borrows: 0,
      bookmarks: 0,
      progressUpdates: 0,
      score: 0,
    };

    if (event.event_type === 'open_book') current.opens += 1;
    if (event.event_type === 'borrow_book') current.borrows += 1;
    if (event.event_type === 'bookmark') current.bookmarks += 1;
    if (event.event_type === 'update_progress') current.progressUpdates += 1;
    current.score += 1;
    scores.set(event.book_id, current);
  }

  return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
