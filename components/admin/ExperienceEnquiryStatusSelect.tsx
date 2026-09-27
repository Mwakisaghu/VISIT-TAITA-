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
        const next = e.target.value;
        setValue(next);
        startTransition(async () => {
          await updateExperienceEnquiryStatus(enquiryId, next);
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
