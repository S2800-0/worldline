export type WorldId = "real" | "archivist" | "alchemist";

export interface Project {
  title: string;
  summary: string;
  specs: [string, string][];
  links?: [string, string][];
  headline?: [string, string];
  how?: [string, string][];
  limits?: string;
  stack?: string;
}

export interface World {
  id: WorldId;
  path: string;
  meter: string;
  fictional: boolean;
  name: string;
  role: string;
  title: string;
  about: string[];
  skills: [string, string][];
  projects: Project[];
  sectionLabels: { about: string; skills: string; projects: string };
  footnote?: string;
  whatIf?: string;
}

export const experience = [
  {
    role: "Big Data & Data Engineering Trainee",
    place: "Samsung Innovation Campus",
    when: "Jul - Oct 2026",
    detail:
      "Built 15+ data engineering projects: batch and streaming pipelines with Kafka, NiFi, Spark Structured Streaming, Flink SQL, HDFS and Hive, including a real-time pipeline replacing a 12-hour nightly batch. Also AWS (Glue, S3, Athena), Snowflake with dbt, Delta Lake, Airflow and Kubernetes scheduling, and Prometheus and Grafana monitoring.",
  },
  {
    role: "Data Science & Analytics Trainee",
    place: "DEPI, IBM Data Science track",
    when: "Nov 2025 - Jul 2026",
    detail: "Capstone, FinWise AI: an inflation forecasting model (Gradient Boosting), a SQL database layer and a Dash dashboard.",
  },
  {
    role: "Software Development & AI Integration Intern",
    place: "Minly",
    when: "Jul - Aug 2025",
    detail: "REST APIs and relational schemas in NestJS, TypeORM and PostgreSQL, automated data refresh workflows, and Docker.",
  },
];

export const credentials: [string, string][] = [
  ["Education", "B.Sc. Computer Science & Artificial Intelligence, Alryada University. Sept 2023 - June 2027 (expected)"],
  ["Certifications", "IBM Data Science Professional (2026). Supervised ML, DeepLearning.AI (2026). Huawei/NTI AI Academy (2025)"],
  ["Languages", "Arabic (native), English (C1)"],
];

export const real: World = {
  id: "real",
  path: "/",
  meter: "1.112007",
  fictional: false,
  name: "Shahesta Salama",
  role: "Computer science and AI undergraduate. Data systems and trustworthy AI.",
  title: "Shahesta Salama",
  sectionLabels: { about: "About", skills: "Skills", projects: "Projects" },
  about: [
    "I'm in my final year of computer science and AI at Alryada University in Egypt, graduating in June 2027.",
    "I work on data systems, and on AI that can be checked afterwards. Most of what I build is about knowing when a system should stop, and being able to prove what it did.",
  ],
  skills: [
    ["Languages", "Python, C++, SQL, TypeScript, Bash"],
    ["AI / ML", "PyTorch, Scikit-learn, TensorFlow/Keras, YOLO, SegFormer, OpenCV"],
    ["Data systems", "Spark, Kafka, Flink, Hive, Airflow, dbt, Snowflake, Delta Lake, PostgreSQL"],
    ["Tools", "FastAPI, Docker, Kubernetes, AWS, Linux, Git, GitHub Actions"],
  ],
  projects: [
    {
      title: "Incident Commander",
      summary:
        "An SRE agent that decides when not to act. Built with my teammate, and archived on Zenodo with a paper in preparation.",
      headline: ["14 of 14", "Irreversible actions blocked, over 63 trials"],
      how: [
        ["Investigate", "Competing root-cause hypotheses, updated with Bayes' rule. Each next check is the one with the most expected information per unit of cost. There is no LLM in the decision path, so the same input always gives the same output."],
        ["Ask", "An OPA policy engine in its own container gates every state-changing action. The agent has no code path around it, and if OPA is unreachable the backend fails closed."],
        ["Act", "Only after approval, over real HTTP against the target service. Autonomy depends on whether an action can be undone, not on how confident the agent is. Irreversible actions never run."],
        ["Verify", "From fresh telemetry collected after the action, not the signal from before it."],
        ["Auto-revert", "If verification fails, the agent undoes its own change and escalates to a person."],
        ["Seal", "Every decision is a leaf in a Merkle tree signed with Ed25519. A standalone script verifies the postmortem offline and reports any tampering."],
      ],
      limits: "A working research prototype, not hardened for production. The intended path is staging and read-only shadow mode first.",
      stack: "Python, FastAPI, OPA and Rego, OpenTelemetry, React, Docker",
      specs: [
        ["Award", "1st Place, Student Track, ITIDA DevOps Day 2026"],
        ["Checks per incident", "1.2, against 2.8 for exhaustive search at equal accuracy"],
        ["Failed fixes auto-reverted", "10 of 10, over 63 trials"],
        ["Irreversible actions blocked", "14 of 14, over 63 trials"],
      ],
      links: [
        ["Repository", "https://github.com/incident-commander-lab/incident-commander"],
        ["DOI", "https://doi.org/10.5281/zenodo.23276215"],
      ],
    },
    {
      title: "ICVSP",
      summary:
        "A trust-aware cooperative vehicle safety platform for Egyptian roads. Graduation project, mentored by Valeo engineers.",
      headline: ["46.9% to 0.5%", "False alerts with 20% attackers, in simulation"],
      how: [
        ["The idea", "A low-cost retrofit unit that detects potholes and speed bumps, checks them against on-board sensors and reports from other vehicles, and warns approaching drivers. It keeps working when the cloud or network is down."],
        ["Detect", "YOLO11n fine-tuned on Cairo day and night footage. A speed-bump box is kept only if it lies on the road surface (SegFormer) and moves towards the car like a fixed object. That removes over 95% of false bump flags on held-out video, keeping about 4 in 5 real bumps."],
        ["Decide", "The trust and consensus engine decides, with a written reason, whether a hazard is real enough to warn anyone. Over 2,000 simulated runs per setting, warning on any report gives 46.9% false alerts, majority vote 24.3%, this engine 0.5%. It defends against Sybil identities, replay and GPS spoofing."],
        ["Device", "C++ firmware tells potholes (wheel drops first) from speed bumps (lifts first, for longer) using the IMU, and signs reports with Ed25519 inside a 30-second replay window. The 8-bit, 486 KB model reaches speed-bump mAP50 0.72 in simulation."],
        ["System", "A full simulation runs dozens of cars on the real device code through the FastAPI backend, across 4 fault and attack scenarios, with 0% false warnings."],
      ],
      limits: "These are simulated results, not real traffic. Against insiders with a good history, the engine gives 15.2% false alerts and misses its 10% target, which is the open research problem. On-chip accuracy still needs a physical board.",
      stack: "Python, PyTorch, C++ (ESP32-S3), FastAPI",
      specs: [
        ["Detector", "YOLO11n, mAP50 0.846 on unseen public images"],
        ["False alerts", "Cut from 46.9% to 0.5% by the trust and consensus engine"],
        ["Edge model", "8-bit, 486 KB, for a low-cost ESP32-S3 unit"],
        ["Tests", "150+ unit tests"],
      ],
      links: [["Repository", "https://github.com/S2800-0/icvsp-prototype"]],
    },
    {
      title: "Fleet Telematics Lakehouse",
      summary:
        "Samsung Innovation Campus team project. My part was the data generator and the ingestion platform.",
      headline: ["3.16M", "Events streamed in 75 minutes"],
      how: [
        ["The idea", "A simulated delivery fleet turned into auditable analytics: 5,000 vehicles and 5,200 drivers across 10 Egyptian depots, from raw telemetry to a Power BI dashboard."],
        ["My part: generator", "Repeatable telemetry from a fixed seed, with problems injected on purpose: cold-chain breaches, route deviations, malformed JSON, duplicates and late events."],
        ["My part: ingestion", "A FastAPI endpoint over insert-only PostgreSQL that keeps rejected records and the reason for each. New rows stream through Debezium CDC and Kafka, and a bridge commits offsets only after the cloud acknowledges them."],
        ["The team's platform", "Bronze, Silver and Gold tables in Microsoft Fabric and Delta Lake, rule-based anomaly detection with PySpark, and the dashboard."],
      ],
      limits: "All the data is simulated, so the figures describe the simulation and its rules, not a real fleet.",
      stack: "Python, FastAPI, PostgreSQL, Debezium, Kafka, Microsoft Fabric, Delta Lake, PySpark, Power BI",
      specs: [
        ["Streamed", "3.16M events in 75 minutes, about 700 per second"],
        ["Average latency", "1.59 s"],
        ["Batch", "5.09M rows, loaded idempotently"],
        ["Path", "FastAPI, PostgreSQL, Debezium, Kafka, Microsoft Fabric"],
      ],
      links: [["Repository", "https://github.com/abdullah-fat7y/fleet-telematics-lakehouse"]],
    },
    {
      title: "Microverse",
      summary:
        "An illustrated ecosystem playground: bring a creature to life, predict what an environmental change will do, and compare repeatable model experiments.",
      how: [
        ["Ask what if", "Choose a change like less rain or removing the wolves, predict what happens, then compare paired runs of the same forest."],
        ["Replay", "Complete snapshots mean any experiment can be saved, reopened and checked for reproducibility."],
        ["Classroom", "Prepared ecology questions, a traceable evidence guide and a printable activity all work without AI calls. The optional AI features are off by default."],
      ],
      limits: "A simplified model, still being assembled one feature at a time. It isn't an environmental forecast, and there's no evidence yet that it improves learning.",
      stack: "JavaScript, Node.js",
      specs: [
        ["Simulation", "Deterministic, with complete snapshots and replay"],
        ["Licence", "MIT"],
      ],
      links: [["Repository", "https://github.com/S2800-0/microverse"]],
    },
  ],
};

export const archivist: World = {
  id: "archivist",
  path: "/worldline/chrono-archivist/",
  meter: "0.523307",
  fictional: true,
  name: "Shahesta Salama",
  whatIf: "This is the life I'd have had if I'd skipped DevOps Day.",
  role: "Assistant Archivist, Records Annex, Giza.",
  title: "Shahesta Salama, Assistant Archivist",
  sectionLabels: { about: "About", skills: "Competencies", projects: "Selected holdings" },
  about: [
    "I look after a records room in Giza. In 2026 a colleague suggested we enter a DevOps competition on a whim, and I said no, and spent the evening reorganising the index drawers.",
    "The drawers have been excellent since.",
  ],
  skills: [
    ["Classification", "Dewey, Library of Congress, and one I made up for Drawer 9"],
    ["Paper", "Foxing, acid damage, faded pencil, other people's handwriting"],
    ["Software", "Python, mainly for finding duplicate cards"],
    ["Public service", "Telling people the thing they want is in another building"],
  ],
  projects: [
    {
      title: "Metadata migration, boxes 1974-1982",
      summary: "Moved 41,000 catalogue cards into one consistent format. I am told this was thrilling to watch.",
      specs: [
        ["Errors", "11, all mine, all corrected"],
        ["Status", "Complete"],
      ],
    },
    {
      title: "Misfiled card estimator",
      summary:
        "A small script that works out where a misfiled card most likely went, then checks the likeliest drawer first.",
      specs: [
        ["Drawers opened per card", "1.2"],
        ["Awards", "None. It is a filing script."],
      ],
    },
    {
      title: "Drawer 14 reconciliation",
      summary: "For eleven years, Drawer 14 was labelled Drawer 41. It is now labelled Drawer 14.",
      specs: [
        ["Cards affected", "All of them"],
        ["Reference", "Dr. T, who still brings up that competition"],
      ],
    },
  ],
};

export const alchemist: World = {
  id: "alchemist",
  path: "/worldline/data-alchemist/",
  meter: "2.615074",
  fictional: true,
  name: "Shahesta Salama",
  whatIf: "This is the life I'd have had if I'd turned down Samsung Innovation Campus.",
  role: "Alchemist, self-employed. Giza.",
  title: "Shahesta Salama, Alchemist",
  sectionLabels: { about: "About", skills: "Skills", projects: "Trials" },
  about: [
    "In 2026 I was offered a place on a data engineering programme and turned it down. I had read that a sufficiently clean CSV could be turned into gold, and I wanted to start before the field got crowded.",
    "It has not got crowded.",
  ],
  skills: [
    ["Reagents", "Kafka, read aloud. Spark, from flint. Flink, still looking for it."],
    ["Vessels", "Alembic, retort, one very old spreadsheet"],
    ["Languages", "Latin, some. Python, less."],
    ["Safety", "One eyebrow remaining"],
  ],
  projects: [
    {
      title: "CSV to gold, series 1-40",
      summary: "Forty controlled attempts at the central problem. The data was very clean by the end.",
      specs: [
        ["Input", "4.2 GB of validated CSV"],
        ["Gold", "0 g"],
        ["Smoke", "Considerable"],
      ],
    },
    {
      title: "Deduplication by fire",
      summary: "Removes every duplicate row from any dataset, reliably, in under a minute.",
      specs: [
        ["Duplicates remaining", "0"],
        ["Rows remaining", "0"],
      ],
    },
    {
      title: "Real-time pipeline",
      summary: "A copper pipe from the well to the workshop, replacing a 12-hour walk.",
      specs: [
        ["Latency", "Immediate, then a leak"],
        ["Reference", "Dr. T, who has asked me to stop sending samples"],
      ],
    },
  ],
};

export const worlds = { real, archivist, alchemist };
