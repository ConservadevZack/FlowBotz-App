# FlowBotz Supabase Middleware Integration Guide

## Overview

This document provides comprehensive guidance for integrating the FlowBotz Supabase middleware layer into the application. The middleware provides robust database connectivity, authentication management, and credit system functionality with graceful fallbacks for missing tables.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │────│  Middleware      │────│   Supabase      │
│                 │    │                  │    │                 │
│ ├─ useAuth()    │    │ ├─ AuthMiddleware │    │ ├─ users        │
│ ├─ useCredits() │    │ ├─ dbMiddleware  │    │ ├─ designs      │
│ └─ Components   │    │ └─ creditManager │    │ └─ ...tables    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Core Components

### 1. Database Middleware (`/lib/database/supabase-middleware.ts`)

**Purpose**: Provides type-safe database operations with graceful error handling

**Key Features**:
- Automatic table existence checking
- Graceful fallbacks for missing tables
- Type-safe CRUD operations
- User initialization and management
- Design and AI generation management

**Usage Example**:
```typescript
import { dbMiddleware } from '@/lib/database/supabase-middleware';

// Get user stats with fallback
const stats = await dbMiddleware.getUserStats(userId);

// Create AI generation
const generation = await dbMiddleware.createAIGeneration({
  user_id: userId,
  prompt: "A beautiful landscape",
  model_id: modelId,
  cost: 2
});
```

### 2. Authentication Middleware (`/lib/auth/auth-middleware.ts`)

**Purpose**: Manages authentication state and user sessions

**Key Features**:
- Automatic user initialization in database
- Session state management
- Google OAuth integration
- Profile management
- Credit balance integration

**Usage Example**:
```typescript
import { authMiddleware } from '@/lib/auth/auth-middleware';

// Sign in with credentials
const result = await authMiddleware.signIn({
  email: 'user@example.com',
  password: 'password'
});

// Check authentication status
const isAuth = authMiddleware.isAuthenticated();
```

### 3. Credit Manager (`/lib/credits/credit-manager.ts`)

**Purpose**: Handles AI generation credits and billing

**Key Features**:
- Credit balance management
- Usage tracking and analytics
- Dynamic pricing calculation
- Batch generation discounts
- Refund handling

**Usage Example**:
```typescript
import { creditManager } from '@/lib/credits/credit-manager';

// Check if user has credits
const hasCredits = await creditManager.hasCredits(userId, 2);

// Consume credits for generation
const result = await creditManager.consumeCredits(
  userId, 
  2, 
  generationId, 
  'dall-e-3'
);
```

## React Hooks

### 1. useAuth Hook (`/hooks/useAuth.ts`)

Provides React integration for authentication:

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { 
    user, 
    flowBotzUser, 
    loading, 
    error, 
    isAuthenticated,
    signIn, 
    signOut,
    getAvailableCredits
  } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <LoginForm onSignIn={signIn} />;

  return <Dashboard user={flowBotzUser} />;
}
```

### 2. useCredits Hook (`/hooks/useCredits.ts`)

Provides React integration for credit management:

```typescript
import { useCredits } from '@/hooks/useCredits';

function GeneratorComponent() {
  const { 
    balance, 
    loading, 
    status, 
    hasCredits,
    calculateCost,
    consumeCredits,
    shouldShowWarning
  } = useCredits();

  const handleGenerate = async () => {
    const cost = calculateCost('dall-e-3', 1024, 1024);
    
    if (!hasCredits(cost)) {
      alert('Insufficient credits');
      return;
    }

    const result = await consumeCredits(cost, generationId, 'dall-e-3');
    if (result.success) {
      // Proceed with generation
    }
  };

  return (
    <div>
      <div>Credits: {balance}</div>
      {shouldShowWarning(1) && <CreditWarning />}
      <button onClick={handleGenerate}>Generate</button>
    </div>
  );
}
```

## Integration Steps

### Step 1: Import Middleware in Your Components

```typescript
// For database operations
import { dbMiddleware } from '@/lib/database/supabase-middleware';

// For authentication
import { useAuth } from '@/hooks/useAuth';

// For credits
import { useCredits } from '@/hooks/useCredits';
```

### Step 2: Update Authentication Flow

Replace existing auth logic with the new middleware:

```typescript
// Old approach
import { supabase } from '@/lib/supabase';
const { data: { user } } = await supabase.auth.getUser();

// New approach
import { useAuth } from '@/hooks/useAuth';
const { user, flowBotzUser, isAuthenticated } = useAuth();
```

### Step 3: Integrate Credit System

Add credit checking to AI generation:

```typescript
import { useCredits } from '@/hooks/useCredits';

function AIGenerator() {
  const { hasCredits, consumeCredits, calculateCost } = useCredits();
  
  const handleGenerate = async (prompt: string) => {
    const cost = calculateCost('dall-e-3');
    
    if (!hasCredits(cost)) {
      // Show credit purchase modal
      return;
    }
    
    // Proceed with generation
    const generation = await dbMiddleware.createAIGeneration({
      user_id: user.id,
      prompt,
      cost,
      status: 'pending'
    });
    
    // Consume credits
    await consumeCredits(cost, generation.id, 'dall-e-3');
  };
}
```

### Step 4: Update Design Management

Use middleware for design operations:

```typescript
import { dbMiddleware } from '@/lib/database/supabase-middleware';

// Create design
const design = await dbMiddleware.createDesign({
  title: 'My Design',
  owner_id: user.id,
  type: 'custom',
  canvas: { width: 800, height: 600 },
  elements: []
});

// Get user designs
const designs = await dbMiddleware.getUserDesigns(user.id);

// Update design
const updatedDesign = await dbMiddleware.updateDesign(design.id, {
  title: 'Updated Title',
  elements: newElements
});
```

## Error Handling

The middleware includes comprehensive error handling:

```typescript
// Database operations return null on error
const stats = await dbMiddleware.getUserStats(userId);
if (!stats) {
  console.error('Failed to load user stats');
  // Handle gracefully with defaults
}

// Authentication operations return success/error objects
const result = await authMiddleware.signIn(credentials);
if (!result.success) {
  setError(result.error);
}

// Credit operations include detailed error information
const creditResult = await creditManager.consumeCredits(userId, amount, id, model);
if (!creditResult.success) {
  if (creditResult.error?.includes('Insufficient credits')) {
    // Show purchase modal
  }
}
```

## Performance Considerations

### 1. Caching

The middleware implements intelligent caching:

```typescript
// User stats are cached after first load
const stats = await dbMiddleware.getUserStats(userId); // Database call
const sameStats = await dbMiddleware.getUserStats(userId); // Cached

// Refresh when needed
const { refreshBalance } = useCredits();
await refreshBalance(); // Force refresh
```

### 2. Batch Operations

For multiple operations, use batch methods:

```typescript
// Instead of multiple single operations
const designs = await Promise.all([
  dbMiddleware.createDesign(design1),
  dbMiddleware.createDesign(design2),
  dbMiddleware.createDesign(design3)
]);

// Use batch generation for multiple AI requests
const batchCost = creditManager.calculateBatchCreditCost('dall-e-3', 5);
```

### 3. Lazy Loading

Load data only when needed:

```typescript
function UserDashboard() {
  const { user } = useAuth();
  const [designs, setDesigns] = useState(null);
  
  useEffect(() => {
    if (user) {
      dbMiddleware.getUserDesigns(user.id).then(setDesigns);
    }
  }, [user]);
}
```

## Security Best Practices

### 1. Row Level Security

The middleware respects RLS policies:

```typescript
// Users can only access their own data
const designs = await dbMiddleware.getUserDesigns(userId); // RLS enforced
const otherUserDesigns = await dbMiddleware.getUserDesigns(otherUserId); // Returns []
```

### 2. Input Validation

Always validate inputs:

```typescript
// Credit operations validate amounts
const result = await creditManager.consumeCredits(userId, -5, id, model); // Fails safely

// Database operations validate required fields
const design = await dbMiddleware.createDesign({
  // Missing owner_id will fail gracefully
  title: 'Test'
});
```

### 3. Session Management

The auth middleware handles session security:

```typescript
// Automatic session refresh
const session = await authMiddleware.getCurrentSession();

// Secure sign out
await authMiddleware.signOut(); // Clears all client-side data
```

## Testing Integration

### Unit Tests

Test middleware functionality:

```typescript
import { dbMiddleware } from '@/lib/database/supabase-middleware';

describe('Database Middleware', () => {
  it('should handle missing tables gracefully', async () => {
    const stats = await dbMiddleware.getUserStats('test-user');
    expect(stats).toBeTruthy(); // Returns defaults even if table missing
  });
});
```

### Integration Tests

Test full workflows:

```typescript
describe('AI Generation Flow', () => {
  it('should complete generation with credit consumption', async () => {
    const { user } = await authMiddleware.signIn(credentials);
    const hasCredits = await creditManager.hasCredits(user.id, 2);
    expect(hasCredits).toBe(true);
    
    const generation = await dbMiddleware.createAIGeneration({
      user_id: user.id,
      prompt: 'test',
      cost: 2
    });
    
    const creditResult = await creditManager.consumeCredits(
      user.id, 2, generation.id, 'dall-e-3'
    );
    expect(creditResult.success).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

1. **Tables Not Found**: Middleware handles this gracefully with fallbacks
2. **Credit Calculation Errors**: Check model name spelling and parameters
3. **Authentication Loops**: Ensure proper session handling in components
4. **RLS Policy Errors**: Verify user permissions and table access

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.FLOWBOTZ_DEBUG = 'true';

// Middleware will log detailed information
const result = await dbMiddleware.createDesign(designData);
// Logs: "Creating design for user: abc123, table exists: true"
```

## Migration Path

### From Existing Code

1. **Replace direct Supabase calls**:
   ```typescript
   // Old
   const { data } = await supabase.from('users').select('*');
   
   // New
   const user = await dbMiddleware.ensureUserExists(authUser);
   ```

2. **Update authentication**:
   ```typescript
   // Old
   const [user, setUser] = useState(null);
   useEffect(() => {
     supabase.auth.onAuthStateChange((event, session) => {
       setUser(session?.user);
     });
   }, []);
   
   // New
   const { user, loading } = useAuth();
   ```

3. **Add credit checking**:
   ```typescript
   // Before AI generation
   const { hasCredits, consumeCredits } = useCredits();
   
   if (!hasCredits(cost)) {
     // Handle insufficient credits
   }
   ```

## Best Practices

1. **Always check authentication state before operations**
2. **Handle loading states appropriately**
3. **Implement proper error boundaries**
4. **Use TypeScript types provided by middleware**
5. **Test with both existing and missing database tables**
6. **Monitor credit usage and implement warnings**
7. **Cache expensive operations where appropriate**

## Support and Maintenance

- **Documentation**: This guide and inline code comments
- **Type Safety**: Full TypeScript support with interfaces
- **Error Handling**: Comprehensive error catching and reporting
- **Logging**: Detailed logs for debugging and monitoring
- **Testing**: Unit and integration test examples provided

---

**Integration Status**: Ready for production use
**Database Requirement**: Manual migration required (see SUPABASE_SETUP_GUIDE.md)
**Browser Support**: All modern browsers
**Node.js Support**: 18.0.0+