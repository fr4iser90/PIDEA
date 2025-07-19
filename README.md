# PIDEA - Personal IDE Agent

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](CHANGELOG.md)

![Big Icon](docs/assets/icons/big.png)

## Quickstart

Choose your preferred setup method:

### Option 1: Docker Setup (Recommended for Testing)

**⚠️ WARNING: This setup is for testing only and should NOT be used in production! DO NOT EXPOSE TO WWW! Use it via VPN please!**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/fr4iser90/PIDEA.git && cd PIDEA
   ```

2. **Start with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

3. **Access PIDEA:**
   - Frontend: http://localhost
   - Backend API: http://localhost:3000
   - **Test Credentials:** `test@test.com` / `test123`

### Option 2: Development Setup (Monorepo)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/fr4iser90/PIDEA.git && cd PIDEA
   ```

2. **Install all dependencies (backend & frontend):**
   ```bash
   npm install
   ```

3. **Start the interactive dev setup menu:**
   ```bash
   npm run setup
   # or directly: ./setup.js
   ```
   The menu allows you to:
   - Reset the database
   - Create test or custom users
   - Start backend/frontend
   - Check system status and more

4. **Alternatively, start both backend & frontend together:**
   ```bash
   npm run dev
   ```

---

## Cursor IDE Setup

PIDEA integrates with Cursor IDE for enhanced development experience. Follow these steps to set up the integration:

### Step 1: Download Cursor IDE

**Download Cursor IDE from the official website:**
- Visit: https://cursor.sh/
- Download the appropriate version for your operating system

### Step 2: Start Cursor with Remote Debugging

**Option A: Manual Commands**

**Linux (AppImage):**
```bash
# Navigate to your download directory
cd ~/Downloads  # or wherever you downloaded the AppImage

# Start Cursor with remote debugging
appimage-run ./Cursor-1.x.x-x86_64.AppImage \
  --user-data-dir="$HOME/.cursor-profile-dev" \
  --remote-debugging-port=9222
```

**Linux (Installed):**
```bash
cursor \
  --user-data-dir="$HOME/.cursor-profile-dev" \
  --remote-debugging-port=9222
```

**Windows:**
```cmd
# Navigate to Cursor installation directory (usually)
cd "C:\Users\%USERNAME%\AppData\Local\Programs\cursor"

# Start Cursor with remote debugging
cursor.exe --user-data-dir="%USERPROFILE%\.cursor-profile-dev" --remote-debugging-port=9222
```

**macOS:**
```bash
/Applications/Cursor.app/Contents/MacOS/Cursor \
  --user-data-dir="$HOME/.cursor-profile-dev" \
  --remote-debugging-port=9222
```

**Option B: IDE Starter Scripts (Recommended)**

We provide convenient starter scripts that manage multiple IDE instances with automatic port allocation:

**Linux/macOS:**
```bash
# Interactive menu
./start_ide_example.sh menu

# Direct commands
./start_ide_example.sh cursor        # Start Cursor with free port
./start_ide_example.sh cursor 3      # Start Cursor on slot 3 (port 9224)
./start_ide_example.sh cursor auto   # Auto-find free slot
```

**Windows PowerShell:**
```powershell
# Interactive menu
.\start_ide_example.ps1 menu

# Direct commands
.\start_ide_example.ps1 cursor       # Start Cursor with free port
.\start_ide_example.ps1 vscode 3     # Start VSCode on slot 3 (port 9235)
.\start_ide_example.ps1 cursor auto  # Auto-find free slot
```

**Windows Batch:**
```cmd
# Interactive menu
start_ide_example.bat menu

# Direct commands
start_ide_example.bat cursor         # Start Cursor with free port
start_ide_example.bat vscode 3       # Start VSCode on slot 3
start_ide_example.bat cursor auto    # Auto-find free slot
```

**Port Ranges:**
- **Cursor**: Ports 9222-9232 (11 slots)
- **VSCode**: Ports 9233-9242 (10 slots)

Each slot gets its own directory and port, allowing you to run multiple IDE instances simultaneously without conflicts.

### VS Code Support (Experimental)

**⚠️ Note: VS Code support is experimental and not fully functional yet.**

**Linux/macOS:**
```bash
code --no-sandbox --remote-debugging-port=9232
```

**Windows:**
```cmd
code.exe --no-sandbox --remote-debugging-port=9232
```

### Step 3: Verify Connection

Once Cursor is running with remote debugging enabled, PIDEA can connect to it and provide IDE mirroring functionality.

**Parameters explained:**
- `--user-data-dir`: Creates a separate profile directory for development, keeping your main Cursor profile clean
- `--remote-debugging-port=9222`: Enables remote debugging on port 9222, which PIDEA uses to connect to your IDE

---

## Overview

**Personal IDE Agent** - An innovative web-based platform designed to enhance developer productivity through integrated tools and AI-driven assistance. It provides a seamless environment for coding, collaboration, and project management, with features like real-time chat, IDE mirroring, and content preview. The platform is built to support developers in creating, analyzing, and refactoring projects efficiently.

## Key Features

- **Real-Time Chat System**: Interact with AI assistants for coding support directly within the platform, designed primarily for single users with a focus on local IDE integration which is critical for functionality.
- **IDE Integration**: Mirror and interact with your Cursor IDE for a unified coding experience.
- **Preview Functionality**: View code output or project content in real-time alongside your workspace.
- **Multi-View Interface**: Switch between chat, code, IDE mirror, and preview modes to suit your workflow.

## Upcoming Enhancements

### Mobile Web Interface
PIDEA is being adapted for mobile devices to ensure accessibility and usability on the go. Planned updates include:
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
- Commit, push, pull, and manage branches directly from the PIDEA interface.
- Execute Git commands securely via backend scripts.

### Terminal Management
An emulated terminal is planned for running commands specific to the project:
- Commands will be restricted to the work path to ensure security.
- Global command execution will be prohibited to prevent unintended system changes.

### Extended IDE Support
Future versions will expand IDE integration beyond Cursor to include:
- **VS Code**: Full integration with Visual Studio Code for seamless development workflows.
- **Windsurf**: Support for the Windsurf IDE to provide additional development environment options.
- **Universal IDE Interface**: A standardized approach to IDE communication that can be extended to support other popular development environments.

## Project Structure
- **frontend/**: Contains React-based UI components and pages for chat, preview, and IDE integration.
- **backend/**: Manages chat sessions, message handling, and IDE communication.
- **framework/**: Includes templates and prompts for project scaffolding and AI interactions.
- **scripts/**: Automation tools for DOM analysis, task management, and more.
- **docs/**: Detailed documentation on features, setup, and development.

## Contributing
I welcome contributions to PIDEA! Please follow these steps:
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a pull request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support the Project

If you find this project useful, please consider supporting its development:

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.me/SupportMySnacks)

Your support helps cover development costs and keeps the project actively maintained.

## Personal Goal: Project Unifier

My personal objective with PIDEA is to create a unifying platform for all my projects. The goal is to standardize frameworks, maintain consistent documentation, and ensure a uniform structure across different endeavors. I'm happy to share this tool with the community, hoping it saves time and brings efficiency to others as well.

## Contact
For questions or feedback, reach me out via email : pa.boe90@gmail.com
