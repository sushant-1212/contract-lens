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
  const failed = check.status === "failing";
  const [run] = await db
    .insert(checkRunsTable)
    .values({
      checkId: check.id,
      status: failed ? "failed" : "passed",
      statusCode: failed ? 500 : 200,
      latency: check.latency,
      error: failed ? "Response schema is missing currency" : null,
    })
    .returning();
  await db
    .update(checksTable)
    .set({ lastRunAt: new Date() })
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

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    const isGroqKey = apiKey.startsWith("gsk_");
    const openai = new OpenAI({
      apiKey,
      ...(isGroqKey
        ? { baseURL: "https://api.groq.com/openai/v1" }
        : {}),
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
    req.log.error({ error }, "AI diagnosis failed");
    res.status(502).json({
      error: "AI diagnosis is temporarily unavailable. Please try again.",
    });
  }
});

export default router;