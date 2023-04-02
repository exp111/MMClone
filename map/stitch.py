import os
from PIL import Image

def getDirs(folder):
    return [filename for filename in os.listdir(folder) if os.path.isdir(os.path.join(folder, filename))]

for scale in [
    "1x",
    #"2x",
    #"3x",
    #"4x"
    ]:
    scaleFolder = scale
    print(f"Scale {scale}")
    zooms = getDirs(scaleFolder)
    for zoom in zooms:
        print(f"- Zoom {zoom}")
        zoomDir = f"{scaleFolder}/{zoom}"
        # we now have rows
        rows = getDirs(zoomDir)
        rows.sort(key=int)
        zoomTiles = 0 # INFO: some rows have missing pieces so we save the highest tile count (the first row should have all tiles)
        for row in rows:
            print(f"-- Row {row}")
            rowFolder = f"{zoomDir}/{row}"
            result = f"{zoomDir}/row{row}.png"
            width = Image.open(f"{rowFolder}/0.png").size[0]
            imgs = os.listdir(rowFolder)
            imgs.sort()
            if len(imgs) > zoomTiles:
                zoomTiles = len(imgs)
            imgs = sorted(imgs, key=lambda x: int(x[:-4])) # sort by num
            totalWidth = width * zoomTiles
            img = Image.new("RGBA", (totalWidth, width))

            # INFO: some tiles are missing, fill with white
            for i in range(zoomTiles):
                path = f"{rowFolder}/{i}.png"
                if os.path.exists(path):
                    img.paste(Image.open(path), (i * width,0))
                else: # fill with white
                    img.paste((255,255,255), [i*width, 0, (i+1)*width, width])
            img.save(result)
        # then stitch rows together
        totalHeight = len(rows) * width
        total = Image.new("RGBA", (totalWidth, totalHeight))
        offset = 0
        for i in range(len(rows)):
            total.paste(Image.open(f"{zoomDir}/row{i}.png"), (0, offset))
            offset += width
        total.save(f"{zoomDir}/{zoom}.png")

