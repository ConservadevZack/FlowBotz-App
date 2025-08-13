# FlowBotz - Premium Glassmorphism Automation Platform

> **CRITICAL: This project needs to be moved to `/Users/conservadev/Desktop/Projects/FlowbotzApp/`**

## 🚨 IMPORTANT RELOCATION INSTRUCTIONS

This FlowBotz project was created in a temporary location and **MUST** be moved to the correct directory:

### Move Instructions:
```bash
# Navigate to your Projects directory
cd /Users/conservadev/Desktop/Projects/

# Move this entire project to the correct location
mv flowbotz/flowbotz-clean/FLOWBOTZ_PROJECT_TO_MOVE FlowbotzApp

# Verify the move was successful
cd FlowbotzApp
ls -la
```

## 🎯 Project Overview

FlowBotz is a cutting-edge automation platform featuring:
- **Advanced 3D Glassmorphism Design** with multi-layered glass effects
- **60fps Animated Gradients** with GPU acceleration
- **Next.js 14.2.5 + React 18.3.1** for optimal performance
- **FastAPI Backend** with comprehensive API endpoints
- **Supabase Integration** for real-time data and authentication
- **Stripe Integration** for payment processing
- **AI-Powered Workflows** with multiple model support

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 14.2.5 with App Router
- **UI Library**: React 18.3.1 with TypeScript
- **Styling**: Tailwind CSS with custom glassmorphism utilities
- **Animations**: Framer Motion for 60fps animations
- **State Management**: Zustand for global state
- **Icons**: Lucide React for consistent iconography

### Backend
- **API Framework**: FastAPI with automatic OpenAPI docs
- **Authentication**: JWT with Supabase Auth integration
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Payment Processing**: Stripe with webhook handling
- **AI Integration**: OpenAI, Anthropic, Together AI, Stability AI
- **POD Integration**: Printful and Printify APIs

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.9+ and pip
- Supabase account and project
- Stripe account (test mode)

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload

# API will be available at http://localhost:8000
# API docs at http://localhost:8000/api/docs
```

## 🎨 Glassmorphism Design System

### Glass Effect Classes
```css
.glass          /* Default glass: rgba(255,255,255,0.1) + blur(12px) */
.glass-strong   /* Strong glass: rgba(255,255,255,0.2) + blur(24px) */
.glass-weak     /* Weak glass: rgba(255,255,255,0.05) + blur(4px) */
.glass-card     /* Complete card with shadows and hover effects */
.glass-button   /* Interactive button with glass effect */
```

### Motion System
- **GPU-accelerated animations** using `transform3d`
- **60fps gradient animations** with `will-change` optimization
- **Smooth transitions** with cubic-bezier easing
- **Hover and focus states** with scale and blur effects

## 🔐 Environment Variables

All environment variables are pre-configured in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://vpfphtrjvomejsxjmxut.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[configured]
SUPABASE_SERVICE_ROLE_KEY=[configured]

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[configured]
STRIPE_SECRET_KEY=[configured]
STRIPE_WEBHOOK_SECRET=[configured]

# AI APIs
TOGETHER_API_KEY=[configured]
STABILITY_API_KEY=[configured]
OPENAI_API_KEY=[configured]

# POD APIs
PRINTFUL_API_KEY=[configured]
PRINTIFY_API_KEY=[configured]
```

## 📁 Project Structure

```
FlowbotzApp/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   └── theme-provider.tsx
│   ├── lib/                # Utility libraries
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript definitions
│   └── utils/              # Helper functions
├── backend/
│   ├── app/
│   │   ├── routes/         # API endpoints
│   │   ├── models/         # Data models
│   │   ├── services/       # Business logic
│   │   └── utils/          # Backend utilities
│   ├── main.py             # FastAPI application
│   └── requirements.txt    # Python dependencies
├── public/                 # Static assets
├── package.json           # Node.js dependencies
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── next.config.js         # Next.js configuration
```

## 🚀 Available Scripts

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checker
```

### Backend
```bash
python backend/main.py              # Start FastAPI server
uvicorn main:app --reload           # Start with auto-reload
uvicorn main:app --host 0.0.0.0     # Start on all interfaces
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Workflows
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/{id}` - Get workflow
- `PUT /api/workflows/{id}` - Update workflow
- `DELETE /api/workflows/{id}` - Delete workflow
- `POST /api/workflows/{id}/execute` - Execute workflow

### AI Services
- `POST /api/ai/chat` - Chat completion
- `POST /api/ai/generate-image` - Image generation
- `GET /api/ai/models` - Available models
- `POST /api/ai/workflow-suggestion` - AI workflow suggestions

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook
- `POST /api/webhooks/printify` - Printify webhook
- `POST /api/webhooks/supabase` - Database webhook

## 🔒 Security Features

- **JWT Authentication** with secure token handling
- **CORS Protection** with environment-specific origins
- **Input Validation** using Pydantic models
- **Webhook Signature Verification** for all external services
- **Environment Variable Protection** with proper .env handling
- **SQL Injection Prevention** through Supabase's built-in protection

## 🎯 Performance Optimizations

- **Code Splitting** with Next.js automatic optimization
- **Image Optimization** with Next.js Image component
- **Bundle Analysis** and tree shaking
- **GPU Acceleration** for animations
- **Lazy Loading** for components and routes
- **Caching Strategies** for API responses

## 🧪 Testing

```bash
# Frontend testing (to be implemented)
npm run test         # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run Playwright E2E tests

# Backend testing (to be implemented)
pytest               # Run Python tests
pytest --cov        # Run with coverage
```

## 📦 Deployment

### Frontend (Vercel)
```bash
npm run build        # Build the application
# Deploy to Vercel with automatic optimizations
```

### Backend (Railway/Heroku)
```bash
# Create Dockerfile for containerized deployment
# Configure environment variables in deployment platform
# Set up database migrations and health checks
```

## 🔄 Development Workflow

1. **Feature Development**: Create feature branches from main
2. **Code Quality**: ESLint, Prettier, TypeScript strict mode
3. **Testing**: Unit tests, integration tests, E2E tests
4. **Performance**: Lighthouse audits, Core Web Vitals
5. **Security**: OWASP compliance, dependency audits
6. **Accessibility**: WCAG 2.1 AA compliance

## 📈 Monitoring and Analytics

- **Error Tracking**: Integration with Sentry
- **Performance Monitoring**: Core Web Vitals tracking
- **User Analytics**: Privacy-focused analytics
- **API Monitoring**: Health checks and uptime monitoring
- **Database Performance**: Query optimization and indexing

## 🤝 Contributing

1. Follow the coding standards in CLAUDE.md
2. Maintain the 500-line file limit and 50-line function limit
3. Ensure all components follow the glassmorphism design system
4. Write comprehensive tests for new features
5. Update documentation for API changes

## 📄 License

This project is proprietary and confidential.

---

**After moving this project to `/Users/conservadev/Desktop/Projects/FlowbotzApp/`, you can delete the temporary `FLOWBOTZ_PROJECT_TO_MOVE` directory.**