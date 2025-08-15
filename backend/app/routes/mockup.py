"""
Mockup Generation API Routes
Advanced product mockup generation with accurate design placement
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from .auth import verify_token
from ..services.pod_mockup_service import (
    PODMockupService, 
    MockupRequest, 
    MockupResponse, 
    DesignPlacement,
    ProductSpecs,
    pod_mockup_service
)
from ..services.smart_placement_service import (
    SmartPlacementService,
    PlacementSuggestion,
    PlacementValidation,
    DesignContext,
    ProductContext,
    DesignType,
    PlacementArea,
    smart_placement_service
)
import os
import httpx

router = APIRouter()

class SimpleMockupRequest(BaseModel):
    """Simplified request for easy frontend integration"""
    product_id: str
    variant_id: str
    design_url: str
    placement_area: str = "center_chest"  # 'center_chest', 'left_chest', 'back', 'sleeve'
    design_width: Optional[float] = None  # Auto-calculate if not provided
    design_height: Optional[float] = None  # Auto-calculate if not provided

class ProductImageRequest(BaseModel):
    """Request for flat product images"""
    product_id: str
    provider: str = "printful"  # 'printful' or 'printify'

class PlacementValidationRequest(BaseModel):
    """Request for validating design placement"""
    product_id: str
    placement: DesignPlacement

class SmartPlacementRequest(BaseModel):
    """Request for smart placement suggestions"""
    product_type: str
    design_type: DesignType
    design_content: str = ""
    aspect_ratio: float = 1.0
    style: str = "casual"
    target_audience: str = "unisex"
    num_suggestions: int = 3

class PlacementValidationDirectRequest(BaseModel):
    """Direct placement validation request"""
    area: PlacementArea
    x: float
    y: float
    width: float
    height: float
    product_type: str
    design_type: Optional[DesignType] = None

@router.post("/generate-accurate-mockup", response_model=MockupResponse)
async def generate_accurate_mockup(
    request: SimpleMockupRequest,
    current_user = Depends(verify_token)
):
    """Generate accurate product mockup with industry-standard placement"""
    try:
        # Validate design URL and file
        if not await _validate_design_file(request.design_url):
            raise HTTPException(status_code=400, detail="Invalid design file: must be PNG, JPG, or SVG under 100MB")
        # Get product specifications
        product_specs = await pod_mockup_service._get_printful_product_specs(request.product_id)
        
        # Calculate optimal placement if dimensions not provided
        if request.design_width and request.design_height:
            design_dimensions = (request.design_width, request.design_height)
        else:
            # Default to 8x8 inches for auto-sizing
            design_dimensions = (8.0, 8.0)
        
        optimal_placement = await pod_mockup_service.calculate_optimal_placement(
            product_specs, 
            design_dimensions
        )
        
        # Override placement area if specified
        if request.placement_area != "center_chest":
            optimal_placement.area = request.placement_area
            
            # Recalculate coordinates for different areas
            product_type = product_specs.product_type
            standards = pod_mockup_service.placement_standards.get(product_type, {})
            area_standards = standards.get(request.placement_area, standards.get("center_chest", {}))
            
            optimal_placement.x = area_standards.get("x", 0)
            optimal_placement.y = area_standards.get("y", 4.5)
        
        # Create full mockup request
        mockup_request = MockupRequest(
            product_id=request.product_id,
            variant_id=request.variant_id,
            design_url=request.design_url,
            placement=optimal_placement
        )
        
        # Generate mockup
        result = await pod_mockup_service.generate_printful_mockup(mockup_request)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mockup generation failed: {str(e)}")

@router.get("/flat-product-images/{product_id}")
async def get_flat_product_images(
    product_id: str,
    provider: str = "printful",
    current_user = Depends(verify_token)
):
    """Get flat lay or ghost mannequin product images"""
    try:
        images = await pod_mockup_service.get_flat_product_images(product_id, provider)
        
        return {
            "product_id": product_id,
            "provider": provider,
            "image_type": "flat_lay_ghost_mannequin",
            "images": images,
            "total_count": len(images)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get flat images: {str(e)}")

@router.post("/validate-placement")
async def validate_design_placement(
    request: PlacementValidationRequest,
    current_user = Depends(verify_token)
):
    """Validate that design placement is within product bounds"""
    try:
        is_valid = await pod_mockup_service.validate_design_bounds(
            request.product_id, 
            request.placement
        )
        
        return {
            "valid": is_valid,
            "product_id": request.product_id,
            "placement": request.placement.dict(),
            "message": "Placement is valid" if is_valid else "Placement exceeds product bounds"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@router.get("/placement-guidelines/{product_type}")
async def get_placement_guidelines(
    product_type: str,
    current_user = Depends(verify_token)
):
    """Get industry-standard placement guidelines for product type"""
    try:
        guidelines = pod_mockup_service.placement_standards.get(
            product_type.lower(), 
            pod_mockup_service.placement_standards["t-shirt"]
        )
        
        return {
            "product_type": product_type,
            "placement_areas": guidelines,
            "description": "Industry-standard placement coordinates in inches",
            "coordinate_system": "Center-based (0,0 = center of chest area)"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get guidelines: {str(e)}")

@router.get("/product-specs/{product_id}")
async def get_product_specifications(
    product_id: str,
    current_user = Depends(verify_token)
):
    """Get detailed product specifications for accurate mockup generation"""
    try:
        specs = await pod_mockup_service._get_printful_product_specs(product_id)
        
        return {
            "product_specs": specs.dict(),
            "placement_options": list(specs.print_areas.keys()),
            "recommended_resolution": "4000x4000",
            "supported_formats": ["PNG", "JPG", "SVG"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get product specs: {str(e)}")

@router.post("/optimal-placement")
async def calculate_optimal_placement(
    product_id: str,
    design_width: float,
    design_height: float,
    preferred_area: str = "center_chest",
    current_user = Depends(verify_token)
):
    """Calculate optimal design placement for given product and design dimensions"""
    try:
        # Get product specifications
        product_specs = await pod_mockup_service._get_printful_product_specs(product_id)
        
        # Calculate optimal placement
        optimal_placement = await pod_mockup_service.calculate_optimal_placement(
            product_specs, 
            (design_width, design_height)
        )
        
        # Override area if preferred area specified and valid
        if preferred_area in product_specs.print_areas:
            optimal_placement.area = preferred_area
        
        return {
            "optimal_placement": optimal_placement.dict(),
            "product_type": product_specs.product_type,
            "area_used": optimal_placement.area,
            "scaling_applied": True,
            "coordinates_unit": "inches"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Placement calculation failed: {str(e)}")

@router.get("/mockup-status")
async def get_mockup_service_status(current_user = Depends(verify_token)):
    """Get status of mockup service and API connections"""
    try:
        printful_key = bool(os.getenv("PRINTFUL_API_KEY"))
        printify_key = bool(os.getenv("PRINTIFY_API_KEY"))
        
        return {
            "service_status": "active",
            "printful_api": "configured" if printful_key else "not_configured",
            "printify_api": "configured" if printify_key else "not_configured", 
            "high_resolution_support": True,
            "max_resolution": "4000x4000",
            "supported_placement_areas": ["center_chest", "left_chest", "back", "sleeve", "hood"],
            "accuracy_target": "100%"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.post("/smart-placement/suggest", response_model=List[PlacementSuggestion])
async def suggest_smart_placements(
    request: SmartPlacementRequest,
    current_user = Depends(verify_token)
):
    """Get AI-powered placement suggestions based on design and product context"""
    try:
        design_context = DesignContext(
            design_type=request.design_type,
            content=request.design_content,
            aspect_ratio=request.aspect_ratio,
            is_horizontal=request.aspect_ratio > 1.0,
            has_text=request.design_type == DesignType.TEXT,
            dominant_colors=["#000000"],  # Default for now
            style=request.style
        )
        
        product_context = ProductContext(
            product_type=request.product_type,
            size_category="M",  # Default for now
            color="white",
            material="cotton",
            target_audience=request.target_audience,
            style=request.style
        )
        
        suggestions = await smart_placement_service.suggest_optimal_placements(
            design_context,
            product_context,
            request.num_suggestions
        )
        
        return suggestions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart placement suggestion failed: {str(e)}")

@router.post("/smart-placement/validate", response_model=PlacementValidation)
async def validate_smart_placement(
    request: PlacementValidationDirectRequest,
    current_user = Depends(verify_token)
):
    """Validate design placement with detailed feedback"""
    try:
        design_context = None
        if request.design_type:
            design_context = DesignContext(
                design_type=request.design_type,
                content="",
                aspect_ratio=request.width / request.height if request.height > 0 else 1.0,
                is_horizontal=request.width > request.height,
                has_text=request.design_type == DesignType.TEXT,
                dominant_colors=["#000000"],
                style="casual"
            )
        
        validation = await smart_placement_service.validate_placement(
            request.area,
            request.x,
            request.y,
            request.width,
            request.height,
            request.product_type,
            design_context
        )
        
        return validation
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Placement validation failed: {str(e)}")

@router.get("/smart-placement/heatmap/{product_type}")
async def get_placement_heatmap(
    product_type: str,
    design_type: DesignType = DesignType.GRAPHIC,
    current_user = Depends(verify_token)
):
    """Get placement heatmap showing optimal zones for design types"""
    try:
        heatmap = await smart_placement_service.get_placement_heatmap(
            product_type,
            design_type
        )
        
        return heatmap
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Heatmap generation failed: {str(e)}")

@router.get("/smart-placement/areas/{product_type}")
async def get_available_placement_areas(
    product_type: str,
    current_user = Depends(verify_token)
):
    """Get all available placement areas for a product type"""
    try:
        # Get placement rules for the product type
        product_type = product_type.lower()
        placement_rules = smart_placement_service.placement_rules
        
        if product_type not in placement_rules:
            product_type = "t-shirt"  # Default fallback
        
        areas = []
        for area, rules in placement_rules[product_type].items():
            areas.append({
                "area": area,
                "name": area.replace("_", " ").title(),
                "x_range": rules["x_range"],
                "y_range": rules["y_range"],
                "max_width": rules["max_width"],
                "max_height": rules["max_height"],
                "optimal_position": {
                    "x": rules["optimal_x"],
                    "y": rules["optimal_y"]
                },
                "priority": rules["priority"]
            })
        
        # Sort by priority
        areas.sort(key=lambda x: x["priority"])
        
        return {
            "product_type": product_type,
            "available_areas": areas,
            "coordinate_system": "Inches from center point (0,0 = center of chest)",
            "total_areas": len(areas)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get placement areas: {str(e)}")

@router.post("/smart-placement/auto-suggest")
async def auto_suggest_placement(
    product_id: str,
    design_url: str,
    design_type: DesignType = DesignType.GRAPHIC,
    current_user = Depends(verify_token)
):
    """Automatically suggest best placement for a design on a specific product"""
    try:
        # Get product specifications
        product_specs = await pod_mockup_service._get_printful_product_specs(product_id)
        
        # Create contexts
        design_context = DesignContext(
            design_type=design_type,
            content="",
            aspect_ratio=1.0,  # Would be calculated from actual image
            is_horizontal=True,
            has_text=design_type == DesignType.TEXT,
            dominant_colors=["#000000"],
            style="casual"
        )
        
        product_context = ProductContext(
            product_type=product_specs.product_type,
            size_category="M",
            color="white",
            material="cotton",
            target_audience="unisex",
            style="casual"
        )
        
        # Get suggestions
        suggestions = await smart_placement_service.suggest_optimal_placements(
            design_context,
            product_context,
            3
        )
        
        # Return the best suggestion with additional context
        if suggestions:
            best_suggestion = suggestions[0]
            return {
                "product_id": product_id,
                "design_url": design_url,
                "recommended_placement": best_suggestion.dict(),
                "alternative_suggestions": [s.dict() for s in suggestions[1:]],
                "auto_applied": True,
                "confidence_level": "high" if best_suggestion.confidence > 0.8 else "medium"
            }
        else:
            # Fallback to center chest
            return {
                "product_id": product_id,
                "design_url": design_url,
                "recommended_placement": {
                    "area": "center_chest",
                    "x": 0,
                    "y": 5.5,
                    "width": 8,
                    "height": 8,
                    "confidence": 0.7,
                    "reasoning": "Default center chest placement"
                },
                "alternative_suggestions": [],
                "auto_applied": True,
                "confidence_level": "medium"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-suggestion failed: {str(e)}")

async def _validate_design_file(design_url: str) -> bool:
    """Validate design file format, size, and accessibility"""
    try:
        # Check URL format
        if not design_url or not design_url.startswith(('http://', 'https://')):
            return False
        
        # Check file extension
        allowed_extensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']
        url_path = design_url.lower().split('?')[0]  # Remove query parameters
        if not any(url_path.endswith(ext) for ext in allowed_extensions):
            print(f"❌ Invalid file extension for {design_url}")
            return False
        
        # Check file accessibility and size
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                # HEAD request to check file size without downloading
                response = await client.head(design_url)
                
                if response.status_code != 200:
                    print(f"❌ Design file not accessible: {response.status_code}")
                    return False
                
                # Check content type
                content_type = response.headers.get('content-type', '').lower()
                allowed_types = ['image/png', 'image/jpg', 'image/jpeg', 'image/svg+xml', 'image/webp']
                if not any(allowed_type in content_type for allowed_type in allowed_types):
                    print(f"❌ Invalid content type: {content_type}")
                    return False
                
                # Check file size (100MB limit)
                content_length = response.headers.get('content-length')
                if content_length:
                    file_size = int(content_length)
                    max_size = 100 * 1024 * 1024  # 100MB in bytes
                    if file_size > max_size:
                        print(f"❌ File too large: {file_size / 1024 / 1024:.2f}MB > 100MB")
                        return False
                
                print(f"✅ Design file validated: {design_url}")
                return True
                
            except Exception as e:
                print(f"❌ Error validating design file: {str(e)}")
                return False
                
    except Exception as e:
        print(f"❌ Design file validation error: {str(e)}")
        return False