import type { AppDefinition, AppId } from '@/os/types';

const localPreviewIcon = (name: string, fallback: string) => import.meta.env.DEV ? `/local-macos/${name}` : fallback;
const defaultWindow = { width: 760, height: 470, minWidth: 510, minHeight: 330, resizable: true };

export const apps: Record<AppId, AppDefinition> = {
  finder: { id: 'finder', name: 'Finder', icon: localPreviewIcon('finder.png', '/icons/file-browser.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'toolbar', defaultWindow: { ...defaultWindow, width: 760 } },
  notes: { id: 'notes', name: 'Notes', icon: localPreviewIcon('notes.png', '/icons/portfolio-notes.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'toolbar', defaultWindow: { ...defaultWindow, width: 830, minWidth: 620, minHeight: 390 } },
  terminal: { id: 'terminal', name: 'Terminal', icon: localPreviewIcon('terminal.png', '/icons/portfolio-terminal.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'plain', defaultWindow: { ...defaultWindow, width: 660, height: 410, minWidth: 470, minHeight: 290 } },
  safari: { id: 'safari', name: 'Safari', icon: localPreviewIcon('safari.png', '/icons/file-browser.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'toolbar', defaultWindow: { ...defaultWindow, width: 860, height: 520 } },
  messages: { id: 'messages', name: 'Messages', icon: localPreviewIcon('messages.png', '/icons/portfolio-notes.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'toolbar', defaultWindow: { ...defaultWindow, width: 720, height: 470 } },
  maps: { id: 'maps', name: 'Maps', icon: localPreviewIcon('maps.png', '/icons/file-browser.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'toolbar', defaultWindow: { ...defaultWindow, width: 800, height: 490 } },
  photos: { id: 'photos', name: 'Photos', icon: localPreviewIcon('photos.png', '/icons/portfolio-notes.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'toolbar', defaultWindow: { ...defaultWindow, width: 760, height: 500 } },
  calendar: { id: 'calendar', name: 'Calendar', icon: localPreviewIcon('calendar.png?v=2', '/icons/portfolio-notes.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'toolbar', defaultWindow: { ...defaultWindow, width: 760, height: 480 } },
  vscode: { id: 'vscode', name: 'VS Code', icon: localPreviewIcon('vscode.png', '/icons/portfolio-terminal.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'plain', defaultWindow: { ...defaultWindow, width: 820, height: 500 } },
  x: { id: 'x', name: 'X', icon: localPreviewIcon('x.png', '/icons/portfolio-terminal.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'toolbar', defaultWindow: { ...defaultWindow, width: 700, height: 500 } },
  settings: { id: 'settings', name: 'System Settings', icon: localPreviewIcon('settings.png', '/icons/file-browser.png'), singleInstance: true, quitOnLastWindowClose: false, pinnedToDock: true, titlebarStyle: 'toolbar', defaultWindow: { ...defaultWindow, width: 680, height: 460 } },
  trash: { id: 'trash', name: 'Trash', icon: localPreviewIcon('trash-empty.png', '/icons/file-browser.png'), singleInstance: true, quitOnLastWindowClose: true, pinnedToDock: true, titlebarStyle: 'toolbar', defaultWindow: { ...defaultWindow, width: 640, height: 420 } },
};

export const dockAppIds: AppId[] = ['finder', 'safari', 'messages', 'maps', 'photos', 'calendar', 'notes', 'terminal', 'vscode', 'x', 'settings'];
