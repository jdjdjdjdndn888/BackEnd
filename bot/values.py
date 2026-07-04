import cloudscraper
from bs4 import BeautifulSoup
from pymongo import MongoClient, UpdateOne
import asyncio
from time import time
import random
import string
import re
from termcolor import colored

database_url = "mongodb+srv://admin:leo123le29@spinny.wua2c.mongodb.net/bloxyspin?retryWrites=true&w=majority&appName=spinny"
scraper = cloudscraper.create_scraper(
    browser={'browser': 'chrome', 'platform': 'android', 'desktop': False}
)
Cluster = MongoClient([database_url])
Database = Cluster["bloxyspin"] 
Data = Database["items"] 
PetIcons = scraper.get("https://biggamesapi.io/api/collection/Pets").json()

items = 0


## do not touch

def UnFormat(string):
    suffixes = {'K': 1000, 'M': 1000000, 'B': 1000000000, 'T': 1000000000000, 'Q': 1000000000000000}
    try:
        number = int(string)
    except ValueError:
        try:
            if string[-1].upper() in suffixes:
                number_str = string[:-1]
                suffix = string[-1].upper()
            else:
                number_str = string[:-1]
                suffix = string[-1].upper()
            if suffix in suffixes:
                number = int(float(number_str) * suffixes[suffix])
            else:
                return 0
        except ValueError:
            return 0
    return number

def GetData(PetName):
    CheckName = str.lower(PetName)
    FoundPet = False
    Golden = False
    Rainbow = False
    Shiny = False

    if "golden " in CheckName:
        CheckName = CheckName.replace("golden ", "", 1)
        Golden = True

    if "rainbow " in CheckName:
        CheckName = CheckName.replace("rainbow ", "", 1)
        Rainbow = True

    if "shiny" in CheckName:
        CheckName = CheckName.replace("shiny ", "", 1)
        Shiny = True

    for Pet in PetIcons["data"]:
        FoundName = str.lower(Pet["configData"]["name"])

        if CheckName == FoundName:
            if Golden:
                ImageURL = Pet["configData"]["goldenThumbnail"]
            else:
                ImageURL = Pet["configData"]["thumbnail"]

            FoundPet = {"name": Pet["configData"]["name"], "icon": ImageURL}
            break

    if FoundPet:
        FoundPet["icon"] = FoundPet["icon"].replace("rbxassetid://", "", 1)
        FoundPet["icon"] = "https://biggamesapi.io/image/" + FoundPet["icon"]

    return FoundPet

def to_proper_case(text):
    return ' '.join([word.capitalize() for word in text.split()])

def fetch_page_sync(page, retries=3):
    url = f"https://petsimulatorvalues.com/values.php?category=all&page={page}&sort=id&order=ASC"
    for attempt in range(retries):
        try:
            response = scraper.get(url, timeout=20)
            if response.status_code == 200:
                return response.text
            raise Exception(f"status {response.status_code}")
        except Exception as e:
            if attempt == retries - 1:
                print(colored(f"failed to fetch page {page} after {retries} attempts: {e}", "red"))
                return None
    return None

async def fetch_page(page, retries=3):
    return await asyncio.to_thread(fetch_page_sync, page, retries)

async def get_last_page():
    html = await fetch_page(1)
    if not html:
        return 51  # fallback to previous known value if the site is unreachable
    soup = BeautifulSoup(html, 'html5lib')
    page_numbers = set()
    for a in soup.find_all('a', href=True):
        match = re.search(r'[?&]page=(\d+)', a['href'])
        if match:
            page_numbers.add(int(match.group(1)))
        text = a.get_text(strip=True)
        if text.isdigit():
            page_numbers.add(int(text))
    return max(page_numbers) if page_numbers else 51

async def process_page(page, all_data, bulk_ops):
    global items
    CosmicValues = await fetch_page(page)
    if not CosmicValues:
        return
    Soup = BeautifulSoup(CosmicValues, 'html5lib')
    Items = Soup.select(".cards-groups a")

    for Item in Items:
        ItemName = to_proper_case(Item.select_one('.item-name').get_text(strip=True))
        value_span = Item.select_one('.float-right.pt-2 span:nth-of-type(3)')
        
        if value_span:
            Value = UnFormat(value_span.get_text(strip=True))
        else:
            Value = 0  
        Value = Value / 1000  
        ImageURL = GetData(ItemName)
        print(colored(f"{ItemName} - {value_span or 0}", "yellow"))
        items += 1

        Check = next((item for item in all_data if item.get('itemname') == ItemName), None)

        if Check:
            update_op = {}
            if Check.get("itemvalue") != Value:
                update_op["itemvalue"] = Value

            if ImageURL and Check.get("itemimage") != ImageURL["icon"]:
                update_op["itemimage"] = ImageURL["icon"]
            
            if update_op:
                bulk_ops.append(UpdateOne({"itemname": ItemName}, {"$set": update_op}))
        else:
            print(f"- {ItemName} : {Value}")
            bulk_ops.append(UpdateOne(
                {"itemname": ItemName},  
                {
                    "$setOnInsert": {
                        "itemid": random.randint(1, 99999999),## we should use the _id itemid so shit ngl
                        "game": "PS99",
                        "itemname": ItemName, ## the itemname includes the pet type (RAINBOW, GOLDEN, SHINY)
                        "itemimage": ImageURL.get("icon", None) if ImageURL else None,
                        "itemvalue": Value,
                    }
                },
                upsert=True
            ))

async def main():
    global items
    items = 0
    start_time = time()

    all_data = list(Data.find())
    bulk_ops = []

    last_page = await get_last_page()
    print(colored(f"detected {last_page} pages", "cyan"))
    pages = range(1, last_page + 1)
    tasks = [process_page(page, all_data, bulk_ops) for page in pages]
    await asyncio.gather(*tasks)

    if bulk_ops:
        Data.bulk_write(bulk_ops)
    
    end_time = time()

    print(colored(f"took us {end_time - start_time:.2f} seconds", "green"))
    print(colored(f"got {items} items!!!", "magenta"))

async def updater():
    while True:
        await main()
        await asyncio.sleep(50) 

asyncio.run(updater())
