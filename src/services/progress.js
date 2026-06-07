import { supabase } from '../lib/supabase';
import { getCurrentUser } from './auth';
import { markBookCompleted } from './library';

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

export async function getReadingProgress(bookId) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listMyReadingProgress() {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('reading_progress')
    .select(`
      *,
      book:books(id, title, author, category, pages, cover_url, flipbook_url)
    `)
    .eq('user_id', user.id)
    .order('last_read_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function upsertReadingProgress(bookId, { currentPage, totalPages, percent }) {
  const user = await requireUser();
  const safeTotalPages = Math.max(1, Number(totalPages || 1));
  const safeCurrentPage = Math.max(1, Math.min(Number(currentPage || 1), safeTotalPages));
  const safePercent = Math.max(0, Math.min(Number(percent ?? (safeCurrentPage / safeTotalPages) * 100), 100));

  const { data, error } = await supabase
    .from('reading_progress')
    .upsert(
      {
        user_id: user.id,
        book_id: bookId,
        current_page: safeCurrentPage,
        total_pages: safeTotalPages,
        percent: safePercent,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,book_id' }
    )
    .select()
    .single();

  if (error) throw error;

  await logProgressEvent(bookId, safeCurrentPage, safePercent);

  if (safePercent >= 100) {
    await markBookCompleted(bookId);
  }

  return data;
}

export async function updateProgressByPage(bookId, currentPage, totalPages) {
  const safeTotalPages = Math.max(1, Number(totalPages || 1));
  const safeCurrentPage = Math.max(1, Math.min(Number(currentPage || 1), safeTotalPages));
  const percent = Number(((safeCurrentPage / safeTotalPages) * 100).toFixed(2));

  return upsertReadingProgress(bookId, {
    currentPage: safeCurrentPage,
    totalPages: safeTotalPages,
    percent,
  });
}

export async function updateProgressByPercent(bookId, percent, totalPages) {
  const safeTotalPages = Math.max(1, Number(totalPages || 1));
  const safePercent = Math.max(0, Math.min(Number(percent || 0), 100));
  const currentPage = Math.max(1, Math.round((safePercent / 100) * safeTotalPages));

  return upsertReadingProgress(bookId, {
    currentPage,
    totalPages: safeTotalPages,
    percent: safePercent,
  });
}

export async function resetReadingProgress(bookId) {
  const user = await requireUser();

  const { error } = await supabase
    .from('reading_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('book_id', bookId);

  if (error) throw error;
}

async function logProgressEvent(bookId, page, percent) {
  const user = await requireUser();

  const { error } = await supabase.from('reader_events').insert({
    user_id: user.id,
    book_id: bookId,
    event_type: 'update_progress',
    page,
    percent,
  });

  if (error) throw error;
}
