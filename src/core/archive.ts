/**
 * Archive Tool - Zip/Unzip operations
 */

import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface ArchiveEntry {
  name: string;
  path: string;
  size: number;
  compressedSize?: number;
  isDirectory: boolean;
  modified?: Date;
}

export interface ArchiveResult {
  success: boolean;
  path: string;
  entries?: number;
  totalSize?: number;
  compressedSize?: number;
  message?: string;
}

/**
 * List contents of an archive using PowerShell
 */
export async function listArchive(archivePath: string): Promise<ArchiveEntry[]> {
  // Use PowerShell to list zip contents
  const cmd = `powershell -Command "
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead('${archivePath.replace(/'/g, "''")}')
    $zip.Entries | ForEach-Object {
      [PSCustomObject]@{
        Name = $_.Name
        FullName = $_.FullName
        Length = $_.Length
        CompressedLength = $_.CompressedLength
        LastWriteTime = $_.LastWriteTime.ToString('o')
      }
    } | ConvertTo-Json
    $zip.Dispose()
  "`;

  const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
  
  if (!stdout.trim()) {
    return [];
  }

  const entries = JSON.parse(stdout);
  const entryArray = Array.isArray(entries) ? entries : [entries];

  return entryArray.map((e: any) => ({
    name: e.Name,
    path: e.FullName,
    size: e.Length,
    compressedSize: e.CompressedLength,
    isDirectory: e.FullName.endsWith('/') || e.Length === 0 && !e.Name.includes('.'),
    modified: e.LastWriteTime ? new Date(e.LastWriteTime) : undefined
  }));
}

/**
 * Create a zip archive
 */
export async function createArchive(
  outputPath: string,
  sourcePaths: string[],
  _options: { compressionLevel?: number } = {}
): Promise<ArchiveResult> {
  // compressionLevel option available but using default Optimal in PowerShell
  
  // Build source paths for PowerShell
  const sources = sourcePaths.map(p => `'${p.replace(/'/g, "''")}'`).join(',');
  
  const cmd = `powershell -Command "
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    
    $outputPath = '${outputPath.replace(/'/g, "''")}'
    $sources = @(${sources})
    
    # Remove existing file
    if (Test-Path $outputPath) { Remove-Item $outputPath }
    
    # Create new zip
    $zip = [System.IO.Compression.ZipFile]::Open($outputPath, 'Create')
    
    foreach ($source in $sources) {
      if (Test-Path $source -PathType Container) {
        # Directory - add recursively
        $basePath = Split-Path $source -Leaf
        Get-ChildItem $source -Recurse -File | ForEach-Object {
          $relativePath = $basePath + $_.FullName.Substring($source.Length)
          [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relativePath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
      } else {
        # Single file
        $entryName = Split-Path $source -Leaf
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $source, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
      }
    }
    
    $count = $zip.Entries.Count
    $zip.Dispose()
    
    $fileInfo = Get-Item $outputPath
    Write-Output (ConvertTo-Json @{ entries = $count; size = $fileInfo.Length })
  "`;

  const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
  const result = JSON.parse(stdout.trim());

  return {
    success: true,
    path: outputPath,
    entries: result.entries,
    compressedSize: result.size
  };
}

/**
 * Extract an archive
 */
export async function extractArchive(
  archivePath: string,
  outputDir: string,
  options: { overwrite?: boolean } = {}
): Promise<ArchiveResult> {
  const overwrite = options.overwrite ?? true;
  
  const cmd = `powershell -Command "
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    
    $archivePath = '${archivePath.replace(/'/g, "''")}'
    $outputDir = '${outputDir.replace(/'/g, "''")}'
    
    # Create output directory
    if (!(Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }
    
    # Extract
    [System.IO.Compression.ZipFile]::ExtractToDirectory($archivePath, $outputDir${overwrite ? ", $true" : ""})
    
    # Count extracted files
    $count = (Get-ChildItem $outputDir -Recurse -File).Count
    Write-Output (ConvertTo-Json @{ entries = $count })
  "`;

  const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
  const result = JSON.parse(stdout.trim());

  return {
    success: true,
    path: outputDir,
    entries: result.entries,
    message: `Extracted ${result.entries} files to ${outputDir}`
  };
}

/**
 * Add files to existing archive
 */
export async function addToArchive(
  archivePath: string,
  filePaths: string[]
): Promise<ArchiveResult> {
  const sources = filePaths.map(p => `'${p.replace(/'/g, "''")}'`).join(',');
  
  const cmd = `powershell -Command "
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    
    $archivePath = '${archivePath.replace(/'/g, "''")}'
    $files = @(${sources})
    
    $zip = [System.IO.Compression.ZipFile]::Open($archivePath, 'Update')
    
    foreach ($file in $files) {
      $entryName = Split-Path $file -Leaf
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    
    $count = $zip.Entries.Count
    $zip.Dispose()
    
    Write-Output (ConvertTo-Json @{ entries = $count })
  "`;

  const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
  const result = JSON.parse(stdout.trim());

  return {
    success: true,
    path: archivePath,
    entries: result.entries
  };
}

export async function executeArchiveOperation(args: any): Promise<string> {
  const { operation } = args;

  switch (operation) {
    case 'list': {
      const entries = await listArchive(args.path);
      
      if (entries.length === 0) {
        return `Archive is empty: ${args.path}`;
      }
      
      const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
      const totalCompressed = entries.reduce((sum, e) => sum + (e.compressedSize || 0), 0);
      const ratio = totalSize > 0 ? ((1 - totalCompressed / totalSize) * 100).toFixed(1) : '0';
      
      const output: string[] = [
        `Archive: ${args.path}`,
        `Entries: ${entries.length}`,
        `Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`,
        `Compressed: ${(totalCompressed / 1024 / 1024).toFixed(2)} MB (${ratio}% saved)`,
        '',
        'Contents:'
      ];
      
      for (const entry of entries.slice(0, 50)) {
        const sizeStr = entry.isDirectory ? '<DIR>' : `${(entry.size / 1024).toFixed(1)} KB`;
        output.push(`  ${entry.path} (${sizeStr})`);
      }
      
      if (entries.length > 50) {
        output.push(`  ... and ${entries.length - 50} more entries`);
      }
      
      return output.join('\n');
    }
    
    case 'create': {
      if (!args.output || !args.sources || !Array.isArray(args.sources)) {
        throw new Error('output and sources (array) are required');
      }
      
      const result = await createArchive(args.output, args.sources);
      return `✅ Archive created: ${result.path}\nEntries: ${result.entries}\nSize: ${((result.compressedSize || 0) / 1024 / 1024).toFixed(2)} MB`;
    }
    
    case 'extract': {
      if (!args.path || !args.output) {
        throw new Error('path and output are required');
      }
      
      const result = await extractArchive(args.path, args.output, { overwrite: args.overwrite });
      return `✅ ${result.message}`;
    }
    
    case 'add': {
      if (!args.path || !args.files || !Array.isArray(args.files)) {
        throw new Error('path and files (array) are required');
      }
      
      const result = await addToArchive(args.path, args.files);
      return `✅ Added files to archive: ${result.path}\nTotal entries: ${result.entries}`;
    }
    
    default:
      throw new Error(`Unknown archive operation: ${operation}`);
  }
}
