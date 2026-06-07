import { supabase } from '../lib/supabase';
import { getCurrentUser } from './auth';

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

export async function listMyBookmarks(bookId = null) {
  const user = await requireUser();

  let request = supabase
    .from('bookmarks')
    .select(`
      *,
      book:books(id, title, author, category, pages, cover_url, flipbook_url)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (bookId) request = request.eq('book_id', bookId);

  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function createBookmark(bookId, { page = 1, note = '' } = {}) {
  const user = await requireUser();
  const safePage = Math.max(1, Number(page || 1));

  const { data, error } = await supabase
    .from('bookmarks')
    .insert({
      user_id: user.id,
      book_id: bookId,
      page: safePage,
      note: note || null,
    })
    .select(`
      *,
      book:books(id, title, author, category, pages, cover_url, flipbook_url)
    `)
    .single();

  if (error) throw error;

  await logBookmarkEvent(bookId, safePage);
  return data;
}

export async function updateBookmark(bookmarkId, { page, note }) {
  const user = await requireUser();
  const payload = {};

  if (page !== undefined) payload.page = Math.max(1, Number(page || 1));
  if (note !== undefined) payload.note = note || null;

  const { data, error } = await supabase
    .from('bookmarks')
    .update(payload)
    .eq('id', bookmarkId)
    .eq('user_id', user.id)
    .select(`
      *,
      book:books(id, title, author, category, pages, cover_url, flipbook_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBookmark(bookmarkId) {
  const user = await requireUser();

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', bookmarkId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteBookmarksForBook(bookId) {
  const user = await requireUser();

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('book_id', bookId)
    .eq('user_id', user.id);

  if (error) throw error;
}

async function logBookmarkEvent(bookId, page) {
  const user = await requireUser();

  const { error } = await supabase.from('reader_events').insert({
    user_id: user.id,
    book_id: bookId,
    event_type: 'bookmark',
    page,
  });

  if (error) throw error;
}
