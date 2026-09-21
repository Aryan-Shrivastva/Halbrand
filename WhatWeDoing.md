# macOS Portfolio: Implementation Spec

A portfolio website that behaves like a macOS desktop running in the browser. Visitors watch a boot sequence, land on a desktop, and explore the portfolio by opening "apps" (Terminal, Notes, Finder, ...) in draggable windows.

**Goal:** a visitor should believe it is a real desktop for the few minutes they spend on it. Copy the ~15 behaviors people actually notice. Do not chase every macOS edge case.

This document is the source of truth for behavior. Where it is silent, do what real macOS does, unless that costs more than ~1 hour of work, in which case skip it and leave a `// TODO(macos-parity)` comment.

---

## 1. Scope

### Phase 1 (build now)
Boot sequence, menu bar (app-aware), desktop with icons, dock, full window manager, Terminal, Notes, Finder, Spotlight, keyboard shortcuts, right-click menus, Apple menu (About / Force Quit / Sleep / Restart / Shut Down), dark/light theme, mobile fallback, plain-HTML fallback page.

### Phase 2 (later, do NOT build yet)
Browser app (Safari/Chrome/Brave skins), Calendar, Clock/Timer, Music (Spotify embed), Calculator, Weather, System Settings, Control Center panel, Cmd+Tab-style app switcher.

### Non-goals
Real file system, real OS features, pixel-perfect Apple UI, multi-user, backend. This is a static frontend only.

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Build | Vite + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS + CSS variables for design tokens |
| State | Zustand (with `persist` middleware where noted) |
| Animation | Framer Motion (dock magnification, window open/close/minimize, boot) |
| Drag/resize | `react-rnd` **or** Framer Motion `drag` + custom resize handles. Either is fine as long as every behavior in section 6 holds |
| Markdown | `react-markdown` (Notes content) |
| Icons | Own/open-source icon set (see section 15) |
| Tests | Vitest for stores; Playwright optional for drag/shortcut e2e |
| Deploy | Static hosting (Vercel/Netlify/Cloudflare Pages) |

---

## 3. Project structure

```
src/
  main.tsx
  App.tsx                    # root: boot state machine -> <Desktop/> or <BootScreen/>
  data/
    content.ts               # SINGLE source of truth: profile, projects, skills, notes, contact
  os/
    registry.ts              # AppDefinition[] (all apps registered here)
    types.ts
    stores/
      systemStore.ts         # boot state, theme, activeAppId, focusedWindowId, sleep/shutdown
      processStore.ts        # running apps
      windowStore.ts         # windows + zOrder
      desktopStore.ts        # desktop icon positions, selection, wallpaper
    components/
      MenuBar/
      Dock/
      Desktop/
      Window/                # chrome: titlebar, traffic lights, resize handles
      ContextMenu/
      Spotlight/
      BootScreen/
      Modal/                 # About This Mac, Force Quit
    hooks/
      useShortcuts.ts
      useDockRects.ts        # dock icon bounding rects for minimize animation
  apps/
    terminal/
    notes/
    finder/
    (phase 2 apps here)
  styles/
    tokens.css
  plain/                     # /plain route: static, semantic, JS-light version
public/
  wallpapers/  icons/  sounds/  resume.pdf
```

---

## 4. Core architecture: apps vs processes vs windows

**This separation is the most important design decision. Do not collapse it.**

- **App**: a static definition (icon, name, menus, default window size, component).
- **Process**: an app that is currently *running*. Shown by the dot under its dock icon.
- **Window**: a visible instance belonging to a process. A process can have 0..N windows.

Consequences (all must hold):
- Closing the last window of an app does **not** quit it (dot stays), unless the app sets `quitOnLastWindowClose: true`.
- Clicking a running app's dock icon with no windows opens a new window.
- Quitting an app closes all of its windows and removes the process.
- **Finder is always running** and cannot be quit. It owns the desktop.

### 4.1 Types (`os/types.ts`)

```ts
export type AppId = 'finder' | 'terminal' | 'notes' | 'spotlight' | string;

export interface Bounds { x: number; y: number; width: number; height: number }

export interface AppDefinition {
  id: AppId;
  name: string;                       // shown bold in the menu bar and dock tooltip
  icon: string;                       // asset path
  component: React.ComponentType<AppWindowProps>; // lazy-loaded
  defaultWindow: { width: number; height: number; minWidth: number; minHeight: number; resizable: boolean };
  singleInstance: boolean;            // re-open => focus existing window instead of a new one
  quitOnLastWindowClose: boolean;     // default false
  pinnedToDock: boolean;
  menus: MenuDefinition[];            // app-specific menus shown after the app-name menu
  titlebarStyle: 'toolbar' | 'plain'; // 'toolbar' = tall unified titlebar (Notes/Finder); 'plain' = 28px
}

export interface AppWindowProps { windowId: string; props?: Record<string, unknown> }

export interface WindowState extends Bounds {
  id: string;                         // nanoid
  appId: AppId;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  restoreBounds?: Bounds;             // saved before maximize
  props?: Record<string, unknown>;    // e.g. { noteId } or { path }
}

export interface MenuDefinition {
  label: string;
  items: (MenuItem | 'separator')[];
}
export interface MenuItem {
  label: string;
  action: string | (() => void);      // string = named action dispatched to the active app
  shortcut?: string;                  // display string, e.g. '⌥W'
  disabled?: boolean | (() => boolean);
}
```

### 4.2 Stores

**`processStore`**
- `running: AppId[]` (Finder always present)
- `launch(appId, props?)`: if not running, add to `running` and trigger dock bounce; then delegate to `windowStore.open`. If `singleInstance` and a window exists: restore if minimized, then focus.
- `quit(appId)`: close all windows for app, remove from `running`, run focus fallback (4.3). No-op for Finder.

**`windowStore`**
- `windows: Record<id, WindowState>`
- `zOrder: string[]` (last = topmost). `zIndex` for rendering = `100 + index`.
- Actions: `open(appId, props?)`, `close(id)`, `focus(id)`, `minimize(id)`, `restore(id)`, `toggleMaximize(id)`, `move(id, x, y)`, `resize(id, bounds)`, `closeAllForApp(appId)`.

**`systemStore`**
- `boot: 'off' | 'booting' | 'ready' | 'sleeping' | 'shutdown'`
- `activeAppId: AppId` (whose menus show in the menu bar)
- `focusedWindowId: string | null`
- `theme: 'light' | 'dark' | 'auto'` (persisted)

**`desktopStore`** (persisted): icon positions, selected icon ids, wallpaper id.

### 4.3 Focus rules (write unit tests for every one)

1. `focus(id)`: move `id` to the end of `zOrder`; set `focusedWindowId = id`; set `activeAppId = window.appId`. If the window is minimized, restore it first.
2. Clicking **empty desktop**: `focusedWindowId = null`, `activeAppId = 'finder'`. Windows keep their z-order but all render as unfocused.
3. After `close(id)` or `minimize(id)` of the focused window: focus the topmost non-minimized window (any app). If none, behave like rule 2.
4. New windows are focused on open and appear on top.
5. `quit(appId)` while that app is active: apply rule 3 after closing its windows.
6. `pointerdown` anywhere on a window (capture phase) calls `focus(id)` but must **not** swallow the event, so a click on a button in an unfocused window still works.

---

## 5. Boot sequence

State machine: `off -> booting -> ready`. Also `ready -> sleeping | shutdown -> booting`.

1. **Power-on screen** (first visit only): black screen, small centered power icon and "Click to start". This exists because browsers block audio without a user gesture. The click unlocks the startup chime.
2. **Boot**: black background, white logo centered, thin progress bar below (fills over ~2.5 s with slightly uneven easing). Optional startup chime (muted if the user never clicked).
3. **Transition**: fade to desktop over 400 ms. The menu bar and dock slide/fade in slightly after.
4. **Skip**: a subtle "Skip" text button bottom-right, plus `Esc` and any click after 500 ms. Never make a visitor wait more than ~3 s.
5. **Repeat visits**: if `localStorage.bootSeen` was set within the last 24 h, skip straight to the desktop with a 300 ms fade.
6. `prefers-reduced-motion`: skip the animation and go directly to the desktop.

Apple menu actions:
- **Restart**: close all windows, clear processes (except Finder), replay boot.
- **Sleep**: black screen, click or press any key to wake to the desktop (state preserved).
- **Shut Down**: black screen with a power button in the center; click it to run the boot sequence again.
- **Lock Screen / Log Out**: optional. Login screen with avatar, name, and a password field that auto-types dots, then enters. Only if time allows.

---

## 6. Window manager behavior

### 6.1 Chrome
- Radius 12px. Focused shadow `0 22px 70px 4px rgba(0,0,0,.56)`; unfocused shadow lighter (`0 10px 30px rgba(0,0,0,.25)`).
- 1px inner border `rgba(255,255,255,.12)` in dark mode, `rgba(0,0,0,.1)` in light.
- **Traffic lights**: 12px circles, 8px gap, 13px from left edge. Colors: close `#ff5f57`, minimize `#febc2e`, zoom `#28c840`. When the window is **unfocused** they render grey (`#4d4d4d` dark / `#cfcfcf` light).
- The x, -, + glyphs appear **only while the pointer is over the traffic-light group** (all three at once).
- Title text centered in the title bar, semibold 13px. Dimmed when unfocused.
- Titlebar height: 28px (`plain`) or 52px (`toolbar`).
- `user-select: none` on all chrome. Content area decides its own selection rules.

### 6.2 Drag
- Drag by the titlebar (or toolbar area) only. Use transforms (`translate3d`) while dragging; **commit to the store on drag end** (or throttle to rAF). Do not re-render the whole tree per mousemove.
- Clamp: the window's titlebar may not go above the menu bar (`y >= 28`). At least 60px of the window must remain horizontally visible on either side; at least 28px vertically above the bottom edge.
- Double-clicking the titlebar toggles zoom (maximize).
- While dragging or resizing, render a transparent overlay above window content so iframes (phase 2) do not steal pointer events.

### 6.3 Resize
- Resizable via all 4 edges and 4 corners (invisible 6px hit areas, correct cursors).
- Respect per-app `minWidth/minHeight`. Apps with `resizable: false` show a disabled (greyed) green button.
- Cannot resize the window's bottom edge beyond the viewport bottom.

### 6.4 Open
- Default size from the app definition, capped to 90% of the viewport.
- **Cascade**: first window centers slightly above middle. Each subsequent new window offsets +28px x and y from the most recently opened window. If it would overflow, wrap back to the origin.
- Animation: scale `0.92 -> 1`, opacity `0 -> 1`, 180 ms ease-out, `transform-origin: center`.

### 6.5 Close (red)
- Animation: scale `1 -> 0.96`, opacity `1 -> 0`, 120 ms. Then remove from store.
- Apply focus rule 4.3.3. If it was the app's last window and `quitOnLastWindowClose` is false, the process stays running (dock dot remains).

### 6.6 Minimize (yellow)
- Animate the window toward its **dock icon's bounding rect** (or, if the app is not pinned, the minimized-window area of the dock): scale to ~0.1, translate to the icon center, opacity to 0, 350 ms `easeInOut`. Real macOS uses a genie warp; this scale+translate approximation is intentional.
- Set `isMinimized = true`, keep the window mounted (hidden) so app state survives.
- Minimized windows show as small thumbnails in the dock, right of the separator. Phase 1: use the app icon inside a mini window frame (no live snapshot).
- Restoring (click thumbnail or dock icon) reverses the animation.

### 6.7 Zoom (green)
- Phase 1 behavior: fill the area from below the menu bar to the bottom of the viewport (dock stays overlaid on top). This is "zoom", not native fullscreen.
- Save `restoreBounds`; clicking again restores with a 250 ms spring.
- Optional: hold `Alt` while clicking green to enter true fullscreen (hide menu bar and dock, exit on `Esc`).

### 6.8 Focus visuals
- Focused: colored traffic lights, strong shadow, title full opacity.
- Unfocused: grey lights, lighter shadow, title dimmed, sidebar vibrancy slightly desaturated.

---

## 7. Menu bar

- Height 28px, fixed top, `backdrop-filter: blur(20px) saturate(180%)`, translucent background, 13px text.
- **Left**: Apple logo -> **app-name menu (bold)** -> the active app's menus.
- **Right**: Spotlight (search icon), Control Center icon (Phase 2), Wi-Fi/battery icons (decorative), **live clock** `Fri 25 Apr  00:35` (updates every 30 s; use the visitor's locale).
- **The bar is global and changes with `activeAppId`.** Terminal active shows `Terminal | Shell | Edit | View | Window | Help`. Notes shows its own menus. No windows open or desktop clicked -> `Finder`.
- Menus open on click; once one is open, hovering another top-level item switches to it. Click outside or `Esc` closes. Items highlight blue (`#0a60ff`) on hover with white text.
- Menu items dispatch **named actions** to the active app (e.g. `notes:new`, `terminal:clear`), or run a callback.
- Every app gets a default set: **Window** (Minimize, Zoom, Bring All to Front, list of the app's windows) and the app-name menu (`About <App>`, `Hide`, `Quit <App>`).

### Apple menu
`About This Mac` (modal: fake specs styled as a Mac; put real info here: your name, role, stack) / `System Settings...` (Phase 2, disabled) / `Recent Items` (opens recent projects) / `Force Quit...` (list of running apps, functional) / `Sleep` / `Restart...` / `Shut Down...` / `Lock Screen` / `Log Out` (optional).

---

## 8. Dock

- Fixed bottom center, floating with 8px margin. Background `rgba(255,255,255,.2)`, `backdrop-filter: blur(20px)`, radius 22px, 1px border `rgba(255,255,255,.25)`.
- Base icon 48px, max magnified 80px. Vertical space is reserved so the dock does not push content.
- **Magnification** (use Framer Motion motion values, **not React state**):

```ts
const mouseX = useMotionValue(Infinity);              // set on pointermove over dock, Infinity on leave
// per icon:
const distance = useTransform(mouseX, (v) => v - iconCenterX);
const widthSync = useTransform(distance, [-150, 0, 150], [48, 80, 48]);
const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });
```
- Icons: pinned apps left, then a thin separator, then minimized-window thumbnails, then another separator and the Trash (decorative; clicking shows an empty Trash Finder window or does nothing).
- **Running indicator**: 4px dot centered under the icon of every running app.
- **Tooltip**: rounded label above the hovered icon showing the app name.
- **Launch bounce**: on launch, the icon bounces (`y: [0, -24, 0]`, ~0.5 s per bounce), repeating until the app's first window has mounted (max 3 bounces).
- **Click behavior** (in this order):
  1. App not running: launch it (bounce).
  2. Running with minimized windows: restore the most recently minimized one and focus it.
  3. Running with visible windows: focus its topmost window.
  4. Running with no windows: open a new window.
- **Right-click** an icon: context menu with `Open` (or the app's window titles), `Quit` (if running), `Options > Keep in Dock` (disabled/no-op).
- Every dock icon must register its DOMRect in `useDockRects` so minimize animations know their target. Recompute on resize and magnification end.

---

## 9. Desktop

- Full-viewport wallpaper (`background-size: cover`), swappable (ship 2-3 wallpapers, one light and one dark that switch with theme).
- **Icons** (right-aligned column starting top-right, like macOS): e.g. `Projects`, `Resume.pdf`, `About Me`, `Contact`. Each 64px icon with a label underneath (white text with shadow, 2-line clamp).
- Interaction:
  - Single click: select (blue rounded highlight behind the icon, label gets an accent-blue pill).
  - `Cmd/Ctrl/Shift`-click: multi-select. Marquee selection by dragging on empty desktop (nice to have).
  - Double click: open (folder -> Finder window at that path, file -> matching app).
  - Drag to reposition, snap to a 100x100 grid, persist positions in `desktopStore`.
  - Click empty desktop: deselect all + focus rule 4.3.2.
- **Right-click desktop**: `New Folder` (disabled), `Change Wallpaper...` (cycles), `Open Terminal Here`, `About This Portfolio`.
- **Right-click icon**: `Open`, `Get Info` (small modal with the item's description/tech stack for projects).

---

## 10. Context menus

One reusable `<ContextMenu>` component: opens at the pointer position, flips if it would overflow the viewport, closes on outside click / `Esc` / scroll / window blur, supports separators, disabled items, submenus (one level deep), and keyboard navigation (arrows, Enter, Esc). Suppress the browser's native context menu everywhere except inside Terminal/Notes text areas.

---

## 11. Keyboard shortcuts

### 11.1 Important caveat: browsers reserve the real macOS shortcuts
`Cmd+W`, `Cmd+Q`, `Cmd+M`, `Cmd+N`, `Cmd+T`, `Cmd+Tab` and `Cmd+Space` are consumed by the browser or OS **before** the page sees them, and `preventDefault` cannot stop them. Binding to them as the primary path will fail (or worse, close the visitor's tab).

So: **every action must be reachable via the menu bar (click)**, and the keyboard bindings use `Alt/Option` as the modifier. Match on `event.code` (not `event.key`) so macOS Option-character remapping does not break it. Display the real binding in menus.

| Action | Binding | Notes |
|---|---|---|
| Close window | `Alt+W` | |
| Minimize | `Alt+M` | |
| Quit app | `Alt+Q` | closes all windows of the active app |
| New window | `Alt+N` | only for multi-instance apps |
| Cycle windows of active app | `Alt+Backquote` | |
| Spotlight | `Ctrl+K` / `Cmd+K`, also `/` when nothing is focused | plus the menu bar icon |
| Close menu / Spotlight / modal | `Esc` | |

Additionally listen for the `Cmd/Ctrl` variants of W/M/Q and `preventDefault` them; they will only fire in contexts where the browser lets them through (e.g., fullscreen). **Never rely on them.**

### 11.2 Rules
- Global shortcuts are ignored while typing in an `<input>`/`<textarea>`/contenteditable unless the shortcut uses `Alt` or `Ctrl`.
- Shortcuts act on the **focused window / active app**.
- One central `useShortcuts` hook maps bindings to the same named actions the menu bar dispatches. No duplicated logic.

---

## 12. Apps (Phase 1)

### 12.1 Terminal
**Feels like:** macOS Terminal with zsh. Dark translucent window, monospace font (JetBrains Mono / SF Mono fallback), prompt `guest@portfolio ~ %`.

Behavior:
- Click anywhere in the window focuses the hidden input. Output auto-scrolls to bottom.
- `Enter` runs; `Up/Down` history; `Tab` autocompletes commands and file names; `Ctrl+L` clears; `Ctrl+C` cancels the current line (prints `^C`).
- Each Terminal window has its own history/cwd/session.
- Output may contain clickable links (project URLs, email) and colored spans (ANSI-like: green/blue/yellow/red/dim). Render via a small token format, not `dangerouslySetInnerHTML`.
- Unknown command: `zsh: command not found: <cmd>`.
- All data comes from `data/content.ts`.

Commands:

| Command | Output |
|---|---|
| `help` | list of commands with one-line descriptions |
| `about` | short bio |
| `projects` | numbered list: name, one-liner, stack |
| `project <name\|n>` | details, links, `open` hint |
| `skills` | grouped by category |
| `experience` / `education` | timeline |
| `contact` | email, GitHub, LinkedIn as links |
| `resume` | opens `/resume.pdf` in a new tab |
| `socials` | links |
| `whoami` | `guest` |
| `neofetch` | ASCII-art system info styled as a portfolio spec sheet |
| `ls`, `cd`, `pwd`, `cat <file>` | small **virtual FS** derived from content (`~/projects/<name>.md`, `~/about.txt`, `~/skills.txt`) |
| `open <app\|project>` | launches an app or opens the project's live URL |
| `theme dark\|light` | switches theme |
| `date`, `echo`, `history`, `clear` | standard |
| `sudo ...` | `guest is not in the sudoers file. This incident will be reported.` |
| `rm -rf /` | playful refusal |

Menus: Terminal (About, Quit), Shell (New Window), Edit (Copy, Paste, Clear Screen), View, Window, Help.

### 12.2 Notes
**Feels like:** Apple Notes. Three panes.

- **Sidebar** (vibrancy): FOLDERS (`Notes`, `Work`, `Personal`, or your own), SMART FOLDERS (`Recently Deleted`, `Favorites`; `Locked Notes`/`Tags` may be decorative).
- **List pane**: notes in the selected folder, each with bold title, date, 2-line preview. Selected note = yellow highlight (like the reference screenshot).
- **Editor pane**: title, date, content rendered from markdown.
- Toolbar: sidebar toggle, new note `+`, delete, search field (filters title + body live), share (decorative).
- **Seeded notes** come from `content.ts` (About, My Projects, What I Love, ...) and are **read-only**: bottom-right badge reads `Viewing`.
- **User notes**: `+` creates an editable note (plain text or simple markdown), autosaves to `localStorage` key `notes:v1`. Delete moves to Recently Deleted. Seeded notes never get deleted.
- Footer shows note count for the current folder.

### 12.3 Finder
- Toolbar with back/forward, path breadcrumb, view toggle (icon grid only in Phase 1), search.
- Sidebar: Favorites (Desktop, Documents, Projects, Downloads/Resume), iCloud-style decorative items OK.
- Content is a **virtual FS tree** generated from `content.ts`. Double click a folder to navigate; double click a file to open it in its app (`.md` -> Notes, `.pdf` -> new tab, project folder -> project detail with "Open live site"/"View source" buttons).
- The Finder menu bar shows when nothing else is focused (see focus rule 4.3.2).

### 12.4 Spotlight
- Centered overlay, 640px wide, opens with `Ctrl/Cmd+K` or the menu bar icon.
- Searches: apps, projects, notes, terminal commands. Results grouped by category. Arrow keys navigate, `Enter` opens, `Esc` closes. Debounce 100 ms, fuzzy match.

---

## 13. Content model (`data/content.ts`)

One typed file. Terminal, Notes, Finder, Spotlight and Desktop all read from it. Updating a project must be a one-place edit.

```ts
export interface Project {
  slug: string; name: string; tagline: string; description: string; // markdown
  stack: string[]; liveUrl?: string; repoUrl?: string; year: number;
  framable?: boolean;      // Phase 2: whether the Browser app may iframe it
}
export interface Note { id: string; folder: string; title: string; body: string; createdAt: string }
export const profile = { name, role, bio, location, email, socials: {...} };
export const projects: Project[] = [...];
export const skills: Record<string, string[]> = {...};
export const notes: Note[] = [...];
```

---

## 14. Theming, typography, motion

- Light/dark via CSS variables in `tokens.css`, toggled by a `data-theme` attribute on `<html>`. Default `auto` (follows `prefers-color-scheme`).
- Font stack: `-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif`. On Apple devices this renders real SF; elsewhere it falls back to Inter (self-host it). Do not ship SF Pro files.
- Translucency: `backdrop-filter: blur(20px) saturate(180%)` on menu bar, dock, sidebars, Terminal.
- Motion: springs for dock and zoom, short ease-out for open/close. Under `prefers-reduced-motion`: disable bounce, magnification and minimize warp; use simple fades.
- Cursor: default arrow everywhere; text cursor inside Terminal/Notes content only.

---

## 15. Assets and licensing

Apple's icons, wallpapers, SF fonts and logo are Apple's copyright/trademark. For anything public, use your **own drawn icons, open-source icon sets, and CC0/own wallpapers**. Using Apple assets as placeholders while prototyping is fine; leave a `TODO(replace-assets)` list and replace them before deploying.

---

## 16. Mobile and no-JS fallback

- **< 768px viewport or touch-only device**: do not render the desktop. Show a simplified iOS-style home screen (grid of app icons that open full-screen sheets containing the same content), or redirect to `/plain`. Recruiters often open links on phones.
- **`/plain` route**: normal semantic HTML resume-style page (about, projects, skills, contact) generated from `content.ts`. Add a small "Plain version" link on the desktop (e.g., in the About This Mac modal and the Apple menu). This also serves crawlers and recruiters without JS.
- Set real `<title>`, meta description, and Open Graph tags (with a screenshot of the desktop as `og:image`).

---

## 17. Performance and quality bars

- Lazy-load each app component (`React.lazy`) and the boot assets.
- Drag/resize/dock magnification must hold 60fps on a mid-range laptop: transforms + motion values, `will-change: transform` during drag only, memoize `Window` by id.
- Initial JS < 200 KB gzipped before lazy chunks; boot screen must render before the desktop bundle finishes loading.
- Accessibility: dock and menu bar reachable by keyboard (`Tab`, arrows, Enter), `role="menubar"`/`menu`/`dialog` where appropriate, visible focus rings, `aria-label` on traffic lights, `prefers-reduced-motion` respected.
- Text selection disabled on chrome, enabled in Terminal output and Notes body.

---

## 18. Persistence

| Key | Contents |
|---|---|
| `bootSeen` | timestamp of last full boot |
| `theme` | `light\|dark\|auto` |
| `desktop:v1` | icon positions, wallpaper |
| `notes:v1` | user-created notes |

Wrap every `localStorage` access in try/catch (private mode can throw). **Do not** persist open windows across reloads in Phase 1: every visit starts clean.

---

## 19. Build order and acceptance criteria

Work strictly in this order. Do not start a milestone until the previous one passes.

**M0. Scaffold**: Vite + TS strict + Tailwind + tokens + fonts + path aliases + lint + `content.ts` with placeholder data.
Done when: blank desktop shows a wallpaper and theme toggles.

**M1. Stores + Window manager** (with a dummy "Hello" app, register 2 dummy apps to test focus)
Done when: windows open, cascade, drag (clamped), resize (min sizes), focus/z-order, close, minimize (to a temporary target), zoom/restore; traffic lights gray when unfocused; hover reveals glyphs; **Vitest passes for all focus rules in 4.3**.

**M2. Menu bar + Apple menu**
Done when: menus change with the active app, hover-switching works, clock ticks, Force Quit lists running apps and quits them, About This Mac modal opens.

**M3. Dock**
Done when: magnification is smooth, bounce/dot/tooltip work, all four click behaviors in section 8 work, minimize animates into the correct icon, thumbnails appear and restore.

**M4. Desktop**
Done when: icons select/drag/snap/persist, double-click opens, context menus work.

**M5. Boot / Sleep / Restart / Shut Down**
Done when: full sequence <= 3 s with working skip, repeat-visit shortcut, reduced-motion path.

**M6. Terminal**
Done when: every command in 12.1 works, history and tab-complete work, virtual FS navigates, two Terminal windows have independent state.

**M7. Notes**
Done when: seeded notes viewable and searchable; user notes create/edit/delete/persist; layout matches three-pane spec.

**M8. Finder + Spotlight**
Done when: navigation and file opening work; Spotlight finds apps/projects/notes and opens them.

**M9. Shortcuts, polish, mobile, `/plain`, SEO**
Done when: every shortcut in 11.1 works and every action is also reachable by menu; mobile shows the fallback; Lighthouse performance >= 90 on desktop.

### Regression checklist (run before each milestone is called done)
- [ ] Closing the last window keeps the dock dot; dock click reopens a window.
- [ ] `Quit` removes the dot and all windows.
- [ ] Clicking empty desktop switches the menu bar to Finder and greys all windows.
- [ ] Minimizing the focused window focuses the next one and updates the menu bar.
- [ ] No text selection or drag-ghosting on chrome.
- [ ] No global shortcut fires while typing in Terminal/Notes (unless Alt/Ctrl).
- [ ] Reload resets windows but keeps theme, desktop icon positions and user notes.

---

## 20. Phase 2 notes (for later, so today's architecture does not block them)

- **Browser app**: many sites (Google, GitHub, X) send `X-Frame-Options`/`frame-ancestors` and **cannot be iframed**. Ship the Browser app with a whitelist of sites you control or that allow framing (your own projects, Wikipedia, CodePen, YouTube/Spotify embeds), a custom start page, and an error page with "Open in new tab" for anything else. Skins (Safari/Chrome/Brave) are cosmetic variants of one component.
- **Spotify**: use the official `open.spotify.com/embed/...` iframe.
- **Control Center**: dark mode toggle, volume slider (drives the startup chime and any UI sounds), Wi-Fi/battery decorative.
- **Cmd+Tab switcher**: cannot bind to it (see 11.1); use a dock-driven or `Alt+Tab`-alternative overlay.
- The `AppDefinition`/registry design in section 4 is deliberately built so Phase 2 apps are pure additions: new folder in `apps/`, one entry in `registry.ts`.
