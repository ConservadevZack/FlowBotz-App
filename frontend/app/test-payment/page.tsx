'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import PODOrderFlow from '../../components/PODOrderFlow';
import { Package, ShoppingCart } from 'lucide-react';

// Mock product for testing
const mockProduct = {
  id: "mock-1",
  name: "Premium Cotton T-Shirt",
  description: "High-quality 100% cotton t-shirt perfect for custom designs. Soft, comfortable, and durable.",
  type: "t-shirt",
  brand: "FlowBotz",
  image: "https://images.printful.com/products/71/product_1581412399.jpg",
  variants: [
    {
      id: "mock-1-s-white",
      name: "Premium T-Shirt - S - White",
      size: "S",
      color: "White",
      color_code: "#FFFFFF",
      price: 19.99,
      in_stock: true,
      image: "https://images.printful.com/products/71/product_1581412399.jpg"
    },
    {
      id: "mock-1-m-white",
      name: "Premium T-Shirt - M - White",
      size: "M",
      color: "White",
      color_code: "#FFFFFF",
      price: 19.99,
      in_stock: true,
      image: "https://images.printful.com/products/71/product_1581412399.jpg"
    },
    {
      id: "mock-1-l-white",
      name: "Premium T-Shirt - L - White",
      size: "L",
      color: "White",
      color_code: "#FFFFFF",
      price: 19.99,
      in_stock: true,
      image: "https://images.printful.com/products/71/product_1581412399.jpg"
    },
    {
      id: "mock-1-xl-white",
      name: "Premium T-Shirt - XL - White",
      size: "XL",
      color: "White",
      color_code: "#FFFFFF",
      price: 21.99,
      in_stock: true,
      image: "https://images.printful.com/products/71/product_1581412399.jpg"
    },
    {
      id: "mock-1-m-black",
      name: "Premium T-Shirt - M - Black",
      size: "M",
      color: "Black",
      color_code: "#000000",
      price: 19.99,
      in_stock: true,
      image: "https://images.printful.com/products/71/product_1581412420.jpg"
    }
  ],
  options: [
    {
      name: "Color",
      values: ["White", "Black", "Navy", "Gray"]
    },
    {
      name: "Size", 
      values: ["S", "M", "L", "XL", "XXL"]
    }
  ],
  provider: "FlowBotz"
};

const mockDesignUrl = "https://via.placeholder.com/400x400/4F46E5/FFFFFF?text=FlowBotz+Design";

export default function TestPaymentPage() {
  const [showOrderFlow, setShowOrderFlow] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Check API connectivity on page load
  useEffect(() => {
    const checkAPI = async () => {
      try {
        const response = await fetch('/api/payments/pricing');
        if (response.ok) {
          setApiStatus('connected');
        } else {
          setApiStatus('error');
        }
      } catch (error) {
        setApiStatus('error');
      }
    };

    checkAPI();
  }, []);

  const startOrderFlow = () => {
    setShowOrderFlow(true);
  };

  const handleOrderCancel = () => {
    setShowOrderFlow(false);
  };

  if (showOrderFlow) {
    return (
      <PODOrderFlow
        product={mockProduct}
        designUrl={mockDesignUrl}
        onCancel={handleOrderCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            FlowBotz Payment Integration Test
          </h1>
          <p className="text-gray-600">
            Test the complete POD order and payment workflow
          </p>
        </div>

        {/* API Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                apiStatus === 'connected' ? 'bg-green-500' :
                apiStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className="font-medium">
                {apiStatus === 'connected' ? 'Backend Connected' :
                 apiStatus === 'error' ? 'Backend Error' : 'Checking...'}
              </span>
            </div>
            {apiStatus === 'error' && (
              <p className="text-sm text-red-600 mt-2">
                Make sure the backend is running on http://localhost:8000
              </p>
            )}
          </CardContent>
        </Card>

        {/* Test Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Features Implemented
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Secure Stripe payment processing
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  POD pricing calculation
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Order tracking and status
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Webhook payment confirmation
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  PCI compliant card processing
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Real-time order status updates
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Payment security validation
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <strong>Stripe Mode:</strong> Test Mode
                </div>
                <div>
                  <strong>Test Card:</strong> 4242 4242 4242 4242
                </div>
                <div>
                  <strong>Expiry:</strong> Any future date
                </div>
                <div>
                  <strong>CVC:</strong> Any 3 digits
                </div>
                <div>
                  <strong>POD Provider:</strong> Mock (for testing)
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  No real charges will be made in test mode
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Preview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={mockProduct.image}
                  alt={mockProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="md:col-span-2 space-y-3">
                <div>
                  <h3 className="text-xl font-semibold">{mockProduct.name}</h3>
                  <p className="text-gray-600">{mockProduct.description}</p>
                </div>
                <div className="flex gap-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {mockProduct.type}
                  </span>
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                    {mockProduct.brand}
                  </span>
                </div>
                <div>
                  <strong>Available Sizes:</strong> S, M, L, XL
                </div>
                <div>
                  <strong>Available Colors:</strong> White, Black
                </div>
                <div>
                  <strong>Price Range:</strong> $19.99 - $21.99
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Design Preview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Design</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={mockDesignUrl}
                  alt="Test design"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-3">
                <p className="text-gray-600">
                  This is a placeholder design for testing the payment flow. 
                  In a real application, this would be the user's custom AI-generated design.
                </p>
                <div className="space-y-2 text-sm">
                  <div><strong>Format:</strong> PNG</div>
                  <div><strong>Resolution:</strong> 400x400px</div>
                  <div><strong>Placement:</strong> Center Chest</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Order Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Ready to Test?</h3>
              <p className="text-gray-600">
                Click below to start the complete order and payment workflow
              </p>
              <Button
                onClick={startOrderFlow}
                disabled={apiStatus !== 'connected'}
                size="lg"
                className="px-8"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Start Order Flow
              </Button>
              {apiStatus !== 'connected' && (
                <p className="text-sm text-red-600">
                  Backend must be connected to test payments
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This page demonstrates the complete FlowBotz payment integration.
            Use test card numbers for safe testing.
          </p>
        </div>
      </div>
    </div>
  );
}