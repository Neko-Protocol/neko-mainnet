import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The redirect would otherwise drop the query string, losing referral
  // attribution for links shaped like /?ref=CODE.
  const params = await searchParams;
  const ref = typeof params.ref === "string" ? params.ref.trim() : "";
  redirect(ref ? `/dashboard?ref=${encodeURIComponent(ref)}` : "/dashboard");
}
