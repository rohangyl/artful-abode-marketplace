# Artful Abode Marketplace

Build a complete, modern, premium-looking e-commerce website for my Art & Decor business in India. Requirements: React and TypeScript, responsive design, secure backend, PostgreSQL database, secure signup and login, shopping cart, Razorpay payment integration, admin dashboard to manage products and orders, customer dashboard, contact details, mobile-friendly and SEO-friendly. Step by step, explain any manual configuration required.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://artful-abode-marketplace.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b730cdb7-8c51-4c28-b0c4-33acee4a8d2b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm start
```

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

Signed-in users are automatically logged out after one minute without activity.
The timeout is tracked across tabs and survives a page reload on the same
browser.

## Checkout coupons

Checkout accepts `ART100` (100%), `ART60` (60%), and `ART30` (30%) discounts on
the product subtotal. Shipping is calculated separately and is not discounted.
Coupons can be reused without a redemption limit. A coupon is validated against
server-side product prices before payment; a zero-payable order is not accepted
because checkout requires a verified Razorpay payment.
