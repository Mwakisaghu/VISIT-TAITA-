"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/lib/actions/marketplace";

const statuses = ["PENDING", "CONFIRMED", "FULFILLED", "CANCELLED"];

export default function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(async () => {
          await updateOrderStatus(orderId, next);
        });
      }}
      className="input"
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
