# How to Use This Project Starter System

## Purpose

This document defines the process to follow when starting a new project.

The goals are:

- fast, structured project setup
- clear thinking before coding
- consistent architecture across projects
- effective use of coding agents

---

## Overview Process

Every project follows this sequence:

1. Define the problem in `project_brief.md`.
2. Define the user experience in `ui_plan.md`.
3. Let the agent help define:
   - `database_plan.md`
   - `api_plan.md`
4. Confirm the build plan.
5. Build phase by phase using `AGENTS.md` rules.

---

## Step 1: Create a New Project

Run:

```powershell
.\start-new-project.ps1
```

This will:

- create the project folder
- copy the template
- initialize git
- open VS Code

## Step 2: Define the Project

Open:

```text
project_brief.md
```

Fill in only what you know.

### Questions to Answer

Copy this into ChatGPT when needed:

```text
Help me define a project brief.

Ask me questions one at a time to fully define:

1. What the system must do
2. Who will use it
3. The main workflows
4. What must be included in V1
5. What should NOT be included in V1
6. What success looks like

Keep it simple and practical.
Do not overcomplicate.
```

### Minimum You Must Define

- purpose
- users
- 3 to 5 main workflows
- included vs. excluded scope

## Step 3: Define the UI

Open:

```text
ui_plan.md
```

### Questions to Answer

Copy this into ChatGPT:

```text
Based on this project brief:

[paste project_brief.md]

Help me define:

1. The main pages/screens
2. What each page does
3. What fields/forms are needed
4. What actions users can take

Keep it simple and mobile-friendly.
```

### Minimum You Must Define

- navigation or menu items
- pages
- key forms
- key actions

## Step 4: Define Data and API With the Agent

Now involve the agent.

### Prompt to Use

```text
Read AGENTS.md, project_brief.md and ui_plan.md.

Do NOT write code.

First define:

1. Required database tables
2. Table structure (fields)
3. Relationships between tables
4. Required API endpoints
5. Endpoint responsibilities

Keep everything simple for V1.

Output in format suitable for:
- database_plan.md
- api_plan.md
```

Then paste the results into:

- `database_plan.md`
- `api_plan.md`

## Step 5: Review the Build Plan

Open:

```text
build_plan.md
```

Update:

- objective
- phase breakdown so it matches your project

### Optional Prompt

```text
Review my build_plan.md.

Based on:
- project_brief.md
- database_plan.md
- api_plan.md
- ui_plan.md

Tell me:
1. What is missing
2. What is unclear
3. What should be simplified

Do NOT over-engineer.
```

## Step 6: Start Building in a Controlled Way

### First Prompt to Agent

```text
Read AGENTS.md and all planning files.

Do NOT code yet.

Tell me:
1. What the first build phase is
2. What files you will create
3. What the expected outcome is
```

Then proceed step by step.

Follow this pattern:

1. Agent proposes work.
2. You confirm.
3. Agent implements.
4. Agent explains.
5. You test.
6. Repeat.

## Step 7: Test as You Go

Use:

```text
testing_checklist.md
```

Do not wait until the end.

Test after:

- auth
- first CRUD flow
- API connection
- deployment

## Step 8: Deploy Early

As soon as you have:

- login working
- one working CRUD feature

Deploy to Cloudflare.

## Step 9: Improve the System

After the project, ask:

```text
What should be improved in:
- template
- AGENTS.md
- structure
- workflow

So the next project is faster?
```

## Rules for Yourself

### Do

- keep V1 simple
- focus on a working system first
- build one vertical slice early
- let the agent help design unknowns

### Do Not

- over-design before building
- add unnecessary features
- try to perfect everything upfront
- skip the planning phase

## Quick Summary

1. Run the script.
2. Fill in `project_brief.md`.
3. Fill in `ui_plan.md`.
4. Use the agent to generate:
   - `database_plan.md`
   - `api_plan.md`
5. Review `build_plan.md`.
6. Build step by step.
7. Test early.
8. Deploy early.

## Final Note

This system works if you follow it.

If you skip planning, builds become messy.

If you follow the steps, builds become predictable and fast.

---

## Why This Is Powerful

You now have:

- a repeatable thinking process
- a structured agent workflow
- a clear separation of concerns
- a feedback loop for improvement

---

## If You Want the Next Level

The next step is adding a default working feature into the template, such as login plus CRUD plus database wiring.

That shifts each new project from empty to partially built, which makes the system much faster to use.