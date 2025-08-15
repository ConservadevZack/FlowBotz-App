from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from .auth import verify_token
import os
import httpx
import base64
from datetime import datetime

router = APIRouter()

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
    """Get available print-on-demand products with enhanced specifications"""
    try:
        if provider == "printify":
            return await get_printify_products(category)
        else:
            return await get_printful_products(category)
    except Exception as e:
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
    """Get products from Printful API with detailed variants and pricing"""
    printful_api_key = os.getenv("PRINTFUL_API_KEY")
    if not printful_api_key or printful_api_key == "your_printful_api_key":
        print("⚠️  Printful API key not configured, using mock data")
        return get_mock_products()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Get all products from Printful
            response = await client.get(
                "https://api.printful.com/products",
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
                
                # Get detailed product info including variants
                product_detail_response = await client.get(
                    f"https://api.printful.com/products/{item['id']}",
                    headers={
                        "Authorization": f"Bearer {printful_api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if product_detail_response.status_code != 200:
                    continue
                
                detail_data = product_detail_response.json()
                product_info = detail_data.get("result", {})
                
                variants = []
                options = {"sizes": set(), "colors": set()}
                
                for variant in product_info.get("variants", []):
                    # Check if variant is available in any region
                    if variant.get("in_stock", False):
                        # Find flat lay or ghost mannequin image (no model photos)
                        variant_image = ""
                        for file_info in variant.get("files", []):
                            file_type = file_info.get("type", "").lower()
                            preview_url = file_info.get("preview_url", "")
                            
                            # Prioritize flat lay and ghost mannequin images
                            if file_type in ["mockup", "flat"] and "model" not in preview_url.lower():
                                variant_image = preview_url
                                break
                            elif "ghost" in preview_url.lower() or "flat" in preview_url.lower():
                                variant_image = preview_url
                                break
                        
                        # Fallback to first available image if no flat lay found
                        if not variant_image and variant.get("files"):
                            variant_image = variant.get("files", [{}])[0].get("preview_url", "")
                        
                        variants.append({
                            "id": str(variant["id"]),
                            "name": variant.get("name", ""),
                            "size": variant.get("size", ""),
                            "color": variant.get("color", ""),
                            "color_code": variant.get("color_code", ""),
                            "price": float(variant.get("price", 0)),
                            "in_stock": variant.get("in_stock", True),
                            "image": variant_image,
                            "image_type": "flat_lay" if variant_image and "model" not in variant_image.lower() else "standard"
                        })
                        
                        if variant.get("size"):
                            options["sizes"].add(variant.get("size"))
                        if variant.get("color"):
                            options["colors"].add(variant.get("color"))
                
                # Find the best flat lay image for the main product
                main_product_image = item.get("image", "")
                if variants and variants[0].get("image"):
                    # Use the first variant's flat lay image as main product image
                    main_product_image = variants[0]["image"]
                
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
            
            print(f"✅ Fetched {len(products)} Printful products")
            return products
            
        except Exception as e:
            print(f"❌ Printful API error: {str(e)}")
            return get_mock_products()

async def get_printify_products(category: str = "apparel"):
    """Get products from Printify API with detailed variants and pricing"""
    printify_api_key = os.getenv("PRINTIFY_API_KEY")
    if not printify_api_key or printify_api_key == "your_printify_api_key":
        print("⚠️  Printify API key not configured, using mock data")
        return get_mock_products()
    
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
            
            # Fix: Handle case where data might be a list instead of dict
            if isinstance(data, dict):
                blueprint_list = data.get("data", [])
            elif isinstance(data, list):
                blueprint_list = data
            else:
                print(f"❌ Printify data unexpected type: {type(data)}")
                return get_mock_products()
            
            for item in blueprint_list[:15]:  # Limit to first 15 blueprints
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
                    continue
                
                providers_data = providers_response.json()
                
                # Enhanced error handling for providers_data - FIX: Handle list response
                if isinstance(providers_data, list):
                    # Some Printify endpoints return a list directly
                    provider_data = providers_data
                elif isinstance(providers_data, dict):
                    # Standard API response format with data wrapper
                    provider_data = providers_data.get("data", [])
                else:
                    print(f"❌ Printify providers_data unexpected type: {type(providers_data)}")
                    print(f"   Raw response: {providers_data}")
                    continue
                
                # Use the first available print provider
                if not isinstance(provider_data, list) or len(provider_data) == 0:
                    print(f"❌ Printify provider_data is not a list or empty: {type(provider_data)}")
                    continue
                    
                provider = provider_data[0]
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
                    continue
                
                variants_data = variants_response.json()
                variants = []
                options = {"sizes": set(), "colors": set()}
                
                # Fix: Check if variants_data is a dict or list
                if isinstance(variants_data, dict):
                    # Standard API response format
                    variants_list = variants_data.get("variants", [])
                elif isinstance(variants_data, list):
                    # Some Printify endpoints return a list directly
                    variants_list = variants_data
                else:
                    print(f"❌ Printify variants_data unexpected type: {type(variants_data)}")
                    continue
                
                for variant in variants_list:
                    if variant.get("is_enabled", True):
                        # Extract size and color from title or options
                        variant_title = variant.get("title", "")
                        size = ""
                        color = ""
                        
                        # Parse size and color from variant options
                        for option in variant.get("options", []):
                            # Fix: Ensure option is a dict before calling .get()
                            if not isinstance(option, dict):
                                continue
                                
                            option_type = option.get("type", "").lower()
                            if option_type in ["size", "sizes"]:
                                size = option.get("value", "")
                            elif option_type in ["color", "colors", "colour"]:
                                color = option.get("value", "")
                        
                        # Fallback: try to extract from title
                        if not size or not color:
                            # Common size patterns
                            size_patterns = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL", "5XL"]
                            for s in size_patterns:
                                if s in variant_title.upper():
                                    size = s
                                    break
                        
                        variants.append({
                            "id": str(variant["id"]),
                            "name": variant_title,
                            "size": size,
                            "color": color,
                            "color_code": "",  # Printify doesn't provide color codes
                            "price": float(variant.get("price", 0)) / 100,  # Convert from cents
                            "in_stock": variant.get("is_enabled", True),
                            "image": variant.get("image", "")
                        })
                        
                        if size:
                            options["sizes"].add(size)
                        if color:
                            options["colors"].add(color)
                
                # Only add products that have variants
                if variants:
                    products.append(ProductResponse(
                        id=str(blueprint_id),
                        name=item["title"],
                        description=item.get("description", "High-quality print-on-demand product"),
                        type=blueprint_title.split()[0] if blueprint_title else "apparel",
                        brand="Printify",
                        model=item["title"],
                        image=_get_printify_image_safe(item),
                        variants=variants,
                        options=[
                            {"name": "Size", "values": list(options["sizes"])},
                            {"name": "Color", "values": list(options["colors"])}
                        ]
                    ))
                    
                    # Limit to 10 products for performance
                    if len(products) >= 10:
                        break
            
            print(f"✅ Fetched {len(products)} Printify products")
            return products
            
        except Exception as e:
            print(f"❌ Printify API error: {str(e)}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            return get_mock_products()

def get_mock_products():
    """Return mock products for demonstration"""
    return [
        ProductResponse(
            id="1",
            name="Premium T-Shirt",
            description="High-quality cotton t-shirt perfect for custom designs",
            type="t-shirt",
            brand="FlowBotz",
            model="Premium Cotton Tee",
            image="https://via.placeholder.com/400x400?text=T-Shirt",
            variants=[
                {"id": "1-s", "size": "S", "color": "white", "price": 19.99},
                {"id": "1-m", "size": "M", "color": "white", "price": 19.99},
                {"id": "1-l", "size": "L", "color": "white", "price": 19.99},
                {"id": "1-xl", "size": "XL", "color": "white", "price": 21.99}
            ],
            options=[
                {"name": "Color", "values": ["White", "Black", "Navy", "Gray"]},
                {"name": "Size", "values": ["S", "M", "L", "XL", "XXL"]}
            ]
        ),
        ProductResponse(
            id="2",
            name="Classic Hoodie",
            description="Comfortable pullover hoodie with kangaroo pocket",
            type="hoodie",
            brand="FlowBotz",
            model="Classic Pullover",
            image="https://via.placeholder.com/400x400?text=Hoodie",
            variants=[
                {"id": "2-s", "size": "S", "color": "black", "price": 39.99},
                {"id": "2-m", "size": "M", "color": "black", "price": 39.99},
                {"id": "2-l", "size": "L", "color": "black", "price": 39.99},
                {"id": "2-xl", "size": "XL", "color": "black", "price": 42.99}
            ],
            options=[
                {"name": "Color", "values": ["Black", "Navy", "Gray", "Maroon"]},
                {"name": "Size", "values": ["S", "M", "L", "XL", "XXL"]}
            ]
        ),
        ProductResponse(
            id="3",
            name="Tank Top",
            description="Lightweight tank top for summer designs",
            type="tank-top",
            brand="FlowBotz",
            model="Summer Tank",
            image="https://via.placeholder.com/400x400?text=Tank+Top",
            variants=[
                {"id": "3-s", "size": "S", "color": "white", "price": 16.99},
                {"id": "3-m", "size": "M", "color": "white", "price": 16.99},
                {"id": "3-l", "size": "L", "color": "white", "price": 16.99}
            ],
            options=[
                {"name": "Color", "values": ["White", "Black", "Gray"]},
                {"name": "Size", "values": ["S", "M", "L", "XL"]}
            ]
        )
    ]

@router.post("/mockup", response_model=MockupResponse)
async def generate_mockup(
    request: MockupRequest,
    current_user = Depends(verify_token)
):
    """Generate product mockup with design"""
    try:
        # For now, return a mock mockup URL
        # In production, this would call Printful/Printify mockup APIs
        mockup_url = f"https://via.placeholder.com/600x600?text=Mockup+Product+{request.product_id}"
        
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
    """Create print-on-demand order"""
    try:
        # TODO: Implement real order creation with Printful/Printify
        # This would involve:
        # 1. Creating the product variant
        # 2. Uploading the design
        # 3. Creating the order
        # 4. Processing payment
        
        # For now, return mock order
        order_id = f"ORDER_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        return OrderResponse(
            order_id=order_id,
            status="pending",
            total_cost=25.99,
            estimated_delivery="7-10 business days"
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