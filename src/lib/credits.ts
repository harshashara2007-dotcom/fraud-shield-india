import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CREDIT_PACKS = [
  { credits: 200, price: 89, label: "Starter" },
  { credits: 500, price: 200, label: "Popular", best: true },
  { credits: 2000, price: 1000, label: "Pro" },
];

export const SCAN_COST = 2;

export async function fetchCredits(): Promise<{ balance: number; monthly_reset_at: string } | null> {
  const { data, error } = await supabase.rpc("get_or_init_credits");
  if (error || !data || !data[0]) return null;
  return data[0] as any;
}

/** Deducts credits before an action. Returns true if allowed. Silent no-op for signed-out users. */
export async function chargeCredits(amount: number, reason: string): Promise<boolean> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return true; // not signed in — allow (or gate elsewhere)
  const { error } = await supabase.rpc("use_credits", { _amount: amount, _reason: reason });
  if (error) {
    if (String(error.message).includes("insufficient_credits")) {
      toast.error("Out of credits — top up from your profile");
    } else {
      toast.error(error.message);
    }
    return false;
  }
  return true;
}
