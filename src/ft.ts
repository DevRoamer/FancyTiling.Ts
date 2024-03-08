import "@girs/gjs";
import Clutter from "@girs/clutter-13";
import GObject from "@girs/gobject-2.0";
import Meta from "@girs/meta-13";
import St from "@girs/st-13";
import GLib from "@girs/glib-2.0";
import * as Main from "@girs/gnome-shell/ui/main";

import { Extension } from "@girs/gnome-shell/extensions/extension";

import { createDisplayObserver, IDisplayObserver, IWindowObserver } from "./observers";
import { createLayoutManager, ILayout, ILayoutManager, IZone } from "./layout";
import { FtObject, FtSettings, Rectangle } from "./shared";

/// #region FancyTiling

class FancyTiling {
    private readonly _extension: Extension;
    private _displayObserver: IDisplayObserver;
    private _layoutManager: ILayoutManager;
    private _handlerObserverDrag: number;
    private _zoneSelector: IZoneSelector | null = null;

    get layoutManager() {
        return this._layoutManager;
    }

    get extension() {
        return this._extension;
    }

    constructor(extension: Extension) {
        this._extension = extension;
        this.init();
    }

    destroy() {
        this._displayObserver?.disconnect(this._handlerObserverDrag);
        this._displayObserver?.destroy();
        this._displayObserver = null;
        this._layoutManager?.destroy();
        this._layoutManager = null;
    }

    private init() {
        this.handleZoneFinished = this.handleZoneFinished.bind(this);
        this.handleZoneSelected = this.handleZoneSelected.bind(this);
        this.handleObserverDrag = this.handleObserverDrag.bind(this);

        this._displayObserver = createDisplayObserver(global.display);
        this._handlerObserverDrag = this._displayObserver.connect("observer-drag", this.handleObserverDrag);
        this._layoutManager = createLayoutManager(global.display);
        this._layoutManager.loadLayouts();
    }

    private handleObserverDrag(displayObserver: IDisplayObserver, windowObserver: IWindowObserver) {
        if (this._zoneSelector != null || this._layoutManager.activeLayout == null) {
            return;
        }

        this._zoneSelector = new ZoneSelector(this._layoutManager.activeLayout, windowObserver);
        this._zoneSelector.connect("finished", this.handleZoneFinished);
        this._zoneSelector.connect("zone-selected", this.handleZoneSelected);
        this._zoneSelector.run();
    }

    private handleZoneFinished(selector: IZoneSelector) {
        this._zoneSelector?.destroy();
        this._zoneSelector = null;
    }

    private handleZoneSelected(windowObserver: IWindowObserver, zone: IZone) {}
}

/// #endregion FancyTiling

/// #region ZoneSelector

interface IZoneSelector {
    destroy();
    run();
    connect(sigName: "finished", callback: (selector: ZoneSelector) => void);
    emit(sigName: "finished", ...args: any[]);
    connect(sigName: "zone-selected", callback: (windowObserver: IWindowObserver, zone: IZone | null) => void);
    emit(sigName: "zone-selected", ...args: any[]);
    connect(sigName: string, callback: (...args: any[]) => void): number;
    disconnect(id: number);
}

class ZoneSelector extends FtObject implements IZoneSelector {
    private _actor: ZoneActor | null;
    private _seat: Clutter.Seat | null;
    private _handlerInterval: number | null;
    private _cancelRequested: boolean = false;
    private _layout: ILayout;
    private _observer: IWindowObserver;
    private _rect: Rectangle | null;

    constructor(layout: ILayout, observer: IWindowObserver) {
        super();
        this._layout = layout;
        this._observer = observer;
        this.init();
    }

    destroy() {
        this.stop();
        this._seat = null;
        if (this._actor?.isAssigned ?? false) {
            global.stage.remove_child(this._actor);
            this._actor.isAssigned = false;
        }
        this._actor?.destroy();
        this._actor = null;
        this._layout = null;
        this._observer = null;
        super.destroy();
    }

    run() {
        global.stage.add_child(this._actor);
        this._actor.isAssigned = true;
        this._handlerInterval = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => {
            if (!this._cancelRequested && !this.update()) {
                return GLib.SOURCE_CONTINUE;
            }
            this.stop();
            return GLib.SOURCE_REMOVE;
        });
    }

    private init() {
        this.stop = this.stop.bind(this);
        this.update = this.update.bind(this);

        this._seat = Clutter.get_default_backend().get_default_seat();
        this._actor = new ZoneActor();
    }

    private update(): boolean {
        let [, mousePos, mouseMod] = this._seat.query_state(this._seat.get_pointer(), null);
        let [, , keyboardMod] = this._seat.query_state(this._seat.get_keyboard(), null);

        let btnDown = (mouseMod & Clutter.ModifierType.BUTTON1_MASK) != 0;
        let keyDown = (keyboardMod & Clutter.ModifierType.CONTROL_MASK) != 0;
        let rect: Rectangle | null = null;

        if (btnDown) {
            if (keyDown) {
                rect = this._layout.getZoneRectangleAt(mousePos.x, mousePos.y);
            } else {
                rect = null;
            }
        } else {
            if (keyDown) {
                this.onZoneSelected();
            }
            return true;
        }

        if (rect != null) {
            this.showZoneActor(rect);
        } else {
            this.hideZoneActor();
        }

        this._rect = rect;
        return false;
    }

    private onZoneSelected() {
        if (this._rect == null) {
            return;
        }

        let window = this._observer.window;
        let windowActor = this._observer.actor;

        if (FtSettings.isAnimated) {
            windowActor.remove_all_transitions();
            //@ts-ignore
            Main.wm._prepareAnimationInfo(
                global.window_manager,
                windowActor,
                window.get_frame_rect().copy(),
                Meta.SizeChange.MAXIMIZE
            );
        }
        window.move_frame(true, this._rect.x, this._rect.y);
        window.move_resize_frame(true, this._rect.x, this._rect.y, this._rect.width, this._rect.height);
    }

    private stop() {
        if (this._cancelRequested) {
            return;
        }
        this._cancelRequested = true;
        if (this._handlerInterval != null) {
            GLib.source_remove(this._handlerInterval);
            this._handlerInterval = null;
        }
        this.emit("finished", this);
    }

    private showZoneActor(rect: Rectangle) {
        this._actor.rectangle = rect;
        this._actor.show();
    }

    private hideZoneActor() {
        this._actor.hide();
    }
}

// #endregion

/// #region ZoneActor

class ZoneActor extends St.Bin {
    static {
        GObject.registerClass(this);
    }

    private _assigned: boolean;

    get isAssigned(): boolean {
        return this._assigned;
    }
    set isAssigned(a: boolean) {
        this._assigned = a;
    }

    get rectangle(): Rectangle {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }

    set rectangle(r: Rectangle) {
        this.x = r.x;
        this.y = r.y;
        this.width = r.width;
        this.height = r.height;
    }

    constructor() {
        super({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            styleClass: "ft-zone-actor",
            visible: false,
        });

        this.set_opacity(FtSettings.overlayOpacity * 255);
        let colArray = FtSettings.overlayColor;
        this.set_background_color(
            new Clutter.Color({ red: colArray[0] * 255, green: colArray[1] * 255, blue: colArray[2] * 255, alpha: 255 })
        );
    }
}

/// #endregion ZoneActor

export default FancyTiling;
