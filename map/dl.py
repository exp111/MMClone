import requests, os
import const

address = const.address # 4x/0/0/0.png
for zoom in [
    "1x", # 6 zoom levels
    #"2x", # "
    #"3x", # "
    #"4x" # 5 zoom levels
    ]:
    for z in [6]:#range(6):
        for y in [2,9,10,12,13,19,20,27,28,31]:#range(64):
            for x in range(49):#64):
                dir = f"{zoom}/{z}/{y}"
                path = f"{dir}/{x}.png"
                cur = f"{address}/{path}"
                print(f"Trying {cur}")
                res = requests.get(cur)
                if res.status_code != 200:
                    print(f"Skipping {cur}")
                    continue
                    #break
                if not os.path.exists(dir):
                    os.makedirs(dir)
                file = open(path, "wb")
                file.write(res.content)
                file.close()
            if x == 0:
                print("X {x} failed. Increasing Y.")
                break
        if y == 0:
            print("Y {y} failed. Increasing Z.")
            break