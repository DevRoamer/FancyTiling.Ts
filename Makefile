NAME=ft
UUID=$(NAME)@devroamer.zen
ZIP=$(UUID).shell-extension.zip
OUT_DIR=build

build: clean compile
	gnome-extensions pack -f \
		--extra-source=../assets \
		--extra-source=../src/metadata.json \
		--extra-source=../src/stylesheet.css \
		--schema=../src/schemas/org.gnome.shell.extensions.$(NAME).gschema.xml \
		--podir=../po \
		$(OUT_DIR) \
		-o ./

compile:
	mkdir -p ./build
	yarn install
	yarn build

install: build remove
	gnome-extensions install -f $(ZIP)

pot:
	rm -f po/LINGUAS
	find assets/ui -iname "*.ui" -printf "%f\n" | sort | \
		xargs xgettext --directory=assets/ui --output=po/$(UUID).pot \
		--from-code=utf-8 --package-name=$(UUID)

	for l in $$(ls po/*.po); do \
		basename $$l .po >> po/LINGUAS; \
	done

	cd po && \
	for lang in $$(cat LINGUAS); do \
    	mv $${lang}.po $${lang}.po.old; \
    	msginit --no-translator --locale=$$lang --input $(UUID).pot -o $${lang}.po.new; \
    	msgmerge -N $${lang}.po.old $${lang}.po.new > $${lang}.po; \
    	rm $${lang}.po.old $${lang}.po.new; \
	done


uninstall:
	gnome-extensions uninstall $(UUID)

remove:
	rm -rf $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

clean:
	rm -f $(ZIP)
	rm -rf ./$(OUT_DIR) ./src/po/*.mo

test: install
	env GNOME_SHELL_SLOWDOWN_FACTOR=2 \
		 MUTTER_DEBUG_DUMMY_MODE_SPECS=1920x1080 \
		 dbus-run-session -- gnome-shell --nested --wayland


test-prefs: install
	gnome-extensions prefs $(UUID)