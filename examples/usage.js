/**
 * Example usage of the MCP-GitIngest server
 * 
 * This script demonstrates how to use the MCP-GitIngest server
 * to fetch information about a GitHub repository.
 */

import { GitIngester } from '../src/gitingest-mcp/ingest.js';

async function main() {
  try {
    // Example repository URL
    const repoUrl = 'https://github.com/facebook/react';
    
    console.log(`Fetching data for repository: ${repoUrl}`);
    
    // Create a new GitIngester instance
    const ingester = new GitIngester(repoUrl);
    
    // Fetch repository data
    console.log('Fetching repository data...');
    await ingester.fetchRepoData();
    
    // Get repository summary
    console.log('\n--- Repository Summary ---');
    console.log(ingester.getSummary());
    
    // Get repository tree structure (first level only for brevity)
    console.log('\n--- Repository Structure (First Level) ---');
    const tree = ingester.getTree();
    console.log(tree.split('\n').filter(line => !line.includes('  ')).join('\n'));
    
    // Get specific files
    console.log('\n--- Repository Files ---');
    const filesToFetch = ['README.md', 'package.json'];
    console.log(`Fetching files: ${filesToFetch.join(', ')}`);
    const filesContent = ingester.getContent(filesToFetch);
    console.log(filesContent);
    
    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error in example:', error.message);
  }
}

// Run the example
main().catch(console.error);
