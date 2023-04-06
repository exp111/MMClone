import requests, os
import const

address = const.address # 4x/0/0/0.png
for zoom in [
    "1x", # 6 zoom levels
    #"2x", # "
    #"3x", # "
    #"4x" # 5 zoom levels
    ]:
    for z in range(6):
        for y in range(64):
            for x in range(64):
                dir = f"{zoom}/{z}/{y}"
                file = f"{x}.png"
                outDir = f"{const.out}/{dir}"
                out = f"{outDir}/{file}"
                cur = f"{address}/{dir}/{file}"
                print(f"Trying {cur}")
                res = requests.get(cur)
                if res.status_code != 200:
                    print(f"Skipping {cur}")
                    break
                if not os.path.exists(outDir):
                    os.makedirs(outDir)
                file = open(out, "wb")
                file.write(res.content)
                file.close()
            if x == 0:
                print("X {x} failed. Increasing Y.")
                break
        if y == 0:
            print("Y {y} failed. Increasing Z.")
            break