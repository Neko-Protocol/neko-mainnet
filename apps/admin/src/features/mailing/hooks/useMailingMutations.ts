import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MailingAudienceId } from "@neko/api-contracts";
import {
  createAutomation,
  createBroadcast,
  createTemplate,
  deleteAutomation,
  deleteBroadcast,
  deleteTemplate,
  runDispatch,
  runEnrollment,
  sendBroadcast,
  sendBroadcastTest,
  setAutomationStatus,
  updateAutomation,
  updateTemplate,
} from "../actions";
import { mailingKeys } from "../queryKeys";

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBroadcast,
    onSuccess: () => qc.invalidateQueries({ queryKey: mailingKeys.broadcasts }),
  });
}

/**
 * Compose-and-send in one step: the composer creates the draft, then sends it,
 * so a send failure still leaves a recoverable draft behind rather than losing
 * the copy the admin just wrote.
 */
export function useSendNewBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      subject: string;
      body_html: string;
      audience: MailingAudienceId;
    }) => {
      const draft = await createBroadcast(input);
      return sendBroadcast(draft.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mailingKeys.broadcasts }),
  });
}

export function useSendBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendBroadcast(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: mailingKeys.broadcasts }),
  });
}

export function useSendBroadcastTest() {
  return useMutation({
    mutationFn: (input: {
      name: string;
      subject: string;
      body_html: string;
      audience: MailingAudienceId;
      email: string;
    }) =>
      createBroadcast({
        name: input.name,
        subject: input.subject,
        body_html: input.body_html,
        audience: input.audience,
      }).then((draft) => sendBroadcastTest(draft.id, input.email)),
  });
}

export function useDeleteBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBroadcast(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: mailingKeys.broadcasts }),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: mailingKeys.templates }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      subject?: string;
      body_html?: string;
    }) => {
      const { id, ...rest } = input;
      return updateTemplate(id, rest);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mailingKeys.templates }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: mailingKeys.templates }),
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAutomation,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: mailingKeys.automations }),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; patch: Record<string, unknown> }) =>
      updateAutomation(input.id, input.patch),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: mailingKeys.automations }),
  });
}

export function useSetAutomationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      action: "activate" | "pause" | "archive";
    }) => setAutomationStatus(input.id, input.action),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: mailingKeys.automations }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAutomation(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: mailingKeys.automations }),
  });
}

/**
 * Ops actions run the same cron jobs on demand. Both automations and their run
 * rows can change, so invalidate the whole mailing tree.
 */
export function useRunEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: runEnrollment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mailing"] }),
  });
}

export function useRunDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: runDispatch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mailing"] }),
  });
}
