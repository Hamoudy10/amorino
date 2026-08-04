import axios from "axios";

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");
  const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 15_000,
  });
  cachedToken = {
    token: res.data.access_token,
    // Daraja tokens live ~1h; refresh after 50 minutes
    expiresAt: Date.now() + 50 * 60 * 1000,
  };
  return cachedToken.token;
}

export function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

export function darajaTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
}

export function formatMpesaPhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "254" + p.slice(1);
  return p;
}

export function isMpesaConfigured(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_SHORTCODE
  );
}

export interface StkPushParams {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc?: string;
}

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function initiateStkPush(params: StkPushParams): Promise<StkPushResponse> {
  const token = await getAccessToken();
  const timestamp = darajaTimestamp();
  const password = generatePassword(
    process.env.MPESA_SHORTCODE!,
    process.env.MPESA_PASSKEY!,
    timestamp
  );
  const formattedPhone = formatMpesaPhone(params.phone);
  const callbackBase = process.env.MPESA_CALLBACK_BASE_URL ?? "http://localhost:3000";
  const callbackUrl = `${callbackBase}/api/payments/mpesa/callback`;

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(params.amount),
    PartyA: formattedPhone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: params.accountReference.slice(0, 12),
    TransactionDesc: (params.transactionDesc ?? `Payment for ${params.accountReference}`).slice(0, 20),
  };

  const res = await axios.post<StkPushResponse>(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20_000,
    }
  );
  return res.data;
}

export interface QueryStkResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

export async function queryStkStatus(checkoutRequestId: string): Promise<QueryStkResponse> {
  const token = await getAccessToken();
  const timestamp = darajaTimestamp();
  const password = generatePassword(
    process.env.MPESA_SHORTCODE!,
    process.env.MPESA_PASSKEY!,
    timestamp
  );
  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };
  const res = await axios.post<QueryStkResponse>(
    `${BASE_URL}/mpesa/stkpushquery/v1/query`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    }
  );
  return res.data;
}

export interface StkCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

export function parseCallbackMetadata(callback: StkCallbackBody): {
  mpesaReceiptNumber?: string;
  transactionDate?: Date;
  phoneNumber?: string;
  amount?: number;
} {
  const item = callback.Body?.stkCallback?.CallbackMetadata?.Item ?? [];
  const get = (name: string) => item.find((i) => i.Name === name)?.Value;
  const receipt = get("MpesaReceiptNumber") as string | undefined;
  const rawDate = get("TransactionDate") as number | undefined;
  const amount = Number(get("Amount") ?? 0);
  const phoneNumber = get("PhoneNumber") as string | undefined;
  return {
    mpesaReceiptNumber: receipt,
    transactionDate: rawDate ? new Date(Number(rawDate)) : undefined,
    phoneNumber,
    amount,
  };
}

export const MPESA_SUCCESS_CODES = ["0", 0, "00", "00000000"];
