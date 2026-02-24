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
  description: "Windows UI automation. Keyboard: type, key (with modifiers: ctrl/alt/shift/win), hotkey (e.g. 'ctrl+c'). Mouse: click (left/right/middle, x/y coords), move, scroll. Windows: list, focus, minimize, maximize, close, active, window_info, move_window, screen_size. Other: screenshot (full or region), launch app.",

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
