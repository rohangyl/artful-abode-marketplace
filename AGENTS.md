## Architecture rules
- Prices are always recomputed server-side from the products table in `createCheckout`; never trust client cart prices.
- Orders/order_items are written only by server functions with the admin client after auth + Razorpay signature verification; clients have read-only access via RLS.
- Admin rights come from `user_roles` + `has_role()`; RLS enforces it, the UI check is cosmetic.
- Product images are URLs (public buckets are blocked in this workspace).
