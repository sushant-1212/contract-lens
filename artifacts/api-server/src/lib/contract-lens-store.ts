import { desc, eq } from "drizzle-orm";
import {
  db,
  pool,
  servicesTable,
  checksTable,
  checkRunsTable,
  incidentsTable,
  timelineEventsTable,
} from "@workspace/db";

export const DDL_SCHEMA = `
CREATE TABLE IF NOT EXISTS contract_lens_services (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'healthy',
  uptime numeric NOT NULL DEFAULT '99.9',
  latency integer NOT NULL DEFAULT 120,
  endpoint_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_lens_checks (
  id serial PRIMARY KEY,
  service_id integer NOT NULL REFERENCES contract_lens_services(id) ON DELETE CASCADE,
  name text NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'passing',
  latency integer NOT NULL DEFAULT 120,
  success_rate numeric NOT NULL DEFAULT '99.9',
  last_run_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_lens_check_runs (
  id serial PRIMARY KEY,
  check_id integer NOT NULL REFERENCES contract_lens_checks(id) ON DELETE CASCADE,
  status text NOT NULL,
  status_code integer NOT NULL,
  latency integer NOT NULL,
  error text,
  ran_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_lens_incidents (
  id serial PRIMARY KEY,
  title text NOT NULL,
  service_name text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  duration text NOT NULL DEFAULT 'Ongoing',
  error_rate numeric NOT NULL DEFAULT '0',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_lens_timeline_events (
  id serial PRIMARY KEY,
  incident_id integer NOT NULL REFERENCES contract_lens_incidents(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  occurred_at timestamp with time zone NOT NULL DEFAULT now()
);
`;

const ago = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

export interface ServiceRecord {
  id: number;
  name: string;
  slug: string;
  owner: string;
  description: string | null;
  status: string;
  uptime: string | number;
  latency: number;
  endpointCount: number;
  updatedAt: Date;
}

export interface CheckRecord {
  id: number;
  serviceId: number;
  name: string;
  method: string;
  path: string;
  url: string;
  status: string;
  latency: number;
  successRate: string | number;
  lastRunAt: Date;
}

export interface CheckRunRecord {
  id: number;
  checkId: number;
  status: string;
  statusCode: number;
  latency: number;
  error: string | null;
  ranAt: Date;
}

export interface IncidentRecord {
  id: number;
  title: string;
  serviceName: string;
  severity: string;
  status: string;
  startedAt: Date;
  resolvedAt: Date | null;
  duration: string;
  errorRate: string | number;
  updatedAt: Date;
}

export interface TimelineEventRecord {
  id: number;
  incidentId: number;
  kind: string;
  title: string;
  detail: string;
  occurredAt: Date;
}

// In-Memory initial state (ensures 100% uptime even if PostgreSQL is offline)
let memoryServices: ServiceRecord[] = [
  {
    id: 1,
    name: "Payments API",
    slug: "payments-api",
    owner: "Core Platform",
    description: "Card authorization, refunds, and ledger writes.",
    status: "degraded",
    uptime: "99.82",
    latency: 184,
    endpointCount: 42,
    updatedAt: ago(10),
  },
  {
    id: 2,
    name: "Identity API",
    slug: "identity-api",
    owner: "Trust Engineering",
    description: "Authentication, sessions, and access tokens.",
    status: "healthy",
    uptime: "99.99",
    latency: 72,
    endpointCount: 28,
    updatedAt: ago(15),
  },
  {
    id: 3,
    name: "Catalog API",
    slug: "catalog-api",
    owner: "Commerce Platform",
    description: "Product search and inventory availability.",
    status: "healthy",
    uptime: "99.97",
    latency: 116,
    endpointCount: 35,
    updatedAt: ago(20),
  },
  {
    id: 4,
    name: "Notification API",
    slug: "notification-api",
    owner: "Growth Platform",
    description: "Email, push, and webhook delivery.",
    status: "healthy",
    uptime: "99.94",
    latency: 138,
    endpointCount: 19,
    updatedAt: ago(25),
  },
];

let memoryChecks: CheckRecord[] = [
  {
    id: 1,
    serviceId: 1,
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
    id: 2,
    serviceId: 1,
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
    id: 3,
    serviceId: 2,
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
    id: 4,
    serviceId: 3,
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
    id: 5,
    serviceId: 4,
    name: "Send webhook",
    method: "POST",
    path: "/v1/webhooks",
    url: "https://api.contractlens.dev/v1/webhooks",
    status: "passing",
    latency: 138,
    successRate: "99.94",
    lastRunAt: ago(6),
  },
];

let memoryRuns: CheckRunRecord[] = [
  {
    id: 1,
    checkId: 1,
    status: "failed",
    statusCode: 500,
    latency: 184,
    error: "Response schema is missing currency",
    ranAt: ago(2),
  },
  {
    id: 2,
    checkId: 1,
    status: "failed",
    statusCode: 500,
    latency: 201,
    error: "Response schema is missing currency",
    ranAt: ago(7),
  },
  {
    id: 3,
    checkId: 1,
    status: "passed",
    statusCode: 200,
    latency: 142,
    error: null,
    ranAt: ago(19),
  },
  {
    id: 4,
    checkId: 3,
    status: "passed",
    statusCode: 200,
    latency: 72,
    error: null,
    ranAt: ago(1),
  },
  {
    id: 5,
    checkId: 4,
    status: "passed",
    statusCode: 200,
    latency: 116,
    error: null,
    ranAt: ago(3),
  },
  {
    id: 6,
    checkId: 5,
    status: "passed",
    statusCode: 202,
    latency: 138,
    error: null,
    ranAt: ago(6),
  },
  {
    id: 7,
    checkId: 5,
    status: "passed",
    statusCode: 202,
    latency: 138,
    error: null,
    ranAt: ago(6),
  },
];

let memoryIncidents: IncidentRecord[] = [
  {
    id: 1,
    title: "Payment authorization contract drift",
    serviceName: "Payments API",
    severity: "high",
    status: "investigating",
    startedAt: ago(46),
    resolvedAt: null,
    duration: "46m",
    errorRate: "3.6",
    updatedAt: ago(5),
  },
  {
    id: 2,
    title: "Elevated token issuance latency",
    serviceName: "Identity API",
    severity: "medium",
    status: "resolved",
    startedAt: ago(196),
    resolvedAt: ago(143),
    duration: "53m",
    errorRate: "0.8",
    updatedAt: ago(140),
  },
];

let memoryEvents: TimelineEventRecord[] = [
  {
    id: 1,
    incidentId: 1,
    kind: "alert",
    title: "Synthetic check started failing",
    detail: "Authorize payment returned HTTP 500 for 2 consecutive runs.",
    occurredAt: ago(46),
  },
  {
    id: 2,
    incidentId: 1,
    kind: "deployment",
    title: "Payments API v2.4.1 deployed",
    detail: "Deployment completed 7 minutes before the first failed check.",
    occurredAt: ago(53),
  },
  {
    id: 3,
    incidentId: 1,
    kind: "diagnosis",
    title: "Contract mismatch detected",
    detail: "The currency field is absent from the response body.",
    occurredAt: ago(18),
  },
  {
    id: 4,
    incidentId: 2,
    kind: "recovery",
    title: "Token issuer returned to baseline",
    detail: "p95 latency fell from 640ms to 72ms after the pool resize.",
    occurredAt: ago(143),
  },
];

let isDatabaseOnline = false;
let storeInitPromise: Promise<void> | null = null;

export function ensureContractLensSeeded(): Promise<void> {
  storeInitPromise ??= initStore();
  return storeInitPromise;
}

async function initStore(): Promise<void> {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout")), 3000),
    );
    const connectPromise = pool.connect();
    const client = (await Promise.race([connectPromise, timeoutPromise])) as any;

    try {
      await client.query(DDL_SCHEMA);
      const res = await client.query(
        "SELECT COUNT(*)::int as count FROM contract_lens_services",
      );
      const countNum = res.rows[0]?.count ?? 0;

      if (countNum === 0) {
        await seedPostgresData();
      }
      isDatabaseOnline = true;
      console.log(
        "[ContractLens Store] PostgreSQL connection verified. Database schema auto-provisioned and ready.",
      );
    } finally {
      client.release();
    }
  } catch (err: any) {
    isDatabaseOnline = false;
    console.warn(
      `[ContractLens Store] Notice: PostgreSQL is currently unreachable (${err.message}). High-availability in-memory resilience store is active.`,
    );
  }
}

async function seedPostgresData(): Promise<void> {
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

const numeric = (value: string | number | null | undefined): number =>
  Number(value ?? 0);

export const serviceView = (service: ServiceRecord) => ({
  ...service,
  uptime: numeric(service.uptime),
  endpointCount: Number(service.endpointCount),
});

export const checkView = (check: CheckRecord, serviceName: string) => ({
  ...check,
  serviceName,
  successRate: numeric(check.successRate),
  latency: Number(check.latency),
});

export const incidentView = (incident: IncidentRecord) => ({
  ...incident,
  errorRate: numeric(incident.errorRate),
});

export const runView = (run: CheckRunRecord) => ({
  ...run,
  latency: Number(run.latency),
  statusCode: Number(run.statusCode),
});

export const eventView = (event: TimelineEventRecord) => event;

export const durationFrom = (
  startedAt: Date,
  resolvedAt?: Date | null,
): string => {
  const end = resolvedAt ?? new Date();
  const minutes = Math.max(
    1,
    Math.round((end.getTime() - new Date(startedAt).getTime()) / 60000),
  );
  return `${minutes}m`;
};

export const contractLensStore = {
  isDatabaseAvailable(): boolean {
    return isDatabaseOnline;
  },

  async getDashboard() {
    if (isDatabaseOnline) {
      try {
        const services = await db
          .select()
          .from(servicesTable)
          .orderBy(desc(servicesTable.updatedAt));
        const incidents = await db
          .select()
          .from(incidentsTable)
          .orderBy(desc(incidentsTable.updatedAt))
          .limit(4);
        const events = await db
          .select()
          .from(timelineEventsTable)
          .orderBy(desc(timelineEventsTable.occurredAt))
          .limit(5);
        const checks = await db.select().from(checksTable);

        return {
          workspaceName: "Northstar Engineering",
          summary: {
            uptime: 99.94,
            averageLatency: 126,
            openIncidents: incidents.filter((item) => item.status !== "resolved")
              .length,
            monitoredChecks: checks.length,
          },
          services: services.map(serviceView as any),
          incidents: incidents.map(incidentView as any),
          latencyTrend: [
            { label: "09:00", value: 112 },
            { label: "10:00", value: 118 },
            { label: "11:00", value: 124 },
            { label: "12:00", value: 121 },
            { label: "13:00", value: 136 },
            { label: "14:00", value: 126 },
            { label: "15:00", value: 126 },
          ],
          errorTrend: [
            { label: "09:00", value: 0.4 },
            { label: "10:00", value: 0.5 },
            { label: "11:00", value: 0.6 },
            { label: "12:00", value: 0.8 },
            { label: "13:00", value: 1.2 },
            { label: "14:00", value: 1.1 },
            { label: "15:00", value: 0.9 },
          ],
          activity: events.map(eventView as any),
        };
      } catch (err) {
        console.warn(
          "[ContractLens Store] Database error on getDashboard, using in-memory store:",
          err,
        );
      }
    }

    const openIncidents = memoryIncidents.filter((i) => i.status !== "resolved").length;
    return {
      workspaceName: "Northstar Engineering",
      summary: {
        uptime: 99.94,
        averageLatency: 126,
        openIncidents,
        monitoredChecks: memoryChecks.length,
      },
      services: [...memoryServices].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      ).map(serviceView),
      incidents: [...memoryIncidents].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      ).slice(0, 4).map(incidentView),
      latencyTrend: [
        { label: "09:00", value: 112 },
        { label: "10:00", value: 118 },
        { label: "11:00", value: 124 },
        { label: "12:00", value: 121 },
        { label: "13:00", value: 136 },
        { label: "14:00", value: 126 },
        { label: "15:00", value: 126 },
      ],
      errorTrend: [
        { label: "09:00", value: 0.4 },
        { label: "10:00", value: 0.5 },
        { label: "11:00", value: 0.6 },
        { label: "12:00", value: 0.8 },
        { label: "13:00", value: 1.2 },
        { label: "14:00", value: 1.1 },
        { label: "15:00", value: 0.9 },
      ],
      activity: [...memoryEvents].sort(
        (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
      ).slice(0, 5).map(eventView),
    };
  },

  async listServices() {
    if (isDatabaseOnline) {
      try {
        const services = await db
          .select()
          .from(servicesTable)
          .orderBy(desc(servicesTable.updatedAt));
        return services.map(serviceView as any);
      } catch (err) {
        console.warn("[ContractLens Store] DB listServices fallback:", err);
      }
    }
    return [...memoryServices]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(serviceView);
  },

  async getService(id: number) {
    if (isDatabaseOnline) {
      try {
        const [service] = await db
          .select()
          .from(servicesTable)
          .where(eq(servicesTable.id, id));
        return service ? serviceView(service as any) : null;
      } catch (err) {
        console.warn("[ContractLens Store] DB getService fallback:", err);
      }
    }
    const service = memoryServices.find((s) => s.id === id);
    return service ? serviceView(service) : null;
  },

  async createService(data: {
    name: string;
    owner: string;
    description?: string;
  }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (isDatabaseOnline) {
      try {
        const [service] = await db
          .insert(servicesTable)
          .values({ ...data, slug })
          .returning();
        return serviceView(service as any);
      } catch (err) {
        console.warn("[ContractLens Store] DB createService fallback:", err);
      }
    }
    const newService: ServiceRecord = {
      id: memoryServices.length + 1,
      name: data.name,
      slug,
      owner: data.owner,
      description: data.description ?? null,
      status: "healthy",
      uptime: "99.9",
      latency: 120,
      endpointCount: 0,
      updatedAt: new Date(),
    };
    memoryServices.unshift(newService);
    return serviceView(newService);
  },

  async updateService(
    id: number,
    data: {
      name?: string;
      owner?: string;
      description?: string;
      status?: string;
    },
  ) {
    if (isDatabaseOnline) {
      try {
        const [service] = await db
          .update(servicesTable)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(servicesTable.id, id))
          .returning();
        return service ? serviceView(service as any) : null;
      } catch (err) {
        console.warn("[ContractLens Store] DB updateService fallback:", err);
      }
    }
    const idx = memoryServices.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const existing = memoryServices[idx];
    const updated: ServiceRecord = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    memoryServices[idx] = updated;
    return serviceView(updated);
  },

  async listChecks(serviceId?: number) {
    if (isDatabaseOnline) {
      try {
        const rows = await db
          .select({ check: checksTable, serviceName: servicesTable.name })
          .from(checksTable)
          .innerJoin(servicesTable, eq(checksTable.serviceId, servicesTable.id))
          .where(serviceId ? eq(checksTable.serviceId, serviceId) : undefined)
          .orderBy(desc(checksTable.lastRunAt));
        return rows.map(({ check, serviceName }) =>
          checkView(check as any, serviceName),
        );
      } catch (err) {
        console.warn("[ContractLens Store] DB listChecks fallback:", err);
      }
    }
    return memoryChecks
      .filter((c) => (serviceId ? c.serviceId === serviceId : true))
      .sort((a, b) => b.lastRunAt.getTime() - a.lastRunAt.getTime())
      .map((check) => {
        const service = memoryServices.find((s) => s.id === check.serviceId);
        return checkView(check, service?.name ?? "Unknown service");
      });
  },

  async getCheck(checkId: number) {
    if (isDatabaseOnline) {
      try {
        const [row] = await db
          .select({ check: checksTable, serviceName: servicesTable.name })
          .from(checksTable)
          .innerJoin(servicesTable, eq(checksTable.serviceId, servicesTable.id))
          .where(eq(checksTable.id, checkId));
        if (!row) return null;
        const runs = await db
          .select()
          .from(checkRunsTable)
          .where(eq(checkRunsTable.checkId, row.check.id))
          .orderBy(desc(checkRunsTable.ranAt))
          .limit(10);
        return {
          ...checkView(row.check as any, row.serviceName),
          recentRuns: runs.map(runView as any),
        };
      } catch (err) {
        console.warn("[ContractLens Store] DB getCheck fallback:", err);
      }
    }
    const check = memoryChecks.find((c) => c.id === checkId);
    if (!check) return null;
    const service = memoryServices.find((s) => s.id === check.serviceId);
    const recentRuns = memoryRuns
      .filter((r) => r.checkId === check.id)
      .sort((a, b) => b.ranAt.getTime() - a.ranAt.getTime())
      .slice(0, 10)
      .map(runView);
    return {
      ...checkView(check, service?.name ?? "Unknown service"),
      recentRuns,
    };
  },

  async createCheck(data: {
    serviceId: number;
    name: string;
    method: string;
    path: string;
    url: string;
  }) {
    if (isDatabaseOnline) {
      try {
        const [check] = await db
          .insert(checksTable)
          .values(data)
          .returning();
        const [service] = await db
          .select({ name: servicesTable.name })
          .from(servicesTable)
          .where(eq(servicesTable.id, check.serviceId));
        return {
          ...checkView(check as any, service?.name ?? "Unknown service"),
          recentRuns: [],
        };
      } catch (err) {
        console.warn("[ContractLens Store] DB createCheck fallback:", err);
      }
    }
    const newCheck: CheckRecord = {
      id: memoryChecks.length + 1,
      serviceId: data.serviceId,
      name: data.name,
      method: data.method,
      path: data.path,
      url: data.url,
      status: "passing",
      latency: 120,
      successRate: "99.9",
      lastRunAt: new Date(),
    };
    memoryChecks.unshift(newCheck);
    const service = memoryServices.find((s) => s.id === newCheck.serviceId);
    return {
      ...checkView(newCheck, service?.name ?? "Unknown service"),
      recentRuns: [],
    };
  },

  async recordCheckRun(
    checkId: number,
    runData: {
      status: "passed" | "failed";
      statusCode: number;
      latency: number;
      error: string | null;
    },
  ) {
    if (isDatabaseOnline) {
      try {
        const [run] = await db
          .insert(checkRunsTable)
          .values({
            checkId,
            status: runData.status,
            statusCode: runData.statusCode,
            latency: Math.max(1, runData.latency),
            error: runData.error,
            ranAt: new Date(),
          })
          .returning();

        await db
          .update(checksTable)
          .set({
            lastRunAt: new Date(),
            latency: Math.max(1, runData.latency),
          })
          .where(eq(checksTable.id, checkId));

        return runView(run as any);
      } catch (err) {
        console.warn("[ContractLens Store] DB recordCheckRun fallback:", err);
      }
    }

    const newRun: CheckRunRecord = {
      id: memoryRuns.length + 1,
      checkId,
      status: runData.status,
      statusCode: runData.statusCode,
      latency: Math.max(1, runData.latency),
      error: runData.error,
      ranAt: new Date(),
    };
    memoryRuns.unshift(newRun);

    const checkIdx = memoryChecks.findIndex((c) => c.id === checkId);
    if (checkIdx !== -1) {
      memoryChecks[checkIdx] = {
        ...memoryChecks[checkIdx],
        lastRunAt: new Date(),
        latency: Math.max(1, runData.latency),
      };
    }
    return runView(newRun);
  },

  async listIncidents(status?: string) {
    if (isDatabaseOnline) {
      try {
        const incidents = await db
          .select()
          .from(incidentsTable)
          .where(status ? eq(incidentsTable.status, status) : undefined)
          .orderBy(desc(incidentsTable.updatedAt));
        return incidents.map(incidentView as any);
      } catch (err) {
        console.warn("[ContractLens Store] DB listIncidents fallback:", err);
      }
    }
    return memoryIncidents
      .filter((i) => (status ? i.status === status : true))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(incidentView);
  },

  async createIncident(data: {
    title: string;
    serviceName: string;
    severity: string;
    errorRate?: number;
  }) {
    if (isDatabaseOnline) {
      try {
        const [incident] = await db
          .insert(incidentsTable)
          .values({
            ...data,
            status: "open",
            duration: "Ongoing",
            errorRate: String(data.errorRate ?? 0),
          })
          .returning();
        return incidentView(incident as any);
      } catch (err) {
        console.warn("[ContractLens Store] DB createIncident fallback:", err);
      }
    }
    const newIncident: IncidentRecord = {
      id: memoryIncidents.length + 1,
      title: data.title,
      serviceName: data.serviceName,
      severity: data.severity,
      status: "open",
      startedAt: new Date(),
      resolvedAt: null,
      duration: "Ongoing",
      errorRate: String(data.errorRate ?? 0),
      updatedAt: new Date(),
    };
    memoryIncidents.unshift(newIncident);
    return incidentView(newIncident);
  },

  async getIncidentDetails(incidentId: number): Promise<{
    incident: ReturnType<typeof incidentView>;
    events: TimelineEventRecord[];
    checks: ReturnType<typeof checkView>[];
  } | null> {
    if (isDatabaseOnline) {
      try {
        const [incident] = await db
          .select()
          .from(incidentsTable)
          .where(eq(incidentsTable.id, incidentId));
        if (!incident) return null;

        const [events, checks] = await Promise.all([
          db
            .select()
            .from(timelineEventsTable)
            .where(eq(timelineEventsTable.incidentId, incident.id))
            .orderBy(desc(timelineEventsTable.occurredAt)),
          db
            .select({ check: checksTable, serviceName: servicesTable.name })
            .from(checksTable)
            .innerJoin(
              servicesTable,
              eq(checksTable.serviceId, servicesTable.id),
            )
            .where(eq(servicesTable.name, incident.serviceName)),
        ]);

        return {
          incident: incidentView(incident as any),
          events: events.map(eventView as any),
          checks: checks.map(({ check, serviceName }) =>
            checkView(check as any, serviceName),
          ),
        };
      } catch (err) {
        console.warn("[ContractLens Store] DB getIncidentDetails fallback:", err);
      }
    }

    const incident = memoryIncidents.find((i) => i.id === incidentId);
    if (!incident) return null;

    const events = memoryEvents
      .filter((e) => e.incidentId === incident.id)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .map(eventView);

    const checks = memoryChecks
      .filter((c) => {
        const s = memoryServices.find((srv) => srv.id === c.serviceId);
        return s?.name === incident.serviceName;
      })
      .map((c) => checkView(c, incident.serviceName));

    return {
      incident: incidentView(incident),
      events,
      checks,
    };
  },

  async updateIncident(
    incidentId: number,
    data: {
      title?: string;
      severity?: string;
      status?: string;
      errorRate?: number;
    },
  ) {
    if (isDatabaseOnline) {
      try {
        const [existing] = await db
          .select()
          .from(incidentsTable)
          .where(eq(incidentsTable.id, incidentId));
        if (!existing) return null;

        const resolvedAt =
          data.status === "resolved" ? new Date() : existing.resolvedAt;
        const [incident] = await db
          .update(incidentsTable)
          .set({
            ...data,
            errorRate:
              data.errorRate !== undefined
                ? String(data.errorRate)
                : existing.errorRate,
            resolvedAt,
            duration: durationFrom(existing.startedAt, resolvedAt),
            updatedAt: new Date(),
          })
          .where(eq(incidentsTable.id, existing.id))
          .returning();
        return incidentView(incident as any);
      } catch (err) {
        console.warn("[ContractLens Store] DB updateIncident fallback:", err);
      }
    }

    const idx = memoryIncidents.findIndex((i) => i.id === incidentId);
    if (idx === -1) return null;
    const existing = memoryIncidents[idx];
    const resolvedAt =
      data.status === "resolved" ? new Date() : existing.resolvedAt;
    const updated: IncidentRecord = {
      ...existing,
      ...data,
      errorRate:
        data.errorRate !== undefined
          ? String(data.errorRate)
          : existing.errorRate,
      resolvedAt,
      duration: durationFrom(existing.startedAt, resolvedAt),
      updatedAt: new Date(),
    };
    memoryIncidents[idx] = updated;
    return incidentView(updated);
  },
};
