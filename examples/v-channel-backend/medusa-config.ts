import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

/**
 * V-Channel Medusa backend configuration.
 *
 * Phase 1: Redis-backed infrastructure modules are enabled for production so
 * the event bus, workflow engine, cache and distributed locks survive
 * horizontal scaling and a separate worker process. Providers wire up Stripe
 * (payments + PPV + subscription billing), SendGrid (newsletter/email),
 * S3 (media), PostHog (analytics) and the emailpass/google/github auth flows.
 */
module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },

  // Run a dedicated worker for the Redis workflow engine in production by
  // deploying a second instance with `MEDUSA_WORKER_MODE=worker`.
  // See README "Phase 6 - Deploy & operate".
  // workerMode: process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server",

  admin: {
    disable: process.env.MEDUSA_WORKER_MODE === "worker",
  },

  modules: [
    // -- V-Channel custom modules (Phase 2/3) ------------------------------
    {
      resolve: "./src/modules/membership",
    },
    {
      resolve: "./src/modules/subscription",
      options: {
        apiKey: process.env.STRIPE_API_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        // Maps a V-Channel tier code to its Stripe Billing recurring price id
        priceByTier: {
          subscriber: process.env.STRIPE_PRICE_SUBSCRIBER,
          creator: process.env.STRIPE_PRICE_CREATOR,
        },
      },
    },
    {
      resolve: "./src/modules/creator-profile",
    },

    // -- Redis-backed infrastructure (Phase 1.1) ---------------------------
    {
      resolve: "@medusajs/medusa/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: {
        redis: {
          url: process.env.REDIS_URL,
        },
      },
    },
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/locking-redis",
            id: "locking-redis",
            is_default: true,
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
        ],
      },
    },

    // -- Payments: Stripe (Phase 1.2) --------------------------------------
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },

    // -- Notifications: SendGrid (Phase 1.2) -------------------------------
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/notification-sendgrid",
            id: "sendgrid",
            options: {
              channels: ["email"],
              api_key: process.env.SENDGRID_API_KEY,
              from: process.env.SENDGRID_FROM,
            },
          },
        ],
      },
    },

    // -- File storage: S3 (Phase 1.2) --------------------------------------
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
            },
          },
        ],
      },
    },

    // -- Analytics: PostHog (Phase 1.2) ------------------------------------
    {
      resolve: "@medusajs/medusa/analytics",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/analytics-posthog",
            id: "posthog",
            options: {
              posthogEventsKey: process.env.POSTHOG_API_KEY,
              posthogHost: process.env.POSTHOG_HOST,
            },
          },
        ],
      },
    },

    // -- Auth: emailpass + google (+ github) (Phase 1.2) -------------------
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
            options: {},
          },
          {
            resolve: "@medusajs/medusa/auth-google",
            id: "google",
            options: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              callbackUrl: process.env.GOOGLE_CALLBACK_URL,
            },
          },
          {
            resolve: "@medusajs/medusa/auth-github",
            id: "github",
            options: {
              clientId: process.env.GITHUB_CLIENT_ID,
              clientSecret: process.env.GITHUB_CLIENT_SECRET,
              callbackUrl: process.env.GITHUB_CALLBACK_URL,
            },
          },
        ],
      },
    },
  ],
})
