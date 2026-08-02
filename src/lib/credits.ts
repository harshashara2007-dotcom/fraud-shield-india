import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CREDIT_PACKS = [
  { credits: 200, price: 89, label: "Starter" },
  { credits: 500, price: 200, label: "Popular", best: true },
  { credits: 2000, price: 1000, label: "Pro" },
];

export const SCAN_COST = 2;

export async function fetchCredits(): Promise<{ balance: number; monthly_reset_at: string } | null> {
  // get_or_init_credits creates the user's row with 100 credits on first call.
  const { data, error } = await supabase.rpc("get_or_init_credits");
  if (error) {
    console.error("[credits] failed to load", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as { balance: number; monthly_reset_at: string };
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
