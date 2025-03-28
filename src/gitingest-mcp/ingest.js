import axios from 'axios';
import { Octokit } from 'octokit';

class GitIngester {
  constructor(url, branch = null) {
    /**
     * Initialize the GitIngester with a repository URL.
     * @param {string} url - The GitHub repository URL
     * @param {string|null} branch - Optional branch name
     */
    this.url = url;
    this.branch = branch;
    
    // Parse owner and repo from URL
    const urlMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (urlMatch) {
      this.owner = urlMatch[1];
      this.repo = urlMatch[2];
    } else {
      throw new Error('Invalid GitHub URL format');
    }

    if (branch) {
      this.url = `${url}/tree/${branch}`;
    }
    
    this.summary = null;
    this.tree = null;
    this.content = null;
    this.octokit = new Octokit();
  }

  async fetchRepoData() {
    /**
     * Asynchronously fetch and process repository data.
     */
    try {
      // Fetch repository information
      const repoInfo = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo
      });

      // Fetch repository contents
      const contentsResponse = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: '',
        ref: this.branch || repoInfo.data.default_branch
      });

      // Process the data
      await this._processRepoData(repoInfo.data, contentsResponse.data);
    } catch (error) {
      console.error('Error fetching repository data:', error);
      throw new Error(`Failed to fetch repository data: ${error.message}`);
    }
  }

  async _processRepoData(repoInfo, contents) {
    /**
     * Process the repository data and generate summary, tree, and content.
     * @param {Object} repoInfo - Repository information from GitHub API
     * @param {Array} contents - Repository contents from GitHub API
     */
    // Generate summary
    this.summary = this._generateSummary(repoInfo);
    
    // Generate tree
    this.tree = await this._generateTree(contents);
    
    // Generate content
    this.content = await this._generateContent(contents);
  }

  _generateSummary(repoInfo) {
    /**
     * Generate a summary of the repository.
     * @param {Object} repoInfo - Repository information from GitHub API
     * @returns {Object} - Repository summary
     */
    const summary = {
      repository: `${this.owner}/${this.repo}`,
      description: repoInfo.description || 'No description provided',
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      language: repoInfo.language,
      created_at: repoInfo.created_at,
      updated_at: repoInfo.updated_at,
      raw: ''
    };

    // Format raw summary
    summary.raw = `Repository: ${summary.repository}\n` +
                  `Description: ${summary.description}\n` +
                  `Language: ${summary.language || 'Not specified'}\n` +
                  `Stars: ${summary.stars}\n` +
                  `Forks: ${summary.forks}\n` +
                  `Created: ${new Date(summary.created_at).toLocaleDateString()}\n` +
                  `Last updated: ${new Date(summary.updated_at).toLocaleDateString()}`;

    return summary;
  }

  async _generateTree(contents, path = '') {
    /**
     * Generate a tree representation of the repository structure.
     * @param {Array} contents - Repository contents from GitHub API
     * @param {string} path - Current path in the repository
     * @returns {string} - Tree representation of the repository
     */
    let tree = '';
    
    // Sort contents: directories first, then files
    const sortedContents = [...contents].sort((a, b) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });

    for (const item of sortedContents) {
      const indent = path ? '  '.repeat(path.split('/').filter(Boolean).length) : '';
      const itemPath = path ? `${path}/${item.name}` : item.name;
      
      if (item.type === 'dir') {
        tree += `${indent}📁 ${item.name}/\n`;
        
        try {
          const subContents = await this.octokit.rest.repos.getContent({
            owner: this.owner,
            repo: this.repo,
            path: itemPath,
            ref: this.branch
          });
          
          tree += await this._generateTree(subContents.data, itemPath);
        } catch (error) {
          tree += `${indent}  ⚠️ Error loading directory contents\n`;
        }
      } else {
        tree += `${indent}📄 ${item.name}\n`;
      }
    }
    
    return tree;
  }

  async _generateContent(contents, path = '') {
    /**
     * Generate a representation of the repository content.
     * @param {Array} contents - Repository contents from GitHub API
     * @param {string} path - Current path in the repository
     * @returns {string} - Content representation of the repository
     */
    let content = '';
    
    for (const item of contents) {
      const itemPath = path ? `${path}/${item.name}` : item.name;
      
      if (item.type === 'file') {
        try {
          // Skip binary files and large files
          if (this._isBinaryFile(item.name) || item.size > 1000000) {
            content += `${'='.repeat(50)}\n`;
            content += `File: ${itemPath}\n`;
            content += `${'='.repeat(50)}\n`;
            content += `[Binary or large file: ${item.size} bytes]\n\n`;
            continue;
          }
          
          const fileContent = await this.octokit.rest.repos.getContent({
            owner: this.owner,
            repo: this.repo,
            path: itemPath,
            ref: this.branch
          });
          
          const decodedContent = Buffer.from(fileContent.data.content, 'base64').toString('utf-8');
          
          content += `${'='.repeat(50)}\n`;
          content += `File: ${itemPath}\n`;
          content += `${'='.repeat(50)}\n`;
          content += `${decodedContent}\n\n`;
        } catch (error) {
          content += `${'='.repeat(50)}\n`;
          content += `File: ${itemPath}\n`;
          content += `${'='.repeat(50)}\n`;
          content += `[Error loading file: ${error.message}]\n\n`;
        }
      } else if (item.type === 'dir') {
        try {
          const subContents = await this.octokit.rest.repos.getContent({
            owner: this.owner,
            repo: this.repo,
            path: itemPath,
            ref: this.branch
          });
          
          content += await this._generateContent(subContents.data, itemPath);
        } catch (error) {
          // Skip directory errors
        }
      }
    }
    
    return content;
  }

  _isBinaryFile(filename) {
    /**
     * Check if a file is likely to be binary based on its extension.
     * @param {string} filename - The filename to check
     * @returns {boolean} - True if the file is likely binary, false otherwise
     */
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
      '.mp3', '.mp4', '.wav', '.ogg', '.avi', '.mov', '.flv',
      '.zip', '.tar', '.gz', '.rar', '.7z',
      '.exe', '.dll', '.so', '.dylib',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
    ];
    
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return binaryExtensions.includes(ext);
  }

  getSummary() {
    /**
     * Returns the repository summary.
     * @returns {string} - Repository summary
     */
    return this.summary ? this.summary.raw : 'Summary not available';
  }

  getTree() {
    /**
     * Returns the repository tree structure.
     * @returns {string} - Repository tree structure
     */
    return this.tree || 'Tree structure not available';
  }

  getContent(filePaths = null) {
    /**
     * Returns the repository content or specific files.
     * @param {Array|null} filePaths - Optional list of file paths to retrieve
     * @returns {string} - Repository content or specific files
     */
    if (!filePaths) {
      return this.content || 'Content not available';
    }
    
    return this._getFilesContent(filePaths);
  }

  _getFilesContent(filePaths) {
    /**
     * Helper function to extract specific files from repository content.
     * @param {Array} filePaths - List of file paths to retrieve
     * @returns {string} - Content of the specified files
     */
    if (!this.content) {
      return 'Content not available';
    }
    
    const contentStr = this.content;
    const result = {};
    
    for (const path of filePaths) {
      result[path] = null;
    }
    
    // Pattern to match file content sections
    const pattern = /={50}\nFile: ([^\n]+)\n={50}/g;
    let match;
    
    while ((match = pattern.exec(contentStr)) !== null) {
      const filename = match[1].trim();
      const startPos = match.index + match[0].length;
      
      // Find the next file header or end of string
      const nextMatch = contentStr.indexOf('='.repeat(50) + '\nFile:', startPos);
      const endPos = nextMatch !== -1 ? nextMatch : contentStr.length;
      const fileContent = contentStr.substring(startPos, endPos).trim();
      
      // Check if this file matches any of the requested paths
      for (const path of filePaths) {
        const basename = path.split('/').pop();
        if (path === filename || basename === filename || path.endsWith('/' + filename)) {
          result[path] = fileContent;
        }
      }
    }
    
    // Concatenate all found file contents with file headers
    let concatenated = '';
    for (const [path, content] of Object.entries(result)) {
      if (content !== null) {
        if (concatenated) {
          concatenated += '\n\n';
        }
        concatenated += `${'='.repeat(50)}\n`;
        concatenated += `File: ${path}\n`;
        concatenated += `${'='.repeat(50)}\n`;
        concatenated += content;
      }
    }
    
    return concatenated || 'None of the requested files were found';
  }
}

export { GitIngester };
