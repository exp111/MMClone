from PIL import Image
offsets = [
    #x,y
    [(0,0), (3244,0), (6493,0), (9742,0)],
    [(0,2209), (3244,2209), (6493,2209), (9742,2209)],
    [(0,4428), (3244,4422), (6493,4427), (9742,4422)],
    [(0,6647), (3244,6641), (6493,6637), (9742,6635)],
]

# get the last image
lastRow = len(offsets) - 1
lastColumn = len(offsets[0]) - 1
lastImg = Image.open(f"{lastRow}_{lastColumn}.png")

totalWidth = offsets[lastRow][lastColumn][0] + lastImg.width
totalHeight = offsets[lastRow][lastColumn][1] + lastImg.height
print(f"Width: {totalWidth}, Height: {totalHeight}")

img = Image.new("RGBA", (totalWidth, totalHeight))
offset = 0
for row in range(len(offsets)):
    for column in range(len(offsets[0])):
        offset = offsets[row][column]
        img.paste(Image.open(f"{row}_{column}.png"), offset)
img.save("out.png")
print("Done")