import { buildApp } from "./app.js";

const app = buildApp();

const start = async () => {
  try {
    await app.listen({ host: "127.0.0.1", port: 4000 });
    app.log.info("Bridge listening on http://127.0.0.1:4000");
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
