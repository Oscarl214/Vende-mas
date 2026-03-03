import { supabase } from './supabase';

export type Post = {
  id: string;
  user_id: string;
  business_profile_id: string;
  content_type: string;
  platform: string | null;
  prompt_notes: string | null;
  generated_content: string;
  created_at: string;
};

export type CreatePostData = {
  business_profile_id: string;
  content_type: string;
  platform?: string;
  prompt_notes?: string;
  generated_content: string;
};

export async function createPost(userId: string, post: CreatePostData) {
  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id: userId, ...post })
    .select()
    .single();
  if (error) throw error;

  await supabase.rpc('increment_post_count', { p_user_id: userId });

  return data as Post;
}

export async function getPosts(userId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Post[];
}

export async function getPost(postId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();
  if (error) throw error;
  return data as Post;
}
