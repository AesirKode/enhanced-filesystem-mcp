
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { analyzeFile } from '../core/analysis.js';
import path from 'path';
import fs from 'fs';

export const analysisTool: Tool = {
  name: 'analysis_tool',
  description: `Code analysis tool for TypeScript/JavaScript files.

Extracts structure (classes, functions, imports) without reading the full file.
Useful for understanding codebases quickly.

Operations:
- 'summarize': Get high-level structure of a file
- 'imports': List all imports in a file

Examples:

1. Summarize a file:
{ operation: 'summarize', path: 'src/index.ts' }

2. Check imports:
{ operation: 'imports', path: 'src/core/utils.ts' }`,

  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['summarize', 'imports'],
        description: 'Analysis operation'
      },
      path: {
        type: 'string',
        description: 'Path to the file to analyze'
      }
    },
    required: ['operation', 'path']
  }
};

export async function executeAnalysisOperation(args: { operation: string; path: string }): Promise<string> {
  if (!fs.existsSync(args.path)) {
    throw new Error(`File not found: ${args.path}`);
  }

  const summary = analyzeFile(args.path);

  if (args.operation === 'imports') {
    return JSON.stringify(summary.imports, null, 2);
  }

  // Summarize
  const output = [];
  output.push(`File: ${path.basename(summary.path)}`);

  if (summary.imports.length > 0) {
    output.push(`\nImports (${summary.imports.length}):`);
    summary.imports.forEach(imp => {
      const parts = [];
      if (imp.default) parts.push(imp.default);
      if (imp.named) parts.push(`{ ${imp.named.join(', ')} }`);
      output.push(`  - ${parts.join(', ')} from '${imp.module}'`);
    });
  }

  if (summary.classes.length > 0) {
    output.push(`\nClasses (${summary.classes.length}):`);
    summary.classes.forEach(c => {
      output.push(`  - ${c.name} (${c.visibility}) [L${c.line}]`);
    });
  }

  if (summary.interfaces.length > 0) {
    output.push(`\nInterfaces (${summary.interfaces.length}):`);
    summary.interfaces.forEach(i => {
      output.push(`  - ${i.name} (${i.visibility}) [L${i.line}]`);
    });
  }

  if (summary.functions.length > 0) {
    output.push(`\nFunctions (${summary.functions.length}):`);
    summary.functions.forEach(f => {
      output.push(`  - ${f.name} (${f.visibility}) [L${f.line}]`);
    });
  }

  if (summary.variables.length > 0) {
    output.push(`\nVariables (${summary.variables.length}):`);
    summary.variables.forEach(v => {
      output.push(`  - ${v.name} (${v.visibility}) [L${v.line}]`);
    });
  }

  return output.join('\n');
}
