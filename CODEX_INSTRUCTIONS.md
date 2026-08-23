# DHATU — Development Instructions

## Project Context

You are building **DHATU — Digital Holistic Analytics for Transformative Utilization**.

DHATU is an AI-assisted process intelligence platform for mineral processing.

The current MVP focuses specifically on the real-world processing of **Manganese ore into Manganese Dioxide (MnO₂) and Manganese Oxide/Monoxide (MnO)**.

The system will eventually generalize to other minerals, but the current implementation must focus only on the manganese processing pipeline.

The primary goal is to demonstrate:

> Given a mineral feed and a set of process conditions, DHATU can simulate process outcomes, predict recovery and product characteristics, quantify resource usage and environmental impact, and later optimize operating conditions.

---

# CURRENT PROCESS FLOW

The MVP models the following process:

```text
RAW MANGANESE ORE
        │
        ▼
┌───────────────────────┐
│    BENEFICIATION      │
│                       │
│ Crushing              │
│ Washing               │
│ Gravity Separation    │
└───────────┬───────────┘
            │
            ├──────────────► Tailings / Waste
            │
            ▼
     MnO₂ CONCENTRATE
            │
            ▼
┌───────────────────────┐
│  THERMAL REDUCTION    │
│                       │
│ Rotary Kiln           │
│ Reductant             │
│ High Temperature      │
└───────────┬───────────┘
            │
            ├──────────────► Emissions
            │
            ▼
          MnO
            │
            ▼
┌───────────────────────┐
│   MILLING & SIZING    │
│                       │
│ Granules / Powder     │
│ Custom Mesh           │
└───────────┬───────────┘
            │
            ▼
       FINAL PRODUCT