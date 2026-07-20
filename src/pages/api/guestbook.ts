import type { APIRoute } from 'astro';
import { sanityClient } from '../../lib/sanity';
import type { Language } from '../../lib/i18n';

interface GuestbookSubmission {
  name: string;
  email: string;
  message: string;
  website?: string;
  language: Language;
}

export const POST: APIRoute = async ({ request }) => {
  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }

  try {
    const body: GuestbookSubmission = await request.json();

    // Validate input
    if (!body.name || !body.email || !body.message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400 }
      );
    }

    // Validate message length
    if (body.message.length < 5 || body.message.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Message must be between 5 and 500 characters' }),
        { status: 400 }
      );
    }

    // Create document in Sanity
    const doc = await sanityClient.create({
      _type: 'guestbookEntry',
      name: body.name.trim(),
      email: body.email.toLowerCase().trim(),
      message: body.message.trim(),
      website: body.website?.trim() || null,
      language: body.language || 'en',
      approved: false,
      submittedAt: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you for signing the guestbook! Your entry will be reviewed and published soon.',
        id: doc._id,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Guestbook submission error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to submit entry' }),
      { status: 500 }
    );
  }
};
