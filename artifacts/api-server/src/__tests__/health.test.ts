import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../app";

test("Health Check & Core Endpoints", async (t) => {
  let server: Server;
  let baseUrl: string;

  await t.test("starts server on random port", async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
    assert.ok(baseUrl, "Server should have a valid baseUrl");
  });

  await t.test("GET /healthz returns healthy status", async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.equal(data.status, "healthy");
    assert.ok(typeof data.uptime === "number");
    assert.ok(data.timestamp);
  });

  await t.test("GET /api/healthz returns ok status", async () => {
    const res = await fetch(`${baseUrl}/api/healthz`);
    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.equal(data.status, "ok");
  });

  await t.test("GET / serves frontend index.html SPA entrypoint", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("<html") || text.includes("<!DOCTYPE html>"), "Should serve HTML document");
  });

  await t.test("GET /services serves SPA index.html fallback for client routing", async () => {
    const res = await fetch(`${baseUrl}/services`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("<html") || text.includes("<!DOCTYPE html>"), "Should serve SPA fallback");
  });

  await t.test("teardown server", async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
