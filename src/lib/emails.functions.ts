import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendWelcomeEmailOnce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null || Object.keys(data).length !== 0) {
      throw new Error("Invalid welcome email request.");
    }
    return {};
  })
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.auth.getUser();
    if (error) throw new Error(`Could not verify current user: ${error.message}`);
    if (!data.user?.email || !data.user.email_confirmed_at) return { sent: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWelcomeEmail } = await import("@/lib/email.server");
    const { user } = data;
    const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
    const name = typeof metadataName === "string" ? metadataName : "";
    const sent = await sendWelcomeEmail(supabaseAdmin, user.id, user.email, name);
    return { sent };
  });
