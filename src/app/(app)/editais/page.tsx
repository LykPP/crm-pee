import { redirect } from "next/navigation";
import { listCalls } from "@/lib/data/reference";
import { createClient } from "@/lib/supabase/server";

/** Opens the first call; the list itself lives in the layout. */
export default async function CallsPage() {
  const calls = await listCalls(await createClient());
  if (calls.length) redirect(`/editais/${calls[0].id}`);
  return null;
}
