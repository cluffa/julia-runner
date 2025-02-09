#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';

class JuliaRunnerServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'julia-runner',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'execute_julia',
          description: 'Execute Julia code',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Julia code to execute',
              },
            },
            required: ['code'],
          },
        },
        {
          name: 'add_julia_package',
          description: 'Add a Julia package to the project',
          inputSchema: {
            type: 'object',
            properties: {
              package_name: {
                type: 'string',
                description: 'Name of the Julia package to add',
              },
            },
            required: ['package_name'],
          },
        },
        {
          name: 'get_installed_julia_packages',
          description: 'Get the list of installed Julia packages',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_julia_documentation',
          description: 'Get documentation for a Julia function',
          inputSchema: {
            type: 'object',
            properties: {
              function_name: {
                type: 'string',
                description: 'Name of the Julia function',
              },
            },
            required: ['function_name'],
          },
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const projectDir = new URL('.', import.meta.url).pathname;

      if (request.params.name === 'execute_julia') {
        const code = String(request.params.arguments?.code);
        if (!code) {
          throw new McpError(ErrorCode.InvalidParams, 'Code is required');
        }

        try {
          const activatedCode = `using Pkg; Pkg.activate("${projectDir}"); ${code}`;
          const result = await this.executeJuliaCode(activatedCode, projectDir);
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } catch (error) {
          console.error('Error executing Julia code:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error executing Julia code: ${error}`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === 'add_julia_package') {
        const packageName = String(request.params.arguments?.package_name);
        if (!packageName) {
          throw new McpError(ErrorCode.InvalidParams, 'Package name is required');
        }

        try {
          const addPackageCode = `using Pkg; Pkg.activate("${projectDir}"); Pkg.add("${packageName}")`;
          const result = await this.executeJuliaCode(addPackageCode, projectDir);
          return {
            content: [
              {
                type: 'text',
                text: `Package ${packageName} added successfully:\n${result}`,
              },
            ],
          };
        } catch (error) {
          console.error('Error adding Julia package:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error adding Julia package: ${error}`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === 'get_installed_julia_packages') {
        try {
          const code = `using Pkg; Pkg.activate("${projectDir}"); Pkg.status()`;
          const result = await this.executeJuliaCode(code, projectDir);
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } catch (error) {
          console.error('Error getting installed Julia packages:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error getting installed Julia packages: ${error}`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === 'get_julia_documentation') {
        const functionName = String(request.params.arguments?.function_name);
        if (!functionName) {
          throw new McpError(ErrorCode.InvalidParams, 'Function name is required');
        }

        try {
          const code = `using Pkg; Pkg.activate("${projectDir}"); println(@doc ${functionName})`;
          const result = await this.executeJuliaCode(code, projectDir);
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } catch (error) {
          console.error('Error getting Julia documentation:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error getting Julia documentation: ${error}`,
              },
            ],
            isError: true,
          };
        }
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }
    });
  }

  private async executeJuliaCode(code: string, cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const juliaProcess = spawn('julia', ['-e', code], { cwd });
      let output = '';
      let errorOutput = '';

      juliaProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      juliaProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      juliaProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Julia process exited with code ${code}: ${errorOutput}`));
        }
      });

      juliaProcess.on('error', (err) => {
        reject(new Error(`Failed to start Julia process: ${err}`));
      });
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Julia Runner MCP server running on stdio');
  }
}

const server = new JuliaRunnerServer();
server.run().catch(console.error);
