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
  try {
    const langFilter = lang ? ` && language == "${lang}"` : '';
    return await sanityClient.fetch(`*[_type == "post" && published == true${langFilter}] | order(pubDate desc) {
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
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return [];
  }
}

export async function getPost(slug: string, lang?: Language): Promise<Post | null> {
  try {
    const langFilter = lang ? ` && language == "${lang}"` : '';
    return await sanityClient.fetch(
      `*[_type == "post" && published == true && slug.current == $slug${langFilter}][0] {
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
  } catch (error) {
    console.error('Failed to fetch post:', error);
    return null;
  }
}

export async function getProjects(lang?: Language): Promise<Project[]> {
  try {
    const langFilter = lang ? ` && language == "${lang}"` : '';
    return await sanityClient.fetch(`*[_type == "project"${langFilter}] | order(pubDate desc) {
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
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

export async function getProject(slug: string, lang?: Language): Promise<Project | null> {
  try {
    const langFilter = lang ? ` && language == "${lang}"` : '';
    return await sanityClient.fetch(
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
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return null;
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    return await sanityClient.fetch(`*[_type == "category"] | order(title asc) {
      _id,
      title,
      "slug": slug.current,
      description
    }`);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

export async function getAuthors(): Promise<Author[]> {
  try {
    return await sanityClient.fetch(`*[_type == "author"] {
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
  } catch (error) {
    console.error('Failed to fetch authors:', error);
    return [];
  }
}

export async function getSettings() {
  try {
    return await sanityClient.fetch(`*[_type == "settings"][0] {
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
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return null;
  }
}

export async function getGuestbookEntries(lang?: Language): Promise<any[]> {
  try {
    const langFilter = lang ? ` && language == "${lang}"` : '';
    return await sanityClient.fetch(`*[_type == "guestbookEntry" && approved == true${langFilter}] | order(submittedAt desc) {
      _id,
      name,
      email,
      message,
      website,
      language,
      submittedAt
    }`);
  } catch (error) {
    console.error('Failed to fetch guestbook entries:', error);
    return [];
  }
}

export async function submitGuestbookEntry(entry: {
  name: string;
  email: string;
  message: string;
  website?: string;
  language: Language;
}) {
  return sanityClient.create({
    _type: 'guestbookEntry',
    ...entry,
    approved: false,
    submittedAt: new Date().toISOString(),
  });
}
