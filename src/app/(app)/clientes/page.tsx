import { redirect } from "next/navigation";
import { listClients } from "@/lib/data/clients";
import { createClient } from "@/lib/supabase/server";

/** Opens the first client; the list itself lives in the layout. */
export default async function ClientsPage() {
  const clients = await listClients(await createClient());
  if (clients.length) redirect(`/clientes/${clients[0].id}`);
  return null;
}
