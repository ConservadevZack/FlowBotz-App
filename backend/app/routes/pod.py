from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from .auth import verify_token
from ..database import db_service
import os
import httpx
import base64
from datetime import datetime, timedelta
import asyncio
from functools import wraps
import json

router = APIRouter()

# Simple in-memory cache for POD products
_product_cache = {}
_cache_expiry = {}
CACHE_DURATION_MINUTES = 30

def cache_key(provider: str, category: str) -> str:
    """Generate cache key for POD products"""
    return f"{provider}_{category}"

def is_cache_valid(key: str) -> bool:
    """Check if cache entry is still valid"""
    if key not in _cache_expiry:
        return False
    return datetime.now() < _cache_expiry[key]

def get_from_cache(key: str):
    """Get products from cache if valid"""
    if is_cache_valid(key) and key in _product_cache:
        print(f"✅ Using cached products for {key}")
        return _product_cache[key]
    return None

def set_cache(key: str, products):
    """Set products in cache with expiry"""
    _product_cache[key] = products
    _cache_expiry[key] = datetime.now() + timedelta(minutes=CACHE_DURATION_MINUTES)
    print(f"✅ Cached {len(products)} products for {key}")

# Pydantic models
class ProductRequest(BaseModel):
    category: Optional[str] = "apparel"
    subcategory: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    description: str
    type: str
    brand: str
    model: str
    image: str
    variants: List[Dict[str, Any]]
    options: List[Dict[str, Any]]

class MockupRequest(BaseModel):
    product_id: str
    variant_id: str
    design_url: str
    placement: Optional[str] = "front"

class MockupResponse(BaseModel):
    mockup_url: str
    product_id: str
    variant_id: str

class OrderRequest(BaseModel):
    product_id: str
    variant_id: str
    quantity: int
    design_url: str
    recipient: Dict[str, str]
    shipping_method: str

class OrderResponse(BaseModel):
    order_id: str
    status: str
    total_cost: float
    estimated_delivery: str

@router.get("/products", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = "apparel",
    provider: Optional[str] = "printful",
    current_user = Depends(verify_token)
):
    """Get available print-on-demand products with enhanced specifications and database tracking"""
    try:
        # Track product request
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="pod",
            event_action="products_viewed",
            properties={
                "category": category,
                "provider": provider
            }
        )
        
        if provider == "printify":
            products = await get_printify_products(category)
        else:
            products = await get_printful_products(category)
            
        # Track successful product fetch
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="pod",
            event_action="products_loaded",
            properties={
                "category": category,
                "provider": provider,
                "product_count": len(products)
            }
        )
        
        return products
        
    except Exception as e:
        # Track error
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="pod",
            event_action="products_error",
            properties={
                "error_type": type(e).__name__,
                "category": category,
                "provider": provider
            }
        )
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")

@router.get("/categories")
async def get_product_categories(current_user = Depends(verify_token)):
    """Get all available product categories from both providers"""
    try:
        categories = {
            "apparel": {
                "name": "Apparel",
                "description": "T-shirts, hoodies, tank tops & more",
                "icon": "👕",
                "subcategories": ["t-shirts", "hoodies", "tank-tops", "long-sleeve", "polo"]
            },
            "accessories": {
                "name": "Accessories", 
                "description": "Bags, hats, phone cases & more",
                "icon": "🎒",
                "subcategories": ["bags", "hats", "phone-cases", "mugs"]
            },
            "home": {
                "name": "Home & Living",
                "description": "Pillows, wall art, blankets & more", 
                "icon": "🏠",
                "subcategories": ["pillows", "wall-art", "blankets", "posters"]
            }
        }
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch categories: {str(e)}")

@router.get("/products/unified")
async def get_unified_products(
    category: Optional[str] = "apparel",
    current_user = Depends(verify_token)
):
    """Get combined products from both Printful and Printify providers"""
    try:
        # Get products from both providers concurrently
        printful_products = await get_printful_products(category)
        printify_products = await get_printify_products(category)
        
        # Combine and deduplicate products
        all_products = []
        
        # Add Printful products with provider info
        for product in printful_products:
            product_dict = product.dict() if hasattr(product, 'dict') else product
            product_dict['provider'] = 'printful'
            product_dict['provider_name'] = 'Printful'
            all_products.append(product_dict)
            
        # Add Printify products with provider info  
        for product in printify_products:
            product_dict = product.dict() if hasattr(product, 'dict') else product
            product_dict['provider'] = 'printify'
            product_dict['provider_name'] = 'Printify'
            all_products.append(product_dict)
        
        # Sort by product type and name for consistent ordering
        all_products.sort(key=lambda x: (x.get('type', ''), x.get('name', '')))
        
        return {
            "category": category,
            "total_products": len(all_products),
            "providers": ["printful", "printify"],
            "products": all_products
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch unified products: {str(e)}")

async def get_printful_products(category: str = "apparel"):
    """Get products from Printful API V2 (2025) with enhanced features and detailed variants"""
    # Check cache first
    cache_key_str = cache_key("printful", category)
    cached_products = get_from_cache(cache_key_str)
    if cached_products:
        return cached_products
    
    printful_api_key = os.getenv("PRINTFUL_API_KEY")
    if not printful_api_key or printful_api_key == "your_printful_api_key":
        print("⚠️  Printful API key not configured, using mock data")
        mock_products = get_mock_products()
        set_cache(cache_key_str, mock_products)
        return mock_products
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Try Printful API V2 first (2025 latest), fallback to V1
            api_version = "v2"
            base_url = f"https://api.printful.com/{api_version}"
            
            # Get all products from Printful V2
            response = await client.get(
                f"{base_url}/products",
                headers={
                    "Authorization": f"Bearer {printful_api_key}",
                    "Content-Type": "application/json",
                    "X-PF-Store-Id": "store-id"  # V2 might require store ID
                }
            )
            
            # Fallback to V1 if V2 fails
            if response.status_code != 200:
                print(f"⚠️  V2 API failed ({response.status_code}), falling back to V1")
                api_version = "v1"
                base_url = "https://api.printful.com"
                response = await client.get(
                    f"{base_url}/products",
                    headers={
                        "Authorization": f"Bearer {printful_api_key}",
                        "Content-Type": "application/json"
                    }
                )
            
            if response.status_code != 200:
                print(f"❌ Printful API error: {response.status_code} - {response.text}")
                return get_mock_products()
            
            data = response.json()
            products = []
            
            # Filter for popular apparel items
            apparel_filter = ["t-shirt", "hoodie", "tank-top", "long-sleeve", "polo"]
            
            for item in data.get("result", []):
                product_type = item.get("type", "").lower()
                
                # Skip non-apparel items if category is apparel
                if category == "apparel" and not any(t in product_type for t in apparel_filter):
                    continue
                
                # Get detailed product info including variants (use determined API version)
                detail_headers = {
                    "Authorization": f"Bearer {printful_api_key}",
                    "Content-Type": "application/json"
                }
                if api_version == "v2":
                    detail_headers["X-PF-Store-Id"] = "store-id"
                
                product_detail_response = await client.get(
                    f"{base_url}/products/{item['id']}",
                    headers=detail_headers
                )
                
                if product_detail_response.status_code != 200:
                    print(f"❌ Failed to get product details for {item['id']}")
                    continue
                
                detail_data = product_detail_response.json()
                product_info = detail_data.get("result", {})
                
                variants = []
                options = {"sizes": set(), "colors": set()}
                
                for variant in product_info.get("variants", []):
                    # Check if variant is available in any region
                    if variant.get("in_stock", False):
                        # Find the best product image - prioritize mockup files
                        variant_image = ""
                        files = variant.get("files", [])
                        
                        # Look for mockup images first
                        for file_info in files:
                            if isinstance(file_info, dict):
                                file_type = file_info.get("type", "").lower()
                                preview_url = file_info.get("preview_url", "")
                                
                                # Prioritize mockup files with good preview URLs
                                if file_type in ["mockup"] and preview_url:
                                    variant_image = preview_url
                                    break
                        
                        # Fallback to any available preview
                        if not variant_image and files:
                            for file_info in files:
                                if isinstance(file_info, dict):
                                    preview_url = file_info.get("preview_url", "")
                                    if preview_url:
                                        variant_image = preview_url
                                        break
                        
                        # Use main product image as final fallback
                        if not variant_image:
                            variant_image = item.get("image", "")
                        
                        variants.append({
                            "id": str(variant["id"]),
                            "name": variant.get("name", ""),
                            "size": variant.get("size", ""),
                            "color": variant.get("color", ""),
                            "color_code": variant.get("color_code", ""),
                            "price": float(variant.get("price", 0)),
                            "in_stock": variant.get("in_stock", True),
                            "image": variant_image,
                            "image_type": "mockup" if variant_image else "none"
                        })
                        
                        if variant.get("size"):
                            options["sizes"].add(variant.get("size"))
                        if variant.get("color"):
                            options["colors"].add(variant.get("color"))
                
                # Only add products that have variants
                if variants:
                    # Use the first variant's image or main product image
                    main_product_image = variants[0]["image"] if variants[0].get("image") else item.get("image", "")
                    
                    products.append(ProductResponse(
                        id=str(item["id"]),
                        name=item["title"],
                        description=item.get("description", "High-quality print-on-demand product"),
                        type=product_type,
                        brand="Printful",
                        model=item["title"],
                        image=main_product_image,
                        variants=variants,
                        options=[
                            {"name": "Size", "values": list(options["sizes"])},
                            {"name": "Color", "values": list(options["colors"])}
                        ]
                    ))
                    
                    # Limit to 10 products for performance
                    if len(products) >= 10:
                        break
            
            if products:
                print(f"✅ Fetched {len(products)} Printful products")
                set_cache(cache_key_str, products)
                return products
            else:
                print("⚠️  No products found from Printful, using mock data")
                mock_products = get_mock_products()
                set_cache(cache_key_str, mock_products)
                return mock_products
            
        except Exception as e:
            print(f"❌ Printful API error: {str(e)}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            mock_products = get_mock_products()
            set_cache(cache_key_str, mock_products)
            return mock_products

async def get_printify_products(category: str = "apparel"):
    """Get products from Printify API with detailed variants and pricing"""
    # Check cache first
    cache_key_str = cache_key("printify", category)
    cached_products = get_from_cache(cache_key_str)
    if cached_products:
        return cached_products
    
    printify_api_key = os.getenv("PRINTIFY_API_KEY")
    if not printify_api_key or printify_api_key == "your_printify_api_key":
        print("⚠️  Printify API key not configured, using mock data")
        mock_products = get_mock_products()
        set_cache(cache_key_str, mock_products)
        return mock_products
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Get all blueprints (product templates) from Printify
            response = await client.get(
                "https://api.printify.com/v1/catalog/blueprints.json",
                headers={
                    "Authorization": f"Bearer {printify_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code != 200:
                print(f"❌ Printify API error: {response.status_code} - {response.text}")
                return get_mock_products()
            
            data = response.json()
            products = []
            
            # Filter for popular apparel items
            apparel_filter = ["t-shirt", "hoodie", "tank", "long-sleeve", "polo", "sweatshirt"]
            
            # Handle different response formats from Printify
            blueprint_list = []
            if isinstance(data, dict):
                blueprint_list = data.get("data", data.get("result", []))
            elif isinstance(data, list):
                blueprint_list = data
            else:
                print(f"❌ Printify data unexpected type: {type(data)}")
                return get_mock_products()
            
            for item in blueprint_list[:15]:  # Limit to first 15 blueprints
                try:
                    blueprint_title = item.get("title", "").lower()
                    
                    # Skip non-apparel items if category is apparel
                    if category == "apparel" and not any(t in blueprint_title for t in apparel_filter):
                        continue
                    
                    blueprint_id = item.get("id")
                    if not blueprint_id:
                        continue
                    
                    # Get print providers for this blueprint
                    providers_response = await client.get(
                        f"https://api.printify.com/v1/catalog/blueprints/{blueprint_id}/print_providers.json",
                        headers={
                            "Authorization": f"Bearer {printify_api_key}",
                            "Content-Type": "application/json"
                        }
                    )
                    
                    if providers_response.status_code != 200:
                        print(f"❌ Failed to get providers for blueprint {blueprint_id}")
                        continue
                    
                    providers_data = providers_response.json()
                    
                    # Handle different provider response formats
                    provider_list = []
                    if isinstance(providers_data, dict):
                        provider_list = providers_data.get("data", providers_data.get("result", []))
                    elif isinstance(providers_data, list):
                        provider_list = providers_data
                    
                    if not provider_list:
                        print(f"❌ No providers found for blueprint {blueprint_id}")
                        continue
                    
                    provider = provider_list[0]  # Use first provider
                    provider_id = provider.get("id")
                    
                    # Get variants for this blueprint and provider
                    variants_response = await client.get(
                        f"https://api.printify.com/v1/catalog/blueprints/{blueprint_id}/print_providers/{provider_id}/variants.json",
                        headers={
                            "Authorization": f"Bearer {printify_api_key}",
                            "Content-Type": "application/json"
                        }
                    )
                    
                    if variants_response.status_code != 200:
                        print(f"❌ Failed to get variants for blueprint {blueprint_id}, provider {provider_id}")
                        continue
                    
                    variants_data = variants_response.json()
                    variants = []
                    options = {"sizes": set(), "colors": set()}
                    
                    # Handle different variant response formats
                    variants_list = []
                    if isinstance(variants_data, dict):
                        variants_list = variants_data.get("variants", variants_data.get("data", variants_data.get("result", [])))
                    elif isinstance(variants_data, list):
                        variants_list = variants_data
                    
                    for variant in variants_list:
                        if not isinstance(variant, dict) or not variant.get("is_enabled", True):
                            continue
                        
                        # Extract variant information
                        variant_title = variant.get("title", "")
                        size = ""
                        color = ""
                        
                        # Parse size and color from variant options
                        for option in variant.get("options", []):
                            if not isinstance(option, dict):
                                continue
                            
                            option_type = option.get("type", "").lower()
                            if option_type in ["size", "sizes"]:
                                size = option.get("value", "")
                            elif option_type in ["color", "colors", "colour"]:
                                color = option.get("value", "")
                        
                        # Fallback: extract size from title
                        if not size:
                            size_patterns = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL", "5XL"]
                            for s in size_patterns:
                                if s in variant_title.upper():
                                    size = s
                                    break
                        
                        # Get variant image
                        variant_image = ""
                        if "image" in variant and variant["image"]:
                            variant_image = variant["image"]
                        elif "preview_url" in variant and variant["preview_url"]:
                            variant_image = variant["preview_url"]
                        
                        variants.append({
                            "id": str(variant["id"]),
                            "name": variant_title,
                            "size": size,
                            "color": color,
                            "color_code": "",  # Printify doesn't provide color codes
                            "price": float(variant.get("price", 0)) / 100,  # Convert from cents
                            "in_stock": variant.get("is_enabled", True),
                            "image": variant_image
                        })
                        
                        if size:
                            options["sizes"].add(size)
                        if color:
                            options["colors"].add(color)
                    
                    # Only add products that have variants
                    if variants:
                        main_product_image = _get_printify_image_safe(item)
                        if not main_product_image and variants[0].get("image"):
                            main_product_image = variants[0]["image"]
                        
                        products.append(ProductResponse(
                            id=str(blueprint_id),
                            name=item["title"],
                            description=item.get("description", "High-quality print-on-demand product"),
                            type=blueprint_title.split()[0] if blueprint_title else "apparel",
                            brand="Printify",
                            model=item["title"],
                            image=main_product_image,
                            variants=variants,
                            options=[
                                {"name": "Size", "values": list(options["sizes"])},
                                {"name": "Color", "values": list(options["colors"])}
                            ]
                        ))
                        
                        # Limit to 10 products for performance
                        if len(products) >= 10:
                            break
                
                except Exception as item_error:
                    print(f"❌ Error processing Printify item: {str(item_error)}")
                    continue
            
            if products:
                print(f"✅ Fetched {len(products)} Printify products")
                set_cache(cache_key_str, products)
                return products
            else:
                print("⚠️  No products found from Printify, using mock data")
                mock_products = get_mock_products()
                set_cache(cache_key_str, mock_products)
                return mock_products
            
        except Exception as e:
            print(f"❌ Printify API error: {str(e)}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            mock_products = get_mock_products()
            set_cache(cache_key_str, mock_products)
            return mock_products

def get_mock_products():
    """Return mock products with realistic images for demonstration"""
    return [
        ProductResponse(
            id="mock-1",
            name="Premium Cotton T-Shirt",
            description="High-quality 100% cotton t-shirt perfect for custom designs. Soft, comfortable, and durable.",
            type="t-shirt",
            brand="FlowBotz",
            model="Premium Cotton Tee",
            image="https://images.printful.com/products/71/product_1581412399.jpg",
            variants=[
                {"id": "mock-1-s-white", "name": "Premium T-Shirt - S - White", "size": "S", "color": "White", "color_code": "#FFFFFF", "price": 19.99, "in_stock": True, "image": "https://images.printful.com/products/71/product_1581412399.jpg"},
                {"id": "mock-1-m-white", "name": "Premium T-Shirt - M - White", "size": "M", "color": "White", "color_code": "#FFFFFF", "price": 19.99, "in_stock": True, "image": "https://images.printful.com/products/71/product_1581412399.jpg"},
                {"id": "mock-1-l-white", "name": "Premium T-Shirt - L - White", "size": "L", "color": "White", "color_code": "#FFFFFF", "price": 19.99, "in_stock": True, "image": "https://images.printful.com/products/71/product_1581412399.jpg"},
                {"id": "mock-1-xl-white", "name": "Premium T-Shirt - XL - White", "size": "XL", "color": "White", "color_code": "#FFFFFF", "price": 21.99, "in_stock": True, "image": "https://images.printful.com/products/71/product_1581412399.jpg"},
                {"id": "mock-1-m-black", "name": "Premium T-Shirt - M - Black", "size": "M", "color": "Black", "color_code": "#000000", "price": 19.99, "in_stock": True, "image": "https://images.printful.com/products/71/product_1581412420.jpg"}
            ],
            options=[
                {"name": "Color", "values": ["White", "Black", "Navy", "Gray"]},
                {"name": "Size", "values": ["S", "M", "L", "XL", "XXL"]}
            ]
        ),
        ProductResponse(
            id="mock-2",
            name="Unisex Heavy Blend Hoodie",
            description="Comfortable unisex hoodie made from a cotton-polyester blend. Features a kangaroo pocket and adjustable drawstring hood.",
            type="hoodie",
            brand="FlowBotz",
            model="Heavy Blend Hoodie",
            image="https://images.printful.com/products/146/product_1581412677.jpg",
            variants=[
                {"id": "mock-2-s-black", "name": "Heavy Blend Hoodie - S - Black", "size": "S", "color": "Black", "color_code": "#000000", "price": 39.99, "in_stock": True, "image": "https://images.printful.com/products/146/product_1581412677.jpg"},
                {"id": "mock-2-m-black", "name": "Heavy Blend Hoodie - M - Black", "size": "M", "color": "Black", "color_code": "#000000", "price": 39.99, "in_stock": True, "image": "https://images.printful.com/products/146/product_1581412677.jpg"},
                {"id": "mock-2-l-black", "name": "Heavy Blend Hoodie - L - Black", "size": "L", "color": "Black", "color_code": "#000000", "price": 39.99, "in_stock": True, "image": "https://images.printful.com/products/146/product_1581412677.jpg"},
                {"id": "mock-2-xl-black", "name": "Heavy Blend Hoodie - XL - Black", "size": "XL", "color": "Black", "color_code": "#000000", "price": 42.99, "in_stock": True, "image": "https://images.printful.com/products/146/product_1581412677.jpg"}
            ],
            options=[
                {"name": "Color", "values": ["Black", "Navy", "Gray", "Maroon", "White"]},
                {"name": "Size", "values": ["S", "M", "L", "XL", "XXL", "3XL"]}
            ]
        ),
        ProductResponse(
            id="mock-3",
            name="Bella Canvas Unisex Tank Top",
            description="Lightweight and comfortable unisex tank top, perfect for summer designs. Made from soft, breathable fabric.",
            type="tank-top",
            brand="FlowBotz",
            model="Bella Canvas Tank",
            image="https://images.printful.com/products/102/product_1581412516.jpg",
            variants=[
                {"id": "mock-3-s-white", "name": "Tank Top - S - White", "size": "S", "color": "White", "color_code": "#FFFFFF", "price": 16.99, "in_stock": True, "image": "https://images.printful.com/products/102/product_1581412516.jpg"},
                {"id": "mock-3-m-white", "name": "Tank Top - M - White", "size": "M", "color": "White", "color_code": "#FFFFFF", "price": 16.99, "in_stock": True, "image": "https://images.printful.com/products/102/product_1581412516.jpg"},
                {"id": "mock-3-l-white", "name": "Tank Top - L - White", "size": "L", "color": "White", "color_code": "#FFFFFF", "price": 16.99, "in_stock": True, "image": "https://images.printful.com/products/102/product_1581412516.jpg"},
                {"id": "mock-3-m-black", "name": "Tank Top - M - Black", "size": "M", "color": "Black", "color_code": "#000000", "price": 16.99, "in_stock": True, "image": "https://images.printful.com/products/102/product_1581412539.jpg"}
            ],
            options=[
                {"name": "Color", "values": ["White", "Black", "Gray", "Navy"]},
                {"name": "Size", "values": ["S", "M", "L", "XL", "XXL"]}
            ]
        ),
        ProductResponse(
            id="mock-4",
            name="Long Sleeve Tee",
            description="Classic long sleeve t-shirt made from premium cotton. Perfect for cooler weather and layering.",
            type="long-sleeve",
            brand="FlowBotz",
            model="Classic Long Sleeve",
            image="https://images.printful.com/products/95/product_1581412481.jpg",
            variants=[
                {"id": "mock-4-m-white", "name": "Long Sleeve Tee - M - White", "size": "M", "color": "White", "color_code": "#FFFFFF", "price": 24.99, "in_stock": True, "image": "https://images.printful.com/products/95/product_1581412481.jpg"},
                {"id": "mock-4-l-white", "name": "Long Sleeve Tee - L - White", "size": "L", "color": "White", "color_code": "#FFFFFF", "price": 24.99, "in_stock": True, "image": "https://images.printful.com/products/95/product_1581412481.jpg"},
                {"id": "mock-4-xl-white", "name": "Long Sleeve Tee - XL - White", "size": "XL", "color": "White", "color_code": "#FFFFFF", "price": 26.99, "in_stock": True, "image": "https://images.printful.com/products/95/product_1581412481.jpg"}
            ],
            options=[
                {"name": "Color", "values": ["White", "Black", "Gray", "Navy", "Red"]},
                {"name": "Size", "values": ["S", "M", "L", "XL", "XXL"]}
            ]
        )
    ]

@router.post("/mockup", response_model=MockupResponse)
async def generate_mockup(
    request: MockupRequest,
    current_user = Depends(verify_token)
):
    """Generate product mockup with design using POD provider APIs"""
    try:
        # Determine provider and generate mockup
        provider = determine_provider_from_product_id(request.product_id)
        
        if provider == "printful":
            mockup_url = await generate_printful_mockup(request)
        elif provider == "printify":
            mockup_url = await generate_printify_mockup(request)
        else:
            # Fallback to placeholder for mock products
            mockup_url = f"https://via.placeholder.com/600x600?text=Mockup+Product+{request.product_id}"
        
        # Track mockup generation
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="pod",
            event_action="mockup_generated",
            properties={
                "product_id": request.product_id,
                "variant_id": request.variant_id,
                "provider": provider,
                "placement": request.placement
            }
        )
        
        return MockupResponse(
            mockup_url=mockup_url,
            product_id=request.product_id,
            variant_id=request.variant_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mockup generation failed: {str(e)}")

@router.post("/order", response_model=OrderResponse)
async def create_order(
    request: OrderRequest,
    current_user = Depends(verify_token)
):
    """Create print-on-demand order with real POD provider integration"""
    try:
        # Determine which provider to use based on product_id
        provider = determine_provider_from_product_id(request.product_id)
        
        # Submit order to POD provider
        pod_order_result = await submit_pod_order(request, provider)
        
        if not pod_order_result["success"]:
            raise HTTPException(status_code=400, detail=f"POD order failed: {pod_order_result['error']}")
        
        # Create order in database with POD provider info
        order_record = await db_service.create_order(
            user_id=current_user["user_id"],
            product_details={
                "product_id": request.product_id,
                "variant_id": request.variant_id,
                "quantity": request.quantity,
                "design_url": request.design_url,
                "shipping_method": request.shipping_method,
                "provider": provider,
                "pod_order_id": pod_order_result.get("pod_order_id"),
                "fulfillment_status": "pending"
            },
            total_amount=pod_order_result["total_cost"],
            shipping_address=request.recipient
        )
        
        if not order_record:
            raise HTTPException(status_code=500, detail="Failed to create order record")
        
        # Update user stats
        await db_service.increment_user_stat(current_user["user_id"], "orders_placed")
        await db_service.update_user_stats(
            current_user["user_id"],
            {"total_spent": pod_order_result["total_cost"], "last_order_placed": datetime.now().isoformat()}
        )
        
        # Track order creation
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="pod",
            event_action="order_created",
            properties={
                "order_id": order_record["id"],
                "product_id": request.product_id,
                "variant_id": request.variant_id,
                "quantity": request.quantity,
                "total_cost": pod_order_result["total_cost"],
                "shipping_method": request.shipping_method,
                "provider": provider,
                "pod_order_id": pod_order_result.get("pod_order_id")
            }
        )
        
        return OrderResponse(
            order_id=order_record["order_number"],
            status=order_record["status"],
            total_cost=pod_order_result["total_cost"],
            estimated_delivery=pod_order_result.get("estimated_delivery", "7-10 business days")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")

@router.get("/order/{order_id}")
async def get_order_status(
    order_id: str,
    current_user = Depends(verify_token)
):
    """Get order status and tracking information"""
    try:
        # TODO: Implement real order tracking
        return {
            "order_id": order_id,
            "status": "in_production",
            "tracking_number": None,
            "estimated_delivery": "7-10 business days",
            "events": [
                {
                    "timestamp": "2024-01-15T10:00:00Z",
                    "status": "order_received",
                    "description": "Order received and queued for production"
                },
                {
                    "timestamp": "2024-01-15T14:30:00Z",
                    "status": "in_production",
                    "description": "Item is being printed"
                }
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get order status: {str(e)}")

@router.get("/product-specs/{product_id}")
async def get_product_specifications(
    product_id: str,
    provider: str = "printful",
    current_user = Depends(verify_token)
):
    """Get detailed product specifications with placement constraints for design overlay"""
    try:
        # Define real POD placement constraints based on 2025 standards
        product_type_specs = {
            "t-shirt": {
                "type": "t-shirt",
                "print_areas": {
                    "center_chest": {
                        "area": "center_chest",
                        "x_range": [-6, 6],
                        "y_range": [3, 8], 
                        "max_width": 12,
                        "max_height": 14,
                        "optimal_x": 0,
                        "optimal_y": 5.5,
                        "priority": 1
                    },
                    "left_chest": {
                        "area": "left_chest", 
                        "x_range": [-6, -2],
                        "y_range": [3, 6],
                        "max_width": 4,
                        "max_height": 4,
                        "optimal_x": -4,
                        "optimal_y": 4.5,
                        "priority": 2
                    },
                    "back": {
                        "area": "back",
                        "x_range": [-7, 7],
                        "y_range": [2, 10],
                        "max_width": 14,
                        "max_height": 16,
                        "optimal_x": 0,
                        "optimal_y": 6,
                        "priority": 3
                    }
                },
                "product_dimensions": {"width": 24, "height": 32}
            },
            "hoodie": {
                "type": "hoodie",
                "print_areas": {
                    "center_chest": {
                        "area": "center_chest",
                        "x_range": [-6, 6],
                        "y_range": [4, 9],
                        "max_width": 14,
                        "max_height": 16,
                        "optimal_x": 0,
                        "optimal_y": 6.5,
                        "priority": 1
                    },
                    "left_chest": {
                        "area": "left_chest",
                        "x_range": [-7, -3],
                        "y_range": [4, 7],
                        "max_width": 4,
                        "max_height": 4,
                        "optimal_x": -5,
                        "optimal_y": 5.5,
                        "priority": 2
                    },
                    "back": {
                        "area": "back",
                        "x_range": [-8, 8],
                        "y_range": [2, 11],
                        "max_width": 16,
                        "max_height": 18,
                        "optimal_x": 0,
                        "optimal_y": 6.5,
                        "priority": 3
                    }
                },
                "product_dimensions": {"width": 26, "height": 34}
            },
            "tank-top": {
                "type": "tank-top",
                "print_areas": {
                    "center_chest": {
                        "area": "center_chest",
                        "x_range": [-4, 4],
                        "y_range": [3, 7],
                        "max_width": 10,
                        "max_height": 12,
                        "optimal_x": 0,
                        "optimal_y": 5,
                        "priority": 1
                    }
                },
                "product_dimensions": {"width": 20, "height": 28}
            }
        }

        # For now, determine product type from product_id or use t-shirt as default
        # In production, this would query the actual POD API for specifications
        product_type = "t-shirt"  # Default
        
        if "hoodie" in product_id.lower() or "sweatshirt" in product_id.lower():
            product_type = "hoodie"
        elif "tank" in product_id.lower():
            product_type = "tank-top"
        
        specs = product_type_specs.get(product_type, product_type_specs["t-shirt"])
        
        return {
            "product_id": product_id,
            "provider": provider,
            "specifications": specs,
            "placement_guidelines": {
                "coordinate_system": "Inches from center point (0,0 = center of chest)",
                "resolution_requirements": "300 DPI minimum",
                "supported_formats": ["PNG", "JPG", "SVG"],
                "maximum_file_size": "100 MB",
                "color_profile": "sRGB recommended"
            },
            "updated_for_2025": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get product specifications: {str(e)}")

@router.get("/shipping-rates")
async def get_shipping_rates(
    country: str = "US",
    state: Optional[str] = None,
    current_user = Depends(verify_token)
):
    """Get shipping rates for destination"""
    try:
        # TODO: Implement real shipping calculation
        return {
            "rates": [
                {
                    "id": "standard",
                    "name": "Standard Shipping",
                    "price": 4.99,
                    "delivery_time": "7-10 business days"
                },
                {
                    "id": "express",
                    "name": "Express Shipping",
                    "price": 12.99,
                    "delivery_time": "3-5 business days"
                },
                {
                    "id": "overnight",
                    "name": "Overnight Shipping",
                    "price": 24.99,
                    "delivery_time": "1-2 business days"
                }
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get shipping rates: {str(e)}")

def determine_provider_from_product_id(product_id: str) -> str:
    """Determine which POD provider to use based on product ID"""
    # Mock products use mock provider
    if product_id.startswith("mock-"):
        return "mock"
    
    # Printify products typically have larger numeric IDs
    try:
        pid = int(product_id)
        if pid > 10000:  # Printify blueprint IDs are typically larger
            return "printify"
        else:
            return "printful"
    except ValueError:
        # Non-numeric IDs default to Printful
        return "printful"

async def submit_pod_order(order_request: OrderRequest, provider: str) -> Dict[str, Any]:
    """Submit order to the appropriate POD provider"""
    try:
        if provider == "printful":
            return await submit_printful_order(order_request)
        elif provider == "printify":
            return await submit_printify_order(order_request)
        else:
            # Mock order for testing
            return {
                "success": True,
                "pod_order_id": f"mock_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "total_cost": 25.98,
                "estimated_delivery": "7-10 business days",
                "status": "pending"
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

async def submit_printful_order(order_request: OrderRequest) -> Dict[str, Any]:
    """Submit order to Printful using their V2 API"""
    printful_api_key = os.getenv("PRINTFUL_API_KEY")
    if not printful_api_key:
        raise Exception("Printful API key not configured")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Prepare order data for Printful V2
        order_data = {
            "external_id": f"flowbotz_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "shipping": "STANDARD",
            "recipient": {
                "name": order_request.recipient.get("name", ""),
                "address1": order_request.recipient.get("address1", ""),
                "city": order_request.recipient.get("city", ""),
                "state_code": order_request.recipient.get("state", ""),
                "country_code": order_request.recipient.get("country", "US"),
                "zip": order_request.recipient.get("zip", "")
            },
            "items": [{
                "sync_variant_id": order_request.variant_id,
                "quantity": order_request.quantity,
                "files": [{
                    "url": order_request.design_url,
                    "type": "default"
                }]
            }]
        }
        
        # Try V2 API first, fallback to V1
        try:
            response = await client.post(
                "https://api.printful.com/v2/orders",
                headers={
                    "Authorization": f"Bearer {printful_api_key}",
                    "Content-Type": "application/json"
                },
                json=order_data
            )
        except:
            # Fallback to V1 API
            response = await client.post(
                "https://api.printful.com/orders",
                headers={
                    "Authorization": f"Bearer {printful_api_key}",
                    "Content-Type": "application/json"
                },
                json=order_data
            )
        
        if response.status_code in [200, 201]:
            result = response.json()
            order_info = result.get("result", result)
            
            return {
                "success": True,
                "pod_order_id": str(order_info.get("id")),
                "total_cost": float(order_info.get("costs", {}).get("total", 25.99)),
                "estimated_delivery": "7-10 business days",
                "status": order_info.get("status", "pending")
            }
        else:
            return {
                "success": False,
                "error": f"Printful API error: {response.status_code} - {response.text}"
            }

async def generate_printful_mockup(request: MockupRequest) -> str:
    """Generate mockup using Printful API"""
    printful_api_key = os.getenv("PRINTFUL_API_KEY")
    if not printful_api_key:
        return f"https://via.placeholder.com/600x600?text=Mockup+{request.product_id}"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            # Prepare mockup generation request
            mockup_data = {
                "variant_ids": [int(request.variant_id)],
                "format": "jpg",
                "files": [{
                    "placement": request.placement or "front",
                    "image_url": request.design_url,
                    "position": {
                        "area_width": 1800,
                        "area_height": 2400,
                        "width": 1800,
                        "height": 1800,
                        "top": 300,
                        "left": 0
                    }
                }]
            }
            
            # Try V2 API first, fallback to V1
            try:
                response = await client.post(
                    "https://api.printful.com/v2/mockup-generator/create-task",
                    headers={
                        "Authorization": f"Bearer {printful_api_key}",
                        "Content-Type": "application/json"
                    },
                    json=mockup_data
                )
            except:
                # Fallback to V1
                response = await client.post(
                    "https://api.printful.com/mockup-generator/create-task",
                    headers={
                        "Authorization": f"Bearer {printful_api_key}",
                        "Content-Type": "application/json"
                    },
                    json=mockup_data
                )
            
            if response.status_code in [200, 201]:
                result = response.json()
                task_key = result.get("result", {}).get("task_key")
                
                if task_key:
                    # Poll for mockup completion
                    for attempt in range(10):  # Max 10 attempts
                        await asyncio.sleep(2)  # Wait 2 seconds between attempts
                        
                        status_response = await client.get(
                            f"https://api.printful.com/mockup-generator/task?task_key={task_key}",
                            headers={
                                "Authorization": f"Bearer {printful_api_key}",
                                "Content-Type": "application/json"
                            }
                        )
                        
                        if status_response.status_code == 200:
                            status_data = status_response.json()
                            result_data = status_data.get("result", {})
                            
                            if result_data.get("status") == "completed":
                                mockups = result_data.get("mockups", [])
                                if mockups and mockups[0].get("mockup_url"):
                                    return mockups[0]["mockup_url"]
                            elif result_data.get("status") == "failed":
                                break
                
            return f"https://via.placeholder.com/600x600?text=Mockup+{request.product_id}"
            
        except Exception as e:
            print(f"❌ Printful mockup generation error: {str(e)}")
            return f"https://via.placeholder.com/600x600?text=Mockup+{request.product_id}"

async def generate_printify_mockup(request: MockupRequest) -> str:
    """Generate mockup using Printify API"""
    printify_api_key = os.getenv("PRINTIFY_API_KEY")
    if not printify_api_key:
        return f"https://via.placeholder.com/600x600?text=Mockup+{request.product_id}"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            # First, get shop info
            shops_response = await client.get(
                "https://api.printify.com/v1/shops.json",
                headers={
                    "Authorization": f"Bearer {printify_api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if shops_response.status_code != 200:
                return f"https://via.placeholder.com/600x600?text=Mockup+{request.product_id}"
            
            shops = shops_response.json()
            if not shops:
                return f"https://via.placeholder.com/600x600?text=Mockup+{request.product_id}"
            
            shop_id = shops[0]["id"]
            
            # Create temporary product for mockup
            product_data = {
                "title": "Temporary Mockup Product",
                "description": "For mockup generation",
                "blueprint_id": int(request.product_id),
                "print_provider_id": 1,  # Default provider
                "variants": [{
                    "id": int(request.variant_id),
                    "price": 2000,  # Price in cents
                    "is_enabled": True
                }],
                "print_areas": [{
                    "variant_ids": [int(request.variant_id)],
                    "placeholders": [{
                        "position": "front",
                        "images": [{
                            "id": request.design_url,
                            "x": 0.5,
                            "y": 0.5,
                            "scale": 1,
                            "angle": 0
                        }]
                    }]
                }]
            }
            
            # Create product
            product_response = await client.post(
                f"https://api.printify.com/v1/shops/{shop_id}/products.json",
                headers={
                    "Authorization": f"Bearer {printify_api_key}",
                    "Content-Type": "application/json"
                },
                json=product_data
            )
            
            if product_response.status_code in [200, 201]:
                product_result = product_response.json()
                product_id = product_result.get("id")
                
                if product_id:
                    # Get product mockups
                    mockup_response = await client.get(
                        f"https://api.printify.com/v1/shops/{shop_id}/products/{product_id}.json",
                        headers={
                            "Authorization": f"Bearer {printify_api_key}",
                            "Content-Type": "application/json"
                        }
                    )
                    
                    if mockup_response.status_code == 200:
                        mockup_data = mockup_response.json()
                        images = mockup_data.get("images", [])
                        if images and images[0].get("src"):
                            # Clean up temporary product
                            await client.delete(
                                f"https://api.printify.com/v1/shops/{shop_id}/products/{product_id}.json",
                                headers={
                                    "Authorization": f"Bearer {printify_api_key}",
                                    "Content-Type": "application/json"
                                }
                            )
                            return images[0]["src"]
            
            return f"https://via.placeholder.com/600x600?text=Mockup+{request.product_id}"
            
        except Exception as e:
            print(f"❌ Printify mockup generation error: {str(e)}")
            return f"https://via.placeholder.com/600x600?text=Mockup+{request.product_id}"

async def submit_printify_order(order_request: OrderRequest) -> Dict[str, Any]:
    """Submit order to Printify using their API"""
    printify_api_key = os.getenv("PRINTIFY_API_KEY")
    if not printify_api_key:
        raise Exception("Printify API key not configured")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # First, get shop info (required for Printify)
        shops_response = await client.get(
            "https://api.printify.com/v1/shops.json",
            headers={
                "Authorization": f"Bearer {printify_api_key}",
                "Content-Type": "application/json"
            }
        )
        
        if shops_response.status_code != 200:
            return {
                "success": False,
                "error": f"Failed to get Printify shops: {shops_response.status_code}"
            }
        
        shops = shops_response.json()
        if not shops:
            return {
                "success": False,
                "error": "No Printify shops found"
            }
        
        shop_id = shops[0]["id"]  # Use first shop
        
        # Prepare order data for Printify
        order_data = {
            "external_id": f"flowbotz_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "label": "FlowBotz Order",
            "line_items": [{
                "product_id": order_request.product_id,
                "variant_id": order_request.variant_id,
                "quantity": order_request.quantity,
                "print_areas": {
                    "front": order_request.design_url
                }
            }],
            "shipping_method": 1,  # Standard shipping
            "address_to": {
                "first_name": order_request.recipient.get("name", "").split()[0] if order_request.recipient.get("name") else "",
                "last_name": " ".join(order_request.recipient.get("name", "").split()[1:]) if order_request.recipient.get("name") else "",
                "address1": order_request.recipient.get("address1", ""),
                "city": order_request.recipient.get("city", ""),
                "region": order_request.recipient.get("state", ""),
                "country": order_request.recipient.get("country", "US"),
                "zip": order_request.recipient.get("zip", "")
            }
        }
        
        response = await client.post(
            f"https://api.printify.com/v1/shops/{shop_id}/orders.json",
            headers={
                "Authorization": f"Bearer {printify_api_key}",
                "Content-Type": "application/json"
            },
            json=order_data
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            
            return {
                "success": True,
                "pod_order_id": str(result.get("id")),
                "total_cost": float(result.get("total_price", 25.99)) / 100,  # Printify uses cents
                "estimated_delivery": "7-14 business days",
                "status": result.get("status", "pending")
            }
        else:
            return {
                "success": False,
                "error": f"Printify API error: {response.status_code} - {response.text}"
            }

def _get_printify_image_safe(item) -> str:
    """Safely extract image URL from Printify item with robust error handling"""
    try:
        if not item or not isinstance(item, dict):
            return ""
        
        images = item.get("images")
        if not images:
            return ""
        
        if isinstance(images, list) and len(images) > 0:
            first_image = images[0]
            if isinstance(first_image, dict):
                return first_image.get("src", "")
            elif isinstance(first_image, str):
                return first_image
        elif isinstance(images, str):
            return images
        
        return ""
    except Exception as e:
        print(f"❌ Error extracting Printify image: {str(e)}")
        return ""