import { promises as fs } from 'fs';
import { glob } from 'glob';

export interface SearchOptions {
  pattern: string;
  searchType: 'files' | 'content' | 'smart';
  filePattern?: string;
  maxResults?: number;
  caseSensitive?: boolean;
  contextLines?: number;
}

export interface SearchResult {
  path: string;
  type: 'file' | 'content';
  matches?: ContentMatch[];
  score?: number;
}

export interface ContentMatch {
  line: number;
  text: string;
  context?: string[];
}

export async function search(
  searchPath: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const {
    pattern,
    searchType,
    filePattern = '*',
    maxResults = 100,
    caseSensitive = false,
    contextLines = 2,
  } = options;

  const results: SearchResult[] = [];

  // Determine actual search type
  let actualSearchType = searchType;
  if (searchType === 'smart') {
    actualSearchType = detectSearchType(pattern);
  }

  if (actualSearchType === 'files') {
    // Search for files by name
    await searchFiles(searchPath, pattern, filePattern, results, maxResults);
  } else {
    // Search for content in files
    await searchContent(
      searchPath,
      pattern,
      filePattern,
      results,
      maxResults,
      caseSensitive,
      contextLines
    );
  }

  return results;
}

async function searchFiles(
  searchPath: string,
  pattern: string,
  _filePattern: string,
  results: SearchResult[],
  maxResults: number
): Promise<void> {
  try {
    // Use glob for file search
    const globPattern = `${searchPath}/**/${pattern}`;
    const files = await glob(globPattern, {
      nocase: true,
      maxDepth: 10,
    });

    for (const file of files.slice(0, maxResults)) {
      results.push({
        path: file,
        type: 'file',
      });
    }
  } catch (error) {
    console.error('File search error:', error);
  }
}

async function searchContent(
  searchPath: string,
  pattern: string,
  filePattern: string,
  results: SearchResult[],
  maxResults: number,
  caseSensitive: boolean,
  contextLines: number
): Promise<void> {
  try {
    // Get all files matching the file pattern
    const globPattern = `${searchPath}/**/${filePattern}`;
    const files = await glob(globPattern, {
      nocase: true,
      maxDepth: 10,
    });

    const regex = new RegExp(
      escapeRegex(pattern),
      caseSensitive ? 'g' : 'gi'
    );

    // Search content in parallel (batches of 10)
    const batchSize = 10;
    for (let i = 0; i < files.length && results.length < maxResults; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((file) => searchFileContent(file, regex, contextLines))
      );

      for (const result of batchResults) {
        if (result && result.matches && result.matches.length > 0) {
          results.push(result);
          if (results.length >= maxResults) break;
        }
      }
    }
  } catch (error) {
    console.error('Content search error:', error);
  }
}

async function searchFileContent(
  filePath: string,
  regex: RegExp,
  contextLines: number
): Promise<SearchResult | null> {
  try {
    const stats = await fs.stat(filePath);

    // Skip binary files and large files
    if (stats.size > 10 * 1024 * 1024) return null; // Skip >10MB

    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const matches: ContentMatch[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        const context: string[] = [];

        // Add context lines before
        for (let j = Math.max(0, i - contextLines); j < i; j++) {
          context.push(lines[j]);
        }

        // Add context lines after
        for (
          let j = i + 1;
          j <= Math.min(lines.length - 1, i + contextLines);
          j++
        ) {
          context.push(lines[j]);
        }

        matches.push({
          line: i + 1,
          text: lines[i],
          context,
        });
      }

      // Reset regex for next line
      regex.lastIndex = 0;
    }

    if (matches.length > 0) {
      return {
        path: filePath,
        type: 'content',
        matches,
      };
    }

    return null;
  } catch (error) {
    // Skip files we can't read
    return null;
  }
}

function detectSearchType(pattern: string): 'files' | 'content' {
  // If pattern looks like a filename pattern, search files
  if (
    pattern.includes('*') ||
    pattern.includes('.') ||
    pattern.match(/\.(js|ts|py|txt|md|json|csv)$/i)
  ) {
    return 'files';
  }
  // Otherwise search content
  return 'content';
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
