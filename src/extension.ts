import Gio from "@girs/gio-2.0";
import St from "@girs/st-13";
import GObject from "@girs/gobject-2.0";
import * as Main from "@girs/gnome-shell/ui/main";
import { Extension } from "@girs/gnome-shell/extensions/extension";
import { Button as PanelMenuButton } from "@girs/gnome-shell/ui/panelMenu";
import { PopupMenuItem } from "@girs/gnome-shell/ui/popupMenu";
import FancyTiling from "./ft";
import { FtSettings } from "./shared";
import { showEditor } from "./editor";

export default class FancyTilingExtension extends Extension {
    private _ft: FancyTiling;
    private _handlerSettingChanged: number | null;
    private _settings: Gio.Settings;
    private _indicator: FancyTilingIndicator | null;

    get settings() {
        return this._settings;
    }

    get ft() {
        return this._ft;
    }

    enable() {
        this._settings = this.getSettings();
        FtSettings.init(this._settings);
        this._ft = new FancyTiling(this);
        this._indicator = new FancyTilingIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this.getSettings().disconnect(this._handlerSettingChanged);
        this._handlerSettingChanged = null;
        this._indicator?.destroy();
        this._indicator = null;
        this._ft?.destroy();
        this._ft = null;
        FtSettings.destroy();
    }
}

/// #region FancyTilingIndicator

class FancyTilingIndicator extends PanelMenuButton {
    static {
        GObject.registerClass(this);
    }

    private _extension: FancyTilingExtension;
    private _panelIcon: St.Icon | null = null;

    constructor(extension: FancyTilingExtension) {
        super(0.0, "Fancy Tiling");
        this._extension = extension;
    }

    _init() {
        super._init(0.0, "Fancy Tiling");

        this._panelIcon = new St.Icon({
            iconSize: 16,
            iconName: "fancy-tiling-light",
            styleClass: "system-status-icon",
        });

        this.add_child(this._panelIcon);

        let preferencesItem = new PopupMenuItem("Preferences");
        preferencesItem.connect("activate", () => {
            this._extension.openPreferences();
        });

        this.menu.addMenuItem(preferencesItem);

        let editorItem = new PopupMenuItem("Layout editor");
        editorItem.connect("activate", () => {
            showEditor(this._extension.ft.layoutManager.activeLayout);
        });

        this.menu.addMenuItem(editorItem);
    }

    destroy(): void {
        this.destroy_all_children();
        this._panelIcon = null;
        this._extension = null;
    }
}

/// #endregion FancyTilingIndicator
