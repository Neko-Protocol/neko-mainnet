import { ReferredBreakdownSection } from "@/features/referrals/components/ReferredBreakdownSection";

export default async function PartnerReferredPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { id } = await params;
  const { name } = await searchParams;
  return <ReferredBreakdownSection kind="partner" id={id} label={name} />;
}
