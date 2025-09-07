import * as vscode from 'vscode';
import { PomodoroTimer, PomodoroState } from './extension';

// Generates a random string for CSP
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export class PomodoroWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codepomodoro.webview';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private _pomodoroTimer: PomodoroTimer
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    // This command is sent from the webview when it's ready to receive data
                    case 'webviewReady':
                        this._pomodoroTimer.updateWebview();
                        break;
                    case 'start':
                        this._pomodoroTimer.start();
                        break;
                    case 'pause':
                        this._pomodoroTimer.pause();
                        break;
                    case 'reset':
                        this._pomodoroTimer.reset();
                        break;
                    case 'skip':
                        this._pomodoroTimer.skip();
                        break;
                    case 'settings':
                        this._pomodoroTimer.openSettings();
                        break;
                    case 'startWorkSession':
                        this._pomodoroTimer.startSpecificSession('work');
                        break;
                    case 'startShortBreak':
                        this._pomodoroTimer.startSpecificSession('shortBreak');
                        break;
                    case 'startLongBreak':
                        this._pomodoroTimer.startSpecificSession('longBreak');
                        break;
                }
            }
        );
    }

    // This method is called by the PomodoroTimer to send updates to the webview
    public updateWebview(data: { state: PomodoroState, config: any }) {
        if (this._view) {
            this._view.show(true); // Make sure the view is visible
            this._view.webview.postMessage({
                command: 'updateState',
                data: data
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

        // The CSP is crucial to allow the inline script to run.
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CodePomodoro</title>
                <style>
                    body { font-family: var(--vscode-font-family); background-color: var(--vscode-sideBar-background); color: var(--vscode-foreground); padding: 1em; }
                    .container { text-align: center; }
                    .progress-ring { position: relative; width: 120px; height: 120px; margin: 1em auto; }
                    .progress-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
                    .progress-bg, .progress-fill { fill: none; stroke-width: 4; }
                    .progress-bg { stroke: var(--vscode-editorWidget-background); }
                    .progress-fill { stroke: var(--vscode-button-background); transition: stroke-dashoffset 0.3s ease; }
                    .timer-display { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.8em; font-weight: 600; }
                    .session-info { margin-bottom: 1em; color: var(--vscode-descriptionForeground); font-size: 0.9em; }
                    .main-controls { display: flex; justify-content: center; gap: 8px; margin-bottom: 1.5em; }
                    .btn { padding: 8px 12px; border: none; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 4px; cursor: pointer; }
                    .btn:hover { background: var(--vscode-button-hoverBackground); }
                    .btn-secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
                    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
                    .quick-actions h3 { font-size: 1.1em; text-align: left; margin: 1.5em 0 0.8em 0; border-top: 1px solid var(--vscode-widget-border); padding-top: 1em; }
                    .action-buttons { display: flex; flex-direction: column; gap: 8px; }
                    .action-btn { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px; background: var(--vscode-input-background); border: 1px solid transparent; border-radius: 6px; cursor: pointer; text-align: left; color: var(--vscode-foreground); }
                    .action-btn:hover { border-color: var(--vscode-button-background); }
                    .action-icon { font-size: 1.5em; }
                    .action-duration { font-size: 0.8em; color: var(--vscode-descriptionForeground); }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="progress-ring">
                        <svg class="progress-svg" viewBox="0 0 100 100">
                            <circle class="progress-bg" cx="50" cy="50" r="45"></circle>
                            <circle class="progress-fill" id="progressCircle" cx="50" cy="50" r="45" pathLength="100"></circle>
                        </svg>
                        <div class="timer-display" id="timerDisplay">--:--</div>
                    </div>
                    <div class="session-info">
                        <span id="sessionType">Loading...</span> (<span id="sessionCount">-/-</span>)
                    </div>
                    <div class="main-controls">
                        <button class="btn btn-secondary" id="resetBtn">Reset</button>
                        <button class="btn" id="startPauseBtn">Start</button>
                        <button class="btn btn-secondary" id="skipBtn">Skip</button>
                    </div>

                    <div class="quick-actions">
                        <h3>Quick Start</h3>
                        <div class="action-buttons">
                            <button class="action-btn" id="startWorkBtn"><span class="action-icon">🍅</span><div>Work <div class="action-duration" id="workDuration">-- min</div></div></button>
                            <button class="action-btn" id="startShortBreakBtn"><span class="action-icon">☕</span><div>Short Break <div class="action-duration" id="shortBreakDuration">-- min</div></div></button>
                            <button class="action-btn" id="startLongBreakBtn"><span class="action-icon">🛌</span><div>Long Break <div class="action-duration" id="longBreakDuration">-- min</div></div></button>
                        </div>
                    </div>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    
                    // --- EVENT LISTENERS ---
                    document.getElementById('startPauseBtn').addEventListener('click', () => {
                        const btn = document.getElementById('startPauseBtn');
                        vscode.postMessage({ command: btn.dataset.action || 'start' });
                    });
                    document.getElementById('resetBtn').addEventListener('click', () => vscode.postMessage({ command: 'reset' }));
                    document.getElementById('skipBtn').addEventListener('click', () => vscode.postMessage({ command: 'skip' }));
                    document.getElementById('startWorkBtn').addEventListener('click', () => vscode.postMessage({ command: 'startWorkSession' }));
                    document.getElementById('startShortBreakBtn').addEventListener('click', () => vscode.postMessage({ command: 'startShortBreak' }));
                    document.getElementById('startLongBreakBtn').addEventListener('click', () => vscode.postMessage({ command: 'startLongBreak' }));

                    // --- Message Handler ---
                    window.addEventListener('message', event => {
                        if (event.data.command === 'updateState') {
                            updateUI(event.data.data);
                        }
                    });

                    // --- UI UPDATE LOGIC ---
                    function updateUI(data) {
                        if (!data || !data.state || !data.config) return;
                        const { state, config } = data;

                        // Timer and Progress Ring
                        const minutes = Math.floor(state.timeRemaining / 60);
                        const seconds = state.timeRemaining % 60;
                        document.getElementById('timerDisplay').textContent = \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
                        
                        const progress = state.sessionDuration > 0 ? (state.timeRemaining / state.sessionDuration) * 100 : 0;
                        document.getElementById('progressCircle').style.strokeDasharray = \`\${progress} 100\`;

                        // Session Info
                        document.getElementById('sessionType').textContent = getSessionName(state.currentSession);
                        document.getElementById('sessionCount').textContent = \`\${state.completedWorkSessions}/\${state.totalWorkSessions}\`;

                        // Controls
                        const startPauseBtn = document.getElementById('startPauseBtn');
                        if (state.isRunning) {
                            startPauseBtn.textContent = 'Pause';
                            startPauseBtn.dataset.action = 'pause';
                        } else {
                            startPauseBtn.textContent = state.isPaused ? 'Resume' : 'Start';
                            startPauseBtn.dataset.action = 'start';
                        }

                        // Quick Action Durations
                        document.getElementById('workDuration').textContent = \`\${config.workDuration} min\`;
                        document.getElementById('shortBreakDuration').textContent = \`\${config.shortBreakDuration} min\`;
                        document.getElementById('longBreakDuration').textContent = \`\${config.longBreakDuration} min\`;
                    }

                    function getSessionName(sessionType) {
                        if (sessionType === 'work') return 'Work';
                        if (sessionType === 'shortBreak') return 'Short Break';
                        if (sessionType === 'longBreak') return 'Long Break';
                        return 'Unknown';
                    }

                    // Tell the extension host that the webview is ready to receive data
                    vscode.postMessage({ command: 'webviewReady' });
                </script>
            </body>
            </html>`;
    }
}