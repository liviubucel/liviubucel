import { sanityClient } from './sanity';
import type { Language } from './i18n';

// Types
export interface Post {
  _id: string;
  title: string;
  slug: string;
  language: Language;
  description: string;
  metaDescription?: string;
  keywords?: string[];
  pubDate: string;
  updatedAt?: string;
  featuredImage?: {
    asset: {
      _id: string;
      url: string;
    };
    hotspot?: Record<string, number>;
  };
  category?: {
    title: string;
    slug: string;
  };
  tags?: string[];
  author?: {
    name: string;
    email?: string;
  };
  body?: any[];
  published: boolean;
}

export interface Project {
  _id: string;
  title: string;
  slug: string;
  language: Language;
  description: string;
  metaDescription?: string;
  featuredImage?: {
    asset: {
      _id: string;
      url: string;
    };
  };
  tags?: string[];
  body?: any[];
  links?: {
    demo?: string;
    github?: string;
  };
  featured: boolean;
  pubDate?: string;
}

export interface Author {
  _id: string;
  name: string;
  slug: string;
  email?: string;
  bio?: string;
  image?: {
    asset: {
      _id: string;
      url: string;
    };
  };
}

export interface Category {
  _id: string;
  title: string;
  slug: string;
  description?: string;
}

// Queries
export async function getPosts(lang?: Language): Promise<Post[]> {
  const langFilter = lang ? ` && language == "${lang}"` : '';
  return sanityClient.fetch(`*[_type == "post"${langFilter}] | order(pubDate desc) {
    _id,
    title,
    "slug": slug.current,
    language,
    description,
    metaDescription,
    keywords,
    pubDate,
    updatedAt,
    featuredImage {
      asset-> {
        _id,
        url
      },
      hotspot
    },
    category-> {
      title,
      slug
    },
    tags,
    author-> {
      name,
      email
    },
    body,
    published
  }`);
}

export async function getPost(slug: string, lang?: Language): Promise<Post | null> {
  const langFilter = lang ? ` && language == "${lang}"` : '';
  return sanityClient.fetch(
    `*[_type == "post" && slug.current == $slug${langFilter}][0] {
      _id,
      title,
      "slug": slug.current,
      language,
      description,
      metaDescription,
      keywords,
      pubDate,
      updatedAt,
      featuredImage {
        asset-> {
          _id,
          url
        },
        hotspot
      },
      category-> {
        title,
        slug
      },
      tags,
      author-> {
        name,
        email
      },
      body,
      published
    }`,
    { slug }
  );
}

export async function getProjects(lang?: Language): Promise<Project[]> {
  const langFilter = lang ? ` && language == "${lang}"` : '';
  return sanityClient.fetch(`*[_type == "project"${langFilter}] | order(pubDate desc) {
    _id,
    title,
    "slug": slug.current,
    language,
    description,
    metaDescription,
    featuredImage {
      asset-> {
        _id,
        url
      }
    },
    tags,
    body,
    links,
    featured,
    pubDate
  }`);
}

export async function getProject(slug: string, lang?: Language): Promise<Project | null> {
  const langFilter = lang ? ` && language == "${lang}"` : '';
  return sanityClient.fetch(
    `*[_type == "project" && slug.current == $slug${langFilter}][0] {
      _id,
      title,
      "slug": slug.current,
      language,
      description,
      metaDescription,
      featuredImage {
        asset-> {
          _id,
          url
        }
      },
      tags,
      body,
      links,
      featured,
      pubDate
    }`,
    { slug }
  );
}

export async function getCategories(): Promise<Category[]> {
  return sanityClient.fetch(`*[_type == "category"] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    description
  }`);
}

export async function getAuthors(): Promise<Author[]> {
  return sanityClient.fetch(`*[_type == "author"] {
    _id,
    name,
    slug,
    email,
    bio,
    image {
      asset-> {
        _id,
        url
      }
    }
  }`);
}

export async function getSettings() {
  return sanityClient.fetch(`*[_type == "settings"][0] {
    title,
    description,
    ogImage {
      asset-> {
        url
      }
    },
    author-> {
      name,
      email
    }
  }`);
}
