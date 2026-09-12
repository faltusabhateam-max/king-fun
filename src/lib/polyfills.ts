import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Buffer = (window as any).Buffer || Buffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).global = (window as any).global || window;
}
