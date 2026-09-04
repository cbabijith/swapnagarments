import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { getContainer } from "./core/container";

const { env, logger } = getContainer();
const app = createApp();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info("Backend listening", {
    port: info.port,
    url: `http://localhost:${info.port}`,
    auth: `http://localhost:${info.port}/auth`,
    api: `http://localhost:${info.port}/api/v1`,
    webOrigin: env.WEB_ORIGIN,
  });
});
