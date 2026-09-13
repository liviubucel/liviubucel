import rss from '@astrojs/rss';
import { SITE } from '../site-config';
import { getPosts } from '../lib/sanity-queries';

export async function GET(context) {
  const posts = await getPosts('en');

  return rss({
    title: `${SITE.author.fullName}'s Blog`,
    description: 'Cybersecurity research, practical security work, and technical notes by Liviu Bucel.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.title,
      pubDate: new Date(post.pubDate),
      description: post.metaDescription || post.description || '',
      link: `/blog/${post.slug}/`,
    })),
  });
}
