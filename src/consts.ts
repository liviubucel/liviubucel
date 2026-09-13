// Site Configuration
// Centralized configuration for site metadata, SEO, and branding

export const SITE_TITLE = 'Liviu Bucel — Cybersecurity Portfolio'
export const SITE_DESCRIPTION =
  'Cybersecurity portfolio focused on ethical hacking, digital investigation, incident response, security engineering, threat research, and practical security projects.'

export const GITHUB_URL = 'https://github.com/liviubucel'
export const SITE_URL = 'https://www.liviubucel.com/'

export const SITE_METADATA = {
  title: {
    template: '%s | Liviu Bucel',
    default: SITE_TITLE
  },
  description: SITE_DESCRIPTION,
  keywords: ['cybersecurity', 'ethical hacking', 'digital forensics', 'DFIR', 'incident response', 'penetration testing', 'threat research', 'security engineering'],
  authors: [{ name: 'Liviu Bucel', url: SITE_URL }],
  creator: 'Liviu Bucel',
  publisher: 'Liviu Bucel',
  robots: {
    index: true,
    follow: true
  },
  language: 'en-US',
  locale: 'en_US',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }
    ],
    apple: [{ url: '/favicon.ico', sizes: '180x180' }],
    shortcut: [{ url: '/favicon.ico' }]
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Liviu Bucel',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Liviu Bucel — Cybersecurity Portfolio',
        type: 'image/png'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    site: '@liviubucel',
    creator: '@liviubucel',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png']
  },
  verification: {
    google: '', // Add your Google verification code
    yandex: '', // Add your Yandex verification code
    bing: '' // Add your Bing verification code
  }
}

// Social media links
export const SOCIAL_LINKS = {
  github: 'https://github.com/liviubucel',
  linkedin: 'https://www.linkedin.com/in/liviubucel/',
  twitter: 'https://x.com/liviubucel'
}

// Personal information for structured data
export const COMPANY_INFO = {
  name: 'Liviu Bucel',
  legalName: 'Liviu Bucel',
  url: SITE_URL,
  logo: `/logo-negru.png`,
  foundingDate: '',
  address: {
    streetAddress: '',
    addressLocality: '',
    addressRegion: '',
    postalCode: '',
    addressCountry: 'GB'
  },
  contactPoint: {
    telephone: '',
    contactType: 'professional contact',
    email: 'contact@liviubucel.com'
  },
  sameAs: Object.values(SOCIAL_LINKS)
}
