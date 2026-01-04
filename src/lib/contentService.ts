import { supabase } from "@/integrations/supabase/client";
import { ContentPost, CreateContentPostRequest, UpdateContentPostRequest } from "@/types/content";

export class ContentService {
  static async createPost(data: CreateContentPostRequest, tenantId: string): Promise<ContentPost> {
    const { data: result, error } = await supabase
      .from('content_posts')
      .insert([{
        ...data,
        tenant_id: tenantId,
        edit_history: [],
        status: data.status || 'draft'
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }

    return result;
  }

  static async getAllPosts(): Promise<ContentPost[]> {
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }

    return data || [];
  }

  static async getPostById(id: string): Promise<ContentPost | null> {
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Post not found
      }
      throw new Error(`Failed to fetch post: ${error.message}`);
    }

    return data;
  }

  static async updatePost(id: string, data: UpdateContentPostRequest): Promise<ContentPost> {
    const { data: result, error } = await supabase
      .from('content_posts')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }

    return result;
  }

  static async deletePost(id: string): Promise<void> {
    const { error } = await supabase
      .from('content_posts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }
  }

  static async getPostsByStatus(status: ContentPost['status']): Promise<ContentPost[]> {
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch posts by status: ${error.message}`);
    }

    return data || [];
  }

  static async getPostsByType(content_type: ContentPost['content_type']): Promise<ContentPost[]> {
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .eq('content_type', content_type)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch posts by type: ${error.message}`);
    }

    return data || [];
  }

  static async searchPosts(query: string): Promise<ContentPost[]> {
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search posts: ${error.message}`);
    }

    return data || [];
  }

  static async getScheduledPosts(startDate?: Date, endDate?: Date): Promise<ContentPost[]> {
    let query = supabase
      .from('content_posts')
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_date', 'is', null);

    if (startDate) {
      query = query.gte('scheduled_date', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('scheduled_date', endDate.toISOString());
    }

    const { data, error } = await query.order('scheduled_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch scheduled posts: ${error.message}`);
    }

    return data || [];
  }

  static async duplicatePost(id: string, newTitle?: string): Promise<ContentPost> {
    const originalPost = await this.getPostById(id);
    
    if (!originalPost) {
      throw new Error('Post not found');
    }

    const duplicateData: CreateContentPostRequest = {
      title: newTitle || `${originalPost.title || 'Untitled'} (Copy)`,
      content: originalPost.content,
      content_type: originalPost.content_type,
      source_data: originalPost.source_data,
      original_content: originalPost.original_content,
      platform: originalPost.platform,
      tags: originalPost.tags,
      status: 'draft' // Always create duplicates as drafts
    };

    return this.createPost(duplicateData);
  }

  static async addEditToHistory(id: string, changes: string, newContent: string): Promise<ContentPost> {
    const post = await this.getPostById(id);
    
    if (!post) {
      throw new Error('Post not found');
    }

    const newHistoryEntry = {
      timestamp: new Date().toISOString(),
      changes,
      content: newContent
    };

    const updatedHistory = [...(post.edit_history || []), newHistoryEntry];

    return this.updatePost(id, {
      content: newContent,
      edit_history: updatedHistory
    });
  }
}