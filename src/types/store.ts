export type CurrencyCode = 'GMD' | 'XOF' | 'USD' | 'EUR';

export type Language = 'fr' | 'en';

export type ProductCategory =
  | 'audio'
  | 'wearables'
  | 'streetwear'
  | 'footwear'
  | 'accessories';

export type VisualPreset =
  | 'headphones'
  | 'earbuds'
  | 'watch'
  | 'sneakers'
  | 'hoodie'
  | 'backpack'
  | 'powerbank'
  | 'sunglasses';

export type PaymentMethod =
  | 'wave'
  | 'qmoney'
  | 'afrimoney'
  | 'card'
  | 'cod';

export type OrderStatus =
  | 'confirmed'
  | 'preparing'
  | 'shipping'
  | 'delivered'
  | 'cancelled';

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameEn: string;
  category: ProductCategory;
  description: string;
  descriptionEn: string;
  priceGmd: number;
  compareAtGmd?: number;
  stock: number;
  lowStockThreshold: number;
  visualPreset: VisualPreset;
  imageUrl?: string;
  badge?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  unitPriceGmd: number;
  quantity: number;
  visualPreset: VisualPreset;
  imageUrl?: string;
}

export interface OrderEvent {
  status: OrderStatus;
  label: string;
  note: string;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryZone: string;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  paymentStatus: 'paid' | 'pending_cod';
  currency: CurrencyCode;
  items: OrderItem[];
  subtotalGmd: number;
  deliveryFeeGmd: number;
  totalGmd: number;
  status: OrderStatus;
  timeline: OrderEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  authProvider: 'email' | 'phone' | 'google' | 'facebook' | 'apple';
  role: 'customer' | 'admin';
  defaultZone?: string;
  defaultAddress?: string;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  type: 'welcome' | 'order_confirmation' | 'status_update' | 'low_stock_alert';
  orderNumber?: string;
  status: 'sent_smtp' | 'delivered_outbox';
  previewText: string;
  htmlBody: string;
  sentAt: string;
}

export interface DailySalesPoint {
  date: string;
  label: string;
  revenueGmd: number;
  ordersCount: number;
}

export interface SalesStats {
  totalRevenueGmd: number;
  todayRevenueGmd: number;
  totalOrders: number;
  todayOrders: number;
  activeOrdersCount: number;
  averageOrderGmd: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalUnitsSold: number;
  dailySeries: DailySalesPoint[];
  paymentBreakdown: {
    method: PaymentMethod;
    label: string;
    count: number;
    revenueGmd: number;
  }[];
  topProducts: {
    productId: string;
    name: string;
    unitsSold: number;
    revenueGmd: number;
  }[];
}
