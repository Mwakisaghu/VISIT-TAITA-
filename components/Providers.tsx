"use client";

import { SessionProvider } from "next-auth/react";
import CartProvider from "@/components/marketplace/CartProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <CartProvider>{children}</CartProvider>
    </SessionProvider>
  );
}
