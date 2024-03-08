import "@girs/gjs";
import Gtk from "@girs/gtk-4.0";
import Adw from "@girs/adw-1";
import Gio from "@girs/gio-2.0";
import { ExtensionPreferences, gettext as _ } from "@girs/gnome-shell/extensions/prefs";
import GObject from "@girs/gobject-2.0";
import GLib from "@girs/glib-2.0";
import * as Editor from "./editor";

export default class FtPreferences extends ExtensionPreferences {
    private _settings: Gio.Settings;

    constructor(metadata) {
        super(metadata);
    }

    fillPreferencesWindow(window: Adw.PreferencesWindow) {
        this._settings = this.getSettings();

        let g = new GeneralPage(this._settings);
        window.add(g);
        window.set_visible_page(g);

        window.set_size_request(-1, 600);
    }
}

const GeneralPage = GObject.registerClass(
    {
        GTypeName: "GeneralPage",
        Template: GLib.uri_resolve_relative(import.meta.url, "assets/ui/prefs-general.ui", GLib.UriFlags.NONE),
        InternalChildren: [
            "btnOverlayColor",
            "opacity",
            "highlightDistance",
            "switchAnimations",
            "dropDownDefaultLayout",
            "layouts",
            "btnOpenEditor",
        ],
    },
    class GeneralPage extends Adw.PreferencesPage {
        private _settings: Gio.Settings;
        constructor(settings: Gio.Settings) {
            super({});

            this._settings = settings;

            // Zone
            this._settings.bind("animate", this._switchAnimations, "active", Gio.SettingsBindFlags.DEFAULT);

            // Overlay
            this._settings.bind("zone-snap", this._highlightDistance, "value", Gio.SettingsBindFlags.DEFAULT);
            this.bindColorWidget("overlay-color", this._btnOverlayColor);
            this._settings.bind("overlay-opacity", this._opacity, "value", Gio.SettingsBindFlags.DEFAULT);

            // Layout
            this.bindLayoutDropDown();

            let editorBtn = this._btnOpenEditor as Gtk.Button;
            editorBtn.connect("clicked", (_) => {
                console.log("CLICKED");
                Editor.showEditor();
            });
        }

        private bindLayoutDropDown() {
            let dropDown = this._dropDownDefaultLayout as Gtk.DropDown;
            let defaultLayout = this._settings.get_string("default-layout");
            let stringList = this._layouts as Gtk.StringList;
            let json = JSON.parse(this._settings.get_string("layouts"));
            for (let name in json["layouts"]) {
                stringList.append(name);
                if (name === defaultLayout) {
                    dropDown.selected = stringList.get_n_items() - 1;
                }
            }

            dropDown.connect("notify::selected", (_) => {
                let item = stringList.get_item(dropDown.selected);
                if (!item) {
                    return;
                }
                let strItem = item as Gtk.StringObject;
                this._settings.set_string("default-layout", strItem.get_string());
            });
        }

        private bindColorWidget(settingsKey: string, widget: any) {
            if (!(widget instanceof Gtk.ColorButton)) {
                return;
            }

            let btn = widget as Gtk.ColorButton;

            btn.connect("color-set", (_) => {
                let val = new GLib.Variant("(ddd)", [btn.rgba.red, btn.rgba.green, btn.rgba.blue]);
                this._settings.set_value(settingsKey, val);
            });

            let rgb = btn.rgba;
            let initColor = this._settings.get_value(settingsKey).deepUnpack();
            rgb.red = initColor[0];
            rgb.green = initColor[1];
            rgb.blue = initColor[2];
            btn.rgba = rgb;
        }
    }
);

