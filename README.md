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
email is sent the first time a confirmed user opens the app after signing in.
Email delivery uses [Resend](https://resend.com/); the API key and sender must
be configured on the server, never as `VITE_*` variables.

1. Create a Resend account and verify a sending domain. For local-only testing,
   Resend's `onboarding@resend.dev` sender can only send to the account owner's
   verified email address.
2. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to the local `.env` file and
   to the production server's environment variables. Use a sender such as
   `Art & Decor <orders@your-verified-domain.example>`.
3. In the Supabase SQL Editor, run
   [`supabase/migrations/20261022180000_email_notifications.sql`](./supabase/migrations/20261022180000_email_notifications.sql)
   once to create the private email-delivery log table.
4. Restart the local app. For production, configure the same server-side
   variables and apply the migration to the production Supabase project.

## Login inactivity timeout

Signed-in users are automatically logged out after one minute without activity.
The timeout is tracked across tabs and survives a page reload on the same
browser.
