import * as Main from "@girs/gnome-shell/ui/main";
import Meta from "@girs/meta-13";
import Gio from "@girs/gio-2.0";
import GLib from "@girs/glib-2.0";

/// #region FtObject

export class FtObject {
    private _handlers: {} = {};
    private _handlerCount: number = 0;

    connect(sigName: string, callback: (...args: any[]) => void): number {
        if (!(sigName in this._handlers)) {
            this._handlers[sigName] = [];
        }

        let id = this._handlerCount++;
        this._handlers[sigName].push({ id: id, callback: callback });
        return id;
    }

    disconnect(id: number): void {
        for (let sigName in this._handlers) {
            for (let i in this._handlers[sigName]) {
                if (this._handlers[sigName][i].id === id) {
                    this._handlers[sigName].splice(parseInt(i), 1);
                    return;
                }
            }
        }
    }

    emit(sigName: string, ...args: any[]): void {
        if (!(sigName in this._handlers)) {
            return;
        }

        for (let info of this._handlers[sigName]) {
            info.callback(...args);
        }
    }

    destroy() {
        this._handlers = {};
        this._handlerCount = 0;
    }
}

/// #endregion FtObject

/// #region Rectangle

export class Rectangle {
    private readonly _x: number;
    private readonly _y: number;
    private readonly _width: number;
    private readonly _height: number;

    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }

    get top() {
        return this._y;
    }
    get bottom() {
        return this._height + this._y;
    }
    get left() {
        return this._x;
    }
    get right() {
        return this._width + this._x;
    }

    get isEmpty() {
        return this._width <= 0 || this._height <= 0;
    }

    constructor(x: number, y: number, width: number, height: number) {
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
    }

    toString() {
        return `Rectangle[isEmpty: ${this.isEmpty}, x: ${this._x}, y: ${this._y}, width: ${this._width}, height: ${this._height}]`;
    }

    contains(x: number, y: number): boolean {
        return this.x <= x && this.y <= y && this.right > x && this.bottom > y;
    }

    clone(): Rectangle {
        return new Rectangle(this._x, this._y, this._width, this._height);
    }

    intersects(other: Rectangle): boolean {
        return (
            this.contains(other.x, other.y) ||
            this.contains(other.right, other.y) ||
            this.contains(other.right, other.bottom) ||
            this.contains(other.x, other.bottom)
        );
    }

    static combine(a: Rectangle, b: Rectangle): Rectangle {
        return this.fromLTRB(
            Math.min(a.x, b.x),
            Math.min(a.y, b.y),
            Math.max(a.right, b.right),
            Math.max(a.bottom, b.bottom)
        );
    }

    static fromLTRB(left: number, top: number, right: number, bottom: number): Rectangle {
        return new Rectangle(left, top, right - left, bottom - top);
    }
}

/// #endregion Rectangle

/// #region Util functions

export function getDisplayClientAreaRect(display: Meta.Display): Rectangle {
    let x1 = 0,
        y1 = 0,
        x2 = display.get_size()[0],
        y2 = display.get_size()[1];
    let panelBounds = new Rectangle(
        Main.panel.get_x(),
        Main.panel.get_y(),
        Main.panel.get_width(),
        Main.panel.get_height()
    );

    if (panelBounds.width < panelBounds.height) {
        // vertical
        if (panelBounds.x <= 0) {
            // left
            x1 = panelBounds.right;
        } else {
            x2 = panelBounds.x;
        }
    } else {
        // horizontal
        if (panelBounds.y <= 0) {
            y1 = panelBounds.bottom;
        } else {
            y2 = panelBounds.bottom;
        }
    }

    let clientRect = Rectangle.fromLTRB(x1, y1, x2, y2);
    return clientRect;
}

/// #endregion Util functions

/// #region FtSettings

export class FtSettings {
    private static _gSettings: Gio.Settings;

    static readonly Keys = {
        showIndicator: "show-indicator",
        overlayColor: "overlay-color",
        overlayOpacity: "overlay-opacity",
        animate: "animate",
        zoneSnap: "zone-snap",
        defaultLayout: "default-layout",
        layouts: "layouts",
    };

    static get gSettings() {
        return FtSettings._gSettings;
    }

    static init(gSettings: Gio.Settings) {
        FtSettings._gSettings = gSettings;
    }

    static destroy() {
        FtSettings._gSettings = null;
    }

    static get isAnimated() {
        return FtSettings.gSettings.get_boolean(this.Keys.animate);
    }
    static set isAnimated(value: boolean) {
        FtSettings.gSettings.set_boolean(this.Keys.animate, value);
    }
    static get defaultLayout() {
        return FtSettings.gSettings.get_string(this.Keys.defaultLayout);
    }
    static set defaultLayout(value: string) {
        FtSettings.gSettings.set_string(this.Keys.defaultLayout, value);
    }

    static get overlayColor() {
        return FtSettings.gSettings.get_value(this.Keys.overlayColor).deepUnpack();
    }
    static set overlayColor(value: number[]) {
        FtSettings.gSettings.set_value(this.Keys.overlayColor, new GLib.Variant("(iii)", value));
    }

    static get overlayOpacity() {
        return FtSettings.gSettings.get_double(this.Keys.overlayOpacity);
    }
    static set overlayOpacity(value: number) {
        FtSettings.gSettings.set_double(this.Keys.overlayOpacity, value);
    }

    static get zoneSnap() {
        return FtSettings.gSettings.get_int(this.Keys.zoneSnap);
    }
    static set zoneSnap(value: number) {
        FtSettings.gSettings.set_int(this.Keys.zoneSnap, value);
    }

    static get layouts() {
        return FtSettings.gSettings.get_string(this.Keys.layouts);
    }
    static set layouts(value: string) {
        FtSettings.gSettings.set_string(this.Keys.layouts, value);
    }
}

/// #endregion FtSettings
