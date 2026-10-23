"use client";

import { useState, useTransition } from "react";
import { adminSetOrderStatus } from "@/lib/actions/orders-admin";

// Cancelling is NOT in this list on purpose: it asks for a reason and deals with the refund and the stock, so it has its own form ("Cancel order") and can never be undone from a dropdown.
const statuses: { value: string; label: string }[] = [{ value: "PENDING", label: "Pending" }, { value: "CONFIRMED", label: "Confirmed" }, { value: "FULFILLED", label: "Fulfilled" }];

export default function OrderStatusSelect({ orderId, status }: { orderId: string; status: string }) {
  const [value, setValue] = useState(status);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        aria-label="Order status"
        value={value}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          startTransition(async () => {
            const r = await adminSetOrderStatus(orderId, next);
            if (!r.ok) { setError(r.error); setValue(status); } else setError("");
          });
        }}
        className="input"
      >
        {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      {error && <p role="alert" className="font-body text-xs text-rust">{error}</p>}
    </div>
  );
}
