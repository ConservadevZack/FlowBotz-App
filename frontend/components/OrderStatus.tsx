'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  Loader2, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  ExternalLink,
  CreditCard
} from 'lucide-react';

interface OrderDetails {
  payment_intent_id: string;
  order_id?: string;
  status: string;
  order_created: boolean;
  pod_order_id?: string;
  pod_status?: {
    status: string;
    tracking_number?: string;
    tracking_url?: string;
    estimated_delivery?: string;
  };
  total_amount: number;
  created_at: string;
  estimated_delivery: string;
  product_details: {
    product_id: string;
    variant_id: string;
    quantity: number;
    provider: string;
  };
}

interface OrderStatusProps {
  paymentIntentId: string;
  onClose?: () => void;
}

const OrderStatus: React.FC<OrderStatusProps> = ({ paymentIntentId, onClose }) => {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrderStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/payments/order-status/${paymentIntentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch order status');
      }

      const data = await response.json();
      setOrderDetails(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    }
  };

  useEffect(() => {
    const loadInitialStatus = async () => {
      setIsLoading(true);
      await fetchOrderStatus();
      setIsLoading(false);
    };

    loadInitialStatus();
  }, [paymentIntentId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrderStatus();
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'payment_processing':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'in_production':
      case 'processing':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-500" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'canceled':
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'default'; // green
      case 'shipped':
        return 'secondary'; // purple
      case 'in_production':
      case 'processing':
        return 'outline'; // orange
      case 'canceled':
      case 'cancelled':
      case 'failed':
        return 'destructive'; // red
      default:
        return 'secondary'; // blue
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Order Status...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Error Loading Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
            <Button onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orderDetails) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(orderDetails.status)}
            Order Status
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Order Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status</span>
              <Badge variant={getStatusBadgeVariant(orderDetails.status)}>
                {formatStatus(orderDetails.status)}
              </Badge>
            </div>

            {orderDetails.order_id && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Order ID</span>
                <span className="font-mono text-sm">{orderDetails.order_id}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-medium">Payment ID</span>
              <span className="font-mono text-sm">{orderDetails.payment_intent_id}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Total Amount</span>
              <span className="font-semibold">${orderDetails.total_amount.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Order Date</span>
              <span>{formatDate(orderDetails.created_at)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Estimated Delivery</span>
              <span>{orderDetails.estimated_delivery}</span>
            </div>
          </div>

          {/* Product Details */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Product Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Product ID</span>
                <span className="font-mono">{orderDetails.product_details.product_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Variant</span>
                <span className="font-mono">{orderDetails.product_details.variant_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity</span>
                <span>{orderDetails.product_details.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Provider</span>
                <span className="capitalize">{orderDetails.product_details.provider}</span>
              </div>
            </div>
          </div>

          {/* POD Status */}
          {orderDetails.pod_order_id && orderDetails.pod_status && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Production Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Production ID</span>
                  <span className="font-mono text-sm">{orderDetails.pod_order_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Production Status</span>
                  <Badge variant={getStatusBadgeVariant(orderDetails.pod_status.status)}>
                    {formatStatus(orderDetails.pod_status.status)}
                  </Badge>
                </div>
                
                {orderDetails.pod_status.tracking_number && (
                  <div className="flex items-center justify-between">
                    <span>Tracking Number</span>
                    <span className="font-mono text-sm">
                      {orderDetails.pod_status.tracking_number}
                    </span>
                  </div>
                )}

                {orderDetails.pod_status.tracking_url && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(orderDetails.pod_status!.tracking_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Track Package
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Messages */}
          {!orderDetails.order_created && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your payment is being processed. Your order will be created within a few minutes.
              </AlertDescription>
            </Alert>
          )}

          {orderDetails.status === 'pending' && orderDetails.order_created && (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                Your order has been received and is being prepared for production.
              </AlertDescription>
            </Alert>
          )}

          {orderDetails.status === 'in_production' && (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                Your item is currently being printed and will be shipped soon.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {onClose && (
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/my-orders'}
              className="flex-1"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              View All Orders
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderStatus;