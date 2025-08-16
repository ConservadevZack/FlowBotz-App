export interface ProductVariant {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  variants: ProductVariant[];
}

export interface CreatorState {
  currentStep: number;
  prompt: string;
  generatedImage: string | null;
  selectedProduct: Product | null;
  selectedVariant: string;
  isGenerating: boolean;
}

export interface StepComponentProps {
  onNext?: () => void;
  onBack?: () => void;
}