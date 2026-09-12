"use client";

import "@/lib/polyfills";
import { AppKitProvider } from "@/context/appkit";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <AppKitProvider>{children}</AppKitProvider>;
}
