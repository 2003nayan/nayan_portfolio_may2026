// Client case studies rendered at /work/[slug].
// Client work is under NDA: no screenshots, code, hostnames, database or tag names.

export interface ArchitectureTier {
  label: string;
  nodes: string[];
  // Label on the arrow leading down to the next tier
  flow?: string;
}

export interface CaseStudy {
  slug: string;
  client: string;
  title: string;
  location: string;
  dates: string;
  role: string;
  summary: string;
  stats: { value: string; label: string }[];
  problem: string[];
  ownership: string[];
  architecture: ArchitectureTier[];
  architectureNote?: string;
  built: { title: string; detail: string }[];
  challenges: { title: string; problem: string; solution: string }[];
  results: string[];
  stack: string[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "haridwar",
    client: "Fortune Global 500 FMCG",
    title: "Shopfloor Operations Platform",
    location: "Haridwar, India · Onsite",
    dates: "Sept 2025 – Dec 2025 · Aug 2026 – Present",
    role: "Only full-stack developer",
    summary:
      "A shopfloor platform for a global FMCG packaging plant. Operators see productivity, quality and breakdowns live, act on guided alerts, and change machine parameters from the screen, across 36 high-speed machines.",
    stats: [
      { value: "10 → 36", label: "Machines" },
      { value: "6", label: "Production loops" },
      { value: "1 read / 2s", label: "DB load for all screens" },
      { value: "2h → 15m", label: "Deploy time" },
    ],
    problem: [
      "The plant runs high-speed packaging machines grouped into production loops. Operators needed one place to see how every machine is running (output, quality and stoppages) and to act on problems before they cost production.",
      "In 2025 the platform covered 10 machines in two loops. In 2026 the client ordered the rollout across the rest of the line: 36 machines in 6 loops. Every screen had to stay live, refreshing every two seconds, without adding load to the plant's databases.",
    ],
    ownership: [
      "I'm the only full-stack developer on the platform: frontend, backend API, deployment, and day-to-day changes with operators on the shopfloor.",
      "Other AI4M teams own PLC data collection, the plant databases and the ML models. My backend reads their data and turns it into screens operators can act on.",
    ],
    architecture: [
      {
        label: "Plant floor",
        nodes: ["36 packaging machines", "Machine PLCs", "Inspection cameras"],
        flow: "Telemetry written by plant data services",
      },
      {
        label: "Data",
        nodes: ["Production database", "Alerts database", "Sensor time-series (TimescaleDB)"],
        flow: "Read at most once per 2-second window",
      },
      {
        label: "Backend · FastAPI",
        nodes: ["Shared snapshot cache + ETags", "History API (keyset pagination)", "Auth & role-based access", "Audited setpoint writes"],
        flow: "Polled every 2 s · HTTP 304 when nothing changed",
      },
      {
        label: "Frontend · React + TypeScript",
        nodes: ["Shopfloor dashboard", "Loop cockpits", "Machine view + 3D twin", "History & work instructions", "Control panel"],
      },
    ],
    architectureNote:
      "Setpoint changes travel back down to the machine through a write service that records the operator's ID and reason for every change.",
    built: [
      { title: "Shopfloor dashboard & loop cockpits", detail: "Live OEE, output and status for every machine, grouped by production loop." },
      { title: "Machine views with a 3D digital twin", detail: "A detail view per machine with live parameters and an animated 3D model of its state (Three.js / React Three Fiber)." },
      { title: "Guided alerts & work instructions", detail: "Productivity, quality and breakdown alerts with guided actions for operators, plus a full history of what was done." },
      { title: "Machine control from the UI", detail: "Operators change machine setpoints directly from the control panel; every write is logged with operator ID and reason." },
      { title: "Two-layer access control", detail: "Route guards block whole screens; per-control permissions gate buttons inside a screen. The last admin can never be removed, so nobody gets locked out." },
      { title: "History at plant scale", detail: "Event, stoppage, production and work-instruction history over multi-million-row tables." },
      { title: "Camera streams with fallback", detail: "Live inspection camera feeds (HLS) on the machine view, switching to recorded footage when a stream drops." },
      { title: "PLC diagnostic tool", detail: "A read-only desktop, terminal and CLI tool that reads Allen-Bradley PLCs over EtherNet/IP and Mitsubishi PLCs through a hand-written MC protocol (SLMP) client, reaching machines on isolated plant networks over SSH." },
      { title: "Whole-plant simulator", detail: "A mock data source that simulates the entire plant, so screens can be built and tested without touching production." },
    ],
    challenges: [
      {
        title: "Keeping 36 machines live without hammering the database",
        problem:
          "Every open screen polls every 2 seconds. With more machines and more screens on the shopfloor, a naive backend makes one database read per screen per poll.",
        solution:
          "A shared snapshot cache: the backend reads the databases at most once per 2-second window and serves every screen from memory. ETags are computed from what the data means, not its raw bytes (which change with the server clock), so an unchanged screen gets an HTTP 304 with no body. Any write clears the cache, so operators see their own change instantly.",
      },
      {
        title: "History that stays fast over millions of rows",
        problem:
          "Event and stoppage tables hold millions of rows. \"Skip 10,000 rows, take 50\" gets slower the further back an operator scrolls.",
        solution:
          "Keyset pagination: each page asks for rows older than the last timestamp it saw, which stays fast at any depth. A heavier health query over a 3.5M-row hypertable gets its own longer cache window.",
      },
      {
        title: "Changing a running machine safely",
        problem:
          "Changing a setpoint on a running high-speed machine is a physical action on the line, not a UI tweak.",
        solution:
          "Writes sit behind role-based access at both route and control level, and every write is recorded with who made it and why.",
      },
    ],
    results: [
      "Scaled from 10 machines in 2 loops (2025) to 36 machines across 6 loops (2026).",
      "Any number of open screens costs one database read every 2 seconds.",
      "Deployment time cut from 2 hours to 15 minutes with an in-house CI/CD pipeline.",
      "Selected as the only fresher for the 2025 onsite deployment; came back in 2026 as the platform's only full-stack developer.",
    ],
    stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "Zustand", "Three.js", "React Three Fiber", "Recharts", "HLS.js", "FastAPI", "Python", "PostgreSQL", "TimescaleDB", "Vitest", "Pytest", "PyQt5 · pycomm3 · SLMP (PLC tool)", "Flask · WebSockets · ZeroMQ (2025)"],
  },
  {
    slug: "khamgaon",
    client: "Fortune Global 500 FMCG",
    title: "Soap Line Digital Twin & TwinSight",
    location: "Khamgaon, India · Onsite",
    dates: "Jun 2026 – Present",
    role: "Only full-stack developer",
    summary:
      "Two production apps for a soap finishing line: a live 3D digital twin that shows operators what every machine is doing, and TwinSight, a monitoring portal engineers use to trust their data and run process experiments.",
    stats: [
      { value: "2", label: "Production apps" },
      { value: "180+", label: "PLC tags verified" },
      { value: "3D", label: "Live line twin" },
      { value: "On-prem", label: "Moved off Azure & AWS" },
    ],
    problem: [
      "A soap finishing line turns soap noodles into finished bars through a chain of machines: mixer, mills, plodders, cutter and stamper. Quality is tracked through penetration value (PV), a measure of soap hardness that usually comes from slow manual lab tests.",
      "Operators needed to see the line's live state at a glance and keep PV inside its golden range. Engineers needed a separate tool to trust the data behind it: check that every PLC signal is actually live, analyse signals over time, and track process experiments.",
    ],
    ownership: [
      "I designed, built and deployed both apps as the only full-stack developer: React frontends, FastAPI backends, CI/CD and the move to the plant server.",
      "PLC data collection and the ML models behind PV prediction belong to other AI4M teams; my apps read their output and put it in front of operators and engineers.",
    ],
    architecture: [
      {
        label: "Plant floor",
        nodes: ["Mixer, noodler & mill PLCs", "Plodder & vacuum PLCs", "Cutter, stamper & conveyor PLCs"],
        flow: "Data collectors write readings",
      },
      {
        label: "Data · on the plant server",
        nodes: ["PostgreSQL time-series", "PV predictions from ML models", "Manual lab PV entries"],
        flow: "Time-bucketed queries",
      },
      {
        label: "Backends · FastAPI",
        nodes: ["Digital twin API", "TwinSight API"],
        flow: "REST polling every 3–10 s",
      },
      {
        label: "Apps · React + TypeScript",
        nodes: ["Operator twin: 3D line, PV overview, analytics, historian", "TwinSight: device health, tag verification, signal analysis, experiments, configuration"],
      },
    ],
    built: [
      { title: "Live 3D digital twin", detail: "The soap line rendered in 3D with Three.js / React Three Fiber, with machine animations driven by live machine data." },
      { title: "PV overview & lab entry", detail: "Predicted, estimated and manual lab PV side by side, with a lab-entry form so predictions can be checked against reality." },
      { title: "SKU changeover", detail: "Operators switch the active product with a confirm step; every changeover lands in history." },
      { title: "Analytics & historian", detail: "PV trend and accuracy, material blend trends, and alert, event and changeover history." },
      { title: "PLC tag verification (TwinSight)", detail: "Checks 180+ PLC tags for staleness and source with per-tag thresholds, so engineers know which signals to trust." },
      { title: "Signal analysis & experiments (TwinSight)", detail: "Time-series charts with shift/scale adjustments, and experiment tracking that compares process changes such as machine dimensions, recycle flow, RPM and temperature." },
      { title: "Configuration with audit trail (TwinSight)", detail: "Engineers update device and tag configuration from the browser; every change is logged." },
      { title: "CI/CD with security scanning", detail: "GitLab pipeline with linting, type checks, unit, API contract and end-to-end tests, plus SAST, secret detection and container scanning." },
    ],
    challenges: [
      {
        title: "Long time ranges without slow charts",
        problem:
          "A multi-day trend chart over raw readings means hundreds of thousands of rows sent to the browser.",
        solution:
          "Series are averaged into time buckets inside PostgreSQL, so a multi-day window costs about the same as one hour.",
      },
      {
        title: "Never showing a fake zero",
        problem:
          "A missing reading shown as 0 looks like a real value and can mislead an operator into acting on it.",
        solution:
          "Missing data comes back as null and shows as a dash. Only the 3D animation endpoints fall back to the machine \"at rest\", so the scene never breaks.",
      },
      {
        title: "Moving from the cloud to the plant",
        problem:
          "TwinSight started on Azure (Static Web Apps, Functions, Cosmos DB) and the twin on AWS (Amplify, Lambda, DynamoDB).",
        solution:
          "Moved both onto an on-premise server inside the plant, reading PostgreSQL directly. The new data layer returns rows in the same shape the old one did, so the API routes and frontend didn't have to change.",
      },
    ],
    results: [
      "Two production apps designed, built and deployed by one developer.",
      "The operator twin is used daily on the shopfloor.",
      "Real-time PV estimation means less PV drift: product stays in the golden range for longer.",
      "Both apps now run on the plant's own server instead of Azure and AWS.",
    ],
    stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "TanStack Query", "TanStack Router", "Three.js", "React Three Fiber", "Recharts", "FastAPI", "Python", "PostgreSQL", "GitLab CI/CD", "Vitest", "Pytest", "Azure & AWS (before)"],
  },
  {
    slug: "cavite",
    client: "Fortune Global 500 FMCG",
    title: "Real-Time Quality System",
    location: "Cavite, Philippines · Onsite",
    dates: "Apr 2026 – Jun 2026",
    role: "Built the application end to end",
    summary:
      "A real-time quality monitoring system for high-speed sachet packaging: live machine telemetry, downtime and camera inspection on one screen, delivered onsite in the Philippines.",
    stats: [
      { value: "5", label: "VFFS machines" },
      { value: "180+", label: "Units per minute" },
      { value: "8", label: "Camera streams" },
      { value: "Onsite", label: "International delivery" },
    ],
    problem: [
      "Vertical form-fill-seal (VFFS) machines form, fill and seal sachets at more than 180 units a minute. A weak seal (jaws not hot enough, or not pressed long enough) means leaking product and waste, and at that speed a small problem multiplies fast.",
      "The plant needed every machine's state live (temperatures, torque, downtime and inspection images) so operators catch quality drift as it happens instead of at end-of-shift checks.",
    ],
    ownership: [
      "Selected for international onsite delivery. I developed the monitoring application end to end: frontend, backend and the PLC data path.",
      "Worked directly with plant operators and engineers during the live rollout on the production floor.",
    ],
    architecture: [
      {
        label: "Plant floor",
        nodes: ["5 VFFS packaging machines", "Machine PLCs", "8 inspection cameras"],
        flow: "EtherNet/IP telemetry · camera streams",
      },
      {
        label: "Ingestion & data",
        nodes: ["PLC reader service", "PostgreSQL"],
        flow: "Continuous low-latency writes",
      },
      {
        label: "Backend · FastAPI",
        nodes: ["Telemetry & downtime APIs", "System health", "Camera stream endpoints"],
        flow: "Live updates",
      },
      {
        label: "Frontend · React + TypeScript",
        nodes: ["Live telemetry dashboards", "Downtime tracking", "Inspection metrics", "8-camera inspection wall"],
      },
    ],
    built: [
      { title: "PLC integration over EtherNet/IP", detail: "Reading machine telemetry straight from the PLCs for low-latency production visibility." },
      { title: "Live telemetry dashboards", detail: "Per-machine views of temperatures, torque and machine state, refreshed continuously." },
      { title: "Downtime tracking", detail: "Every stop captured with its duration, so the plant can see where production time is lost." },
      { title: "Camera inspection wall", detail: "Eight inspection camera streams on one screen next to the machine data they relate to." },
      { title: "System health monitoring", detail: "Connectivity and status of every machine and service, so operators know when to trust the screen." },
    ],
    challenges: [
      {
        title: "Ingestion that never stops",
        problem:
          "At 180+ units a minute the telemetry never pauses, and a failed write leaves gaps in the data exactly when operators need it.",
        solution:
          "Debugged the ingestion failures and optimised backend processing and database writes so monitoring stayed stable through continuous production.",
      },
      {
        title: "Delivering on a live line, abroad",
        problem:
          "Changes go out next to running machines in another country, with short windows and no room for downtime caused by software.",
        solution:
          "Worked side by side with plant operators and engineers, shipping changes in step with production.",
      },
    ],
    results: [
      "Live monitoring across 5 high-speed VFFS machines running at 180+ units per minute.",
      "Telemetry, downtime and 8 camera streams on one operator screen.",
      "Stable monitoring through continuous plant operation.",
    ],
    stack: ["React", "TypeScript", "FastAPI", "Python", "PostgreSQL", "EtherNet/IP", "MJPEG streams"],
  },
  {
    slug: "distillery",
    client: "Multinational Spirits Company",
    title: "Distillery Digital Twin",
    location: "Nashik, India · Remote",
    dates: "Jan 2026 – Mar 2026",
    role: "Developed the desktop app end to end",
    summary:
      "A desktop application for a global spirits maker's Nashik plant that brings lab results and mashing sensor data together, so engineers can analyse batches, simulate process changes and see predicted flavour quality before a batch is made.",
    stats: [
      { value: "Desktop", label: "Electron app" },
      { value: "2", label: "Data pipelines" },
      { value: "13", label: "Lab-data edge cases handled" },
      { value: "PINN", label: "Quality predictions" },
    ],
    problem: [
      "Mashing is the first stage of the process: grain and hot water held at controlled temperatures. Small changes there show up later in the flavour of the product.",
      "The data lived in scattered Excel files, lab sheets plus per-batch sensor logs. Engineers needed one tool to load that data reliably, analyse batches, and test \"what if we change this step?\" before trying it on a real batch.",
    ],
    ownership: [
      "I developed the first complete version of the app end to end (Electron shell, React UI, FastAPI backend and the data pipelines), then redesigned the UI and UX.",
      "The PINN models that predict sensory quality come from AI4M's ML team; my pipelines prepare and feed the data they run on.",
    ],
    architecture: [
      {
        label: "Desktop app · Electron",
        nodes: ["React UI: upload, batch analysis, predictions, simulation", "Main process: native file & folder dialogs over IPC"],
        flow: "HTTP on localhost",
      },
      {
        label: "Backend · FastAPI",
        nodes: ["Lab upload pipeline", "Time-series upload (background jobs)", "Batch analysis", "Prediction service (PINN)"],
        flow: "SQL",
      },
      {
        label: "Data",
        nodes: ["PostgreSQL: lab results, sensor time-series, predictions, simulations"],
      },
    ],
    built: [
      { title: "Electron desktop shell", detail: "Native file and folder pickers over a secure IPC bridge (context isolation, no Node.js in the renderer)." },
      { title: "Time-series upload pipeline", detail: "Reads folders of per-batch mashing Excel files as a background job, with a step-by-step progress workflow in the UI." },
      { title: "Lab upload pipeline", detail: "Parses lab Excel sheets, validates every value against configured limits, and lets the engineer continue or discard invalid batches." },
      { title: "Batch analysis", detail: "Pick batches and compare their sensor curves and lab results side by side." },
      { title: "Predictions view", detail: "PINN-based sensory quality predictions per batch, fed by the upload pipelines." },
      { title: "UI/UX redesign", detail: "Rebuilt the interface with Radix UI, Tailwind and Recharts: a guided upload flow, batch charts and a clearer home screen." },
    ],
    challenges: [
      {
        title: "Messy real-world Excel",
        problem:
          "Lab sheets arrive with renamed parameters, missing values, text in number columns, mixed date formats, duplicate batches and columns with data but no batch number.",
        solution:
          "Mapped 13 edge cases and defined handling for each (accept, warn with a Continue/Discard dialog, or reject with a clear message), so bad data never lands silently in the database.",
      },
      {
        title: "Long uploads without a frozen app",
        problem:
          "A folder of batch files takes a while to process, and a blocking request would freeze the UI.",
        solution:
          "Time-series uploads run as background jobs with a job ID; the UI polls status every 800 ms and drives a progress stepper.",
      },
    ],
    results: [
      "Engineers load, validate and analyse batches in one desktop app instead of juggling Excel files.",
      "Validation rules covering 13 lab-data edge cases.",
      "The first version became the base the team built later features on.",
    ],
    stack: ["Electron", "React", "TypeScript", "Vite", "Tailwind CSS", "Radix UI", "Recharts", "FastAPI", "Python", "pandas", "PostgreSQL", "PINN (ONNX)"],
  },
];

export function getCaseStudy(slug: string) {
  return CASE_STUDIES.find((c) => c.slug === slug);
}
