from PIL import Image
import os, math

frontName = "front"
frontFiletype = "jpg"
backName = "back"
backFiletype = "jpg"
fileCount = 4
cardsPerRow = 5
cardsPerColumn = 6
# the card file sizes
frontW = [5000, 5000, 5000, 5000]
frontH = [3778, 3778, 3778, 3778]
backW = [4000, 5000, 5000, 5000]
backH = [3022, 3778, 3778, 3778]
# temp arrs
frontCardW = []
frontCardH = []
backCardW = []
backCardH = []
# calculate the card dimensions
for i in range(fileCount):
    frontCardW.append(frontW[i] / cardsPerRow)
    backCardW.append(backW[i] / cardsPerRow)
for i in range(fileCount):
    frontCardH.append(frontH[i] / cardsPerColumn)
    backCardH.append(backH[i] / cardsPerColumn)

# how many cards each case has
caseLength = [
    5, 5, 5, 5, 8, 10,
    7, 7, 8,
    10, 6, 9, 7,
    9, 8, 11
]
caseName = [
    "top_hat",
    "car_accident",
    "bank_heist",
    "sweet_sour",
    "leo_mustache",
    "dead_cat",
    "death_above",
    "dangerous_hobby",
    "love_song",
    "disappeared",
    "big_betty",
    "hairy_tales",
    "masked_avenger",
    "nature_kills",
    "sunday_stroll",
    "carnival"
]
# counters
curCase = 0
curStep = 0
curImg = 0

for page in range(fileCount):
    print(f"Opening files {page}")
    fName = f"{frontName}{page}.{frontFiletype}"
    bName = f"{backName}{page}.{backFiletype}"
    # open both the front and back img
    try:
        with Image.open(fName, mode="r") as front:
            with Image.open(bName, mode="r") as back:
                while curCase < len(caseLength): # only as long as we have cases
                    while curStep < caseLength[curCase]:
                        # check if we reached end
                        if curImg >= (cardsPerRow * cardsPerColumn): 
                            print(f"curImg {curImg} is too big. next file.")
                            curImg = 0 # reset totalImg count
                            raise StopIteration # open next file
                        # calculate some shit related to the card offset
                        indexX = curImg % cardsPerRow
                        indexY = math.floor(curImg / cardsPerRow)
                        frontW = frontCardW[page]
                        frontH = frontCardH[page]
                        backW = backCardW[page]
                        backH = backCardH[page]
                        print(f"{curImg}: {indexX}, {indexY}")
                        # the final position of the card
                        fRect = (indexX * frontW, indexY * frontH, (indexX + 1) * frontW, (indexY + 1) * frontH)
                        bRect = (indexX * backW, indexY * backH, (indexX + 1) * backW, (indexY + 1) * backH)
                        # crop copy the image
                        f = front.crop(fRect)
                        b = back.crop(bRect)
                        
                        # get dirname
                        dir = caseName[curCase]
                        # create dir if not exist
                        if not os.path.exists(dir):
                            os.makedirs(dir)
                        # file name
                        stepName = f"step{curStep}"
                        if curStep == 0: # special case for first step
                            stepName = "introduction"
                        # save
                        f.save(f"{dir}/{stepName}_front.png")
                        b.save(f"{dir}/{stepName}_back.png")
                        # increase img count
                        curStep += 1
                        curImg += 1
                    print(f"Case {curCase} ({caseName[curCase]}) done")
                    curStep = 0 # reset caseProgress
                    curCase += 1
    except StopIteration:
        pass
