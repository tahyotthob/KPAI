/** Native share sheet if available (phones), else WhatsApp. Returns how it was shared. */
export async function shareOut(text: string): Promise<"native" | "whatsapp" | "cancelled"> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text });
      return "native";
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "cancelled";
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  return "whatsapp";
}
