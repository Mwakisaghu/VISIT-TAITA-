"use client";

import { useState, useTransition } from "react";
import { updateExperienceEnquiryStatus } from "@/lib/actions/enquiries";

const statuses = ["NEW", "CONTACTED", "CONFIRMED", "DECLINED"];

export default function ExperienceEnquiryStatusSelect({
  enquiryId,
  status,
}: {
  enquiryId: string;
  status: string;
}) {
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={isPending}
      onChange={(e) => {
        const previous = value;
        const next = e.target.value;
        setValue(next);
        startTransition(async () => {
          try {
            const result = await updateExperienceEnquiryStatus(enquiryId, next);
            if (result?.error) setValue(previous);
          } catch {
            setValue(previous);
          }
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
