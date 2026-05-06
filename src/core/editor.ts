import { promises as fs } from 'fs';


export interface EditOptions {
  oldText: string;
  newText: string;
  count?: number; // -1 for all occurrences, default 1
  caseSensitive?: boolean;
  /** When true, compute the replacement but don't write to disk. */
  dryRun?: boolean;
}

export interface EditResult {
  replacements: number;
  originalSize: number;
  newSize: number;
  /** True if the operation was a preview (no file write happened). */
  dryRun: boolean;
  /** Short context excerpts of what the change looks like — only set when dryRun=true. */
  preview?: {
    excerpts: { before: string; after: string }[];
  };
}

export async function editFile(
  filePath: string,
  options: EditOptions
): Promise<EditResult> {
  const { oldText, newText, count = 1, caseSensitive = true, dryRun = false } = options;

  // Read file
  const content = await fs.readFile(filePath, 'utf8');
  const originalSize = content.length;

  // Perform replacement
  let newContent: string;
  let replacements = 0;
  // Track replacement positions for dry-run preview excerpts.
  const matchPositions: number[] = [];

  if (count === -1) {
    // Replace all occurrences
    if (caseSensitive) {
      const regex = new RegExp(escapeRegex(oldText), 'g');
      newContent = content.replace(regex, (_match, offset: number) => {
        replacements++;
        matchPositions.push(offset);
        return newText;
      });
    } else {
      const regex = new RegExp(escapeRegex(oldText), 'gi');
      newContent = content.replace(regex, (_match, offset: number) => {
        replacements++;
        matchPositions.push(offset);
        return newText;
      });
    }
  } else {
    // Replace specific number of occurrences
    let remaining = count;
    if (caseSensitive) {
      const regex = new RegExp(escapeRegex(oldText), 'g');
      newContent = content.replace(regex, (match, offset: number) => {
        if (remaining > 0) {
          remaining--;
          replacements++;
          matchPositions.push(offset);
          return newText;
        }
        return match;
      });
    } else {
      const regex = new RegExp(escapeRegex(oldText), 'gi');
      newContent = content.replace(regex, (match, offset: number) => {
        if (remaining > 0) {
          remaining--;
          replacements++;
          matchPositions.push(offset);
          return newText;
        }
        return match;
      });
    }
  }

  // Write back to file (skip on dry-run)
  if (!dryRun) {
    await fs.writeFile(filePath, newContent, 'utf8');
  }

  // Build preview excerpts for dry-run only — keeps the success path lean.
  let preview: EditResult['preview'];
  if (dryRun && matchPositions.length > 0) {
    const PAD = 60;
    const limit = Math.min(matchPositions.length, 3);
    const excerpts: { before: string; after: string }[] = [];
    for (let i = 0; i < limit; i++) {
      const pos = matchPositions[i];
      const ctxStart = Math.max(0, pos - PAD);
      const ctxEnd = Math.min(content.length, pos + oldText.length + PAD);
      const before = content.slice(ctxStart, ctxEnd);
      // Reconstruct the "after" for this occurrence in the same window.
      const afterCtx =
        content.slice(ctxStart, pos) + newText + content.slice(pos + oldText.length, ctxEnd);
      excerpts.push({ before, after: afterCtx });
    }
    preview = { excerpts };
  }

  return {
    replacements,
    originalSize,
    newSize: newContent.length,
    dryRun,
    ...(preview ? { preview } : {}),
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
