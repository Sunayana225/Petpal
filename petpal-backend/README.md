# Legacy backend directory

The maintained API lives in `apps/backend`. This directory preserves source and deployment notes from the original GitHub history. Its npm scripts delegate to the maintained workspace so existing directory-based start/build commands use the hardened API.

Install from the repository root with `npm ci`, then run `npm run build --workspace @petpal/backend`. Installations started in this directory bootstrap the root workspace through postinstall. Run the API with `npm run start` here or the production instructions in [OPERATIONS.md](../docs/OPERATIONS.md).

Legacy `src` files and deployment guides are historical references. Do not build or deploy them independently. Persistent sessions and atomic quotas use SQLite and require a persistent volume; the old Vercel serverless config is not a supported deployment for this architecture. Use a persistent Node service and configure production HTTPS URLs, strong secrets, and a durable DB_PATH before rollout.
