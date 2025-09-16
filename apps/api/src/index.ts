import Fastify from "fastify";

const app = Fastify({
  logger: true
});

app.get("/health", async () => {
  return { ok: true };
});

const port = Number(process.env.PORT ?? 3001);

const start = async () => {
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
