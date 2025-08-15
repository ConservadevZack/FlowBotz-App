"""
Smart Design Placement Service
Advanced algorithms for optimal design positioning on products
"""

from typing import Dict, List, Optional, Tuple, Any
from pydantic import BaseModel
import math
from enum import Enum

class PlacementArea(str, Enum):
    CENTER_CHEST = "center_chest"
    LEFT_CHEST = "left_chest"
    RIGHT_CHEST = "right_chest"
    BACK = "back"
    SLEEVE_LEFT = "sleeve_left"
    SLEEVE_RIGHT = "sleeve_right"
    COLLAR = "collar"
    POCKET = "pocket"

class DesignType(str, Enum):
    TEXT = "text"
    LOGO = "logo"
    GRAPHIC = "graphic"
    PATTERN = "pattern"
    PHOTO = "photo"

class PlacementSuggestion(BaseModel):
    area: PlacementArea
    x: float  # X coordinate in inches
    y: float  # Y coordinate in inches
    width: float  # Recommended width in inches
    height: float  # Recommended height in inches
    confidence: float  # 0-1 confidence score
    reasoning: str  # Why this placement is suggested
    optimal_size: Tuple[float, float]  # (width, height) for best appearance

class PlacementValidation(BaseModel):
    is_valid: bool
    issues: List[str]
    suggestions: List[str]
    quality_score: float  # 0-1 overall placement quality

class DesignContext(BaseModel):
    design_type: DesignType
    content: str  # Text content or description
    aspect_ratio: float
    is_horizontal: bool
    has_text: bool
    dominant_colors: List[str]
    style: str  # casual, formal, sporty, etc.

class ProductContext(BaseModel):
    product_type: str  # t-shirt, hoodie, tank-top
    size_category: str  # S, M, L, XL, etc.
    color: str
    material: str
    target_audience: str  # men, women, unisex, kids
    style: str  # casual, formal, athletic, etc.

class SmartPlacementService:
    """Advanced design placement service with AI-powered recommendations"""
    
    def __init__(self):
        # Industry-standard placement rules (updated for 2025)
        self.placement_rules = {
            "t-shirt": {
                PlacementArea.CENTER_CHEST: {
                    "x_range": (-5, 5),
                    "y_range": (3, 8),
                    "max_width": 12,
                    "max_height": 14,
                    "optimal_x": 0,
                    "optimal_y": 5.5,
                    "priority": 1
                },
                PlacementArea.LEFT_CHEST: {
                    "x_range": (-6, -2),
                    "y_range": (3, 6),
                    "max_width": 4,
                    "max_height": 4,
                    "optimal_x": -4,
                    "optimal_y": 4.5,
                    "priority": 2
                },
                PlacementArea.BACK: {
                    "x_range": (-7, 7),
                    "y_range": (2, 10),
                    "max_width": 14,
                    "max_height": 16,
                    "optimal_x": 0,
                    "optimal_y": 6,
                    "priority": 3
                }
            },
            "hoodie": {
                PlacementArea.CENTER_CHEST: {
                    "x_range": (-6, 6),
                    "y_range": (4, 9),
                    "max_width": 14,
                    "max_height": 16,
                    "optimal_x": 0,
                    "optimal_y": 6.5,
                    "priority": 1
                },
                PlacementArea.LEFT_CHEST: {
                    "x_range": (-7, -3),
                    "y_range": (4, 7),
                    "max_width": 4,
                    "max_height": 4,
                    "optimal_x": -5,
                    "optimal_y": 5.5,
                    "priority": 2
                }
            },
            "tank-top": {
                PlacementArea.CENTER_CHEST: {
                    "x_range": (-4, 4),
                    "y_range": (3, 7),
                    "max_width": 10,
                    "max_height": 12,
                    "optimal_x": 0,
                    "optimal_y": 5,
                    "priority": 1
                }
            }
        }
        
        # Design type preferences
        self.design_preferences = {
            DesignType.LOGO: {
                "preferred_areas": [PlacementArea.LEFT_CHEST, PlacementArea.CENTER_CHEST],
                "max_size_ratio": 0.3,  # Relative to print area
                "aspect_ratio_tolerance": 0.5
            },
            DesignType.TEXT: {
                "preferred_areas": [PlacementArea.CENTER_CHEST, PlacementArea.BACK],
                "max_size_ratio": 0.8,
                "aspect_ratio_tolerance": 2.0  # Text can be wide
            },
            DesignType.GRAPHIC: {
                "preferred_areas": [PlacementArea.CENTER_CHEST, PlacementArea.BACK],
                "max_size_ratio": 0.7,
                "aspect_ratio_tolerance": 1.0
            },
            DesignType.PATTERN: {
                "preferred_areas": [PlacementArea.CENTER_CHEST],
                "max_size_ratio": 0.9,
                "aspect_ratio_tolerance": 0.3
            }
        }

    async def suggest_optimal_placements(
        self, 
        design_context: DesignContext, 
        product_context: ProductContext,
        num_suggestions: int = 3
    ) -> List[PlacementSuggestion]:
        """Generate smart placement suggestions based on design and product context"""
        
        product_type = product_context.product_type.lower()
        if product_type not in self.placement_rules:
            product_type = "t-shirt"  # Default fallback
        
        rules = self.placement_rules[product_type]
        design_prefs = self.design_preferences.get(design_context.design_type, {})
        preferred_areas = design_prefs.get("preferred_areas", list(rules.keys()))
        
        suggestions = []
        
        for area in preferred_areas:
            if area not in rules:
                continue
                
            area_rules = rules[area]
            suggestion = await self._calculate_placement_for_area(
                area, area_rules, design_context, product_context
            )
            
            if suggestion:
                suggestions.append(suggestion)
        
        # Sort by confidence score
        suggestions.sort(key=lambda x: x.confidence, reverse=True)
        
        return suggestions[:num_suggestions]

    async def _calculate_placement_for_area(
        self,
        area: PlacementArea,
        area_rules: Dict,
        design_context: DesignContext,
        product_context: ProductContext
    ) -> Optional[PlacementSuggestion]:
        """Calculate optimal placement for a specific area"""
        
        # Start with optimal position
        x = area_rules["optimal_x"]
        y = area_rules["optimal_y"]
        
        # Calculate optimal size based on design aspect ratio and area constraints
        max_width = area_rules["max_width"]
        max_height = area_rules["max_height"]
        
        design_prefs = self.design_preferences.get(design_context.design_type, {})
        max_size_ratio = design_prefs.get("max_size_ratio", 0.7)
        
        # Adjust size based on design type and content
        if design_context.design_type == DesignType.LOGO:
            # Logos are typically smaller
            width = min(max_width * 0.4, max_width * max_size_ratio)
            height = width / design_context.aspect_ratio
        elif design_context.design_type == DesignType.TEXT:
            # Text can be wider but shorter
            if design_context.is_horizontal:
                width = max_width * max_size_ratio
                height = width / design_context.aspect_ratio
            else:
                height = max_height * max_size_ratio
                width = height * design_context.aspect_ratio
        else:
            # Graphics and patterns use more space
            width = max_width * max_size_ratio
            height = width / design_context.aspect_ratio
        
        # Ensure dimensions fit within area bounds
        if height > max_height:
            height = max_height
            width = height * design_context.aspect_ratio
        
        if width > max_width:
            width = max_width
            height = width / design_context.aspect_ratio
        
        # Calculate confidence score
        confidence = await self._calculate_confidence(
            area, design_context, product_context, width, height, area_rules
        )
        
        # Generate reasoning
        reasoning = self._generate_reasoning(area, design_context, confidence)
        
        return PlacementSuggestion(
            area=area,
            x=x,
            y=y,
            width=width,
            height=height,
            confidence=confidence,
            reasoning=reasoning,
            optimal_size=(width, height)
        )

    async def _calculate_confidence(
        self,
        area: PlacementArea,
        design_context: DesignContext,
        product_context: ProductContext,
        width: float,
        height: float,
        area_rules: Dict
    ) -> float:
        """Calculate confidence score for placement suggestion"""
        
        base_confidence = 0.5
        
        # Boost confidence for preferred design-area combinations
        design_prefs = self.design_preferences.get(design_context.design_type, {})
        if area in design_prefs.get("preferred_areas", []):
            base_confidence += 0.3
        
        # Boost confidence if design fits well in area
        area_utilization = (width * height) / (area_rules["max_width"] * area_rules["max_height"])
        if 0.3 <= area_utilization <= 0.8:  # Sweet spot
            base_confidence += 0.2
        
        # Adjust for aspect ratio compatibility
        area_aspect_ratio = area_rules["max_width"] / area_rules["max_height"]
        aspect_ratio_diff = abs(design_context.aspect_ratio - area_aspect_ratio)
        if aspect_ratio_diff < 0.5:
            base_confidence += 0.1
        
        # Adjust for product and design style compatibility
        if self._styles_compatible(design_context.style, product_context.style):
            base_confidence += 0.1
        
        return min(1.0, max(0.1, base_confidence))

    def _styles_compatible(self, design_style: str, product_style: str) -> bool:
        """Check if design and product styles are compatible"""
        compatibility_map = {
            "casual": ["casual", "everyday", "relaxed"],
            "formal": ["formal", "business", "professional"],
            "sporty": ["athletic", "sporty", "active", "fitness"],
            "artistic": ["creative", "artistic", "trendy", "modern"]
        }
        
        design_categories = compatibility_map.get(design_style, [design_style])
        return product_style in design_categories

    def _generate_reasoning(self, area: PlacementArea, design_context: DesignContext, confidence: float) -> str:
        """Generate human-readable reasoning for placement suggestion"""
        
        base_reasons = {
            PlacementArea.CENTER_CHEST: "Most visible and impactful position",
            PlacementArea.LEFT_CHEST: "Professional placement, ideal for logos and branding",
            PlacementArea.BACK: "Large canvas for detailed designs and statements",
            PlacementArea.SLEEVE_LEFT: "Unique accent placement for modern designs",
            PlacementArea.SLEEVE_RIGHT: "Balanced accent placement"
        }
        
        design_reasons = {
            DesignType.LOGO: "Perfect size and position for brand recognition",
            DesignType.TEXT: "Optimal readability and visual impact",
            DesignType.GRAPHIC: "Showcases artwork with maximum visual appeal",
            DesignType.PATTERN: "Fills the space beautifully without overwhelming"
        }
        
        base = base_reasons.get(area, "Good placement option")
        design_specific = design_reasons.get(design_context.design_type, "")
        
        if confidence > 0.8:
            qualifier = "Excellent choice: "
        elif confidence > 0.6:
            qualifier = "Good option: "
        else:
            qualifier = "Alternative: "
        
        return f"{qualifier}{base}. {design_specific}".strip()

    async def validate_placement(
        self,
        area: PlacementArea,
        x: float,
        y: float,
        width: float,
        height: float,
        product_type: str,
        design_context: Optional[DesignContext] = None
    ) -> PlacementValidation:
        """Validate a specific placement and provide feedback"""
        
        issues = []
        suggestions = []
        quality_score = 1.0
        
        # Get product rules
        product_type = product_type.lower()
        if product_type not in self.placement_rules:
            product_type = "t-shirt"
        
        if area not in self.placement_rules[product_type]:
            issues.append(f"Placement area '{area}' not available for {product_type}")
            quality_score -= 0.5
        else:
            area_rules = self.placement_rules[product_type][area]
            
            # Check position bounds
            if not (area_rules["x_range"][0] <= x <= area_rules["x_range"][1]):
                issues.append("Design positioned outside horizontal print area")
                suggestions.append(f"Move design between {area_rules['x_range'][0]} and {area_rules['x_range'][1]} inches horizontally")
                quality_score -= 0.3
            
            if not (area_rules["y_range"][0] <= y <= area_rules["y_range"][1]):
                issues.append("Design positioned outside vertical print area")
                suggestions.append(f"Move design between {area_rules['y_range'][0]} and {area_rules['y_range'][1]} inches vertically")
                quality_score -= 0.3
            
            # Check size bounds
            if width > area_rules["max_width"]:
                issues.append("Design too wide for print area")
                suggestions.append(f"Reduce width to maximum {area_rules['max_width']} inches")
                quality_score -= 0.2
            
            if height > area_rules["max_height"]:
                issues.append("Design too tall for print area")
                suggestions.append(f"Reduce height to maximum {area_rules['max_height']} inches")
                quality_score -= 0.2
            
            # Check for optimal positioning
            optimal_x = area_rules["optimal_x"]
            optimal_y = area_rules["optimal_y"]
            
            distance_from_optimal = math.sqrt((x - optimal_x)**2 + (y - optimal_y)**2)
            if distance_from_optimal > 2:  # More than 2 inches from optimal
                suggestions.append(f"Consider moving closer to optimal position ({optimal_x}, {optimal_y})")
                quality_score -= 0.1
        
        # Ensure quality score doesn't go below 0
        quality_score = max(0.0, quality_score)
        
        return PlacementValidation(
            is_valid=len(issues) == 0,
            issues=issues,
            suggestions=suggestions,
            quality_score=quality_score
        )

    async def get_placement_heatmap(self, product_type: str, design_type: DesignType) -> Dict[str, Any]:
        """Generate a heatmap showing optimal placement zones"""
        
        product_type = product_type.lower()
        if product_type not in self.placement_rules:
            product_type = "t-shirt"
        
        rules = self.placement_rules[product_type]
        heatmap_data = []
        
        for area, area_rules in rules.items():
            # Create heat zones based on distance from optimal point
            optimal_x = area_rules["optimal_x"]
            optimal_y = area_rules["optimal_y"]
            
            # Generate grid points for heatmap
            x_range = area_rules["x_range"]
            y_range = area_rules["y_range"]
            
            grid_points = []
            resolution = 20  # 20x20 grid
            
            for i in range(resolution):
                for j in range(resolution):
                    x = x_range[0] + (x_range[1] - x_range[0]) * i / (resolution - 1)
                    y = y_range[0] + (y_range[1] - y_range[0]) * j / (resolution - 1)
                    
                    # Calculate heat value (inverse of distance from optimal)
                    distance = math.sqrt((x - optimal_x)**2 + (y - optimal_y)**2)
                    heat_value = max(0.1, 1.0 / (1.0 + distance))
                    
                    grid_points.append({
                        "x": x,
                        "y": y,
                        "heat": heat_value
                    })
            
            heatmap_data.append({
                "area": area,
                "grid_points": grid_points,
                "optimal_point": {"x": optimal_x, "y": optimal_y}
            })
        
        return {
            "product_type": product_type,
            "design_type": design_type,
            "heatmap": heatmap_data,
            "legend": {
                "high_heat": "Optimal placement zone",
                "medium_heat": "Good placement zone", 
                "low_heat": "Acceptable placement zone"
            }
        }

# Initialize service
smart_placement_service = SmartPlacementService()