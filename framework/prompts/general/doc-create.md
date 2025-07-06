🧠 Task:
Analyze the documentation files in this project (typically located in the `docs/` folder or similar) and refactor them into a clear, modern structure that supports both technical and non-technical stakeholders.

🎯 Goal:
Transform unstructured, flat, or outdated documentation into a modular, scalable layout based on current best practices — supporting onboarding, feature reference, architecture, deployment, testing, and AI/LLM integration if applicable.

📁 Desired Output Structure (adapt as needed per project):

- **00_index/**: Overview pages and entry points (README, project summary, changelogs)
- **01_getting-started/**: Installation, onboarding, quickstart guides, screenshots
- **02_architecture/**: Diagrams, system design, data flow, integrations
- **03_features/**: Feature-by-feature explanations, UI demos, example flows
- **04_ide-support/**: DOM structures, integration patterns for IDEs like VSCode/Cursor
- **05_ai/** (if relevant): AI prompts, response logs, automation strategies
- **06_development/**: Dev setup, env configs, Git workflow, internal tools
- **07_deployment/**: Deployment strategies, Docker/Kubernetes, infrastructure
- **08_reference/**: CLI/API specs, errors, config schemas, advanced guides
- **09_roadmap/**: Planned features, known limitations, implementation phases
- **10_testing/**: Test plans, test cases, QA strategy, coverage reports
- **assets/**: Images, diagrams, Mermaid files, mockups

📌 Requirements:
- Auto-detect and group existing documentation into appropriate sections above.
- Merge redundant or fragmented files if necessary.
- Rename and relocate unclear files into the right module.
- Maintain internal links and frontmatter (if present).
- Create index pages or overview files where needed.
- If screenshots, diagrams or assets are referenced, ensure they are moved into an `assets/` or `screenshots/` folder and linked correctly.
- If any required docs are missing, add placeholder files or TODO stubs.

🔄 Output:
Provide:
- The new proposed file/folder structure
- A list of actions taken (e.g. "Merged `api.md` into `reference/api/rest.md`")
- A list of missing or recommended future docs
