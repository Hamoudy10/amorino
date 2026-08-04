import { notifyOrderStatus } from "@/lib/notifications";

export interface NotifyOrderPayload {
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  customerEmail?: string | null;
  userId?: string | null;
  status: string;
  etaMinutes?: number | null;
}

export async function handleNotifyOrder(payload: NotifyOrderPayload) {
  await notifyOrderStatus({
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    customerPhone: payload.customerPhone,
    customerEmail: payload.customerEmail ?? null,
    userId: payload.userId ?? null,
    status: payload.status,
    etaMinutes: payload.etaMinutes ?? null,
  });
}
