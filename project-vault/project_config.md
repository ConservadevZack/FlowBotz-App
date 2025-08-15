# FlowBotz Technical Specifications

## Tech Stack

### Frontend
- **Framework**: Next.js 14.2.15 (App Router)
- **UI Library**: React 18.3.1
- **Styling**: Tailwind CSS 3.4.0 with Glassmorphism design system
- **State Management**: Zustand 4.4.7 + React Context
- **Animation**: Framer Motion 10.18.0
- **Canvas**: Konva 9.3.22 with React-Konva
- **Forms**: React Hook Form 7.62.0 with Zod validation
- **Query Management**: TanStack Query 5.85.0

### Backend
- **Runtime**: Node.js 20+
- **API**: RESTful with comprehensive validation
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with role-based access
- **Payment**: Stripe 14.10.0
- **Real-time**: Socket.io 4.5.4
- **AI Integration**: OpenAI 4.24.1 + Multiple model support

### Infrastructure
- **Hosting**: Vercel (Frontend) + Railway/Render (Backend)
- **CDN**: Cloudflare
- **Storage**: Supabase Storage + S3
- **Monitoring**: Vercel Analytics + Custom dashboards
- **CI/CD**: GitHub Actions

## Environment Setup

### Required Environment Variables
```bash
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_URL=

# Backend (.env)
DATABASE_URL=
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
STABILITY_API_KEY=
REPLICATE_API_KEY=
```

## Development Commands
```bash
# Full stack development
npm run dev:fullstack

# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend

# Testing
npm run test:coverage

# Build production
npm run build
```

## Performance Targets
- Lighthouse Score: 95+
- First Contentful Paint: <1s
- Time to Interactive: <2s
- Cumulative Layout Shift: <0.1
- Bundle Size: <200KB (initial)

## Security Standards
- OWASP Top 10 compliance
- CSP headers implemented
- Input sanitization on all endpoints
- Rate limiting on API
- Secure session management
- HTTPS everywhere
- Regular dependency updates