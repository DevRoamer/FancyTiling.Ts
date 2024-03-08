import "@girs/gjs";
import Gio from "@girs/gio-2.0";
import Meta from "@girs/meta-13";
import { FtObject, FtSettings, Rectangle, getDisplayClientAreaRect } from "./shared";

/// #region LayoutManager

interface LayoutChangedSignalCallback {
    (layoutManager: ILayoutManager, layout: ILayout): void;
}

export interface ILayoutManager {
    activeLayout: ILayout;
    getLayouts(): ILayout[];
    addLayout(layout: ILayout): void;
    removeLayout(layout: ILayout): boolean;

    destroy();
    loadLayouts();
    saveLayouts();

    connect(sigName: "active-layout-changed", callback: LayoutChangedSignalCallback): number;
    emit(sigName: "active-layout-changed", ...args: any[]): void;
    connect(sigName: "layout-added", callback: LayoutChangedSignalCallback): number;
    emit(sigName: "layout-added", ...args: any[]): void;
    connect(sigName: "layout-removed", callback: LayoutChangedSignalCallback): number;
    emit(sigName: "layout-removed", ...args: any[]): void;
    connect(sigName: string, callback: (...args: any[]) => void): number;
    disconnect(id: number);
}

class LayoutManager extends FtObject implements ILayoutManager {
    private _activeLayout: ILayout | null;
    private _layouts: ILayout[] = [];
    private _displayRect: Rectangle;

    get activeLayout(): ILayout {
        return this._activeLayout;
    }

    set activeLayout(layout: ILayout) {
        this._activeLayout = layout;
        this.emit("active-layout-changed", this, layout);
    }

    constructor(display: Meta.Display) {
        super();
        this._displayRect = getDisplayClientAreaRect(display);
    }

    loadLayouts() {
        this._layouts = [];
        this._activeLayout = null;
        let zoneSnap = FtSettings.zoneSnap;
        let jsonStr = FtSettings.layouts;
        if (jsonStr) {
            let json = JSON.parse(jsonStr);
            for (let layoutName in json["layouts"]) {
                let layout = new Layout(this._displayRect, zoneSnap, layoutName, json["layouts"][layoutName]);
                this.addLayout(layout);
            }
        }

        let defaultLayout = this.findLayout(FtSettings.defaultLayout);
        if (defaultLayout != null) {
            this._activeLayout = defaultLayout;
        } else if (defaultLayout == null && this._layouts.length > 0) {
            this.activeLayout = this._layouts[0];
        }
    }

    saveLayouts() {}

    getLayouts(): ILayout[] {
        return this._layouts;
    }
    addLayout(layout: ILayout): void {
        this._layouts.push(layout);
        this.emit("layout-added", this, layout);
    }
    removeLayout(layout: ILayout): boolean {
        for (let i in this._layouts) {
            if (this._layouts[i] === layout) {
                this._layouts.splice(parseInt(i), 1);
                this.emit("layout-removed", this, layout);
                return true;
            }
        }

        return false;
    }
    findLayout(name: string): ILayout | null {
        for (let layout of this._layouts) {
            if (layout.name === name) {
                return layout;
            }
        }

        return null;
    }
    destroy(): void {
        super.destroy();
    }
}

/// #endregion LayoutManager

/// #region Layout

export interface ILayout {
    readonly name: string;
    readonly zoneCount: number;
    getZoneAt(x: number, y: number): IZone | null;
    getZoneRectangleAt(x: number, y: number): Rectangle | null;
    getZoneByName(name: string): IZone | null;
    getRectangles(): Rectangle[];
}

class Layout implements ILayout {
    private _zones: Zone[] = [];
    private _name: string;
    private _mergeDistance: number;

    get zoneCount() {
        return this._zones.length;
    }
    get name() {
        return this._name;
    }

    constructor(displayRect: Rectangle, mergeDistance: number, name: string, json: {}) {
        this._name = name;
        this._mergeDistance = mergeDistance;
        this.load(displayRect, json);
    }
    getRectangles(): Rectangle[] {
        return this._zones.map((z) => z.rectangle.clone());
    }

    getZoneByName(name: string): IZone | null {
        for (let zone of this._zones) {
            if (zone.name === name) {
                return zone;
            }
        }

        return null;
    }
    getZoneAt(x: number, y: number): IZone | null {
        for (let zone of this._zones) {
            if (zone.rectangle.contains(x, y)) {
                return zone;
            }
        }

        return null;
    }

    getZoneRectangleAt(x: number, y: number): Rectangle | null {
        let rect = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];
        let mouseRect = new Rectangle(
            x - this._mergeDistance,
            y - this._mergeDistance,
            this._mergeDistance * 2,
            this._mergeDistance * 2
        );
        for (let zone of this._zones) {
            if (zone.rectangle.intersects(mouseRect)) {
                rect[0] = Math.min(rect[0], zone.rectangle.x);
                rect[1] = Math.min(rect[1], zone.rectangle.y);
                rect[2] = Math.max(rect[2], zone.rectangle.right);
                rect[3] = Math.max(rect[3], zone.rectangle.bottom);
            }
        }
        let result = Rectangle.fromLTRB(rect[0], rect[1], rect[2], rect[3]);
        return result.isEmpty ? null : result;
    }

    private load(displayRect: Rectangle, json: {}) {
        this._name = json["name"];
        for (let zoneName in json["zones"]) {
            let zonePoints = json["zones"][zoneName];
            let zone = new Zone(
                zoneName,
                Rectangle.fromLTRB(
                    zonePoints[0] * displayRect.width + displayRect.x,
                    zonePoints[1] * displayRect.height + displayRect.y,
                    zonePoints[2] * displayRect.width + displayRect.x,
                    zonePoints[3] * displayRect.height + displayRect.y
                )
            );
            this._zones.push(zone);
        }
    }
}

/// #endregion Layout

/// #region Zone

export interface IZone {
    name: string;
    rectangle: Rectangle;
}

class Zone implements IZone {
    private _name: string;
    private _rect: Rectangle;

    get name() {
        return this._name;
    }
    set name(name: string) {
        this._name = name;
    }

    get rectangle() {
        return this._rect;
    }
    set rectangle(r: Rectangle) {
        this._rect = r;
    }

    constructor(name: string, rect: Rectangle) {
        this._name = name;
        this._rect = rect;
    }
}

export function createLayoutManager(display: Meta.Display): ILayoutManager {
    return new LayoutManager(display);
}

/// #endregion Zone
