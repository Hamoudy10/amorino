export interface MenuOption {
  name: string;
  price: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number | null;
  imageUrl: string | null;
  isActive: boolean | null;
}

export interface MenuItem {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean | null;
  isPopular: boolean | null;
  isVegetarian: boolean | null;
  isSpicy: boolean | null;
  prepTimeMinutes: number | null;
  options: MenuOption[];
}

export interface MenuCategoryWithItems extends Category {
  items: MenuItem[];
}

export interface CartLineOptions {
  name: string;
  price: number;
}

export interface CartLine {
  menuItemId: string;
  name: string;
  price: number; // unit price (base + options)
  quantity: number;
  options: CartLineOptions[];
  imageUrl?: string | null;
}

export type OrderType = "delivery" | "pickup" | "dine_in";
export type PaymentMethod = "mpesa" | "cash";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "picked_up"
  | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending Payment",
  paid: "Payment Received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}