import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import OpenAI from "openai";
import { db } from "@workspace/db";
import {
  checkRunsTable,
  checksTable,
  incidentsTable,
  servicesTable,
  timelineEventsTable,
} from "@workspace/db";
import {
  CreateCheckBody,
  CreateIncidentBody,
  CreateServiceBody,
  CreateServiceResponse,
  DiagnoseIncidentResponse,
  DiagnoseIncidentParams,
  GetCheckParams,
  GetCheckResponse,
  GetDashboardResponse,
  GetIncidentParams,
  GetIncidentResponse,
  GetServiceParams,
  GetServiceResponse,
  ListChecksQueryParams,
  ListChecksResponse,
  ListIncidentsQueryParams,
  ListIncidentsResponse,
  ListServicesResponse,
  RunCheckParams,
  RunCheckResponse,
  UpdateIncidentBody,
  UpdateIncidentResponse,
  UpdateIncidentParams,
  UpdateServiceBody,
  UpdateServiceParams,
  UpdateServiceResponse,
} from "@workspace/api-zod";
import { ensureContractLensSeeded } from "../lib/contract-lens-seed";

const router: IRouter = Router();

const numeric = (value: string | number | null | undefined): number =>
  Number(value ?? 0);

const serviceView = (service: typeof servicesTable.$inferSelect) => ({
  ...service,
  uptime: numeric(service.uptime),
  endpointCount: Number(service.endpointCount),
});

const checkView = (
  check: typeof checksTable.$inferSelect,
  serviceName: string,
) => ({
  ...check,
  serviceName,
  successRate: numeric(check.successRate),
  latency: Number(check.latency),
});

const incidentView = (incident: typeof incidentsTable.$inferSelect) => ({
  ...incident,
  errorRate: numeric(incident.errorRate),
});

const runView = (run: typeof checkRunsTable.$inferSelect) => ({
  ...run,
  latency: Number(run.latency),
  statusCode: Number(run.statusCode),
});

const eventView = (event: typeof timelineEventsTable.$inferSelect) => event;

const durationFrom = (startedAt: Date, resolvedAt?: Date | null): string => {
  const end = resolvedAt ?? new Date();
  const minutes = Math.max(
    1,
    Math.round((end.getTime() - startedAt.getTime()) / 60000),
  );
  return `${minutes}m`;
};

router.get("/dashboard", async (_req, res): Promise<void> => {
  await ensureContractLensSeeded();
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

  res.json(
    GetDashboardResponse.parse({
      workspaceName: "Northstar Engineering",
      summary: {
        uptime: 99.94,
        averageLatency: 126,
        openIncidents: incidents.filter((item) => item.status !== "resolved")
          .length,
        monitoredChecks: checks.length,
      },
      services: services.map(serviceView),
      incidents: incidents.map(incidentView),
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
      activity: events.map(eventView),
    }),
  );
});

router.get("/services", async (_req, res): Promise<void> => {
  await ensureContractLensSeeded();
  const services = await db
    .select()
    .from(servicesTable)
    .orderBy(desc(servicesTable.updatedAt));
  res.json(ListServicesResponse.parse(services.map(serviceView)));
});

router.post("/services", async (req, res): Promise<void> => {
  const body = CreateServiceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const slug = body.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [service] = await db
    .insert(servicesTable)
    .values({ ...body.data, slug })
    .returning();
  res.status(201).json(CreateServiceResponse.parse(serviceView(service)));
});

router.get("/services/:serviceId", async (req, res): Promise<void> => {
  const params = GetServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureContractLensSeeded();
  const [service] = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.id, params.data.serviceId));
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(GetServiceResponse.parse(serviceView(service)));
});

router.patch("/services/:serviceId", async (req, res): Promise<void> => {
  const params = UpdateServiceParams.safeParse(req.params);
  const body = UpdateServiceBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid service update" });
    return;
  }
  const [service] = await db
    .update(servicesTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(servicesTable.id, params.data.serviceId))
    .returning();
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(UpdateServiceResponse.parse(serviceView(service)));
});

router.get("/checks", async (req, res): Promise<void> => {
  const query = ListChecksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  await ensureContractLensSeeded();
  const rows = await db
    .select({ check: checksTable, serviceName: servicesTable.name })
    .from(checksTable)
    .innerJoin(servicesTable, eq(checksTable.serviceId, servicesTable.id))
    .where(
      query.data.serviceId
        ? eq(checksTable.serviceId, query.data.serviceId)
        : undefined,
    )
    .orderBy(desc(checksTable.lastRunAt));
  res.json(
    ListChecksResponse.parse(
      rows.map(({ check, serviceName }) => checkView(check, serviceName)),
    ),
  );
});

router.post("/checks", async (req, res): Promise<void> => {
  const body = CreateCheckBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [check] = await db
    .insert(checksTable)
    .values(body.data)
    .returning();
  const [service] = await db
    .select({ name: servicesTable.name })
    .from(servicesTable)
    .where(eq(servicesTable.id, check.serviceId));
  res.status(201).json(
    GetCheckResponse.parse({
      ...checkView(check, service?.name ?? "Unknown service"),
      recentRuns: [],
    }),
  );
});

router.get("/checks/:checkId", async (req, res): Promise<void> => {
  const params = GetCheckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureContractLensSeeded();
  const [row] = await db
    .select({ check: checksTable, serviceName: servicesTable.name })
    .from(checksTable)
    .innerJoin(servicesTable, eq(checksTable.serviceId, servicesTable.id))
    .where(eq(checksTable.id, params.data.checkId));
  if (!row) {
    res.status(404).json({ error: "Check not found" });
    return;
  }
  const runs = await db
    .select()
    .from(checkRunsTable)
    .where(eq(checkRunsTable.checkId, row.check.id))
    .orderBy(desc(checkRunsTable.ranAt))
    .limit(10);
  res.json(
    GetCheckResponse.parse({
      ...checkView(row.check, row.serviceName),
      recentRuns: runs.map(runView),
    }),
  );
});

router.post("/checks/:checkId", async (req, res): Promise<void> => {
  const params = RunCheckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureContractLensSeeded();
  const [check] = await db
    .select()
    .from(checksTable)
    .where(eq(checksTable.id, params.data.checkId));
  if (!check) {
    res.status(404).json({ error: "Check not found" });
    return;
  }
  const startTime = Date.now();
  let statusCode = 200;
  let status: "passed" | "failed" = "passed";
  let errorMsg: string | null = null;
  let measuredLatency = check.latency;

  const isInternalMock =
    check.url.includes("api.contractlens.dev") ||
    check.url.includes("example.com");

  if (
    !isInternalMock &&
    (check.url.startsWith("http://") || check.url.startsWith("https://"))
  ) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const fetchRes = await fetch(check.url, {
        method: check.method,
        signal: controller.signal,
        headers: {
          "User-Agent": "ContractLens-Monitor/1.0",
          Accept: "application/json, text/plain, */*",
        },
      });
      clearTimeout(timeoutId);
      measuredLatency = Date.now() - startTime;
      statusCode = fetchRes.status;
      if (statusCode >= 400) {
        status = "failed";
        errorMsg = `HTTP status code ${statusCode} ${fetchRes.statusText}`;
      }
    } catch (err: any) {
      measuredLatency = Date.now() - startTime;
      statusCode = 500;
      status = "failed";
      errorMsg =
        err.name === "AbortError"
          ? "Request timed out after 5000ms"
          : (err.message || "Connection failed");
    }
  } else {
    const failed = check.status === "failing";
    status = failed ? "failed" : "passed";
    statusCode = failed ? 500 : 200;
    measuredLatency = Math.max(
      20,
      check.latency + Math.floor(Math.random() * 16) - 8,
    );
    errorMsg = failed
      ? "Response schema contract violation: missing mandatory 'currency' field"
      : null;
  }

  const [run] = await db
    .insert(checkRunsTable)
    .values({
      checkId: check.id,
      status,
      statusCode,
      latency: Math.max(1, measuredLatency),
      error: errorMsg,
      ranAt: new Date(),
    })
    .returning();

  await db
    .update(checksTable)
    .set({
      lastRunAt: new Date(),
      latency: Math.max(1, measuredLatency),
    })
    .where(eq(checksTable.id, check.id));

  res.json(RunCheckResponse.parse(runView(run)));
});

router.get("/incidents", async (req, res): Promise<void> => {
  const query = ListIncidentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  await ensureContractLensSeeded();
  const incidents = await db
    .select()
    .from(incidentsTable)
    .where(
      query.data.status
        ? eq(incidentsTable.status, query.data.status)
        : undefined,
    )
    .orderBy(desc(incidentsTable.updatedAt));
  res.json(ListIncidentsResponse.parse(incidents.map(incidentView)));
});

router.post("/incidents", async (req, res): Promise<void> => {
  const body = CreateIncidentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [incident] = await db
    .insert(incidentsTable)
    .values({
      ...body.data,
      status: "open",
      duration: "Ongoing",
      errorRate: String(body.data.errorRate ?? 0),
    })
    .returning();
  res.status(201).json(ListIncidentsResponse.parse([incidentView(incident)]).at(0));
});

router.get("/incidents/:incidentId", async (req, res): Promise<void> => {
  const params = GetIncidentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureContractLensSeeded();
  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.id, params.data.incidentId));
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const [events, checks] = await Promise.all([
    db
      .select()
      .from(timelineEventsTable)
      .where(eq(timelineEventsTable.incidentId, incident.id))
      .orderBy(desc(timelineEventsTable.occurredAt)),
    db
      .select({ check: checksTable, serviceName: servicesTable.name })
      .from(checksTable)
      .innerJoin(servicesTable, eq(checksTable.serviceId, servicesTable.id))
      .where(eq(servicesTable.name, incident.serviceName)),
  ]);
  res.json(
    GetIncidentResponse.parse({
      ...incidentView(incident),
      timeline: events.map(eventView),
      affectedChecks: checks.map(({ check, serviceName }) =>
        checkView(check, serviceName),
      ),
    }),
  );
});

router.patch("/incidents/:incidentId", async (req, res): Promise<void> => {
  const params = UpdateIncidentParams.safeParse(req.params);
  const body = UpdateIncidentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid incident update" });
    return;
  }
  const [existing] = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.id, params.data.incidentId));
  if (!existing) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const resolvedAt =
    body.data.status === "resolved" ? new Date() : existing.resolvedAt;
  const [incident] = await db
    .update(incidentsTable)
    .set({
      ...body.data,
      resolvedAt,
      duration: durationFrom(existing.startedAt, resolvedAt),
      updatedAt: new Date(),
    })
    .where(eq(incidentsTable.id, existing.id))
    .returning();
  res.json(UpdateIncidentResponse.parse(incidentView(incident)));
});

router.post("/incidents/:incidentId/diagnose", async (req, res): Promise<void> => {
  const params = DiagnoseIncidentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureContractLensSeeded();
  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.id, params.data.incidentId));
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const [events, checks] = await Promise.all([
    db
      .select()
      .from(timelineEventsTable)
      .where(eq(timelineEventsTable.incidentId, incident.id))
      .orderBy(desc(timelineEventsTable.occurredAt)),
    db
      .select({ check: checksTable, serviceName: servicesTable.name })
      .from(checksTable)
      .innerJoin(servicesTable, eq(checksTable.serviceId, servicesTable.id))
      .where(eq(servicesTable.name, incident.serviceName)),
  ]);

  const generateSreDiagnosis = () => {
    const failingCheck = checks.find((c) => c.check.status === "failing");
    const deployEvent = events.find(
      (e) =>
        e.kind === "deployment" ||
        e.title.toLowerCase().includes("deploy"),
    );
    const alertEvent = events.find(
      (e) =>
        e.kind === "alert" ||
        e.title.toLowerCase().includes("alert"),
    );

    const probableCause = failingCheck
      ? `Contract drift detected on endpoint ${failingCheck.check.method} ${failingCheck.check.path}: response payload violated contract schema (missing mandatory 'currency' field). Root cause correlates directly with recent deployment.`
      : `Elevated error rate (${incident.errorRate}%) and latency degradation detected across ${incident.serviceName}. Service health transitioned to degraded state under current load.`;

    const recommendations = [
      deployEvent
        ? `Assess rolling back deployment (${deployEvent.title}) to restore API schema compatibility.`
        : `Verify latest upstream release commits for breaking schema changes or serializer regressions.`,
      failingCheck
        ? `Patch response serializer for ${failingCheck.check.path} to re-introduce the expected contract fields.`
        : `Inspect downstream database pool metrics and scale service replica count.`,
      "Enforce automated contract regression tests and OpenAPI schema validation gates in CI/CD.",
      `Notify downstream consumer teams subscribing to ${incident.serviceName} of active mitigation.`,
    ];

    const evidence: Array<{ label: string; detail: string; source: string }> = [];

    if (failingCheck) {
      evidence.push({
        label: "Failing Contract Check",
        detail: `Endpoint ${failingCheck.check.method} ${failingCheck.check.path} is failing validation (latency: ${failingCheck.check.latency}ms, success rate: ${failingCheck.check.successRate}%).`,
        source: "ContractLens Synthetic Check Engine",
      });
    }

    if (deployEvent) {
      evidence.push({
        label: deployEvent.title,
        detail: deployEvent.detail,
        source: "CI/CD Deployment Pipeline",
      });
    }

    if (alertEvent) {
      evidence.push({
        label: alertEvent.title,
        detail: alertEvent.detail,
        source: "Production Alerting Pipeline",
      });
    }

    evidence.push({
      label: "Service Telemetry",
      detail: `Service ${incident.serviceName} experiencing ${incident.errorRate}% error rate over ${incident.duration}.`,
      source: "APM Metrics Telemetry",
    });

    return DiagnoseIncidentResponse.parse({
      summary: `Automated SRE Root-Cause Analysis for ${incident.title} on ${incident.serviceName}: API contract drift detected following release.`,
      confidence: 94,
      probableCause,
      recommendations,
      evidence,
      generatedAt: new Date(),
    });
  };

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    req.log.info(
      "OPENAI_API_KEY not configured; using deterministic SRE rule engine diagnosis",
    );
    res.json(generateSreDiagnosis());
    return;
  }

  try {
    const isGroqKey = apiKey.startsWith("gsk_");
    const openai = new OpenAI({
      apiKey,
      ...(isGroqKey ? { baseURL: "https://api.groq.com/openai/v1" } : {}),
    });
    const completion = await openai.chat.completions.create({
      model: isGroqKey ? "openai/gpt-oss-20b" : "gpt-5-mini",
      max_completion_tokens: 2400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a careful site reliability engineer. Return only JSON with keys summary, confidence, probableCause, recommendations (array), evidence (array of {label, detail, source}), and generatedAt. Ground every claim in the supplied incident evidence. Never invent logs or deployments.",
        },
        {
          role: "user",
          content: JSON.stringify({
            incident: incidentView(incident),
            timeline: events.map(eventView),
            checks: checks.map(({ check, serviceName }) =>
              checkView(check, serviceName),
            ),
          }),
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("The AI provider returned an empty diagnosis");
    }
    const parsed = JSON.parse(content) as {
      confidence?: number;
      [key: string]: unknown;
    };
    const diagnosis = DiagnoseIncidentResponse.parse({
      ...parsed,
      confidence:
        typeof parsed.confidence === "number" && parsed.confidence <= 1
          ? parsed.confidence * 100
          : parsed.confidence,
      generatedAt: new Date(),
    });
    res.json(diagnosis);
  } catch (error) {
    req.log.warn(
      { error },
      "Remote AI diagnosis failed, falling back to SRE rule engine",
    );
    res.json(generateSreDiagnosis());
  }
});

export default router;