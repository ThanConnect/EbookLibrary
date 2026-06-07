import { supabase } from '../lib/supabase';
import { getCurrentUser } from './auth';

export async function listBooks({ query = '', category = '', includeInactive = false } = {}) {
  let request = supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeInactive) request = request.eq('is_active', true);
  if (category) request = request.eq('category', category);
  if (query) request = request.or(`title.ilike.%${query}%,author.ilike.%${query}%,category.ilike.%${query}%`);

  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function getBook(bookId) {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (error) throw error;
  return data;
}

export async function createBook(book) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const payload = {
    title: book.title,
    author: book.author || '',
    description: book.description || '',
    category: book.category || 'General',
    language: book.language || 'th',
    pages: Number(book.pages || 1),
    cover_url: book.cover_url || null,
    flipbook_url: book.flipbook_url,
    is_active: book.is_active ?? true,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from('books')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBook(bookId, updates) {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (payload.pages) payload.pages = Number(payload.pages);

  const { data, error } = await supabase
    .from('books')
    .update(payload)
    .eq('id', bookId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archiveBook(bookId) {
  return updateBook(bookId, { is_active: false });
}

export async function deleteBook(bookId) {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId);

  if (error) throw error;
}

export async function listCategories() {
  const { data, error } = await supabase
    .from('books')
    .select('category')
    .eq('is_active', true)
    .order('category');

  if (error) throw error;
  return [...new Set(data.map((item) => item.category).filter(Boolean))];
}
