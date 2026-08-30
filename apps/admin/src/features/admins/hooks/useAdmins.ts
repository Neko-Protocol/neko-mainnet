import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addAdmin, fetchAdmins, setAdminActive } from "../actions";

const adminKeys = { list: ["admins", "list"] as const };

export function useAdmins() {
  return useQuery({ queryKey: adminKeys.list, queryFn: fetchAdmins });
}

export function useAddAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => addAdmin(email),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.list }),
  });
}

export function useSetAdminActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; isActive: boolean }) =>
      setAdminActive(input.email, input.isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.list }),
  });
}
