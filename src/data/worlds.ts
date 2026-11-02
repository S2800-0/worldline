export type WorldId = "real" | "archivist" | "alchemist";

export interface Project {
  title: string;
  summary: string;
  specs: [string, string][];
  links?: [string, string][];
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
}

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
