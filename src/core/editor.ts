import { promises as fs } from 'fs';


export interface EditOptions {
  oldText: string;
  newText: string;
  count?: number; // -1 for all occurrences, default 1
  caseSensitive?: boolean;
}

export interface EditResult {
  replacements: number;
  originalSize: number;
  newSize: number;
}

export async function editFile(
  filePath: string,
  options: EditOptions
): Promise<EditResult> {
  const { oldText, newText, count = 1, caseSensitive = true } = options;

  // Read file
  const content = await fs.readFile(filePath, 'utf8');
  const originalSize = content.length;

  // Perform replacement
  let newContent: string;
  let replacements = 0;

  if (count === -1) {
    // Replace all occurrences
    if (caseSensitive) {
      const regex = new RegExp(escapeRegex(oldText), 'g');
      newContent = content.replace(regex, () => {
        replacements++;
        return newText;
      });
    } else {
      const regex = new RegExp(escapeRegex(oldText), 'gi');
      newContent = content.replace(regex, () => {
        replacements++;
        return newText;
      });
    }
  } else {
    // Replace specific number of occurrences
    let remaining = count;
    if (caseSensitive) {
      const regex = new RegExp(escapeRegex(oldText), 'g');
      newContent = content.replace(regex, (match) => {
        if (remaining > 0) {
          remaining--;
          replacements++;
          return newText;
        }
        return match;
      });
    } else {
      const regex = new RegExp(escapeRegex(oldText), 'gi');
      newContent = content.replace(regex, (match) => {
        if (remaining > 0) {
          remaining--;
          replacements++;
          return newText;
        }
        return match;
      });
    }
  }

  // Write back to file
  await fs.writeFile(filePath, newContent, 'utf8');

  return {
    replacements,
    originalSize,
    newSize: newContent.length,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
