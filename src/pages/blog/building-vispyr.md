---
layout: ../../layouts/BlogPost.astro
title: "Building Vispyr: An Observability Platform Journey"
date: "September 01, 2025"
description: "How I built an open-source observability platform combining continuous profiling with traditional telemetry data."
---

## The Problem

Modern applications generate massive amounts of telemetry data—metrics, traces, and logs. But there's always been a gap: understanding *why* your application is slow at the code level. Traditional observability tools show you the symptoms, but continuous profiling shows you the cause.

## The Solution

Vispyr combines continuous profiling with traditional telemetry in a single platform. It's built on top of proven open-source tools like Grafana, Prometheus, and Pyroscope, with automated AWS deployment and custom dashboards that connect the dots between high-level metrics and low-level code performance.

### Key Features

- Automated AWS infrastructure deployment with Terraform
- Continuous profiling with Pyroscope integration
- Custom Grafana dashboards with PromQL and TraceQL queries
- CLI tools for infrastructure automation
- Full-stack monitoring from infrastructure to application code

## The Tech Stack

Building Vispyr required working across the entire stack:

- **Backend:** Python with Flask, handling data ingestion and API endpoints
- **Frontend:** React with TypeScript for dashboard customization
- **Infrastructure:** AWS (EC2, S3, RDS), Docker for containerization
- **Observability:** Grafana, Prometheus, Pyroscope, OpenTelemetry

## Lessons Learned

### 1. Start with the data pipeline

The foundation of any observability platform is its data pipeline. I spent the first few weeks just getting telemetry data flowing reliably before building any UI.

### 2. Automation is non-negotiable

Deploying and managing infrastructure manually doesn't scale. The CLI tools and Terraform automation became just as important as the platform itself.

### 3. Grafana is incredibly powerful

Instead of building custom dashboards from scratch, I learned to leverage Grafana's query languages (PromQL, TraceQL) and plugin ecosystem. The time saved was massive.

## What's Next

Vispyr is open source and available on GitHub. I'm currently exploring ways to improve the correlation between traces and profiles, and looking at how to make the platform easier to run on non-AWS infrastructure.

If you're interested in observability or want to contribute, check out the [GitHub repo](https://github.com/yourusername/vispyr).
