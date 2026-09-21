export type AppId = 'finder' | 'notes' | 'terminal' | 'safari' | 'messages' | 'maps' | 'photos' | 'calendar' | 'vscode' | 'x' | 'settings' | 'trash';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppDefinition {
  id: AppId;
  name: string;
  icon: string;
  defaultWindow: Omit<Bounds, 'x' | 'y'> & { minWidth: number; minHeight: number; resizable: boolean };
  singleInstance: boolean;
  quitOnLastWindowClose: boolean;
  pinnedToDock: boolean;
  titlebarStyle: 'toolbar' | 'plain';
}

export interface WindowState extends Bounds {
  id: string;
  appId: AppId;
  spaceId: number;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  restoreBounds?: Bounds;
}
