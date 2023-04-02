A Game Framework to load and play MicroMacro-like maps and cases.
Uses Leaflet to show the map.

## TODO:
- allow images for cases + show the cards
- map upload => zip upload, parse only whats there (maps, cases, case images...) 
- ui
- mp:
    - sync markers
    - sync case progress
    - sync case/map
    - sync cursors
- custom level to show how everything works
- right click menu:
    - on marker: set color
    - debug:
        - on circle: set color, set radius
- style markers
- help page

# How to create a map from a image
To transform a image to raster tiles you can use libvips with this command:

`vips dzsave <image name> --layout google --tile-size 256 --overlap 0 <output name> --suffix .png`


Problems:
- libvips v8.14.2 didn't work for me for some reason. i used v8.14.1
- if images are too small, you may need to adjust the zoom level manually. for a 1080x1920 image i had to use min zoom 8, max zoom 11