# MCP-GitIngest

An MCP server for GitHub repository ingestion. This allows MCP clients like Claude Desktop, Cline, Cursor, etc. to quickly extract information about GitHub repositories including:

- Repository summaries
- Project directory structure
- File content

## Features

- **Repository Summary**: Get basic information about a GitHub repository including name, description, language, stars, forks, and creation/update dates.
- **Directory Structure**: View the complete directory structure of a repository.
- **File Content**: Retrieve the content of specific files from a repository.

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installing from npm

```bash
npm install -g mcp-gitingest
```

### Installing from Source

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/mcp-gitingest.git
   cd mcp-gitingest
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Run the server
   ```bash
   npm start
   ```

## Updating the MCP Client Configuration

Add this to your MCP client config file:

### For Claude Desktop (macOS)

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add the following to the `mcpServers` object:

```json
{
  "mcpServers": {
    "gitingest": {
      "command": "node",
      "args": ["/path/to/mcp-gitingest/src/gitingest-mcp/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### For Cline

Edit the Cline MCP settings file:

```bash
code ~/.vscode-server/data/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

Add the following to the `mcpServers` object:

```json
{
  "mcpServers": {
    "gitingest": {
      "command": "node",
      "args": ["/path/to/mcp-gitingest/src/gitingest-mcp/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Usage

Once the MCP server is configured and running, you can use it with your MCP client. The server provides the following tools:

### git_summary

Get a summary of a GitHub repository.

**Parameters:**
- `owner`: The GitHub organization or username
- `repo`: The repository name
- `branch` (optional): The branch name

**Example:**
```
Get a summary of the React repository
```

### git_tree

Get the tree structure of a GitHub repository.

**Parameters:**
- `owner`: The GitHub organization or username
- `repo`: The repository name
- `branch` (optional): The branch name

**Example:**
```
Show me the directory structure of facebook/react
```

### git_files

Get the content of specific files from a GitHub repository.

**Parameters:**
- `owner`: The GitHub organization or username
- `repo`: The repository name
- `file_paths`: List of paths to files within the repository
- `branch` (optional): The branch name

**Example:**
```
Show me the package.json and README.md files from facebook/react
```

## Debugging

If you encounter issues, you can run the server in debug mode:

```bash
node --inspect src/gitingest-mcp/index.js
```

## License

MIT
