import "@girs/gjs";
import Meta from "@girs/meta-13";
import { FtObject } from "./shared";
import Clutter from "@girs/clutter-13";

/// region DisplayObserver

type windowObserverInfo = {
    observer: IWindowObserver;
    id: number;
    handlerWindowDrag: number;
    handlerDestroyed: number;
};

export interface IDisplayObserver {
    destroy();
    connect(sigName: "observer-drag", callback: (displayObserver: IDisplayObserver, windowObserver: IWindowObserver) => void);
    emit(sigName: "observer-drag", ...args: any[]);
    connect(sigName: string, callback: (...args: any[]) => void): number;
    disconnect(id: number);
}

class DisplayObserver extends FtObject implements IDisplayObserver {
    private _display: Meta.Display;
    private _windowObservers: windowObserverInfo[] = [];
    private _handlerWindowCreated: number | null = null;
    private _handlerWindowEnteredMonitor: number | null = null;

    constructor(display: Meta.Display) {
        super();
        this._display = display;
        this.init();
    }

    private init() {
        this.handleWindowCreated = this.handleWindowCreated.bind(this);
        this.handleWindowEnteredMonitor = this.handleWindowEnteredMonitor.bind(this);
        this.handleObserverDestroyed = this.handleObserverDestroyed.bind(this);
        this.handleObserverWindowDrag = this.handleObserverWindowDrag.bind(this);

        this._handlerWindowCreated = this._display.connect("window-created", this.handleWindowCreated);
        this._handlerWindowEnteredMonitor = this._display.connect("window-entered-monitor", this.handleWindowEnteredMonitor);

        // Create observers for existing windows
        this._display.list_all_windows().forEach((w) => this.createWindowObserver(w));
    }

    destroy() {
        super.destroy();
        this._display.disconnect(this._handlerWindowCreated);
        this._display.disconnect(this._handlerWindowEnteredMonitor);
        this._display = null;
        this._windowObservers.forEach((info) => this.removeWindowObserver(info.observer));
        this._windowObservers = null;
    }

    private findWindowActor(windowId: number): Meta.WindowActor | null {
        let actors: Clutter.Actor[] = Meta.get_window_actors(this._display);
        for (let actor of actors) {
            let windowActor = actor as Meta.WindowActor;
            if (windowActor.get_meta_window().get_id() === windowId) {
                return windowActor;
            }
        }
        return null;
    }

    private createWindowObserver(window: Meta.Window): WindowObserver | null {
        let actor = this.findWindowActor(window.get_id());
        if (actor == null) {
            logError(`could not find window actor for window id ${window.get_id()}`);
            return null;
        }

        let observer = new WindowObserver(window, actor);
        let info: windowObserverInfo = {
            observer: observer,
            id: observer.id,
            handlerDestroyed: observer.connect("window-destroyed", this.handleObserverDestroyed),
            handlerWindowDrag: observer.connect("window-drag", this.handleObserverWindowDrag),
        };

        this._windowObservers.push(info);
    }

    private removeWindowObserver(observer: IWindowObserver) {
        for (let i in this._windowObservers) {
            let info = this._windowObservers[i];
            if (info.id === observer.id) {
                info.observer.disconnect(info.handlerDestroyed);
                info.observer.disconnect(info.handlerWindowDrag);
                info.observer = null;
                this._windowObservers.splice(parseInt(i), 1);
            }
        }
    }

    private handleWindowCreated(display: Meta.Display, window: Meta.Window) {
        this.createWindowObserver(window);
    }

    private handleWindowEnteredMonitor(display: Meta.Display, monitor: number, window: Meta.Window) {
        // ignore at the moment
    }

    private handleObserverWindowDrag(observer: IWindowObserver) {
        this.emit("observer-drag", this, observer);
    }

    private handleObserverDestroyed(observer: IWindowObserver) {
        this.removeWindowObserver(observer);
    }
}

/// endregion DisplayObserver

/// region WindowObserver

export interface IWindowObserver {
    readonly id: number;
    readonly window: Meta.Window;
    readonly actor: Meta.WindowActor;
    destroy();
    connect(sigName: "window-destroyed", callback: (observer: IWindowObserver) => null): number;
    emit(sigName: "window-destroyed", ...args: any[]): void;
    connect(sigName: "window-drag", callback: (observer: IWindowObserver) => null): number;
    emit(sigName: "window-drag", ...args: any[]): void;

    connect(sigName: string, callback: (...args: any[]) => void): number;
    disconnect(id: number);
}

class WindowObserver extends FtObject implements IWindowObserver {
    private _window: Meta.Window;
    private _actor: Meta.WindowActor;
    private _id: number;

    private _handlerActorDestroy: number;
    private _handlerWindowPositionChanged: number;

    get id() {
        return this._id;
    }
    get window() {
        return this._window;
    }
    get actor() {
        return this._actor;
    }
    constructor(window: Meta.Window, actor: Meta.WindowActor) {
        super();
        this._window = window;
        this._actor = actor;
        this._id = window.get_id();

        this.init();
    }

    private init() {
        this.handleActorDestroy = this.handleActorDestroy.bind(this);
        this.handleWindowPositionChanged = this.handleWindowPositionChanged.bind(this);

        this._handlerWindowPositionChanged = this._window.connect("position-changed", this.handleWindowPositionChanged);
        this._handlerActorDestroy = this._actor.connect("destroy", this.handleActorDestroy);
    }

    destroy() {
        this._destroy(false);
    }

    private _destroy(emitSignal: boolean) {
        this._actor?.disconnect(this._handlerActorDestroy);
        this._window?.disconnect(this._handlerWindowPositionChanged);

        if (emitSignal) {
            this.emit("window-destroyed", this);
        }

        this._window = null;
        this._actor = null;
    }

    private handleWindowPositionChanged(arg: any) {
        this.emit("window-drag", this);
    }

    private handleActorDestroy(arg: any) {
        this._destroy(true);
    }
}

/// endregion WindowObserver

export function createDisplayObserver(display: Meta.Display): IDisplayObserver {
    return new DisplayObserver(display);
}
