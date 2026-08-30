import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageInput,
  createMessage,
  createTemplate,
  deleteMessage,
  deleteTemplate,
  runDispatch,
  runEnrollment,
  sendAdHocTest,
  sendMessage,
  setMessageStatus,
  updateMessage,
  updateTemplate,
} from "../actions";
import { mailingKeys } from "../queryKeys";

/** Message lists are keyed by kind, so invalidate the whole subtree. */
function useMessageInvalidation() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["mailing", "messages"] });
}

export function useCreateMessage() {
  const invalidate = useMessageInvalidation();
  return useMutation({ mutationFn: createMessage, onSuccess: invalidate });
}

export function useUpdateMessage() {
  const invalidate = useMessageInvalidation();
  return useMutation({
    mutationFn: (input: { id: string; patch: Record<string, unknown> }) =>
      updateMessage(input.id, input.patch),
    onSuccess: invalidate,
  });
}

export function useDeleteMessage() {
  const invalidate = useMessageInvalidation();
  return useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onSuccess: invalidate,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendMessage(id),
    // A send writes per-recipient rows too, so refresh the whole mailing tree.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mailing"] }),
  });
}

/**
 * Compose-and-send: creates the draft, then sends it. A send failure leaves a
 * recoverable draft rather than losing the copy the admin just wrote.
 */
export function useSendNewBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<MessageInput, "kind">) => {
      const draft = await createMessage({ ...input, kind: "broadcast" });
      return sendMessage(draft.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mailing"] }),
  });
}

export function useSetMessageStatus() {
  const invalidate = useMessageInvalidation();
  return useMutation({
    mutationFn: (input: {
      id: string;
      action: "activate" | "pause" | "archive" | "unarchive";
    }) => setMessageStatus(input.id, input.action),
    onSuccess: invalidate,
  });
}

/** Test-sends from the composer without persisting a message. */
export function useSendTest() {
  return useMutation({
    mutationFn: (input: {
      subject: string;
      body_html: string;
      email: string;
    }) => sendAdHocTest(input),
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
