import "@girs/gjs";
import St from "@girs/st-13";
import GObject from "@girs/gobject-2.0";
import { Rectangle } from "./shared";
import Meta from "@girs/meta-13";
import { ILayout } from "./layout";
import Clutter from "@girs/clutter-13";

/// #region LayoutEditor

interface ILayoutEditor {
    showEditor();
    destroy();
}

class LayoutEditor extends St.Viewport implements ILayoutEditor {
    static {
        GObject.registerClass(this);
    }

    private _rectangles: ZoneRectangle[];
    private _display: Meta.Display;

    constructor(layout: ILayout) {
        super();
        this._display = global.display;
        let [w, h] = this._display.get_size();
        this.x = 0;
        this.y = 0;
        this.width = w;
        this.height = h;
        this.loadRectangles(layout);
        this.canFocus = true;
    }

    showEditor() {
        global.stage.add_child(this);
    }

    private loadRectangles(layout: ILayout) {
        this._rectangles = layout.getRectangles().map((x) => new ZoneRectangle(x));
        this._rectangles.forEach((z) => this.add_child(z));
    }
}

/// #endregion LayoutEditor

/// #region ZoneRectangle

interface IZoneRectangle {}

class ZoneRectangle extends St.Bin {
    static {
        GObject.registerClass(this);
    }

    constructor(r: Rectangle) {
        super({
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            xAlign: Clutter.ActorAlign.CENTER,
            yAlign: Clutter.ActorAlign.CENTER,
            backgroundColor: Clutter.Color.new(Math.random() * 255, Math.random() * 255, Math.random() * 255, 50),
            styleClass: "ft-editor-zone",
            canFocus: true,
            reactive: true,
            trackHover: true,
        });
    }

    vfunc_notify(pspec: GObject.ParamSpec) {
        if (pspec.get_name() === "hover") {
            let col = this.backgroundColor;
            col.alpha = this.get_hover() ? 200 : 50;
            this.backgroundColor = col;
        }
    }

    vfunc_button_press_event(event: Clutter.Event): boolean {
        this.grab_key_focus();
        return Clutter.EVENT_STOP;
    }
}

/// #endregion ZoneRectangle

/// #region Splitter

enum SplitterOrientation {
    Horizontal,
    Vertical,
}

interface ISplitter {
    readonly orientation: SplitterOrientation;
    readonly sideAZones: ZoneRectangle[];
    readonly sideBZones: ZoneRectangle[];
    splitterPosition: number;

    destroy();
    connect(sigName: "position-changed", callback: (splitter: ISplitter) => void);
    emit(sigName: "position-changed", ...args: any[]);
    connect(sigName: string, callback: (...args: any[]) => void): number;
    disconnect(id: number);
}

class HorizontalSplitter extends St.BoxLayout implements ISplitter {
    static {
        GObject.registerClass(this);
    }

    private _position: number;
    private _sideAZones: ZoneRectangle[];
    private _sideBZones: ZoneRectangle[];

    get orientation() {
        return SplitterOrientation.Horizontal;
    }
    get splitterPosition() {
        return this._position;
    }
    set splitterPosition(v: number) {
        this._position = v;
        this.emit("position-changed", this);
    }
    get sideAZones() {
        return this._sideAZones;
    }
    get sideBZones() {
        return this._sideBZones;
    }

    constructor(position: number, sideA: ZoneRectangle[], sideB: ZoneRectangle[]) {
        super();
        this._position = position;
        this._sideAZones = sideA;
        this._sideBZones = sideB;
        this.init();
    }

    private init() {
        let h = 0;
        let y = Number.MAX_VALUE;
        this._sideAZones.forEach((z) => {
            h = Math.max(h, z.get_height());
            y = Math.min(y, z.get_y());
        });
        this._sideBZones.forEach((z) => {
            h = Math.max(h, z.get_height());
            y = Math.min(y, z.get_y());
        });
        this.x = this._position - 3;
        this.y = y;
        this.width = 6;
        this.height = h;
        this.backgroundColor = Clutter.Color.new(100, 100, 100, 255);
    }

    vfunc_enter_event(event: Clutter.Event): boolean {
        console.log("ENTER");
        return Clutter.EVENT_STOP;
    }
}

/// #endregion

export function showEditor(layout: ILayout) {
    let editor = new LayoutEditor(layout);
    editor.showEditor();
}
