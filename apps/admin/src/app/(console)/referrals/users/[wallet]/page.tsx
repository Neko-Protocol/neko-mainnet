import { ReferredBreakdownSection } from "@/features/referrals/components/ReferredBreakdownSection";

export default async function UserReferredPage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;
  return (
    <ReferredBreakdownSection kind="wallet" id={decodeURIComponent(wallet)} />
  );
}
