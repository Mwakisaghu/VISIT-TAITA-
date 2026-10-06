import type { Reward } from "@prisma/client";
import { saveReward } from "@/lib/actions/rewards-admin";
import ImageField from "@/components/uploads/ImageField";

export default function RewardForm({
  reward,
  partners,
}: {
  reward?: Reward;
  partners: { id: string; name: string; email: string }[];
}) {
  const action = saveReward.bind(null, reward?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Reward name">
        <input name="name" defaultValue={reward?.name} required maxLength={120} className="input" />
      </Field>

      <Field label="Description (what the visitor gets)">
        <textarea
          name="description"
          defaultValue={reward?.description}
          required
          minLength={10}
          maxLength={1000}
          rows={3}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Points cost">
          <input
            name="pointsCost"
            type="number"
            min={1}
            defaultValue={reward?.pointsCost}
            required
            className="input"
          />
        </Field>
        <Field label="Honoured by (partner, optional)">
          <input name="partnerName" defaultValue={reward?.partnerName ?? ""} maxLength={120} className="input" />
        </Field>
      </div>

      <Field label="How to use the voucher">
        <textarea
          name="instructions"
          defaultValue={reward?.instructions}
          required
          minLength={10}
          maxLength={1000}
          rows={3}
          className="input"
          placeholder="e.g. Show this code at reception when you check in."
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Stock (blank = unlimited)">
          <input
            name="stock"
            type="number"
            min={0}
            defaultValue={reward?.stock ?? ""}
            className="input"
            placeholder="Unlimited"
          />
        </Field>
        <Field label="Valid until (optional)">
          <input
            name="validUntil"
            type="date"
            defaultValue={reward?.validUntil ? reward.validUntil.toISOString().slice(0, 10) : ""}
            className="input"
          />
        </Field>
      </div>

      <ImageField name="image" label="Image" purpose="product" defaultValue={reward?.image ?? ""} />

      <Field label="Partner account that honours it (optional)">
        <select name="ownerId" defaultValue={reward?.ownerId ?? ""} className="input">
          <option value="">— None: only Visit Taita staff mark vouchers used —</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.email})
            </option>
          ))}
        </select>
      </Field>
      <p className="-mt-3 font-body text-xs text-stone/50">
        A partner (or seller) account can look up this reward&apos;s voucher codes and mark them used from its own
        dashboard. Leave blank if staff will handle it.
      </p>

      <Field label="Status">
        <select name="status" defaultValue={reward?.status ?? "DRAFT"} className="input">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </Field>

      <p className="font-body text-xs text-stone/50">
        Only list rewards a partner has actually agreed to honour. Visitors spend real points on these.
      </p>

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {reward ? "Save changes" : "Create reward"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-sm text-stone/70">{label}</span>
      {children}
    </label>
  );
}
