# FlowBotz POD Integration Implementation Plan
*Designed by: backend-security-developer*
*Date: August 15, 2025*

## INTEGRATION OVERVIEW

Complete implementation of Printful API v2 and Printify API v2 with real product catalogs, dynamic mockup generation, and order fulfillment.

## 1. API CONFIGURATION

### Environment Variables Setup
```bash
# .env file
# Printful API v2
PRINTFUL_API_TOKEN=your_printful_token_here
PRINTFUL_API_URL=https://api.printful.com/v2
PRINTFUL_WEBHOOK_SECRET=your_webhook_secret

# Printify API v2
PRINTIFY_API_TOKEN=your_printify_token_here
PRINTIFY_API_URL=https://api.printify.com/v2
PRINTIFY_SHOP_ID=your_shop_id

# Redis for caching
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600  # 1 hour cache
```

## 2. BACKEND IMPLEMENTATION

### Updated POD Service with Real APIs
```python
# backend/app/services/pod_service.py
import aiohttp
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib
import json
from fastapi import HTTPException
from models.pod import Product, ProductVariant, MockupRequest, Order
from .caching import CachingService

class PODService:
    """Production POD service with real API integration"""
    
    def __init__(self):
        self.cache = CachingService()
        self.printful_headers = {
            'Authorization': f'Bearer {os.getenv("PRINTFUL_API_TOKEN")}',
            'Content-Type': 'application/json'
        }
        self.printify_headers = {
            'Authorization': f'Bearer {os.getenv("PRINTIFY_API_TOKEN")}',
            'Content-Type': 'application/json'
        }
    
    async def sync_product_catalog(self) -> Dict[str, List[Product]]:
        """Sync product catalogs from both providers"""
        results = {}
        
        # Fetch from both providers in parallel
        printful_task = asyncio.create_task(self._fetch_printful_catalog())
        printify_task = asyncio.create_task(self._fetch_printify_catalog())
        
        results['printful'] = await printful_task
        results['printify'] = await printify_task
        
        # Cache the combined catalog
        await self.cache.set('product_catalog', results, ttl=3600)
        
        return results
    
    async def _fetch_printful_catalog(self) -> List[Product]:
        """Fetch Printful product catalog"""
        cache_key = 'printful_catalog'
        
        # Check cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        products = []
        
        async with aiohttp.ClientSession() as session:
            # Get product list
            async with session.get(
                f'{os.getenv("PRINTFUL_API_URL")}/products',
                headers=self.printful_headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for item in data.get('result', []):
                        # Get detailed product info including variants
                        product_id = item['id']
                        
                        async with session.get(
                            f'{os.getenv("PRINTFUL_API_URL")}/products/{product_id}',
                            headers=self.printful_headers
                        ) as detail_response:
                            if detail_response.status == 200:
                                detail_data = await detail_response.json()
                                product_info = detail_data.get('result', {})
                                
                                # Create Product object with real data
                                product = Product(
                                    id=str(product_id),
                                    provider='printful',
                                    name=product_info.get('product', {}).get('title'),
                                    description=product_info.get('product', {}).get('description'),
                                    image_url=product_info.get('product', {}).get('image'),
                                    category=product_info.get('product', {}).get('type_name'),
                                    variants=self._parse_printful_variants(
                                        product_info.get('variants', [])
                                    ),
                                    print_areas=self._parse_print_areas(
                                        product_info.get('product', {})
                                    )
                                )
                                products.append(product)
        
        # Cache the results
        await self.cache.set(cache_key, products, ttl=3600)
        
        return products
    
    def _parse_printful_variants(self, variants: List[Dict]) -> List[ProductVariant]:
        """Parse Printful variants"""
        parsed_variants = []
        
        for variant in variants:
            parsed_variants.append(ProductVariant(
                id=str(variant['id']),
                name=variant['name'],
                size=variant.get('size'),
                color=variant.get('color'),
                color_code=variant.get('color_code'),
                price=float(variant.get('price', 0)),
                currency='USD',
                in_stock=variant.get('in_stock', True),
                availability_status=variant.get('availability_status', 'active')
            ))
        
        return parsed_variants
    
    def _parse_print_areas(self, product: Dict) -> List[Dict]:
        """Parse print areas with 2025 placement names"""
        print_areas = []
        
        for file in product.get('files', []):
            # Update placement names for 2025 API changes
            placement = file.get('type', '')
            if placement == 'front':  # Old placement name
                placement = 'front_large'  # New 2025 placement name
            
            print_areas.append({
                'placement': placement,
                'width': file.get('width'),
                'height': file.get('height'),
                'dpi': file.get('dpi', 150)
            })
        
        return print_areas
    
    async def _fetch_printify_catalog(self) -> List[Product]:
        """Fetch Printify product catalog"""
        cache_key = 'printify_catalog'
        
        # Check cache first
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        products = []
        
        async with aiohttp.ClientSession() as session:
            # Get blueprints (product templates)
            async with session.get(
                f'{os.getenv("PRINTIFY_API_URL")}/catalog/blueprints',
                headers=self.printify_headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for blueprint in data.get('data', []):
                        # Get blueprint details with variants
                        blueprint_id = blueprint['id']
                        
                        async with session.get(
                            f'{os.getenv("PRINTIFY_API_URL")}/catalog/blueprints/{blueprint_id}/print_providers',
                            headers=self.printify_headers
                        ) as provider_response:
                            if provider_response.status == 200:
                                provider_data = await provider_response.json()
                                
                                # Use first available print provider
                                if provider_data.get('data'):
                                    provider = provider_data['data'][0]
                                    
                                    product = Product(
                                        id=str(blueprint_id),
                                        provider='printify',
                                        name=blueprint.get('title'),
                                        description=blueprint.get('description'),
                                        image_url=blueprint.get('images', [{}])[0].get('src'),
                                        category=blueprint.get('model'),
                                        variants=self._parse_printify_variants(
                                            provider.get('variants', [])
                                        ),
                                        print_areas=self._parse_printify_print_areas(
                                            blueprint.get('print_areas', [])
                                        )
                                    )
                                    products.append(product)
        
        # Cache the results
        await self.cache.set(cache_key, products, ttl=3600)
        
        return products
    
    def _parse_printify_variants(self, variants: List[Dict]) -> List[ProductVariant]:
        """Parse Printify variants"""
        parsed_variants = []
        
        for variant in variants:
            parsed_variants.append(ProductVariant(
                id=str(variant['id']),
                name=variant.get('title'),
                size=variant.get('options', {}).get('size'),
                color=variant.get('options', {}).get('color'),
                color_code=variant.get('options', {}).get('color', {}).get('hex'),
                price=float(variant.get('price', {}).get('amount', 0)) / 100,  # Convert cents to dollars
                currency=variant.get('price', {}).get('currency', 'USD'),
                in_stock=variant.get('is_available', True),
                availability_status='active' if variant.get('is_available') else 'inactive'
            ))
        
        return parsed_variants
    
    def _parse_printify_print_areas(self, print_areas: List[Dict]) -> List[Dict]:
        """Parse Printify print areas"""
        parsed_areas = []
        
        for area in print_areas:
            parsed_areas.append({
                'placement': area.get('variant_name'),
                'width': area.get('width'),
                'height': area.get('height'),
                'dpi': 150  # Default DPI for Printify
            })
        
        return parsed_areas
    
    async def generate_mockup(self, request: MockupRequest) -> Dict[str, Any]:
        """Generate product mockup with design"""
        
        if request.provider == 'printful':
            return await self._generate_printful_mockup(request)
        elif request.provider == 'printify':
            return await self._generate_printify_mockup(request)
        else:
            raise HTTPException(status_code=400, detail="Invalid provider")
    
    async def _generate_printful_mockup(self, request: MockupRequest) -> Dict[str, Any]:
        """Generate Printful mockup"""
        
        # Prepare mockup request
        mockup_data = {
            "variant_ids": [int(request.variant_id)],
            "format": "jpg",
            "width": 1000,
            "files": [
                {
                    "placement": request.placement or "front_large",  # Use new placement name
                    "image_url": request.design_url,
                    "position": {
                        "area_width": request.position.get('width', 1800),
                        "area_height": request.position.get('height', 2400),
                        "width": request.position.get('design_width', 1800),
                        "height": request.position.get('design_height', 2400),
                        "top": request.position.get('top', 0),
                        "left": request.position.get('left', 0)
                    }
                }
            ]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{os.getenv("PRINTFUL_API_URL")}/mockup-generator/create-task/{request.product_id}',
                headers=self.printful_headers,
                json=mockup_data
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    task_key = data.get('result', {}).get('task_key')
                    
                    # Poll for result
                    return await self._poll_printful_mockup(task_key)
                else:
                    error_data = await response.json()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Mockup generation failed: {error_data}"
                    )
    
    async def _poll_printful_mockup(self, task_key: str, max_attempts: int = 30) -> Dict[str, Any]:
        """Poll Printful for mockup result"""
        
        async with aiohttp.ClientSession() as session:
            for attempt in range(max_attempts):
                await asyncio.sleep(2)  # Wait 2 seconds between polls
                
                async with session.get(
                    f'{os.getenv("PRINTFUL_API_URL")}/mockup-generator/task',
                    headers=self.printful_headers,
                    params={'task_key': task_key}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        result = data.get('result', {})
                        
                        if result.get('status') == 'completed':
                            mockups = result.get('mockups', [])
                            if mockups:
                                return {
                                    'mockup_url': mockups[0].get('mockup_url'),
                                    'variant_ids': mockups[0].get('variant_ids'),
                                    'placement': mockups[0].get('placement')
                                }
                        elif result.get('status') == 'failed':
                            raise HTTPException(
                                status_code=500,
                                detail="Mockup generation failed"
                            )
        
        raise HTTPException(
            status_code=504,
            detail="Mockup generation timeout"
        )
    
    async def _generate_printify_mockup(self, request: MockupRequest) -> Dict[str, Any]:
        """Generate Printify mockup with AI enhancement"""
        
        # Check if image needs AI enhancement
        enhancement_needed = await self._check_image_quality(request.design_url)
        
        mockup_data = {
            "print_areas": [
                {
                    "variant_ids": [int(request.variant_id)],
                    "placeholders": [
                        {
                            "position": request.placement or "front",
                            "images": [
                                {
                                    "id": request.design_url,
                                    "x": request.position.get('left', 0.5),
                                    "y": request.position.get('top', 0.5),
                                    "scale": request.position.get('scale', 1),
                                    "angle": request.position.get('angle', 0)
                                }
                            ]
                        }
                    ]
                }
            ],
            "ai_enhance": enhancement_needed  # Use AI enhancement if needed
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{os.getenv("PRINTIFY_API_URL")}/uploads/images',
                headers=self.printify_headers,
                json={"file_name": "design.png", "url": request.design_url}
            ) as upload_response:
                if upload_response.status == 200:
                    upload_data = await upload_response.json()
                    image_id = upload_data.get('id')
                    
                    # Generate mockup
                    async with session.post(
                        f'{os.getenv("PRINTIFY_API_URL")}/uploads/mockups',
                        headers=self.printify_headers,
                        json={
                            "blueprint_id": int(request.product_id),
                            "variant_id": int(request.variant_id),
                            "print_area_id": request.placement or "front",
                            "image_id": image_id
                        }
                    ) as mockup_response:
                        if mockup_response.status == 200:
                            mockup_data = await mockup_response.json()
                            return {
                                'mockup_url': mockup_data.get('url'),
                                'variant_id': request.variant_id,
                                'placement': request.placement
                            }
        
        raise HTTPException(
            status_code=500,
            detail="Mockup generation failed"
        )
    
    async def _check_image_quality(self, image_url: str) -> bool:
        """Check if image needs AI enhancement"""
        # Simple check based on resolution
        # In production, implement actual image analysis
        return False  # Placeholder
    
    async def create_order(self, order_request: Order) -> Dict[str, Any]:
        """Create order with selected provider"""
        
        if order_request.provider == 'printful':
            return await self._create_printful_order(order_request)
        elif order_request.provider == 'printify':
            return await self._create_printify_order(order_request)
        else:
            raise HTTPException(status_code=400, detail="Invalid provider")
    
    async def _create_printful_order(self, order: Order) -> Dict[str, Any]:
        """Create Printful order"""
        
        order_data = {
            "recipient": {
                "name": order.customer.name,
                "address1": order.customer.address.line1,
                "address2": order.customer.address.line2,
                "city": order.customer.address.city,
                "state_code": order.customer.address.state,
                "country_code": order.customer.address.country,
                "zip": order.customer.address.postal_code,
                "phone": order.customer.phone,
                "email": order.customer.email
            },
            "items": [
                {
                    "variant_id": int(item.variant_id),
                    "quantity": item.quantity,
                    "files": [
                        {
                            "type": item.placement or "front_large",
                            "url": item.design_url
                        }
                    ]
                }
                for item in order.items
            ]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{os.getenv("PRINTFUL_API_URL")}/orders',
                headers=self.printful_headers,
                json=order_data
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        'order_id': data.get('result', {}).get('id'),
                        'status': data.get('result', {}).get('status'),
                        'dashboard_url': data.get('result', {}).get('dashboard_url')
                    }
                else:
                    error_data = await response.json()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Order creation failed: {error_data}"
                    )

# Initialize service
pod_service = PODService()
```

### API Routes Implementation
```python
# backend/app/routes/pod.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Dict, Any
from models.pod import Product, MockupRequest, Order
from app.services.pod_service import pod_service
from app.auth import get_current_user

router = APIRouter(prefix="/api/pod", tags=["POD"])

@router.get("/products")
async def get_products(
    provider: Optional[str] = None,
    category: Optional[str] = None,
    user=Depends(get_current_user)
) -> Dict[str, List[Product]]:
    """Get product catalog from POD providers"""
    
    # Get full catalog
    catalog = await pod_service.sync_product_catalog()
    
    # Filter by provider if specified
    if provider:
        catalog = {provider: catalog.get(provider, [])}
    
    # Filter by category if specified
    if category:
        for provider_name in catalog:
            catalog[provider_name] = [
                p for p in catalog[provider_name]
                if p.category == category
            ]
    
    return catalog

@router.post("/products/sync")
async def sync_products(
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user)
) -> Dict[str, str]:
    """Trigger product catalog sync"""
    
    background_tasks.add_task(pod_service.sync_product_catalog)
    
    return {"status": "Sync started", "message": "Product catalog sync in progress"}

@router.post("/mockup")
async def generate_mockup(
    request: MockupRequest,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate product mockup with design"""
    
    try:
        mockup = await pod_service.generate_mockup(request)
        return mockup
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders")
async def create_order(
    order: Order,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Create order with POD provider"""
    
    try:
        result = await pod_service.create_order(order)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders/{order_id}")
async def get_order_status(
    order_id: str,
    provider: str,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Get order status from POD provider"""
    
    # Implementation for order status tracking
    pass

@router.post("/webhooks/printful")
async def handle_printful_webhook(
    webhook_data: Dict[str, Any]
) -> Dict[str, str]:
    """Handle Printful webhooks"""
    
    # Verify webhook signature
    # Process webhook event
    # Update order status in database
    
    return {"status": "received"}

@router.post("/webhooks/printify")
async def handle_printify_webhook(
    webhook_data: Dict[str, Any]
) -> Dict[str, str]:
    """Handle Printify webhooks"""
    
    # Process webhook event
    # Update order status in database
    
    return {"status": "received"}
```

## 3. FRONTEND IMPLEMENTATION

### Product Catalog Component
```typescript
// frontend/components/ProductCatalog.tsx
import React, { useEffect, useState } from 'react';
import { apiService } from '@/lib/api';
import { VirtualizedProductGrid } from './VirtualizedProductGrid';

interface Product {
  id: string;
  provider: string;
  name: string;
  image_url: string;
  category: string;
  variants: Variant[];
  price_range: {
    min: number;
    max: number;
  };
}

export function ProductCatalog({ onProductSelect }: { onProductSelect: (product: Product) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    provider: 'all',
    category: 'all'
  });
  
  useEffect(() => {
    loadProducts();
  }, [filter]);
  
  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await apiService.pod.getProducts(
        filter.provider !== 'all' ? filter.provider : undefined,
        filter.category !== 'all' ? filter.category : undefined
      );
      
      // Combine products from all providers
      const allProducts = Object.values(response).flat();
      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const syncCatalog = async () => {
    try {
      await apiService.pod.syncProducts();
      // Show success notification
      setTimeout(() => loadProducts(), 5000); // Reload after sync
    } catch (error) {
      console.error('Failed to sync catalog:', error);
    }
  };
  
  if (loading) {
    return <ProductCatalogSkeleton />;
  }
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <select
          value={filter.provider}
          onChange={(e) => setFilter({ ...filter, provider: e.target.value })}
          className="glass-select"
        >
          <option value="all">All Providers</option>
          <option value="printful">Printful</option>
          <option value="printify">Printify</option>
        </select>
        
        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="glass-select"
        >
          <option value="all">All Categories</option>
          <option value="Apparel">Apparel</option>
          <option value="Accessories">Accessories</option>
          <option value="Home & Living">Home & Living</option>
        </select>
        
        <button
          onClick={syncCatalog}
          className="glass-button ml-auto"
        >
          Sync Catalog
        </button>
      </div>
      
      {/* Product Grid */}
      <VirtualizedProductGrid
        products={products}
        onProductSelect={onProductSelect}
      />
    </div>
  );
}

function ProductCatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="glass-panel animate-pulse">
          <div className="aspect-square bg-white/10 rounded-lg mb-2" />
          <div className="h-4 bg-white/10 rounded mb-1" />
          <div className="h-3 bg-white/10 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
```

### Mockup Preview Component
```typescript
// frontend/components/MockupPreview.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';

interface MockupPreviewProps {
  product: Product;
  variant: Variant;
  designUrl: string;
  placement?: string;
}

export function MockupPreview({ 
  product, 
  variant, 
  designUrl, 
  placement = 'front_large' 
}: MockupPreviewProps) {
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (product && variant && designUrl) {
      generateMockup();
    }
  }, [product, variant, designUrl, placement]);
  
  const generateMockup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.pod.generateMockup({
        provider: product.provider,
        product_id: product.id,
        variant_id: variant.id,
        design_url: designUrl,
        placement: placement,
        position: {
          width: 1800,
          height: 2400,
          design_width: 1800,
          design_height: 2400,
          top: 0,
          left: 0
        }
      });
      
      setMockupUrl(response.mockup_url);
    } catch (err) {
      setError('Failed to generate mockup');
      console.error('Mockup generation error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="glass-panel p-6">
      <h3 className="text-lg font-semibold mb-4">Product Preview</h3>
      
      <div className="aspect-square bg-white/5 rounded-lg overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full text-red-400">
            <p>{error}</p>
          </div>
        )}
        
        {mockupUrl && !loading && (
          <img
            src={mockupUrl}
            alt="Product mockup"
            className="w-full h-full object-contain"
          />
        )}
        
        {!mockupUrl && !loading && !error && (
          <div className="flex items-center justify-center h-full text-white/50">
            <p>Select a product to preview</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Product:</span>
          <span className="text-white">{product?.name || '-'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Variant:</span>
          <span className="text-white">{variant?.name || '-'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Price:</span>
          <span className="text-white">${variant?.price || '-'}</span>
        </div>
      </div>
      
      {mockupUrl && (
        <button
          onClick={() => window.open(mockupUrl, '_blank')}
          className="w-full mt-4 glass-button"
        >
          View Full Size
        </button>
      )}
    </div>
  );
}
```

## 4. CACHING STRATEGY

### Redis Caching Service
```python
# backend/app/services/caching.py
import aioredis
import json
import hashlib
from typing import Any, Optional
from datetime import timedelta

class CachingService:
    """Redis-based caching for POD data"""
    
    def __init__(self):
        self.redis = None
        self.default_ttl = 3600  # 1 hour
    
    async def connect(self):
        """Connect to Redis"""
        self.redis = await aioredis.from_url(
            os.getenv('REDIS_URL', 'redis://localhost:6379'),
            encoding="utf-8",
            decode_responses=True
        )
    
    async def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        if not self.redis:
            await self.connect()
        
        value = await self.redis.get(key)
        if value:
            return json.loads(value)
        return None
    
    async def set(self, key: str, value: Any, ttl: int = None) -> None:
        """Set cached value"""
        if not self.redis:
            await self.connect()
        
        ttl = ttl or self.default_ttl
        await self.redis.set(
            key,
            json.dumps(value),
            ex=ttl
        )
    
    async def delete(self, key: str) -> None:
        """Delete cached value"""
        if not self.redis:
            await self.connect()
        
        await self.redis.delete(key)
    
    def make_cache_key(self, *args) -> str:
        """Create cache key from arguments"""
        key_string = ':'.join(str(arg) for arg in args)
        return hashlib.md5(key_string.encode()).hexdigest()
```

## 5. WEBHOOK HANDLING

### Webhook Security
```python
# backend/app/services/webhook_security.py
import hmac
import hashlib
from fastapi import Request, HTTPException

async def verify_printful_webhook(request: Request, secret: str) -> bool:
    """Verify Printful webhook signature"""
    
    signature = request.headers.get('X-Printful-Signature')
    if not signature:
        raise HTTPException(status_code=401, detail="Missing signature")
    
    body = await request.body()
    expected_signature = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)
```

## 6. TESTING SUITE

### POD Integration Tests
```python
# backend/tests/test_pod_integration.py
import pytest
from httpx import AsyncClient
from app.services.pod_service import pod_service

@pytest.mark.asyncio
async def test_fetch_product_catalog():
    """Test fetching product catalog"""
    catalog = await pod_service.sync_product_catalog()
    
    assert 'printful' in catalog
    assert 'printify' in catalog
    assert len(catalog['printful']) > 0
    assert len(catalog['printify']) > 0

@pytest.mark.asyncio
async def test_generate_mockup():
    """Test mockup generation"""
    mockup_request = MockupRequest(
        provider='printful',
        product_id='71',  # Unisex Staple T-Shirt
        variant_id='4011',  # Black / S
        design_url='https://example.com/design.png',
        placement='front_large'
    )
    
    result = await pod_service.generate_mockup(mockup_request)
    
    assert 'mockup_url' in result
    assert result['mockup_url'].startswith('https://')
```

## 7. IMPLEMENTATION TIMELINE

### Phase 1: API Setup (4 hours)
- [ ] Configure environment variables
- [ ] Set up API authentication
- [ ] Create service classes
- [ ] Implement caching layer

### Phase 2: Product Catalog (6 hours)
- [ ] Fetch Printful products
- [ ] Fetch Printify products
- [ ] Parse and normalize data
- [ ] Implement frontend components

### Phase 3: Mockup Generation (6 hours)
- [ ] Printful mockup API
- [ ] Printify mockup API
- [ ] Frontend preview component
- [ ] Error handling

### Phase 4: Order Processing (4 hours)
- [ ] Order creation endpoints
- [ ] Webhook handlers
- [ ] Order status tracking
- [ ] Testing

## DELIVERABLES

1. **Working Product Catalog**: Real products from both providers
2. **Dynamic Mockup Generation**: Live previews with actual products
3. **Order Processing**: Complete fulfillment pipeline
4. **Webhook Integration**: Real-time order updates
5. **Documentation**: API usage and integration guide

---
*POD Integration Ready for Implementation*
*Estimated Time: 20 hours*
*Priority: CRITICAL*