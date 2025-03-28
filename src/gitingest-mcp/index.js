#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { GitIngester } from './ingest.js';

class GitIngestServer {
  constructor() {
    this.server = new Server(
      {
        name: 'gitingest-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    // Git Summary Tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'git_summary') {
        const { owner, repo, branch } = request.params.arguments;
        
        try {
          const ingester = new GitIngester(`https://github.com/${owner}/${repo}`, branch);
          await ingester.fetchRepoData();
          let summary = ingester.getSummary();

          try {
            // Try to fetch README.md
            const readmeContent = ingester.getContent(['README.md']);
            if (readmeContent && readmeContent.includes('README.md')) {
              summary = `${summary}\n\n${readmeContent}`;
            }
          } catch (error) {
            // Ignore README fetch errors
          }

          return {
            content: [
              {
                type: 'text',
                text: summary,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to get repository summary: ${error.message}. Try visiting https://github.com/${owner}/${repo} directly.`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === 'git_tree') {
        const { owner, repo, branch } = request.params.arguments;
        
        try {
          const ingester = new GitIngester(`https://github.com/${owner}/${repo}`, branch);
          await ingester.fetchRepoData();
          const tree = ingester.getTree();

          return {
            content: [
              {
                type: 'text',
                text: tree,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to get repository tree: ${error.message}. Try visiting https://github.com/${owner}/${repo} directly.`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === 'git_files') {
        const { owner, repo, file_paths, branch } = request.params.arguments;
        
        try {
          const ingester = new GitIngester(`https://github.com/${owner}/${repo}`, branch);
          await ingester.fetchRepoData();
          const filesContent = ingester.getContent(file_paths);
          
          if (!filesContent) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'None of the requested files were found in the repository',
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: filesContent,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to get file content: ${error.message}. Try visiting https://github.com/${owner}/${repo} directly.`,
              },
            ],
            isError: true,
          };
        }
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${request.params.name}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'git_summary',
          description: 'Get a summary of a GitHub repository that includes repo name, files in repo, number of tokens in repo, and summary from the README.md',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'The GitHub organization or username',
              },
              repo: {
                type: 'string',
                description: 'The repository name',
              },
              branch: {
                type: 'string',
                description: 'Optional branch name',
              },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'git_tree',
          description: 'Get the tree structure of a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'The GitHub organization or username',
              },
              repo: {
                type: 'string',
                description: 'The repository name',
              },
              branch: {
                type: 'string',
                description: 'Optional branch name',
              },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'git_files',
          description: 'Get the content of specific files from a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'The GitHub organization or username',
              },
              repo: {
                type: 'string',
                description: 'The repository name',
              },
              file_paths: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'List of paths to files within the repository',
              },
              branch: {
                type: 'string',
                description: 'Optional branch name',
              },
            },
            required: ['owner', 'repo', 'file_paths'],
          },
        },
      ],
    }));
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitIngest MCP server running on stdio');
  }
}

function main() {
  const server = new GitIngestServer();
  server.run().catch(console.error);
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
