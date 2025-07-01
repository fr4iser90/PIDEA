# Chat Web Frontend – UX/UI Patterns & Features

## Core Features
- Chat-Panel mit Markdown/Code/Attachments
- Input-Box mit Multiline, File-Upload, Shortcuts
- Sidebar für Sessions/Threads
- User-Status & Settings

## Advanced Features
- Preview-Modal (zentral, 2/3 Mainframe, resizable)
- Split-View (Chat + Preview nebeneinander)
- Collapsible Sidebars
- Floating Actions im Preview
- History/Timeline
- Multi-Tab/Session Support

## Layout-Patterns
- Overlay-Modal (zentriert, resizable, close/minimize)
- Split-View (Preview als Panel, resizable)
- Full-Page-Preview (kompletter Mainframe, zurück zum Chat)

## Dynamik & Responsiveness
- CSS Grid/Flexbox für Layout
- State-Management für UI-Zustände
- Animierte Transitions
- Accessibility (Keyboard, ARIA)

## Inspiration
- [bolt.new](https://bolt.new)
- [replit.com](https://replit.com)
- [codesandbox.io](https://codesandbox.io)


flowchart LR
    Header["Header (oben, fixierbar, minimierbar)"]
    Sidebar["Sidebar (links, ein-/ausblendbar)"]
    Chat["Chat/Main (zentral)"]
    RightPanel["RightPanel/Preview (rechts, ein-/ausblendbar)"]

    subgraph MainFrame
        Sidebar -- "flex/resizable" --> Chat
        Chat -- "flex/resizable" --> RightPanel
    end

    Header --- MainFrame