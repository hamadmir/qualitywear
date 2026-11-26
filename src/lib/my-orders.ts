"use client";

/** Orders placed on this device, so customers can reopen their order chat. */
export type SavedOrder = { no: string; token: string; at: number };
const KEY = "qw-my-orders";

export function getSavedOrders(): SavedOrder[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]") as SavedOrder[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveOrder(no: string, token: string) {
  try {
    const list = getSavedOrders().filter((o) => o.no !== no);
    list.unshift({ no, token, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    // storage unavailable
  }
}

export function orderChatUrl(no: string, token: string) {
  return `/order/${encodeURIComponent(no)}?t=${encodeURIComponent(token)}`;
}
