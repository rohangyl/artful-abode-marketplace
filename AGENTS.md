<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Prices are always recomputed server-side from the products table in `createCheckout`; never trust client cart prices.
- Orders/order_items are written only by server functions with the admin client after auth + Razorpay signature verification; clients have read-only access via RLS.
- Admin rights come from `user_roles` + `has_role()`; RLS enforces it, the UI check is cosmetic.
- Product images are URLs (public buckets are blocked in this workspace).
