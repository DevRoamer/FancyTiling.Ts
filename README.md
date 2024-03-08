# <img src="./assets/fancy-tiling.svg" width="32" height="32"> Fancy Tiling
![GNOME](https://img.shields.io/badge/45-4A86CF?style=for-the-badge&logo=gnome&logoColor=white&label=GNOME) ![TypeScript](https://img.shields.io/badge/TypeScript-2F74C0.svg?style=for-the-badge&logo=typescript&logoColor=0B3D8D) ![Yarn](https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white)

[Fancy Zones](https://learn.microsoft.com/en-us/windows/powertoys/fancyzones) clone for GNOME 45.
_This extension is in a very early stage_

### Usage
At the moment the activation key is the Ctrl-key. **Start dragging** a window and press **Ctrl**, release mouse button while holding Ctrl will move the window in the selected zone.

### Requierments
- git
- make
- gnome-shell-extension-tool
- [node.js](https://nodejs.org/)
- [yarn](https://yarnpkg.com/)

### Manual Installation (for testers & enthusiasts)

So, if you have all requierments installed you can proceed as follows.

1) Clone the repository via the git-clone command and change to the FancyTiling directory:
```
git clone https://github.com/DevRoamer/fancy-tiling.git
cd fancy-tiling
```

2) If you have already installed FancyTiling, then please remove the existing installation via:
```
make uninstall
```

3) Install it via:
```
make install
```

4) Enable or disable the extension via:
```
make enable
```

```
make disable
```

5) Logout from the current GNOME session and login again for the changes to take effect.

### make options

| Option    | Description                 |
| --------- | --------------------------- |
| build     | build extension             |
| clean     | clean build files           |
| compile   | compile gschema files       |
| disable   | disable extension           |
| enable    | enable extension            |
| install   | install extension           |
| rebuild   | clean & build               |
| test      | run an nested gnome session |
| uninstall | uninstall extension         |

### Customize zones (only for early releases)

To customize layout in early releases you need to edit the [gschema file](./src/schemas/org.gnome.shell.extensions.ft.gschema.xml) or use [dconf](https://wiki.gnome.org/Projects/dconf) and set 
```
/org/gnome/shell/extensions/ft/layouts
```

The default layout config:
```json
{
    "layouts": {
        "2x2": {                      /// layout name
            "zones": {                
                "1":[0,0,0.5,0.5],    /// zone name with 4 float values 
                "2":[0.5,0,1,0.5],    /// (0-1 -> 0 = left/top, 1 = right/bottom)
                "3":[0,0.5,0.5,1],    /// values are for [x, y, right, bottom]
                "4":[0.5,0.5,1,1]
            }
        }
    }
}
```

Compile and install after editing the gschema -> Logout and login.

