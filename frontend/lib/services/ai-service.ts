import { OpenAI } from 'openai';

// AI Model Types and Interfaces
export enum AIModel {
  DALLE3 = 'dalle-3',
  DALLE2 = 'dalle-2',
  STABLE_DIFFUSION_XL = 'stable-diffusion-xl',
  STABLE_DIFFUSION_3 = 'stable-diffusion-3',
  MIDJOURNEY = 'midjourney-v6',
  FLUX = 'flux-pro',
  PLAYGROUND = 'playground-v2.5'
}

export interface AIGenerationOptions {
  model: AIModel;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  quality?: 'standard' | 'hd' | 'ultra';
  style?: string;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
  numOutputs?: number;
  stylePreset?: StylePreset;
  enhancePrompt?: boolean;
}

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  basePrompt: string;
  negativePrompt?: string;
  settings: {
    steps?: number;
    guidanceScale?: number;
    style?: string;
  };
}

export interface AIGenerationResult {
  imageUrl: string;
  model: AIModel;
  prompt: string;
  metadata: {
    width: number;
    height: number;
    seed?: number;
    revisedPrompt?: string;
    generationTime: number;
  };
}

export interface ImageEnhancement {
  type: 'upscale' | 'remove-bg' | 'style-transfer' | 'colorize' | 'restore';
  strength?: number;
  targetStyle?: string;
}

// Style Presets Library
export const STYLE_PRESETS: Record<string, StylePreset> = {
  photorealistic: {
    id: 'photorealistic',
    name: 'Photorealistic',
    description: 'Ultra-realistic photography style',
    basePrompt: 'photorealistic, professional photography, high resolution, detailed, sharp focus',
    negativePrompt: 'cartoon, anime, drawing, painting, illustration, blurry, low quality',
    settings: { steps: 50, guidanceScale: 7.5 }
  },
  anime: {
    id: 'anime',
    name: 'Anime',
    description: 'Japanese anime art style',
    basePrompt: 'anime style, manga, japanese animation, vibrant colors, detailed',
    negativePrompt: 'realistic, photograph, western cartoon, 3d render',
    settings: { steps: 30, guidanceScale: 12 }
  },
  oilPainting: {
    id: 'oil-painting',
    name: 'Oil Painting',
    description: 'Classic oil painting style',
    basePrompt: 'oil painting, artistic, brush strokes, canvas texture, masterpiece',
    negativePrompt: 'digital art, photograph, cartoon, low quality',
    settings: { steps: 40, guidanceScale: 8 }
  },
  watercolor: {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft watercolor painting style',
    basePrompt: 'watercolor painting, soft colors, fluid art, paper texture, artistic',
    negativePrompt: 'digital art, photograph, sharp lines, high contrast',
    settings: { steps: 35, guidanceScale: 9 }
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean and simple design',
    basePrompt: 'minimalist, simple, clean design, modern, geometric',
    negativePrompt: 'complex, detailed, cluttered, busy, ornate',
    settings: { steps: 25, guidanceScale: 6 }
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Futuristic neon cyberpunk style',
    basePrompt: 'cyberpunk, neon lights, futuristic, sci-fi, high tech, night city',
    negativePrompt: 'medieval, ancient, rustic, natural, daylight',
    settings: { steps: 40, guidanceScale: 10 }
  },
  vintage: {
    id: 'vintage',
    name: 'Vintage',
    description: 'Retro vintage aesthetic',
    basePrompt: 'vintage, retro, nostalgic, old photograph, faded colors, film grain',
    negativePrompt: 'modern, digital, sharp, high tech, futuristic',
    settings: { steps: 30, guidanceScale: 7 }
  },
  fantasy: {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Magical fantasy art style',
    basePrompt: 'fantasy art, magical, ethereal, mystical, enchanted, detailed',
    negativePrompt: 'realistic, modern, mundane, photograph, documentary',
    settings: { steps: 45, guidanceScale: 11 }
  }
};

// Prompt Enhancement Engine
class PromptEnhancer {
  enhancePrompt(prompt: string, options?: {
    style?: StylePreset;
    quality?: string;
    aspectRatio?: string;
  }): string {
    let enhancedPrompt = prompt;
    
    // Add style preset
    if (options?.style) {
      enhancedPrompt = `${enhancedPrompt}, ${options.style.basePrompt}`;
    }
    
    // Add quality modifiers
    if (options?.quality === 'ultra') {
      enhancedPrompt += ', 8K resolution, ultra detailed, masterpiece quality';
    } else if (options?.quality === 'hd') {
      enhancedPrompt += ', 4K resolution, highly detailed, professional quality';
    }
    
    // Add composition hints
    const compositionHints = [
      'rule of thirds',
      'golden ratio',
      'centered composition',
      'dynamic angle',
      'symmetric composition'
    ];
    const randomComposition = compositionHints[Math.floor(Math.random() * compositionHints.length)];
    enhancedPrompt += `, ${randomComposition}`;
    
    // Add lighting hints
    const lightingHints = [
      'dramatic lighting',
      'soft lighting',
      'golden hour',
      'studio lighting',
      'natural lighting'
    ];
    const randomLighting = lightingHints[Math.floor(Math.random() * lightingHints.length)];
    enhancedPrompt += `, ${randomLighting}`;
    
    return enhancedPrompt;
  }
  
  generateNegativePrompt(style?: StylePreset): string {
    const baseNegative = 'low quality, blurry, pixelated, distorted, disfigured, bad anatomy';
    
    if (style?.negativePrompt) {
      return `${baseNegative}, ${style.negativePrompt}`;
    }
    
    return baseNegative;
  }
}

// Main AI Service Class
export class AIService {
  private openai: OpenAI | null = null;
  private promptEnhancer: PromptEnhancer;
  private apiKeys: Record<string, string> = {};
  
  constructor() {
    this.promptEnhancer = new PromptEnhancer();
    this.initializeAPIs();
  }
  
  private initializeAPIs() {
    // Initialize OpenAI
    if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });
    }
    
    // Store other API keys
    this.apiKeys = {
      stability: process.env.NEXT_PUBLIC_STABILITY_API_KEY || '',
      replicate: process.env.NEXT_PUBLIC_REPLICATE_API_KEY || '',
      midjourney: process.env.NEXT_PUBLIC_MIDJOURNEY_API_KEY || '',
      flux: process.env.NEXT_PUBLIC_FLUX_API_KEY || ''
    };
  }
  
  async generateImage(options: AIGenerationOptions): Promise<AIGenerationResult> {
    const startTime = Date.now();
    
    // Enhance prompt if requested
    let finalPrompt = options.prompt;
    if (options.enhancePrompt) {
      finalPrompt = this.promptEnhancer.enhancePrompt(options.prompt, {
        style: options.stylePreset,
        quality: options.quality
      });
    }
    
    // Add style preset to prompt
    if (options.stylePreset) {
      finalPrompt = `${finalPrompt}, ${options.stylePreset.basePrompt}`;
    }
    
    // Route to appropriate model
    let result: AIGenerationResult;
    
    switch (options.model) {
      case AIModel.DALLE3:
      case AIModel.DALLE2:
        result = await this.generateWithDALLE(finalPrompt, options);
        break;
      case AIModel.STABLE_DIFFUSION_XL:
      case AIModel.STABLE_DIFFUSION_3:
        result = await this.generateWithStableDiffusion(finalPrompt, options);
        break;
      case AIModel.MIDJOURNEY:
        result = await this.generateWithMidjourney(finalPrompt, options);
        break;
      case AIModel.FLUX:
        result = await this.generateWithFlux(finalPrompt, options);
        break;
      case AIModel.PLAYGROUND:
        result = await this.generateWithPlayground(finalPrompt, options);
        break;
      default:
        throw new Error(`Unsupported model: ${options.model}`);
    }
    
    result.metadata.generationTime = Date.now() - startTime;
    return result;
  }
  
  private async generateWithDALLE(
    prompt: string,
    options: AIGenerationOptions
  ): Promise<AIGenerationResult> {
    if (!this.openai) {
      throw new Error('OpenAI API not initialized');
    }
    
    const size = this.getDALLESize(options.width, options.height);
    const quality = options.quality === 'ultra' ? 'hd' : 'standard';
    
    const response = await this.openai.images.generate({
      model: options.model,
      prompt,
      n: 1,
      size,
      quality,
      response_format: 'url'
    });
    
    const imageData = response.data?.[0];
    if (!imageData?.url) {
      throw new Error('No image data returned from OpenAI');
    }

    return {
      imageUrl: imageData.url,
      model: options.model,
      prompt,
      metadata: {
        width: options.width || 1024,
        height: options.height || 1024,
        revisedPrompt: imageData.revised_prompt,
        generationTime: 0
      }
    };
  }
  
  private async generateWithStableDiffusion(
    prompt: string,
    options: AIGenerationOptions
  ): Promise<AIGenerationResult> {
    // Call Stability AI API
    const engineId = options.model === AIModel.STABLE_DIFFUSION_3 
      ? 'stable-diffusion-3' 
      : 'stable-diffusion-xl-1024-v1-0';
    
    const response = await fetch(
      `https://api.stability.ai/v1/generation/${engineId}/text-to-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKeys.stability}`,
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1
            },
            ...(options.negativePrompt ? [{
              text: options.negativePrompt,
              weight: -1
            }] : [])
          ],
          cfg_scale: options.guidanceScale || 7,
          width: options.width || 1024,
          height: options.height || 1024,
          steps: options.steps || 30,
          samples: options.numOutputs || 1,
          ...(options.seed && { seed: options.seed })
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Stable Diffusion API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const image = data.artifacts[0];
    
    // Convert base64 to data URL
    const imageUrl = `data:image/png;base64,${image.base64}`;
    
    return {
      imageUrl,
      model: options.model,
      prompt,
      metadata: {
        width: options.width || 1024,
        height: options.height || 1024,
        seed: image.seed,
        generationTime: 0
      }
    };
  }
  
  private async generateWithMidjourney(
    prompt: string,
    options: AIGenerationOptions
  ): Promise<AIGenerationResult> {
    // Placeholder for Midjourney API integration
    // This would typically use a third-party service or Discord bot
    throw new Error('Midjourney integration coming soon');
  }
  
  private async generateWithFlux(
    prompt: string,
    options: AIGenerationOptions
  ): Promise<AIGenerationResult> {
    // Placeholder for Flux API integration
    throw new Error('Flux integration coming soon');
  }
  
  private async generateWithPlayground(
    prompt: string,
    options: AIGenerationOptions
  ): Promise<AIGenerationResult> {
    // Placeholder for Playground AI integration
    throw new Error('Playground AI integration coming soon');
  }
  
  async enhanceImage(
    imageUrl: string,
    enhancement: ImageEnhancement
  ): Promise<string> {
    switch (enhancement.type) {
      case 'upscale':
        return this.upscaleImage(imageUrl, enhancement.strength || 2);
      case 'remove-bg':
        return this.removeBackground(imageUrl);
      case 'style-transfer':
        return this.applyStyleTransfer(imageUrl, enhancement.targetStyle!);
      case 'colorize':
        return this.colorizeImage(imageUrl);
      case 'restore':
        return this.restoreImage(imageUrl);
      default:
        throw new Error(`Unknown enhancement type: ${enhancement.type}`);
    }
  }
  
  private async upscaleImage(imageUrl: string, scale: number): Promise<string> {
    // Use ESRGAN or Real-ESRGAN via Replicate
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKeys.replicate}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'real-esrgan',
        input: {
          image: imageUrl,
          scale
        }
      })
    });
    
    const prediction = await response.json();
    return prediction.output;
  }
  
  private async removeBackground(imageUrl: string): Promise<string> {
    // Use remove.bg or similar service
    const formData = new FormData();
    formData.append('image_url', imageUrl);
    
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.NEXT_PUBLIC_REMOVEBG_API_KEY || '',
      },
      body: formData
    });
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
  
  private async applyStyleTransfer(
    imageUrl: string,
    targetStyle: string
  ): Promise<string> {
    // Implement style transfer using appropriate API
    throw new Error('Style transfer coming soon');
  }
  
  private async colorizeImage(imageUrl: string): Promise<string> {
    // Implement colorization for black and white images
    throw new Error('Colorization coming soon');
  }
  
  private async restoreImage(imageUrl: string): Promise<string> {
    // Implement image restoration for old/damaged photos
    throw new Error('Image restoration coming soon');
  }
  
  private getDALLESize(
    width?: number,
    height?: number
  ): '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024' {
    if (!width || !height) return '1024x1024';
    
    const ratio = width / height;
    
    if (Math.abs(ratio - 1) < 0.1) return '1024x1024';
    if (ratio > 1.5) return '1792x1024';
    if (ratio < 0.67) return '1024x1792';
    
    return '1024x1024';
  }
  
  async generateBatch(
    options: AIGenerationOptions,
    count: number
  ): Promise<AIGenerationResult[]> {
    const promises = Array(count).fill(null).map((_, index) => 
      this.generateImage({
        ...options,
        seed: options.seed ? options.seed + index : undefined
      })
    );
    
    return Promise.all(promises);
  }
  
  async generateVariations(
    imageUrl: string,
    count: number = 4
  ): Promise<string[]> {
    if (!this.openai) {
      throw new Error('OpenAI API not initialized');
    }
    
    // Download image and create variations
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], 'image.png', { type: 'image/png' });
    
    const variations = await this.openai.images.createVariation({
      image: file,
      n: count,
      size: '1024x1024'
    });
    
    if (!variations.data) {
      throw new Error('No variation data returned from OpenAI');
    }
    
    return variations.data.map(v => {
      if (!v.url) {
        throw new Error('Invalid variation data: missing URL');
      }
      return v.url;
    });
  }
  
  generateColorPalette(imageUrl: string): Promise<string[]> {
    // Extract dominant colors from image
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Simple color extraction algorithm
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = this.extractColors(imageData.data);
        resolve(colors);
      };
      img.src = imageUrl;
    });
  }
  
  private extractColors(data: Uint8ClampedArray): string[] {
    const colorMap = new Map<string, number>();
    
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.floor(data[i] / 32) * 32;
      const g = Math.floor(data[i + 1] / 32) * 32;
      const b = Math.floor(data[i + 2] / 32) * 32;
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
    }
    
    return Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([color]) => color);
  }
}

// Export singleton instance
export const aiService = new AIService();