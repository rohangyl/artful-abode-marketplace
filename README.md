# Artful Abode Marketplace

Responsive e-commerce storefront for handcrafted Indian art and home décor, built with React, TypeScript, TanStack Start, Supabase, and Razorpay.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm start
```

## Netlify preview deployment

1. Import the Git repository into Netlify and use the build settings in
   [`netlify.toml`](./netlify.toml).
2. Add the required Supabase and Razorpay test credentials in the site's
   environment variables. Keep service-role and payment secret keys server-only;
   never add secrets to `VITE_*` variables.
3. Apply the Supabase migrations documented below before testing the related
   features. Use Razorpay test credentials until live payments are intentionally
   enabled.
4. Netlify can create a separate Deploy Preview for pull requests, so changes
   can be tested without replacing the production deployment.

## Transactional email setup

Order confirmations are sent after Razorpay payment verification. A welcome
email is sent once after a user confirms their email and signs in. Email
delivery supports both [Resend](https://resend.com/) and [Mailtrap](https://mailtrap.io/). Configure the provider on the server, never as `VITE_*` variables.

### Resend (recommended for live delivery)

1. Create a Resend API key and verify a sending domain.
2. Add these server-side variables to the local `.env` file:

   ```env
   RESEND_API_KEY=your-resend-api-key
   RESEND_FROM_EMAIL="Art & Decor <noreply@your-domain.com>"
   ```

3. In the Supabase SQL Editor, run
   [`supabase/migrations/20261022180000_email_notifications.sql`](./supabase/migrations/20261022180000_email_notifications.sql)
   once to create the private email-delivery log table.
4. Restart the local app.

### Mailtrap (for sandbox or testing)

1. Create a sandbox in Mailtrap and copy its Sandbox ID and API token.
2. Add these server-side variables to the local `.env` file:

   ```env
   MAILTRAP_MODE=sandbox
   MAILTRAP_API_TOKEN=your-mailtrap-api-token
   MAILTRAP_INBOX_ID=your-sandbox-id
   MAILTRAP_FROM_NAME=Art & Decor
   ```

   Sandbox messages are captured in the Mailtrap inbox and are not delivered
   to real recipients. No sending domain is needed for sandbox testing.

3. Restart the local app. For live delivery, verify a sending domain in
   Mailtrap and set `MAILTRAP_MODE=transactional`, `MAILTRAP_API_TOKEN`,
   `MAILTRAP_FROM_EMAIL`, and optionally `MAILTRAP_FROM_NAME` in the
   production server environment. Apply the email log migration to the
   production Supabase project as well.

## Login inactivity timeout

Signed-in users are automatically logged out after two minutes without activity.
The timeout is tracked across tabs and survives a page reload on the same
browser.

## Checkout coupons

Checkout accepts `ART100` (100%), `ART60` (60%), and `ART30` (30%) discounts on
the product subtotal. Shipping is calculated separately and is not discounted.
Coupons can be reused without a redemption limit. A coupon is validated against
server-side product prices before payment; a zero-payable order is not accepted
because checkout requires a verified Razorpay payment.

## Product size selection

Product pages default to 40 inches; customers can choose a custom size instead.
The 40-inch price is the base price. Each inch above 40 adds one-fortieth of the
base price, rounded to the nearest rupee. Sizes below 40 keep the base price.
The selected size and calculated unit price are saved with each order item.
Apply [`supabase/migrations/20261025150000_order_item_size.sql`](./supabase/migrations/20261025150000_order_item_size.sql)
to the Supabase project before deploying this checkout change.

## Expected delivery date

After payment is verified, the order gets an estimated delivery date seven
working days later (weekends excluded; public holidays are not accounted for).
The estimate is included in the order confirmation email and shown in the
customer's account. Apply
[`supabase/migrations/20261026120000_order_expected_delivery_date.sql`](./supabase/migrations/20261026120000_order_expected_delivery_date.sql)
to the Supabase project before deploying this change. This is an estimate, not
live courier tracking.
