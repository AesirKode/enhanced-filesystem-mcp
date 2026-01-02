/**
 * Windows Automation Tool
 *
 * Gives Claude programmatic control over Windows:
 * - Keyboard: type text, press keys, hotkeys
 * - Mouse: click, move, scroll
 * - Windows: list, focus, minimize, maximize, close
 * - Screenshots: capture screen or regions
 * - Launch: start applications
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const windowsTool: Tool = {
  name: 'windows_tool',
  description: `Windows UI automation - keyboard, mouse, window control, screenshots.

Operations:
- 'type': Type text into active window
- 'key': Press a key (with optional modifiers)
- 'hotkey': Press key combination like "ctrl+c", "alt+tab"
- 'click': Mouse click (left/right/middle, optional coordinates)
- 'move': Move mouse to coordinates
- 'scroll': Scroll mouse wheel up/down
- 'cursor': Get current cursor position
- 'windows': List all open windows
- 'focus': Focus window by title (partial match)
- 'minimize': Minimize window (active or by title)
- 'maximize': Maximize window (active or by title)
- 'close': Close window by title
- 'active': Get info about active window
- 'window_info': Get detailed info (pos/size) of a window
- 'move_window': Move/Resize a window
- 'screenshot': Capture screen (full or region)
- 'screen_size': Get screen dimensions
- 'launch': Launch an application

Examples:

1. Type text:
{ operation: 'type', text: 'Hello World!' }

2. Type with delay:
{ operation: 'type', text: 'Slow typing', delay: 500 }

3. Press Enter:
{ operation: 'key', key: 'enter' }

4. Press Ctrl+S:
{ operation: 'key', key: 's', modifiers: ['ctrl'] }

5. Alt+Tab:
{ operation: 'hotkey', hotkey: 'alt+tab' }

6. Copy (Ctrl+C):
{ operation: 'hotkey', hotkey: 'ctrl+c' }

7. Win+D (show desktop):
{ operation: 'key', key: 'd', modifiers: ['win'] }

8. Click at position:
{ operation: 'click', x: 500, y: 300 }

9. Right-click:
{ operation: 'click', button: 'right' }

10. Double-click:
{ operation: 'click', clicks: 2 }

11. Move mouse:
{ operation: 'move', x: 100, y: 200 }

12. Scroll down:
{ operation: 'scroll', direction: 'down', amount: 5 }

13. List windows:
{ operation: 'windows' }

14. Focus Chrome:
{ operation: 'focus', title: 'Chrome' }

15. Minimize active:
{ operation: 'minimize' }

16. Close Notepad:
{ operation: 'close', title: 'Notepad' }

17. Get Window Info:
{ operation: 'window_info', title: 'Notepad' }

18. Move Window:
{ operation: 'move_window', title: 'Notepad', x: 0, y: 0, width: 800, height: 600 }

19. Screenshot:
{ operation: 'screenshot', outputPath: 'D:/screenshot.png' }

20. Screenshot region:
{ operation: 'screenshot', region: { x: 0, y: 0, width: 800, height: 600 } }

21. Launch app:
{ operation: 'launch', path: 'notepad.exe' }

22. Launch with args:
{ operation: 'launch', path: 'code', args: 'D:/Projects' }

Key names: enter, tab, escape, backspace, delete, home, end, pageup, pagedown, up, down, left, right, f1-f12, space, printscreen
Modifiers: ctrl, alt, shift, win`,

  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['type', 'key', 'hotkey', 'click', 'move', 'scroll', 'cursor',
               'windows', 'focus', 'minimize', 'maximize', 'close', 'active',
               'screenshot', 'screen_size', 'launch', 'move_window', 'window_info'],
        description: 'Windows operation to perform'
      },

      // Keyboard
      text: {
        type: 'string',
        description: 'Text to type (for type operation)'
      },
      key: {
        type: 'string',
        description: 'Key to press (enter, tab, f1, etc.)'
      },
      modifiers: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key modifiers: ctrl, alt, shift, win'
      },
      hotkey: {
        type: 'string',
        description: 'Hotkey combination like "ctrl+c", "alt+tab"'
      },
      delay: {
        type: 'number',
        description: 'Delay in ms before typing'
      },

      // Mouse
      x: {
        type: 'number',
        description: 'X coordinate'
      },
      y: {
        type: 'number',
        description: 'Y coordinate'
      },
      width: {
        type: 'number',
        description: 'Width (for move_window)'
      },
      height: {
        type: 'number',
        description: 'Height (for move_window)'
      },
      button: {
        type: 'string',
        enum: ['left', 'right', 'middle'],
        description: 'Mouse button (default: left)'
      },
      clicks: {
        type: 'number',
        description: 'Number of clicks (default: 1)'
      },
      amount: {
        type: 'number',
        description: 'Scroll amount in units (default: 3)'
      },
      direction: {
        type: 'string',
        enum: ['up', 'down'],
        description: 'Scroll direction (default: down)'
      },

      // Window
      title: {
        type: 'string',
        description: 'Window title pattern (partial match)'
      },

      // Screenshot
      outputPath: {
        type: 'string',
        description: 'Path to save screenshot'
      },
      region: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' }
        },
        description: 'Region to capture { x, y, width, height }'
      },

      // Launch
      path: {
        type: 'string',
        description: 'Application path or command'
      },
      args: {
        type: 'string',
        description: 'Command line arguments'
      },
      wait: {
        type: 'boolean',
        description: 'Wait for application to exit'
      }
    },
    required: ['operation']
  }
};
