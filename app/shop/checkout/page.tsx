"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/marketplace/CartProvider";
import { placeOrder } from "@/lib/actions/marketplace";
import { initiateMpesaPayment, createPesapalOrder } from "@/lib/actions/payments";
import { formatPrice } from "@/lib/format";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { status } = useSession();
  const router = useRouter();

  const [fulfillment, setFulfillment] = useState<"SHIPPING" | "LOCAL_PICKUP">("LOCAL_PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<"MPESA" | "CARD">("MPESA");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (status !== "authenticated") {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-display text-2xl text-stone">Sign in to check out.</p>
        <Link
          href="/login"
          className="focus-ring mt-6 inline-block rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-display text-2xl text-stone">Your cart is empty.</p>
        <Link
          href="/shop"
          className="focus-ring mt-6 inline-block rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          Browse Taita Made
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("fulfillment", fulfillment);
    formData.set("paymentMethod", paymentMethod);
    formData.set("phone", phone);
    formData.set("address", address);
    formData.set(
      "cart",
      JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity })))
    );

    const orderResult = await placeOrder(formData);
    if (orderResult?.error || !orderResult?.orderId) {
      setError(orderResult?.error ?? "Something went wrong placing your order.");
      setLoading(false);
      return;
    }

    const orderId = orderResult.orderId;

    if (paymentMethod === "MPESA") {
      const mpesaResult = await initiateMpesaPayment(orderId);
      setLoading(false);
      if (mpesaResult?.error) {
        // The order exists but payment couldn't be started — send them to
        // the order page anyway, where they can retry.
        clear();
        router.push(`/shop/orders/${orderId}`);
        return;
      }
      clear();
      router.push(`/shop/orders/${orderId}`);
      return;
    }

    // CARD (via Pesapal)
    const pesapalResult = await createPesapalOrder(orderId);
    setLoading(false);
    if (pesapalResult?.error || !pesapalResult?.url) {
      clear();
      router.push(`/shop/orders/${orderId}`);
      return;
    }
    clear();
    window.location.href = pesapalResult.url;
  }

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-3xl text-stone">Checkout</h1>

        <div className="mt-6 rounded-sm border border-stone/10 p-4">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between font-body text-sm text-stone/70">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="mt-3 flex justify-between border-t border-stone/10 pt-3 font-display text-lg text-stone">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="font-body text-sm text-stone/70">Fulfillment</legend>
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="radio"
                name="fulfillment"
                checked={fulfillment === "LOCAL_PICKUP"}
                onChange={() => setFulfillment("LOCAL_PICKUP")}
              />
              Local pickup
            </label>
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="radio"
                name="fulfillment"
                checked={fulfillment === "SHIPPING"}
                onChange={() => setFulfillment("SHIPPING")}
              />
              Shipping
            </label>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="font-body text-sm text-stone/70">Payment</legend>
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "MPESA"}
                onChange={() => setPaymentMethod("MPESA")}
              />
              M-Pesa (STK push to your phone)
            </label>
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "CARD"}
                onChange={() => setPaymentMethod("CARD")}
              />
              Card
            </label>
          </fieldset>

          <label className="flex flex-col gap-1">
            <span className="font-body text-sm text-stone/70">
              Phone number{paymentMethod === "MPESA" ? " (for the M-Pesa prompt)" : ""}
            </span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+254 7xx xxx xxx"
            />
          </label>

          {fulfillment === "SHIPPING" && (
            <label className="flex flex-col gap-1">
              <span className="font-body text-sm text-stone/70">Shipping address</span>
              <textarea
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="input"
              />
            </label>
          )}

          {error && <p className="font-body text-sm text-rust">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="focus-ring mt-2 rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
          >
            {loading
              ? paymentMethod === "MPESA"
                ? "Sending M-Pesa prompt…"
                : "Redirecting to card payment…"
              : `Pay ${formatPrice(subtotal)}`}
          </button>

          <p className="text-center font-body text-xs text-stone/50">
            {paymentMethod === "MPESA"
              ? "You'll get an M-Pesa prompt on your phone to complete payment."
              : "You'll be redirected to a secure card payment page."}
          </p>
        </form>
      </div>
    </div>
  );
}
