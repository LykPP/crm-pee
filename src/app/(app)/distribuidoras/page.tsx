import { redirect } from "next/navigation";
import { listUtilities } from "@/lib/data/reference";
import { createClient } from "@/lib/supabase/server";

/** Opens the first utility; the list itself lives in the layout. */
export default async function UtilitiesPage() {
  const utilities = await listUtilities(await createClient());
  if (utilities.length) redirect(`/distribuidoras/${utilities[0].id}`);
  return null;
}
