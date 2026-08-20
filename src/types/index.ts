export type Role = 'admin' | 'cashier' | 'waiter' | 'kitchen';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid';

export type PaymentMethod = 'cash' | 'card';

export type ItemStatus = 'pending' | 'preparing' | 'ready';

export type ShiftStatus = 'open' | 'closed';

export type Lang = 'ar' | 'fr';

export interface Staff {
  id: string;
  name: string;
  role: Role;
  pin: string;
  active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name_ar: string;
  name_fr: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string | null;
  name_ar: string;
  name_fr: string;
  price: number;
  description_ar: string;
  description_fr: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Modifier {
  id: string;
  menu_item_id: string;
  name_ar: string;
  name_fr: string;
  price: number;
  active: boolean;
  created_at: string;
}

export interface RestaurantTable {
  id: string;
  name: string;
  seats: number;
  active: boolean;
  created_at: string;
}

export interface Shift {
  id: string;
  status: ShiftStatus;
  opening_cash: number;
  closing_cash: number;
  expected_cash: number;
  total_sales: number;
  total_dine_in: number;
  total_takeaway: number;
  total_delivery: number;
  orders_count: number;
  opened_by: string | null;
  opened_by_name: string | null;
  closed_by: string | null;
  closed_by_name: string | null;
  opened_at: string;
  closed_at: string | null;
  notes: string;
}

export interface OrderItemModifier {
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_ar: string;
  name_fr: string;
  price: number;
  quantity: number;
  notes: string;
  modifiers: OrderItemModifier[];
  status: ItemStatus;
  created_at: string;
}

export interface Order {
  id: string;
  type: OrderType;
  table_id: string | null;
  table_name: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  subtotal: number;
  total: number;
  shift_id: string | null;
  staff_id: string | null;
  staff_name: string;
  notes: string;
  created_at: string;
  completed_at: string | null;
  order_items?: OrderItem[];
}

export interface CartModifier {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  uid: string;
  menu_item_id: string;
  name_ar: string;
  name_fr: string;
  price: number;
  quantity: number;
  notes: string;
  modifiers: CartModifier[];
}

export interface RestaurantInfo {
  name: string;
  phone: string;
  address: string;
  logo: string;
}

export interface LicenseInfo {
  type: 'none' | 'trial' | 'lifetime';
  key: string;
  activatedAt: string | null;
  fingerprint: string;
}

export interface PrinterConfig {
  cashier: string | null;
  kitchen: string | null;
  bar: string | null;
}
