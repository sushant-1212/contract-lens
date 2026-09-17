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

  await t.test("GET /api/dashboard returns 200 with complete telemetry payload", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`);
    assert.equal(res.status, 200, "Dashboard endpoint must succeed with HTTP 200");
    const data: any = await res.json();
    assert.ok(data.workspaceName, "Dashboard must contain workspaceName");
    assert.ok(Array.isArray(data.services), "Dashboard must contain services list");
    assert.ok(Array.isArray(data.incidents), "Dashboard must contain incidents list");
    assert.ok(typeof data.summary?.uptime === "number", "Summary must contain uptime number");
    assert.ok(data.services.length > 0, "Dashboard must have seeded services");
  });

  await t.test("GET /api/services returns 200 with service registry", async () => {
    const res = await fetch(`${baseUrl}/api/services`);
    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 4);
    assert.ok(data.find((s: any) => s.slug === "payments-api"));
  });

  await t.test("GET /api/checks returns 200 with synthetic checks list", async () => {
    const res = await fetch(`${baseUrl}/api/checks`);
    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 5);
  });

  await t.test("POST /api/checks/1 executes probe and returns check run", async () => {
    const res = await fetch(`${baseUrl}/api/checks/1`, { method: "POST" });
    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.ok(data.id);
    assert.equal(data.checkId, 1);
    assert.ok(data.latency > 0);
  });

  await t.test("POST /api/incidents/1/diagnose returns root-cause analysis", async () => {
    const res = await fetch(`${baseUrl}/api/incidents/1/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.ok(data.summary);
    assert.ok(typeof data.confidence === "number");
    assert.ok(data.probableCause);
    assert.ok(Array.isArray(data.recommendations));
    assert.ok(Array.isArray(data.evidence));
  });

  await t.test("teardown server", async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
