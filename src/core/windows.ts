/**
 * Windows Automation Core
 * Uses PowerShell for UI automation via temp script files
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';

const execAsync = promisify(exec);

async function runPowerShell(script: string, timeout = 30000): Promise<string> {
  const tempFile = join(tmpdir(), 'ps_' + Date.now() + '.ps1');
  
  try {
    await fs.writeFile(tempFile, script, 'utf-8');
    
    const { stdout, stderr } = await execAsync(
      'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + tempFile + '"',
      { timeout, maxBuffer: 10 * 1024 * 1024 }
    );
    
    if (stderr && !stdout) throw new Error(stderr);
    return stdout.trim();
  } finally {
    try { await fs.unlink(tempFile); } catch {}
  }
}

// ============ Keyboard ============

export async function typeText(text: string, delay = 0): Promise<string> {
  const escaped = text
    .replace(/[+^%~()[\]{}]/g, '{$&}')
    .replace(/\n/g, '{ENTER}')
    .replace(/\t/g, '{TAB}')
    .replace(/'/g, "''");
  
  let script = 'Add-Type -AssemblyName System.Windows.Forms\n';
  if (delay > 0) script += 'Start-Sleep -Milliseconds ' + delay + '\n';
  script += "[System.Windows.Forms.SendKeys]::SendWait('" + escaped + "')\n";
  script += "Write-Output 'Typed " + text.length + " characters'";
  
  return runPowerShell(script);
}

export async function pressKey(key: string, modifiers?: string[]): Promise<string> {
  const keyMap: Record<string, string> = {
    enter: '{ENTER}', return: '{ENTER}', tab: '{TAB}',
    escape: '{ESC}', esc: '{ESC}', backspace: '{BACKSPACE}',
    delete: '{DELETE}', del: '{DELETE}', insert: '{INSERT}',
    home: '{HOME}', end: '{END}', pageup: '{PGUP}', pagedown: '{PGDN}',
    up: '{UP}', down: '{DOWN}', left: '{LEFT}', right: '{RIGHT}',
    f1: '{F1}', f2: '{F2}', f3: '{F3}', f4: '{F4}',
    f5: '{F5}', f6: '{F6}', f7: '{F7}', f8: '{F8}',
    f9: '{F9}', f10: '{F10}', f11: '{F11}', f12: '{F12}',
    space: ' '
  };
  
  const keyCode = keyMap[key.toLowerCase()] || key;
  
  if (modifiers?.some(m => m.toLowerCase() === 'win' || m.toLowerCase() === 'windows')) {
    return pressWinKey(key);
  }
  
  let prefix = '';
  if (modifiers) {
    for (const mod of modifiers) {
      const m = mod.toLowerCase();
      if (m === 'ctrl' || m === 'control') prefix += '^';
      else if (m === 'alt') prefix += '%';
      else if (m === 'shift') prefix += '+';
    }
  }
  
  const modStr = modifiers ? modifiers.join('+') + '+' : '';
  let script = 'Add-Type -AssemblyName System.Windows.Forms\n';
  script += "[System.Windows.Forms.SendKeys]::SendWait('" + prefix + keyCode + "')\n";
  script += "Write-Output 'Pressed: " + modStr + key + "'";
  
  return runPowerShell(script);
}

async function pressWinKey(key: string): Promise<string> {
  const vkMap: Record<string, number> = {
    d: 0x44, e: 0x45, r: 0x52, l: 0x4C, s: 0x53, i: 0x49, tab: 0x09
  };
  const vk = vkMap[key.toLowerCase()] || key.toUpperCase().charCodeAt(0);
  
  const script = [
    '$sig = @"',
    '[DllImport("user32.dll")]',
    'public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);',
    '"@',
    '$keybd = Add-Type -MemberDefinition $sig -Name "Win32Keybd" -Namespace Win32 -PassThru',
    '$keybd::keybd_event(0x5B, 0, 0, [UIntPtr]::Zero)',
    '$keybd::keybd_event(' + vk + ', 0, 0, [UIntPtr]::Zero)',
    'Start-Sleep -Milliseconds 50',
    '$keybd::keybd_event(' + vk + ', 0, 2, [UIntPtr]::Zero)',
    '$keybd::keybd_event(0x5B, 0, 2, [UIntPtr]::Zero)',
    "Write-Output 'Pressed: Win+" + key + "'"
  ].join('\n');
  
  return runPowerShell(script);
}

export async function pressHotkey(hotkey: string): Promise<string> {
  const parts = hotkey.toLowerCase().split('+').map(p => p.trim());
  const key = parts.pop()!;
  return pressKey(key, parts);
}

// ============ Mouse ============

export async function moveMouse(x: number, y: number): Promise<string> {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(' + x + ', ' + y + ')',
    "Write-Output 'Moved mouse to (" + x + ", " + y + ")'"
  ].join('\n');
  
  return runPowerShell(script);
}

export async function clickMouse(
  button: 'left' | 'right' | 'middle' = 'left',
  x?: number,
  y?: number,
  clicks = 1
): Promise<string> {
  const flags: Record<string, [number, number]> = {
    left: [0x0002, 0x0004],
    right: [0x0008, 0x0010],
    middle: [0x0020, 0x0040]
  };
  const [down, up] = flags[button];
  
  const lines = [
    '$sig = @"',
    '[DllImport("user32.dll")]',
    'public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);',
    '"@',
    '$mouse = Add-Type -MemberDefinition $sig -Name "Win32Mouse" -Namespace Win32 -PassThru'
  ];
  
  if (x !== undefined && y !== undefined) {
    lines.push('Add-Type -AssemblyName System.Windows.Forms');
    lines.push('[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(' + x + ', ' + y + ')');
    lines.push('Start-Sleep -Milliseconds 50');
  }
  
  lines.push('Add-Type -AssemblyName System.Windows.Forms');
  lines.push('$pos = [System.Windows.Forms.Cursor]::Position');
  
  for (let i = 0; i < clicks; i++) {
    lines.push('$mouse::mouse_event(' + down + ', 0, 0, 0, [UIntPtr]::Zero)');
    lines.push('Start-Sleep -Milliseconds 50');
    lines.push('$mouse::mouse_event(' + up + ', 0, 0, 0, [UIntPtr]::Zero)');
    if (i < clicks - 1) lines.push('Start-Sleep -Milliseconds 100');
  }
  
  const clickLabel = clicks > 1 ? ' x' + clicks : '';
  lines.push('Write-Output "' + button + ' click' + clickLabel + ' at ($($pos.X), $($pos.Y))"');
  
  return runPowerShell(lines.join('\n'));
}

export async function scrollMouse(amount = 3, direction: 'up' | 'down' = 'down'): Promise<string> {
  const scrollAmount = direction === 'up' ? amount * 120 : -amount * 120;
  
  const script = [
    '$sig = @"',
    '[DllImport("user32.dll")]',
    'public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);',
    '"@',
    '$mouse = Add-Type -MemberDefinition $sig -Name "Win32Scroll" -Namespace Win32 -PassThru',
    '$mouse::mouse_event(0x0800, 0, 0, ' + scrollAmount + ', [UIntPtr]::Zero)',
    "Write-Output 'Scrolled " + direction + ' ' + amount + " units'"
  ].join('\n');
  
  return runPowerShell(script);
}

export async function getCursorPosition(): Promise<{ x: number; y: number }> {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$pos = [System.Windows.Forms.Cursor]::Position',
    'Write-Output "$($pos.X),$($pos.Y)"'
  ].join('\n');
  
  const result = await runPowerShell(script);
  const [x, y] = result.split(',').map(Number);
  return { x, y };
}

// ============ Windows ============

export async function listWindows(): Promise<Array<{ title: string; handle: string; process: string }>> {
  const script = `
Get-Process | Where-Object { $_.MainWindowTitle } | ForEach-Object {
  Write-Output "$($_.MainWindowHandle)|$($_.MainWindowTitle)|$($_.ProcessName)"
}
`;
  
  const result = await runPowerShell(script);
  return result.split('\n').filter(l => l.trim()).map(line => {
    const [handle, title, process] = line.split('|');
    return { handle, title, process };
  });
}

export async function focusWindow(titlePattern: string): Promise<string> {
  const escaped = titlePattern.replace(/'/g, "''");
  const script = [
    '$sig = @"',
    '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);',
    '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);',
    '"@',
    '$win = Add-Type -MemberDefinition $sig -Name "Win32Focus" -Namespace Win32 -PassThru',
    "$proc = Get-Process | Where-Object { $_.MainWindowTitle -like '*" + escaped + "*' } | Select-Object -First 1",
    'if ($proc) {',
    '  $win::ShowWindow($proc.MainWindowHandle, 9)',
    '  $win::SetForegroundWindow($proc.MainWindowHandle)',
    '  Write-Output "Focused: $($proc.MainWindowTitle)"',
    '} else { Write-Output "No window found" }'
  ].join('\n');
  
  return runPowerShell(script);
}

export async function minimizeWindow(titlePattern?: string): Promise<string> {
  const script = titlePattern
    ? [
        '$sig = \'[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);\'',
        '$win = Add-Type -MemberDefinition $sig -Name "Win32Min" -Namespace Win32 -PassThru',
        "$proc = Get-Process | Where-Object { $_.MainWindowTitle -like '*" + titlePattern.replace(/'/g, "''") + "*' } | Select-Object -First 1",
        'if ($proc) { $win::ShowWindow($proc.MainWindowHandle, 6); Write-Output "Minimized: $($proc.MainWindowTitle)" }'
      ].join('\n')
    : [
        '$sig = \'[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);\'',
        '$sig2 = \'[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();\'',
        '$win = Add-Type -MemberDefinition "$sig`n$sig2" -Name "Win32Min2" -Namespace Win32 -PassThru',
        '$win::ShowWindow($win::GetForegroundWindow(), 6)',
        'Write-Output "Minimized active window"'
      ].join('\n');
  
  return runPowerShell(script);
}

export async function maximizeWindow(titlePattern?: string): Promise<string> {
  const script = titlePattern
    ? [
        '$sig = \'[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);\'',
        '$win = Add-Type -MemberDefinition $sig -Name "Win32Max" -Namespace Win32 -PassThru',
        "$proc = Get-Process | Where-Object { $_.MainWindowTitle -like '*" + titlePattern.replace(/'/g, "''") + "*' } | Select-Object -First 1",
        'if ($proc) { $win::ShowWindow($proc.MainWindowHandle, 3); Write-Output "Maximized: $($proc.MainWindowTitle)" }'
      ].join('\n')
    : [
        '$sig = \'[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);\'',
        '$sig2 = \'[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();\'',
        '$win = Add-Type -MemberDefinition "$sig`n$sig2" -Name "Win32Max2" -Namespace Win32 -PassThru',
        '$win::ShowWindow($win::GetForegroundWindow(), 3)',
        'Write-Output "Maximized active window"'
      ].join('\n');
  
  return runPowerShell(script);
}

export async function closeWindow(titlePattern: string): Promise<string> {
  const escaped = titlePattern.replace(/'/g, "''");
  const script = [
    "$proc = Get-Process | Where-Object { $_.MainWindowTitle -like '*" + escaped + "*' } | Select-Object -First 1",
    'if ($proc) { $title = $proc.MainWindowTitle; $proc.CloseMainWindow() | Out-Null; Write-Output "Closed: $title" }',
    'else { Write-Output "No window found" }'
  ].join('\n');
  
  return runPowerShell(script);
}

export async function getActiveWindow(): Promise<{ title: string; process: string; handle: string }> {
  const script = [
    '$sig = @"',
    '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
    '[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);',
    '"@',
    '$win = Add-Type -MemberDefinition $sig -Name "Win32Active" -Namespace Win32 -PassThru',
    '$hwnd = $win::GetForegroundWindow()',
    '$pid = 0',
    '$win::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null',
    '$proc = Get-Process -Id $pid',
    'Write-Output "$hwnd|$($proc.MainWindowTitle)|$($proc.ProcessName)"'
  ].join('\n');
  
  const result = await runPowerShell(script);
  const [handle, title, process] = result.split('|');
  return { handle, title, process };
}

// ============ Screenshot ============

export async function takeScreenshot(
  outputPath?: string,
  region?: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const savePath = (outputPath || join(tmpdir(), 'screenshot_' + Date.now() + '.png')).replace(/\\/g, '\\\\');
  
  const script = region
    ? [
        'Add-Type -AssemblyName System.Windows.Forms',
        'Add-Type -AssemblyName System.Drawing',
        '$bounds = New-Object System.Drawing.Rectangle(' + region.x + ', ' + region.y + ', ' + region.width + ', ' + region.height + ')',
        '$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)',
        '$graphics = [System.Drawing.Graphics]::FromImage($bitmap)',
        '$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)',
        "$bitmap.Save('" + savePath + "', [System.Drawing.Imaging.ImageFormat]::Png)",
        '$graphics.Dispose()',
        '$bitmap.Dispose()',
        "Write-Output '" + savePath + "'"
      ].join('\n')
    : [
        'Add-Type -AssemblyName System.Windows.Forms',
        'Add-Type -AssemblyName System.Drawing',
        '$screen = [System.Windows.Forms.Screen]::PrimaryScreen',
        '$bounds = $screen.Bounds',
        '$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)',
        '$graphics = [System.Drawing.Graphics]::FromImage($bitmap)',
        '$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)',
        "$bitmap.Save('" + savePath + "', [System.Drawing.Imaging.ImageFormat]::Png)",
        '$graphics.Dispose()',
        '$bitmap.Dispose()',
        "Write-Output '" + savePath + "'"
      ].join('\n');
  
  return runPowerShell(script);
}

export async function getScreenSize(): Promise<{ width: number; height: number }> {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$screen = [System.Windows.Forms.Screen]::PrimaryScreen',
    'Write-Output "$($screen.Bounds.Width),$($screen.Bounds.Height)"'
  ].join('\n');
  
  const result = await runPowerShell(script);
  const [width, height] = result.split(',').map(Number);
  return { width, height };
}

// ============ Launch ============

export async function launchApp(path: string, args?: string, wait = false): Promise<string> {
  const escapedPath = path.replace(/'/g, "''");
  const argsStr = args ? " -ArgumentList '" + args.replace(/'/g, "''") + "'" : '';
  
  const script = wait
    ? "$proc = Start-Process -FilePath '" + escapedPath + "'" + argsStr + " -PassThru -Wait\nWrite-Output 'Launched: " + escapedPath + "'"
    : "Start-Process -FilePath '" + escapedPath + "'" + argsStr + "\nWrite-Output 'Launched: " + escapedPath + "'";
  
  return runPowerShell(script);
}

// ============ Main Handler ============

export interface WindowsToolArgs {
  operation: 'type' | 'key' | 'hotkey' | 'click' | 'move' | 'scroll' | 'cursor' |
             'windows' | 'focus' | 'minimize' | 'maximize' | 'close' | 'active' |
             'screenshot' | 'screen_size' | 'launch';
  text?: string;
  key?: string;
  modifiers?: string[];
  hotkey?: string;
  delay?: number;
  x?: number;
  y?: number;
  button?: 'left' | 'right' | 'middle';
  clicks?: number;
  amount?: number;
  direction?: 'up' | 'down';
  title?: string;
  outputPath?: string;
  region?: { x: number; y: number; width: number; height: number };
  path?: string;
  args?: string;
  wait?: boolean;
}

export async function executeWindowsOperation(args: WindowsToolArgs): Promise<string> {
  switch (args.operation) {
    case 'type':
      if (!args.text) throw new Error('text is required');
      return typeText(args.text, args.delay);
    case 'key':
      if (!args.key) throw new Error('key is required');
      return pressKey(args.key, args.modifiers);
    case 'hotkey':
      if (!args.hotkey) throw new Error('hotkey is required');
      return pressHotkey(args.hotkey);
    case 'click':
      return clickMouse(args.button, args.x, args.y, args.clicks);
    case 'move':
      if (args.x === undefined || args.y === undefined) throw new Error('x and y required');
      return moveMouse(args.x, args.y);
    case 'scroll':
      return scrollMouse(args.amount, args.direction);
    case 'cursor':
      const pos = await getCursorPosition();
      return 'Cursor position: (' + pos.x + ', ' + pos.y + ')';
    case 'windows':
      const wins = await listWindows();
      return '=== Open Windows ===\n\n' + wins.map(w => '[' + w.process + '] ' + w.title).join('\n');
    case 'focus':
      if (!args.title) throw new Error('title is required');
      return focusWindow(args.title);
    case 'minimize':
      return minimizeWindow(args.title);
    case 'maximize':
      return maximizeWindow(args.title);
    case 'close':
      if (!args.title) throw new Error('title is required');
      return closeWindow(args.title);
    case 'active':
      const active = await getActiveWindow();
      return 'Active Window:\n  Title: ' + active.title + '\n  Process: ' + active.process;
    case 'screenshot':
      const path = await takeScreenshot(args.outputPath, args.region);
      return 'Screenshot saved: ' + path;
    case 'screen_size':
      const size = await getScreenSize();
      return 'Screen size: ' + size.width + ' x ' + size.height;
    case 'launch':
      if (!args.path) throw new Error('path is required');
      return launchApp(args.path, args.args, args.wait);
    default:
      throw new Error('Unknown operation: ' + (args as any).operation);
  }
}
