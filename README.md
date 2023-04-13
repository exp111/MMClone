![icon](icon.png)

A Game Framework to load and play MicroMacro-like maps and cases.
Uses Leaflet to show the map.

## TODO:
- mp:
    - let users set color
    - let users select name?
    - make connecting less cbt
    - ping? => do direction effect on border when ping off screen
    - notify user that other user has changed/reset case
    - host migration/close lobby when host leaves
    - sync marker color
- right click menu:
    - debug:
        - on circle: set color
- style markers (so you can see what you marked)
- help page + first time landing page/tutorial
- fix bounds on small images
- mark solved cards better in ui
- make objective display better on mobile
- add shake on mobile/general cards after waiting too long?
- add case finish animation
- add possibility to (temporarily) see unflipped card?
- save case progress
- save settings
- optimize loading (zip limited?)
- support multi-steps (each step gets a "depends on" array? `step1.dependsOn = [step1,step2]`?)
- debug quick mp connect
- show step progress (1/4) somewhere on mobile (card menu? corner?)
- finer file load progress bar (hook put onsuccess?)
- performance test loading (seperate zip and idb tests)
- hints
- add github link (to help menu?)
- tests??

# How to create a map from a image
To transform a image to raster tiles you can use libvips with this command:

`vips dzsave <image name> --layout google --tile-size 256 --overlap 0 <output name> --suffix .png`


Problems:
- libvips v8.14.2 doesn't contain dzsave rn because of some licensing issues. use v8.14.1
- if images are too small, you may need to adjust the zoom level manually. for a 1080x1920 image i had to use min zoom 8, max zoom 11