# CodePomodoro 🍅

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/ParisNeo.codepomodoro.svg?style=flat-square&label=Marketplace)](https://marketplace.visualstudio.com/items?itemName=ParisNeo.codepomodoro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A productivity-focused Pomodoro timer extension for VS Code with status bar integration, customizable sessions, and smart notifications to help developers maintain focus and avoid burnout.

CodePomodoro provides a beautiful and functional timer right within your editor's sidebar, helping you manage your work and break cycles effectively without ever leaving your development environment.

## Features

-   **Interactive Sidebar Timer:** A rich user interface in the VS Code sidebar to view and control the timer.
-   **Status Bar Integration:** Always see the current session type and remaining time at a glance in the status bar.
-   **Customizable Cycles:** Tailor the duration of your work, short break, and long break sessions to match your personal workflow.
-   **Full Control:** Easily start, pause, reset, and skip sessions through the sidebar UI or via commands.
-   **Smart Notifications:** Receive timely notifications when a session ends, with an option to automatically start the next one.
-   **Quick Start Actions:** Jump directly into a work or break session from the sidebar menu.
-   **Highly Configurable:** A wide range of settings to customize the extension's behavior, including auto-starting sessions, sound, and status bar visibility.

## Sneak Peek

Here's a look at the CodePomodoro timer in the VS Code sidebar:

![CodePomodoro Sidebar UI](codepomodoro/images/sidebar.png) 

And the minimalist status bar indicator:

![CodePomodoro Status Bar](codepomodoro/images/status_bar.png)

## Getting Started

1.  Install the **CodePomodoro** extension from the VS Code Marketplace.
2.  Open the Activity Bar on the side of VS Code and click on the **CodePomodoro** icon to reveal the timer view.
3.  Use the "Start" button in the sidebar or run the `Pomodoro: Start` command from the Command Palette to begin your first session.

## Available Commands

You can access all functionalities through the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac):

| Command                         | Description                                            |
| ------------------------------- | ------------------------------------------------------ |
| `Pomodoro: Start/Stop`          | Toggles the timer between running and paused states.   |
| `Pomodoro: Start`               | Starts the timer for the current session.              |
| `Pomodoro: Pause`               | Pauses the currently running timer.                    |
| `Pomodoro: Reset`               | Stops the timer and resets the Pomodoro cycle.         |
| `Pomodoro: Skip`                | Skips the current session and moves to the next one.   |
| `Pomodoro: Settings`            | Opens the extension settings.                          |
| `Pomodoro: Quick Start Menu`    | Shows a quick menu to start a specific session type.   |
| `Pomodoro: Start Work Session`  | Immediately starts a new work session.                 |
| `Pomodoro: Start Short Break`   | Immediately starts a short break session.              |
| `Pomodoro: Start Long Break`    | Immediately starts a long break session.               |
| `Pomodoro: Show Statistics`     | Displays your Pomodoro statistics.                     |

## Extension Settings

This extension is highly customizable. You can configure it in the VS Code settings (`Ctrl+,`) under the "Pomodoro" section:

| Setting                           | Description                                            | Default |
| --------------------------------- | ------------------------------------------------------ | ------- |
| `pomodoro.workDuration`           | Work session length in minutes.                        | `25`    |
| `pomodoro.shortBreakDuration`     | Short break duration in minutes.                       | `5`     |
| `pomodoro.longBreakDuration`      | Long break duration in minutes.                        | `15`    |
| `pomodoro.sessionsBeforeLongBreak`| Number of work sessions before a long break.           | `4`     |
| `pomodoro.soundEnabled`           | Enable sound notifications.                            | `true`  |
| `pomodoro.autoStartBreaks`        | Automatically start break sessions after a work session. | `true`  |
| `pomodoro.autoStartWork`          | Automatically start work sessions after a break.       | `false` |
| `pomodoro.showInStatusBar`        | Show the timer in the status bar.                      | `true`  |
| `pomodoro.statusBarPriority`      | The priority (position) of the status bar item.        | `100`   |

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed information about changes in each version.

### 1.0.0

-   Initial release of CodePomodoro.
-   Full-featured Pomodoro timer with work, short break, and long break cycles.
-   Interactive sidebar webview and status bar integration.
-   Customizable settings for a personalized experience.

---

## Contributing

Contributions are always welcome! Feel free to open an issue or submit a pull request.

## License

This extension is licensed under the [Apache 2.0 License](LICENSE).