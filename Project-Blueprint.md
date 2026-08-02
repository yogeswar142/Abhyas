# Abhyas -- Master Project Blueprint (MVP → Production)

## Vision

Abhyas is a premium AI mock interview platform focused on realistic
interview practice using local or cloud AI. The product UI , UX should feel like
a polished SaaS (Linear, Vercel, Notion quality), not a generic AI
chatbot.

## Core Principles

-   Build production-ready features only.
-   Complete one vertical slice at a time (Database → Backend → Frontend
    → Testing).
-   No throwaway mock implementations once a feature begins.
-   Modular, scalable architecture.
-   AI is a service behind a stable interface.

## Tech Stack

### Frontend

-   Next.js (App Router)
-   TypeScript
-   Tailwind CSS
-   shadcn/ui

### Backend

-   Hono
-   TypeScript
-   Zod

### Database

-   Supabase (Postgres + RLS)

### AI

-   Ollama (local)
-   Qwen 2.5 3B initially
-   Future: LM Studio, llama.cpp, OpenAI, Gemini, Claude

### Local Bridge

Package: `@abhyas`

Responsibilities: - Detect Ollama - Health checks - List/Pull models -
Chat API - Stream responses - Provider abstraction

Website communicates only with the bridge, never directly with Ollama.

## Product Modules

1.  Landing Page (Completed)
2.  Authentication
3.  Dashboard
4.  Interview Management
5.  Interview Session
6.  AI Bridge
7.  AI Interview Engine
8.  Evaluation Engine
9.  Resume Intelligence
10. Voice
11. Settings/Profile
12. Deployment

------------------------------------------------------------------------

# Development Strategy

Every feature must include: - Database schema - Validation - Backend
routes - Frontend - Loading/error handling - Tests (where practical) -
Documentation

Never build UI that will later be replaced by another implementation.

------------------------------------------------------------------------

# Phase Roadmap

## Phase 1 (Completed)

-   Landing Page
-   App Architecture
-   Authentication
-   Dashboard

## Phase 2 -- Interview Management

Goal: Users can create, edit, view and delete interviews.

Deliverables: - Supabase interview schema - CRUD APIs - Zod validation -
Interview creation wizard - Dashboard integration - Real persistence

## Phase 3 -- Interview Session

Goal: A real interview session.

Deliverables: - Session routes - Messages table - Timer - Transcript -
Session lifecycle

(No AI yet beyond plumbing if required.)

## Phase 4 -- @abhyas

Goal: Production-ready Node package.

Features: - CLI - Health - Status - Models - Chat - Streaming - Provider
interface

## Phase 5 -- AI Integration

Goal: Real interview powered by Ollama.

Requirements: - Context memory - One question at a time - Prompt
templates - Configurable generation - Streaming

## Phase 6 -- Evaluation

Generate structured reports: - Overall score - Technical -
Communication - Confidence - Strengths - Weaknesses - Suggestions

Persist reports in Supabase.

## Phase 7 -- Resume Intelligence

-   Resume upload
-   Skill extraction
-   Tailored questions

## Phase 8 -- Voice

-   Speech-to-text
-   Text-to-speech
-   Voice interview mode

## Phase 9 -- Production

-   Settings
-   Analytics
-   Profile
-   Deployment
-   Monitoring
-   Beta launch

------------------------------------------------------------------------

# Coding Standards

-   Prefer composition over duplication.
-   Separate business logic from UI.
-   Use feature-based architecture.
-   Keep AI provider isolated.
-   Strong typing everywhere.
-   Use Zod for input validation.
-   Document major decisions.

------------------------------------------------------------------------

# Guidance for AI Coding Agents

Before implementing any feature: 1. Understand the existing
architecture. 2. Avoid rewriting completed work unless necessary. 3.
Extend existing components instead of duplicating. 4. Keep code modular.
5. Explain architectural decisions. 6. Deliver complete vertical slices,
not partial implementations. 7. If a better architecture is identified,
propose it before implementing.

Success metric: At the end of every phase, the feature should be
production-ready and remain in the codebase without needing a future
rewrite.
