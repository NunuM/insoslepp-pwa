export interface Post {
  id: number;
  title: string;
  description: string;
  body?: any;
  discriminator: number;
  is_audio: number;
  has_tips: number;
  is_gallery: number;
  images?: any;
  likes: number;
  live: number;
  created: Date;
  updated: Date;
  category_id: number;
  category_name?: string;
  liked: number;
  seen: number;
  tips: string;
  _is_complete?: boolean;
  _is_featured?: boolean;
}

export interface Wall {
  featured: Post[];
  recent: Post[];
}

