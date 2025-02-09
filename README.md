# julia-runner MCP Server

A Model Context Protocol server for interacting with Julia.

## Available Tools

This server provides the following tools:

- `execute_julia`: Execute Julia code.
  - Input parameters:
    - `code` (string, required): The Julia code to execute.
- `add_julia_package`: Add a Julia package to the project.
  - Input parameters:
    - `package_name` (string, required): The name of the Julia package to add.
- `get_installed_julia_packages`: Get the list of installed Julia packages.
  - Input parameters: None
- `get_julia_documentation`: Get documentation for a Julia function.
  - Input parameters:
    - `function_name` (string, required): The name of the Julia function.

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "julia-runner": {
      "command": "/path/to/julia-runner/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
