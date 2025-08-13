# 🚀 FlowBotz - AI-Powered Design & Print-on-Demand Platform

> Beautiful glassmorphism UI with 60fps cosmic animations and complete full-stack architecture

## 🌟 Features

- ✨ **Stunning Glassmorphism Design** - Cosmic animations with GPU-accelerated 60fps performance
- 🤖 **AI-Powered Design Generation** - Multiple AI models for creative content
- 🛒 **Print-on-Demand Integration** - Printful & Printify API connections
- 💳 **Stripe Payment Processing** - Complete checkout and subscription system
- 🔐 **Supabase Backend** - Authentication, database, and real-time features
- 📱 **Responsive Design** - Perfect on all devices

## 🏗️ Architecture

```
FlowbotzApp/
├── frontend/          # Next.js 14.2.15 + React 18.3.1
├── backend/           # FastAPI + Python
├── scripts/           # Development & deployment scripts
├── docs/              # Documentation
└── .gitignore
```

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   cd frontend && npm install
   cd ../backend && pip install -r requirements.txt
   ```

2. **Start Development**
   ```bash
   ./scripts/start-flowbotz.sh  # Full stack
   ```

3. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 📁 Project Structure

### Frontend (`/frontend`)
- **Next.js 14.2.15** with App Router
- **React 18.3.1** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Custom glassmorphism components**

### Backend (`/backend`)
- **FastAPI** with Python 3.8+
- **Supabase** integration
- **AI API** connections (OpenAI, Stability AI)
- **Print-on-Demand** APIs (Printful, Printify)
- **Stripe** payment processing

### Scripts (`/scripts`)
- `start-flowbotz.sh` - Start full stack
- `start-frontend.sh` - Frontend only
- `start-backend.sh` - Backend only
- `stop-flowbotz.sh` - Stop all services

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Python 3.8+
- npm or yarn

### Environment Setup
1. Copy `.env.example` to `.env.local` in frontend
2. Copy `.env.example` to `.env` in backend
3. Add your API keys for Supabase, OpenAI, Stripe, etc.

## 📚 Documentation

See the `/docs` folder for detailed documentation:
- [Quick Start Guide](docs/QUICK_START.md)
- API Documentation (auto-generated at /docs endpoint)

## 🔧 Technical Details

- **Fixed webpack factory errors** with custom chunk configuration
- **60fps animations** with hardware acceleration
- **Server-side rendering** with hydration optimization
- **Type-safe** with full TypeScript coverage

## 🎨 UI Components

The platform features a complete glassmorphism design system with:
- Cosmic particle animations
- Glass morphism cards and layouts
- Responsive navigation
- Interactive buttons and forms
- Smooth 60fps transitions

---

Built with ❤️ using Next.js, FastAPI, and beautiful glassmorphism design