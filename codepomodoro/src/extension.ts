import * as vscode from 'vscode';
import { PomodoroWebviewProvider } from './webview-provider';

// Export these types so the webview provider can use them
export enum SessionType {
    WORK = 'work',
    SHORT_BREAK = 'shortBreak',
    LONG_BREAK = 'longBreak'
}

export interface PomodoroState {
    currentSession: SessionType;
    timeRemaining: number;
    sessionDuration: number; // Total duration of the current session in seconds
    isRunning: boolean;
    isPaused: boolean;
    completedWorkSessions: number;
    totalWorkSessions: number;
    dailyPomodoros: number;
}

export function activate(context: vscode.ExtensionContext) {
    const pomodoroTimer = new PomodoroTimer(context);

    const webviewProvider = new PomodoroWebviewProvider(context.extensionUri, pomodoroTimer);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(PomodoroWebviewProvider.viewType, webviewProvider)
    );

    pomodoroTimer.setWebviewProvider(webviewProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('pomodoro.start', () => pomodoroTimer.start()),
        vscode.commands.registerCommand('pomodoro.pause', () => pomodoroTimer.pause()),
        vscode.commands.registerCommand('pomodoro.reset', () => pomodoroTimer.reset()),
        vscode.commands.registerCommand('pomodoro.skip', () => pomodoroTimer.skip()),
        vscode.commands.registerCommand('pomodoro.settings', () => pomodoroTimer.openSettings()),
        vscode.commands.registerCommand('pomodoro.startStop', () => {
            if (pomodoroTimer.isRunning()) {
                pomodoroTimer.pause();
            } else {
                pomodoroTimer.start();
            }
        }),
        vscode.commands.registerCommand('codepomodoro.quickStart', () => pomodoroTimer.showQuickStartMenu()),
        vscode.commands.registerCommand('codepomodoro.startWork', () => pomodoroTimer.startSpecificSession('work')),
        vscode.commands.registerCommand('codepomodoro.startShortBreak', () => pomodoroTimer.startSpecificSession('shortBreak')),
        vscode.commands.registerCommand('codepomodoro.startLongBreak', () => pomodoroTimer.startSpecificSession('longBreak')),
        vscode.commands.registerCommand('codepomodoro.showStats', () => pomodoroTimer.showStats())
    );

    context.subscriptions.push(pomodoroTimer);
}

export function deactivate() {}

export class PomodoroTimer implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private timer: NodeJS.Timeout | undefined;
    private state: PomodoroState;
    private context: vscode.ExtensionContext;
    private configListener: vscode.Disposable;
    private webviewProvider?: PomodoroWebviewProvider;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, this.getStatusBarPriority());

        const initialWorkDuration = this.getWorkDuration() * 60;
        this.state = this.loadState() || {
            currentSession: SessionType.WORK,
            timeRemaining: initialWorkDuration,
            sessionDuration: initialWorkDuration,
            isRunning: false,
            isPaused: false,
            completedWorkSessions: 0,
            totalWorkSessions: this.getSessionsBeforeLongBreak(),
            dailyPomodoros: 0
        };

        this.configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('pomodoro')) {
                this.onConfigurationChanged();
            }
        });

        this.updateStatusBar();
        if (this.shouldShowInStatusBar()) {
            this.statusBarItem.show();
        }
    }

    // Public method for command registration
    public isRunning(): boolean {
        return this.state.isRunning;
    }
    
    // --- Configuration Getters ---
    private getConfiguration = () => vscode.workspace.getConfiguration('pomodoro');
    private getWorkDuration = () => this.getConfiguration().get<number>('workDuration', 25);
    private getShortBreakDuration = () => this.getConfiguration().get<number>('shortBreakDuration', 5);
    private getLongBreakDuration = () => this.getConfiguration().get<number>('longBreakDuration', 15);
    private getSessionsBeforeLongBreak = () => this.getConfiguration().get<number>('sessionsBeforeLongBreak', 4);
    private shouldAutoStartBreaks = () => this.getConfiguration().get<boolean>('autoStartBreaks', true);
    private shouldAutoStartWork = () => this.getConfiguration().get<boolean>('autoStartWork', false);
    private shouldShowInStatusBar = () => this.getConfiguration().get<boolean>('showInStatusBar', true);
    private getStatusBarPriority = () => this.getConfiguration().get<number>('statusBarPriority', 100);

    private onConfigurationChanged(): void {
        this.state.totalWorkSessions = this.getSessionsBeforeLongBreak();
        this.shouldShowInStatusBar() ? this.statusBarItem.show() : this.statusBarItem.hide();

        if (!this.state.isRunning) {
            this.resetSession(this.state.currentSession);
        }
        
        this.updateStatusBar();
        this.updateWebview();
        this.saveState();
    }
    
    // --- Timer Controls ---
    public start(): void {
        if (this.state.isRunning) return;
        
        this.state.isRunning = true;
        this.state.isPaused = false;
        
        this.timer = setInterval(() => this.tick(), 1000);
        
        this.updateAllUIs();
        this.showNotification(`🍅 ${this.getSessionDisplayName()} session started!`);
    }

    public pause(): void {
        if (!this.state.isRunning) return;
        
        this.state.isRunning = false;
        this.state.isPaused = true;
        if (this.timer) clearInterval(this.timer);
        
        this.updateAllUIs();
        this.showNotification('⏸️ Pomodoro paused.');
    }

    public reset(): void {
        this.stop();
        this.state.completedWorkSessions = 0;
        this.resetSession(SessionType.WORK);
        this.updateAllUIs();
        this.showNotification('🔄 Pomodoro reset.');
    }

    public skip(): void {
        this.stop();
        this.nextSession(false);
        this.showNotification(`⏭️ Skipped to ${this.getSessionDisplayName()}.`);
    }

    private stop(): void {
        this.state.isRunning = false;
        this.state.isPaused = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    private tick(): void {
        this.state.timeRemaining--;
        if (this.state.timeRemaining <= 0) {
            this.onSessionComplete();
        } else {
            this.updateAllUIs();
        }
    }

    private onSessionComplete(): void {
        this.stop();
        if (this.state.currentSession === SessionType.WORK) {
            this.state.completedWorkSessions++;
            this.state.dailyPomodoros++;
        }
        this.showSessionCompleteNotification();
        this.nextSession(true);
    }
    
    // --- Session Management ---
    private nextSession(autoStart: boolean): void {
        let nextSessionType: SessionType;
        if (this.state.currentSession === SessionType.WORK) {
            nextSessionType = this.state.completedWorkSessions >= this.state.totalWorkSessions
                ? SessionType.LONG_BREAK
                : SessionType.SHORT_BREAK;
        } else {
            nextSessionType = SessionType.WORK;
        }
        
        if (nextSessionType === SessionType.LONG_BREAK) {
            this.state.completedWorkSessions = 0;
        }

        this.resetSession(nextSessionType);
        this.updateAllUIs();
        
        const shouldStart = autoStart && (nextSessionType === SessionType.WORK ? this.shouldAutoStartWork() : this.shouldAutoStartBreaks());
        if (shouldStart) {
            setTimeout(() => this.start(), 1000);
        }
    }
    
    private resetSession(sessionType: SessionType): void {
        this.state.currentSession = sessionType;
        let duration = 0;
        switch(sessionType) {
            case SessionType.WORK: duration = this.getWorkDuration() * 60; break;
            case SessionType.SHORT_BREAK: duration = this.getShortBreakDuration() * 60; break;
            case SessionType.LONG_BREAK: duration = this.getLongBreakDuration() * 60; break;
        }
        this.state.timeRemaining = duration;
        this.state.sessionDuration = duration;
    }

    public startSpecificSession(sessionType: 'work' | 'shortBreak' | 'longBreak'): void {
        this.stop();
        this.resetSession(sessionType as SessionType);
        this.start();
    }

    // --- UI and State ---
    private updateAllUIs() {
        this.updateStatusBar();
        this.updateWebview();
        this.saveState();
    }
    
    private updateStatusBar(): void {
        const icon = this.getSessionIcon();
        const time = this.formatTime(this.state.timeRemaining);
        this.statusBarItem.text = `${icon} ${time}`;
        this.statusBarItem.tooltip = `CodePomodoro: ${this.getSessionDisplayName()} (${this.state.completedWorkSessions}/${this.state.totalWorkSessions})`;
        this.statusBarItem.command = 'pomodoro.startStop';
    }

public updateWebview(): void {
    if (this.webviewProvider) {
        this.webviewProvider.updateWebview({
            state: this.state,
            config: {
                workDuration: this.getWorkDuration(),
                shortBreakDuration: this.getShortBreakDuration(),
                longBreakDuration: this.getLongBreakDuration()
            }
        });
    }
}

    private saveState = () => this.context.workspaceState.update('pomodoroState', this.state);
    private loadState = (): PomodoroState | undefined => this.context.workspaceState.get<PomodoroState>('pomodoroState');
    
    // --- Commands and Helpers ---
    public openSettings = () => vscode.commands.executeCommand('workbench.action.openSettings', 'pomodoro');
    
    public async showQuickStartMenu(): Promise<void> {
        // Implementation unchanged
    }

    public showStats(): void {
        // Implementation unchanged
    }

    private showNotification = (message: string) => vscode.window.showInformationMessage(message);

    private showSessionCompleteNotification(): void {
        const nextSessionName = this.state.currentSession === SessionType.WORK
            ? (this.state.completedWorkSessions >= this.state.totalWorkSessions ? 'Long Break' : 'Short Break')
            : 'Work';
        
        vscode.window.showInformationMessage(
            `✅ ${this.getSessionDisplayName()} complete! Time for a ${nextSessionName}.`,
            'Start Next'
        ).then(selection => {
            if (selection === 'Start Next') {
                this.start();
            }
        });
    }

    private getSessionDisplayName = (): string => ({
        [SessionType.WORK]: 'Work',
        [SessionType.SHORT_BREAK]: 'Short Break',
        [SessionType.LONG_BREAK]: 'Long Break'
    })[this.state.currentSession];
    
    private getSessionIcon = (): string => ({
        [SessionType.WORK]: '🍅',
        [SessionType.SHORT_BREAK]: '☕',
        [SessionType.LONG_BREAK]: '🛌'
    })[this.state.currentSession];
    
    private formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    public setWebviewProvider = (provider: PomodoroWebviewProvider) => this.webviewProvider = provider;
    
    public dispose(): void {
        this.stop();
        this.statusBarItem.dispose();
        this.configListener.dispose();
    }
}