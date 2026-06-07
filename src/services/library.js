import { supabase } from '../lib/supabase';
import { getCurrentUser } from './auth';

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

export async function getMyLibrary() {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('user_library')
    .select(`
      *,
      book:books(*)
    `)
    .eq('user_id', user.id)
    .neq('status', 'returned')
    .order('borrowed_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getLibraryItem(bookId) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('user_library')
    .select(`
      *,
      book:books(*)
    `)
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function borrowBook(bookId) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('user_library')
    .upsert(
      {
        user_id: user.id,
        book_id: bookId,
        status: 'reading',
        borrowed_at: new Date().toISOString(),
        returned_at: null,
      },
      { onConflict: 'user_id,book_id' }
    )
    .select(`
      *,
      book:books(*)
    `)
    .single();

  if (error) throw error;

  await logLibraryEvent('borrow_book', bookId);
  return data;
}

export async function returnBook(bookId) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('user_library')
    .update({
      status: 'returned',
      returned_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .select(`
      *,
      book:books(*)
    `)
    .single();

  if (error) throw error;

  await logLibraryEvent('return_book', bookId);
  return data;
}

export async function markBookCompleted(bookId) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('user_library')
    .update({ status: 'completed' })
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .select(`
      *,
      book:books(*)
    `)
    .single();

  if (error) throw error;

  await logLibraryEvent('complete_book', bookId);
  return data;
}

export async function archiveLibraryItem(bookId) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('user_library')
    .update({ status: 'archived' })
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .select(`
      *,
      book:books(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function listAllLoans() {
  const { data, error } = await supabase
    .from('user_library')
    .select(`
      *,
      profile:profiles(id, full_name, email, role, status),
      book:books(id, title, author, category, cover_url)
    `)
    .order('borrowed_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function logLibraryEvent(eventType, bookId) {
  const user = await requireUser();

  const { error } = await supabase.from('reader_events').insert({
    user_id: user.id,
    book_id: bookId,
    event_type: eventType,
  });

  if (error) throw error;
}
