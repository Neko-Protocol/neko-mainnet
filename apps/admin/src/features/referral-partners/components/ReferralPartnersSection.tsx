"use client";

import { useMemo, useState } from "react";
import type { ReferralPartner } from "@neko-protocol/api-contracts";
import {
  useDeleteReferralPartner,
  useReferralPartners,
} from "../hooks/useReferralPartners";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/FormControls";
import { PartnerCreateForm } from "./PartnerCreateForm";
import { PartnerTable } from "./PartnerTable";

export function ReferralPartnersSection() {
  const { data, isPending, isError } = useReferralPartners();
  const remove = useDeleteReferralPartner();

  const [open, setOpen] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ReferralPartner | null>(
    null
  );

  const partners = useMemo(() => data ?? [], [data]);

  function confirmDelete() {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <Card
      title="Referral partners"
      description="Referral codes created directly for companies and influencers we've contracted, separate from the codes users get on their own."
      collapsible
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <PartnerCreateForm />
      <PartnerTable
        partners={partners}
        isPending={isPending}
        isError={isError}
        deletePending={remove.isPending}
        deleteError={remove.error}
        onRequestDelete={setPendingDelete}
      />

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this code?"
          description={`Permanently delete "${pendingDelete.name}"'s code (${pendingDelete.code}). This also deletes any referral history already attributed to it. This can't be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </Card>
  );
}
