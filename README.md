A Game Framework to load and play MicroMacro-like maps and cases.
Uses Leaflet to show the map.

## TODO:
- mp:
    - sync markers
    - sync case progress
    - sync case/map
    - sync cursors
- right click menu:
    - on marker: set color
    - debug:
        - on circle: set color, set position, allow finer radius tuning
        - on : print json
- style markers
- help page
- fix bounds on small images
- mark solved cards better in ui
- hide pointer on solution markers?
- move secrets into private repo
- fix pagination bullets being at the bottom
- make objective display better on mobile

# How to create a map from a image
To transform a image to raster tiles you can use libvips with this command:

`vips dzsave <image name> --layout google --tile-size 256 --overlap 0 <output name> --suffix .png`


Problems:
- libvips v8.14.2 didn't work for me for some reason. i used v8.14.1
- if images are too small, you may need to adjust the zoom level manually. for a 1080x1920 image i had to use min zoom 8, max zoom 11