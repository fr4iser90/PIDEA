# CursorWeb

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](CHANGELOG.md)

## Overview

CursorWeb is an innovative web-based platform designed to enhance developer productivity through integrated tools and AI-driven assistance. It provides a seamless environment for coding, collaboration, and project management, with features like real-time chat, IDE mirroring, and content preview. The platform is built to support developers in creating, analyzing, and refactoring projects efficiently.

## Key Features

- **Real-Time Chat System**: Communicate and collaborate with team members or AI assistants directly within the platform.
- **IDE Integration**: Mirror and interact with your Cursor IDE for a unified coding experience.
- **Preview Functionality**: View code output or project content in real-time alongside your workspace.
- **Multi-View Interface**: Switch between chat, code, IDE mirror, and preview modes to suit your workflow.

## Upcoming Enhancements

### Mobile Web Interface
CursorWeb is being adapted for mobile devices to ensure accessibility and usability on the go. Planned updates include:
- Responsive design for optimal viewing on smaller screens.
- Touch-friendly navigation with a bottom bar or hamburger menu.
- Simplified layouts prioritizing key features like chat and preview.

### Integrated AI Engineer
An AI assistant is under development to provide advanced project management capabilities:
- **Project Analysis**: Automatically analyze codebases for structure, dependencies, and potential issues.
- **Code Refactoring**: Suggest and implement refactoring strategies to improve code quality.
- **Task Automation**: Generate tasks, development plans, and documentation based on project needs and user input.

### Git Management
Future updates will include Git integration for mobile and desktop users:
- Commit, push, pull, and manage branches directly from the CursorWeb interface.
- Execute Git commands securely via backend scripts.

### Terminal Management
An emulated terminal is planned for running commands specific to the project:
- Commands will be restricted to the work path to ensure security.
- Global command execution will be prohibited to prevent unintended system changes.
## Getting Started

### Installation
1. Clone the repository: `git clone https://github.com/fr4iser90/CursorWeb.git`
2. Navigate to the project directory: `cd CursorWeb`
3. Install dependencies:
   - Frontend: `cd frontend && npm install`
   - Backend: `cd backend && npm install`
4. Start the development servers:
   - Frontend: `cd frontend && npm run dev`
   - Backend: `cd backend && npm run start`

### Usage
- Access the web interface at `http://localhost:4005` (or the port specified by your frontend server).
- Use the navigation buttons to switch between Chat, IDE Mirror, Preview, and Code views.
- Engage with the chat system to communicate or request AI assistance (once implemented).

## Project Structure
- **frontend/**: Contains React-based UI components and pages for chat, preview, and IDE integration.
- **backend/**: Manages chat sessions, message handling, and IDE communication.
- **framework/**: Includes templates and prompts for project scaffolding and AI interactions.
- **scripts/**: Automation tools for DOM analysis, task management, and more.
- **docs/**: Detailed documentation on features, setup, and development.

## Contributing
I welcome contributions to CursorWeb! Please follow these steps:
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a pull request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Personal Goal: Project Unifier

My personal objective with CursorWeb is to create a unifying platform for all my projects. The goal is to standardize frameworks, maintain consistent documentation, and ensure a uniform structure across different endeavors. I'm happy to share this tool with the community, hoping it saves time and brings efficiency to others as well.

## Contact
For questions or feedback, reach me out via email : pa.boe90@gmail.com