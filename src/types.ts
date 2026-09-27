export interface MenuItem {
  id: string;
  name: string;
  category: 'Signature Mains' | 'Beverages';
  price: number;
  description: string;
  popular?: boolean;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export type OrderStatus = 'ORDERING' | 'PREPARING' | 'SERVED' | 'SETTLED';

export interface CustomerJSONOutput {
  role: 'customer';
  table_no: string;
  action: 'new_order_or_bill' | 'new_order' | 'request_bill';
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  gst?: number;
  grand_total?: number;
  payment_link?: string;
}

export interface StaffJSONOutput {
  role: 'staff';
  staff_name: string;
  action: 'update_status' | 'view_orders' | 'settle_table' | 'clear_table';
  table_no: string;
  new_status?: OrderStatus;
}

export interface TableOrder {
  id: string;
  table_no: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  gstAmount: number; // 5% GST
  grandTotal: number;
  upiPaymentLink?: string;
  createdAt: string;
  updatedAt: string;
  settledAt?: string;
  lastCustomerAction?: string;
  lastStaffAction?: string;
  rawJson?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'staff' | 'ai' | 'system';
  roleType: 'customer' | 'staff';
  text: string;
  timestamp: string;
  jsonBlock?: CustomerJSONOutput | StaffJSONOutput;
}

export interface StaffUser {
  id: string;
  name: string;
  role: 'Chef' | 'Floor Waiter' | 'General Manager';
  badge: string;
}

export interface DailyRevenueMetrics {
  totalGrossRevenue: number;
  netSubtotal: number;
  totalGstCollected: number;
  totalSettledOrders: number;
  averageOrderValue: number;
  settledOrders: TableOrder[];
}

export type ActiveTab = 'split' | 'customer' | 'staff' | 'sandbox';
