"use client";

import { Download } from "lucide-react";
import type { Order } from "@/lib/types";

function csv(rows: (string | number | null | undefined)[][]) {
  return (
    "﻿" +
    rows
      .map((r) =>
        r
          .map((c) => {
            const v = c == null ? "" : String(c);
            // Prevent spreadsheet formula injection from customer-entered text
            const safe = /^[=+\-@\t\r]/.test(v) && !/^-?\d+(\.\d+)?$/.test(v) ? `'${v}` : v;
            return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
          })
          .join(",")
      )
      .join("\r\n")
  );
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const pk = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Karachi" });

export default function ReportDownload({ orders, from, to }: { orders: Order[]; from: string; to: string }) {
  function ordersFile() {
    download(
      `quality-wear-orders-${from}-to-${to}.csv`,
      csv([
        ["Order", "Date", "Customer", "Phone", "City", "Address", "Status", "Payment", "Items", "Subtotal", "Discount", "Coupon", "Delivery", "Total", "Courier", "Tracking"],
        ...orders.map((o) => [
          o.order_number,
          pk(o.created_at),
          o.customer_name,
          o.phone,
          o.city,
          o.address,
          o.status,
          o.payment_status,
          (o.order_items ?? []).reduce((n, i) => n + i.quantity, 0),
          o.subtotal,
          o.discount,
          o.coupon_code,
          o.delivery_charge,
          o.total,
          o.courier,
          o.tracking_number,
        ]),
      ])
    );
  }
  function itemsFile() {
    download(
      `quality-wear-items-${from}-to-${to}.csv`,
      csv([
        ["Order", "Date", "Status", "Product", "Size", "Colour", "Qty", "Unit price", "Line total"],
        ...orders.flatMap((o) =>
          (o.order_items ?? []).map((i) => [o.order_number, pk(o.created_at), o.status, i.product_name, i.size, i.color, i.quantity, i.unit_price, i.line_total])
        ),
      ])
    );
  }
  return (
    <div className="flex gap-2">
      <button onClick={ordersFile} disabled={!orders.length} className="btn bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800 disabled:opacity-40">
        <Download className="h-4 w-4" /> Orders (Excel)
      </button>
      <button onClick={itemsFile} disabled={!orders.length} className="btn-outline px-4 py-2 text-sm disabled:opacity-40">
        <Download className="h-4 w-4" /> Items (Excel)
      </button>
    </div>
  );
}
