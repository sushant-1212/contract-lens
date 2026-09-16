import { count } from "drizzle-orm";
import {
  db,
  servicesTable,
  checksTable,
  checkRunsTable,
  incidentsTable,
  timelineEventsTable,
} from "@workspace/db";

let seedPromise: Promise<void> | null = null;

const ago = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000);

export function ensureContractLensSeeded(): Promise<void> {
  seedPromise ??= seedContractLens();
  return seedPromise;
}

async function seedContractLens(): Promise<void> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(servicesTable);

  if (Number(value) > 0) {
    return;
  }

  const [payments, identity, catalog, notifications] = await db
    .insert(servicesTable)
    .values([
      {
        name: "Payments API",
        slug: "payments-api",
        owner: "Core Platform",
        description: "Card authorization, refunds, and ledger writes.",
        status: "degraded",
        uptime: "99.82",
        latency: 184,
        endpointCount: 42,
      },
      {
        name: "Identity API",
        slug: "identity-api",
        owner: "Trust Engineering",
        description: "Authentication, sessions, and access tokens.",
        status: "healthy",
        uptime: "99.99",
        latency: 72,
        endpointCount: 28,
      },
      {
        name: "Catalog API",
        slug: "catalog-api",
        owner: "Commerce Platform",
        description: "Product search and inventory availability.",
        status: "healthy",
        uptime: "99.97",
        latency: 116,
        endpointCount: 35,
      },
      {
        name: "Notification API",
        slug: "notification-api",
        owner: "Growth Platform",
        description: "Email, push, and webhook delivery.",
        status: "healthy",
        uptime: "99.94",
        latency: 138,
        endpointCount: 19,
      },
    ])
    .returning();

  const [charge, token, search, email, webhook] = await db
    .insert(checksTable)
    .values([
      {
        serviceId: payments.id,
        name: "Authorize payment",
        method: "POST",
        path: "/v1/charges",
        url: "https://api.contractlens.dev/v1/charges",
        status: "failing",
        latency: 184,
        successRate: "96.4",
        lastRunAt: ago(2),
      },
      {
        serviceId: payments.id,
        name: "Refund payment",
        method: "POST",
        path: "/v1/refunds",
        url: "https://api.contractlens.dev/v1/refunds",
        status: "passing",
        latency: 142,
        successRate: "99.8",
        lastRunAt: ago(4),
      },
      {
        serviceId: identity.id,
        name: "Issue access token",
        method: "POST",
        path: "/v1/oauth/token",
        url: "https://api.contractlens.dev/v1/oauth/token",
        status: "passing",
        latency: 72,
        successRate: "99.99",
        lastRunAt: ago(1),
      },
      {
        serviceId: catalog.id,
        name: "Search products",
        method: "GET",
        path: "/v1/products/search",
        url: "https://api.contractlens.dev/v1/products/search",
        status: "passing",
        latency: 116,
        successRate: "99.97",
        lastRunAt: ago(3),
      },
      {
        serviceId: notifications.id,
        name: "Send webhook",
        method: "POST",
        path: "/v1/webhooks",
        url: "https://api.contractlens.dev/v1/webhooks",
        status: "passing",
        latency: 138,
        successRate: "99.94",
        lastRunAt: ago(6),
      },
    ])
    .returning();

  await db.insert(checkRunsTable).values([
    {
      checkId: charge.id,
      status: "failed",
      statusCode: 500,
      latency: 184,
      error: "Response schema is missing currency",
      ranAt: ago(2),
    },
    {
      checkId: charge.id,
      status: "failed",
      statusCode: 500,
      latency: 201,
      error: "Response schema is missing currency",
      ranAt: ago(7),
    },
    {
      checkId: charge.id,
      status: "passed",
      statusCode: 200,
      latency: 142,
      ranAt: ago(19),
    },
    {
      checkId: token.id,
      status: "passed",
      statusCode: 200,
      latency: 72,
      ranAt: ago(1),
    },
    {
      checkId: search.id,
      status: "passed",
      statusCode: 200,
      latency: 116,
      ranAt: ago(3),
    },
    {
      checkId: email.id,
      status: "passed",
      statusCode: 202,
      latency: 138,
      ranAt: ago(6),
    },
    {
      checkId: webhook.id,
      status: "passed",
      statusCode: 202,
      latency: 138,
      ranAt: ago(6),
    },
  ]);

  const [incident] = await db
    .insert(incidentsTable)
    .values({
      title: "Payment authorization contract drift",
      serviceName: payments.name,
      severity: "high",
      status: "investigating",
      startedAt: ago(46),
      duration: "46m",
      errorRate: "3.6",
    })
    .returning();

  const [resolved] = await db
    .insert(incidentsTable)
    .values({
      title: "Elevated token issuance latency",
      serviceName: identity.name,
      severity: "medium",
      status: "resolved",
      startedAt: ago(196),
      resolvedAt: ago(143),
      duration: "53m",
      errorRate: "0.8",
    })
    .returning();

  await db.insert(timelineEventsTable).values([
    {
      incidentId: incident.id,
      kind: "alert",
      title: "Synthetic check started failing",
      detail: "Authorize payment returned HTTP 500 for 2 consecutive runs.",
      occurredAt: ago(46),
    },
    {
      incidentId: incident.id,
      kind: "deployment",
      title: "Payments API v2.4.1 deployed",
      detail: "Deployment completed 7 minutes before the first failed check.",
      occurredAt: ago(53),
    },
    {
      incidentId: incident.id,
      kind: "diagnosis",
      title: "Contract mismatch detected",
      detail: "The currency field is absent from the response body.",
      occurredAt: ago(18),
    },
    {
      incidentId: resolved.id,
      kind: "recovery",
      title: "Token issuer returned to baseline",
      detail: "p95 latency fell from 640ms to 72ms after the pool resize.",
      occurredAt: ago(143),
    },
  ]);
}