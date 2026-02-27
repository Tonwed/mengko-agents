# Mengko Agents

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

An open-source desktop AI agent application with multi-provider support, built with Electron and React.

## Features

- **Multi-Provider Support**: Connect to Anthropic Claude, OpenAI, Google AI Studio, ChatGPT Plus, GitHub Copilot, Ollama, and any OpenAI-compatible endpoint
- **Session Management**: Organize conversations with labels, statuses, and search
- **MCP Integration**: Connect to Linear, GitHub, Slack, and more through MCP servers
- **Permission Modes**: Explore (read-only), Ask to Edit (confirmations), Auto (full autonomy)
- **Internationalization**: English and Chinese language support
- **Dark/Light Themes**: Customizable appearance with multiple color themes
- **Skills**: Define custom agent instructions for specialized workflows
- **Hooks**: Event-driven automation for advanced workflows

## Installation

Download the latest release for your platform:

- **macOS**: [Mengko-Agent-arm64.dmg](https://github.com/Tonwed/mengko-agents/releases/latest) or [Mengko-Agent-x64.dmg](https://github.com/Tonwed/mengko-agents/releases/latest)
- **Windows**: [Mengko-Agent-x64.exe](https://github.com/Tonwed/mengko-agents/releases/latest)
- **Linux**: [Mengko-Agent-x64.AppImage](https://github.com/Tonwed/mengko-agents/releases/latest)

### Build from Source

```bash
git clone https://github.com/Tonwed/mengko-agents.git
cd mengko-agents
bun install
bun run electron:start
```

## Quick Start

1. **Launch the app** after installation
2. **Choose API Connection**: Use Anthropic (API key), Google AI Studio, ChatGPT Plus, GitHub Copilot, or any OpenAI-compatible provider
3. **Create a workspace**: Set up a workspace to organize your sessions
4. **Connect sources** (optional): Add MCP servers, REST APIs, or local filesystems
5. **Start chatting**: Create sessions and interact with your AI assistant

## Supported LLM Providers

| Provider | Auth Method |
|----------|-------------|
| **Anthropic Claude** | API key or OAuth |
| **Google AI Studio** | API key |
| **ChatGPT Plus / Pro** | OAuth |
| **GitHub Copilot** | OAuth |
| **OpenRouter** | API key |
| **Ollama** | Local (no key) |
| **Custom** | Any OpenAI-compatible endpoint |

## Configuration

Configuration is stored at `~/.mengko-agent/`:

```
~/.mengko-agent/
├── config.json        # Main config (workspaces, LLM connections)
├── credentials.enc    # Encrypted credentials (AES-256-GCM)
├── preferences.json   # User preferences
└── workspaces/
    └── {id}/
        ├── sessions/  # Session data
        ├── sources/   # Connected sources
        └── skills/    # Custom skills
```

## Development

```bash
# Development mode with hot reload
bun run electron:dev

# Build and run
bun run electron:start

# Type checking
bun run typecheck

# Build distribution
bun run electron:dist
```

## Version Management

To bump the version number:

```bash
bun run version patch   # 1.0.0 -> 1.0.1
bun run version minor   # 1.0.0 -> 1.1.0
bun run version major   # 1.0.0 -> 2.0.0
bun run version 1.2.3   # Set specific version
```

This will:
1. Update all `package.json` files
2. Create a release notes template

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | [Bun](https://bun.sh/) |
| AI SDK | [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) |
| Desktop | [Electron](https://www.electronjs.org/) + React |
| UI | [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS v4 |
| Build | esbuild (main) + Vite (renderer) |
| State | [Jotai](https://jotai.org/) |

## Architecture

```
mengko-agents/
├── apps/
│   └── electron/           # Desktop application
│       └── src/
│           ├── main/       # Electron main process
│           ├── preload/    # Context bridge
│           └── renderer/   # React UI
├── packages/
│   ├── core/              # Core utilities
│   ├── shared/            # Business logic
│   ├── ui/                # Shared UI components
│   ├── mermaid/           # Mermaid diagram support
│   ├── session-mcp-server/ # MCP server
│   └── pi-agent-server/   # Pi SDK integration
└── scripts/               # Build and utility scripts
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+N` | New chat |
| `Cmd/Ctrl+1/2/3` | Focus sidebar/list/chat |
| `Cmd/Ctrl+/` | Keyboard shortcuts dialog |
| `Shift+Tab` | Cycle permission modes |
| `Enter` | Send message |
| `Shift+Enter` | New line |

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

To report security vulnerabilities, please see [SECURITY.md](SECURITY.md).