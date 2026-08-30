/** An authorized admin of the admin app. */
export interface AdminEmail {
  email: string;
  is_active: boolean;
  added_by: string | null;
  created_at: string;
}
