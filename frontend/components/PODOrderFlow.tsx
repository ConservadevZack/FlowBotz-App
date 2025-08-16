'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import PaymentFlow from './PaymentFlow';
import OrderStatus from './OrderStatus';
import { 
  ShoppingCart, 
  MapPin, 
  CreditCard, 
  Package,
  ArrowLeft,
  Plus,
  Minus,
  AlertCircle
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  brand: string;
  image: string;
  variants: Array<{
    id: string;
    name: string;
    size: string;
    color: string;
    color_code: string;
    price: number;
    in_stock: boolean;
    image: string;
  }>;
  options: Array<{
    name: string;
    values: string[];
  }>;
  provider?: string;
}

interface PODOrderFlowProps {
  product: Product;
  designUrl: string;
  onCancel: () => void;
}

interface ShippingAddress {
  name: string;
  address1: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

const PODOrderFlow: React.FC<PODOrderFlowProps> = ({ product, designUrl, onCancel }) => {
  const [step, setStep] = useState<'product' | 'shipping' | 'payment' | 'status'>('product');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    address1: '',
    city: '',
    state: '',
    country: 'US',
    zip: ''
  });
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-select first available variant
  useEffect(() => {
    const availableVariant = product.variants.find(v => v.in_stock);
    if (availableVariant && !selectedVariantId) {
      setSelectedVariantId(availableVariant.id);
    }
  }, [product.variants, selectedVariantId]);

  // Load saved user email
  useEffect(() => {
    const savedEmail = localStorage.getItem('user_email');
    if (savedEmail) {
      setCustomerEmail(savedEmail);
    }
  }, []);

  const selectedVariant = product.variants.find(v => v.id === selectedVariantId);

  const validateShippingForm = () => {
    const newErrors: Record<string, string> = {};

    if (!shippingAddress.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!shippingAddress.address1.trim()) {
      newErrors.address1 = 'Address is required';
    }
    if (!shippingAddress.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!shippingAddress.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!shippingAddress.zip.trim()) {
      newErrors.zip = 'ZIP code is required';
    }
    if (!customerEmail.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(50, quantity + delta));
    setQuantity(newQuantity);
  };

  const handleShippingSubmit = () => {
    if (validateShippingForm()) {
      setStep('payment');
    }
  };

  const handlePaymentSuccess = (result: any) => {
    setPaymentResult(result);
    setStep('status');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Stay on payment step to allow retry
  };

  const renderProductSelection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Product Image */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={selectedVariant?.image || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Design Preview */}
              {designUrl && (
                <div className="space-y-2">
                  <Label>Your Design</Label>
                  <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                    <img
                      src={designUrl}
                      alt="Your design"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Product Options */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{product.name}</h3>
                <p className="text-gray-600">{product.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{product.type}</Badge>
                  <Badge variant="secondary">{product.brand}</Badge>
                  {product.provider && (
                    <Badge variant="outline">{product.provider}</Badge>
                  )}
                </div>
              </div>

              {/* Variant Selection */}
              <div className="space-y-3">
                <Label>Select Variant</Label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedVariantId === variant.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${!variant.in_stock ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => variant.in_stock && setSelectedVariantId(variant.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {variant.color_code && (
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: variant.color_code }}
                            />
                          )}
                          <div>
                            <div className="font-medium">
                              {variant.size} - {variant.color}
                            </div>
                            <div className="text-sm text-gray-600">
                              {variant.in_stock ? 'In Stock' : 'Out of Stock'}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold">
                          ${variant.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label>Quantity</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="font-medium w-8 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= 50}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  Maximum 50 items per order
                </div>
              </div>

              {/* Price Summary */}
              {selectedVariant && (
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <span>Unit Price</span>
                    <span>${selectedVariant.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quantity</span>
                    <span>{quantity}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Subtotal</span>
                    <span>${(selectedVariant.price * quantity).toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    + shipping, taxes, and platform fees
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={() => setStep('shipping')}
          disabled={!selectedVariantId}
          className="flex-1"
        >
          Continue to Shipping
          <MapPin className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderShippingForm = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Shipping Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="your.email@example.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <div className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email}
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={shippingAddress.name}
                onChange={(e) => setShippingAddress({...shippingAddress, name: e.target.value})}
                placeholder="John Doe"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address1">Address *</Label>
              <Input
                id="address1"
                value={shippingAddress.address1}
                onChange={(e) => setShippingAddress({...shippingAddress, address1: e.target.value})}
                placeholder="123 Main Street"
                className={errors.address1 ? 'border-red-500' : ''}
              />
              {errors.address1 && (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.address1}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={shippingAddress.city}
                onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                placeholder="New York"
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.city}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={shippingAddress.state}
                onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                placeholder="NY"
                className={errors.state ? 'border-red-500' : ''}
              />
              {errors.state && (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.state}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code *</Label>
              <Input
                id="zip"
                value={shippingAddress.zip}
                onChange={(e) => setShippingAddress({...shippingAddress, zip: e.target.value})}
                placeholder="10001"
                className={errors.zip ? 'border-red-500' : ''}
              />
              {errors.zip && (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.zip}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                value={shippingAddress.country}
                onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
              </select>
            </div>
          </div>

          {/* Order Summary */}
          {selectedVariant && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Order Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{product.name} ({selectedVariant.size}, {selectedVariant.color})</span>
                  <span>× {quantity}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Subtotal</span>
                  <span>${(selectedVariant.price * quantity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('product')} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleShippingSubmit} className="flex-1">
          Continue to Payment
          <CreditCard className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderPaymentStep = () => {
    if (!selectedVariant) return null;

    return (
      <div className="space-y-6">
        <PaymentFlow
          productId={product.id}
          variantId={selectedVariantId}
          quantity={quantity}
          designUrl={designUrl}
          shippingAddress={shippingAddress}
          customerEmail={customerEmail}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onCancel={() => setStep('shipping')}
        />
      </div>
    );
  };

  const renderOrderStatus = () => {
    if (!paymentResult) return null;

    return (
      <div className="space-y-6">
        <OrderStatus
          paymentIntentId={paymentResult.payment_intent_id}
          onClose={onCancel}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[
              { key: 'product', label: 'Product', icon: Package },
              { key: 'shipping', label: 'Shipping', icon: MapPin },
              { key: 'payment', label: 'Payment', icon: CreditCard },
              { key: 'status', label: 'Status', icon: ShoppingCart }
            ].map(({ key, label, icon: Icon }, index) => (
              <React.Fragment key={key}>
                <div className={`flex items-center gap-2 ${
                  step === key ? 'text-blue-600' : 
                  ['product', 'shipping', 'payment'].indexOf(step) > index ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{label}</span>
                </div>
                {index < 3 && (
                  <div className={`w-8 h-0.5 ${
                    ['product', 'shipping', 'payment'].indexOf(step) > index ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {step === 'product' && renderProductSelection()}
        {step === 'shipping' && renderShippingForm()}
        {step === 'payment' && renderPaymentStep()}
        {step === 'status' && renderOrderStatus()}
      </div>
    </div>
  );
};

export default PODOrderFlow;